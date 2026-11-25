<?php

namespace App\Services\Dashboard;

use App\Models\Inventory\StockNotification;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\System\Auth\User;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\Inventory\TransferStockReturn;
use App\Models\Warehouse\Inventory\WarehouseStockTransfer;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\UnauthorizedException;

class DashboardService
{
    public const SUPPORTED_MODULES = ['PR', 'PO', 'RN', 'BPB', 'RM', 'TSR', 'STOCK_TRANSFER'];

    /**
     * Resolve which document modules the user can access on the Dashboard.
     *
     * @return array<int, string>
     */
    public function getAccessibleModules(User $user): array
    {
        if ($user->isAdmin()) {
            return self::SUPPORTED_MODULES;
        }

        $modules = [];

        if ($this->canAccessModule($user, 'PR', ['approver', 'approver_tier1', 'approver_tier2', 'procurement', 'accounting', 'requester', 'viewer'], ['pr.view', 'pr.create'])) {
            $modules[] = 'PR';
        }

        if ($this->canAccessModule($user, 'PO', ['approver', 'approver_tier1', 'approver_tier2', 'procurement', 'accounting', 'viewer'], ['po.view', 'po.create'])) {
            $modules[] = 'PO';
        }

        if ($this->canAccessModule($user, 'RN', ['approver', 'approver_tier1', 'approver_tier2', 'warehouse', 'viewer'], ['rn.view', 'rn.create'])) {
            $modules[] = 'RN';
        }

        if ($this->canAccessModule($user, 'BPB', ['approver', 'approver_tier1', 'approver_tier2', 'warehouse', 'viewer'], ['bpb.view', 'bpb.create'])) {
            $modules[] = 'BPB';
        }

        if ($this->canAccessModule($user, 'RM', ['approver', 'approver_tier1', 'approver_tier2', 'warehouse', 'requester', 'viewer'], ['rm.view', 'rm.create'])) {
            $modules[] = 'RM';
        }

        if ($this->canAccessModule($user, 'TSR', ['approver', 'approver_tier1', 'approver_tier2', 'warehouse', 'viewer'], ['return.view', 'return.approve_1', 'return.approve_2', 'inventory.view', 'inventory.adjust'])) {
            $modules[] = 'TSR';
        }

        if ($this->canAccessModule($user, 'STOCK_TRANSFER', ['warehouse', 'viewer'], ['inventory.view', 'inventory.adjust'])) {
            $modules[] = 'STOCK_TRANSFER';
        }

        return array_values(array_unique($modules));
    }

    /**
     * Determine whether the user's aggregation scope covers org-wide docs in accessible modules
     * or should be restricted to only documents created by the user.
     */
    public function hasGlobalAggregationAccess(User $user): bool
    {
        return $user->isAdmin() || $user->hasRole([
            User::ROLE_APPROVER,
            User::ROLE_APPROVER_TIER1,
            User::ROLE_APPROVER_TIER2,
            User::ROLE_PROCUREMENT,
            User::ROLE_ACCOUNTING,
            User::ROLE_WAREHOUSE,
            User::ROLE_VIEWER,
        ]);
    }

    /**
     * 1.1 Document Completion Aggregation (strictly scoped by role/permission, zero double-counting).
     */
    public function getCompletionAggregation(User $user, ?array $requestedModules = null): array
    {
        $accessibleModules = $this->getAccessibleModules($user);
        $targetModules = $accessibleModules;

        if ($requestedModules !== null && ! empty($requestedModules)) {
            $normalized = array_map(fn ($m) => strtoupper(trim((string) $m)), $requestedModules);
            $forbidden = array_diff($normalized, $accessibleModules);
            if (! empty($forbidden)) {
                throw new UnauthorizedException('You are not authorized to aggregate documents for module(s): '.implode(', ', $forbidden));
            }
            $targetModules = array_values(array_intersect($accessibleModules, $normalized));
        }

        $isGlobalScope = $this->hasGlobalAggregationAccess($user);
        $total = 0;
        $completed = 0;
        $incomplete = 0;
        $byModule = [];

        foreach ($targetModules as $module) {
            $stats = $this->countModuleCompletion($module, $user, $isGlobalScope);
            $byModule[] = $stats;
            $total += $stats['total'];
            $completed += $stats['completed'];
            $incomplete += $stats['incomplete'];
        }

        $completionRate = $total > 0 ? round(($completed / $total) * 100, 2) : 0.0;

        return [
            'scope' => $isGlobalScope ? 'role_modules' : 'own_documents',
            'role' => $user->role,
            'accessible_modules' => $accessibleModules,
            'total' => $total,
            'completed' => $completed,
            'incomplete' => $incomplete,
            'completion_rate' => $completionRate,
            'by_module' => $byModule,
        ];
    }

    /**
     * 1.2 Document Tracking for documents created by the user (admin/superadmin may view other creators via creator_id/scope=all).
     */
    public function getDocumentTracking(User $user, array $filters = []): array
    {
        $requestedScope = strtolower((string) ($filters['scope'] ?? 'own'));
        $requestedCreatorId = isset($filters['creator_id']) && $filters['creator_id'] !== '' ? (int) $filters['creator_id'] : null;

        if (! $user->isAdmin()) {
            if ($requestedScope === 'all') {
                throw new UnauthorizedException('Only administrators may view global cross-user document tracking.');
            }
            if ($requestedCreatorId !== null && $requestedCreatorId !== (int) $user->id) {
                throw new UnauthorizedException('You are not authorized to track documents created by another user.');
            }
        }

        $effectiveCreatorId = $user->isAdmin()
            ? ($requestedScope === 'all' ? null : ($requestedCreatorId ?? (int) $user->id))
            : (int) $user->id;

        $accessibleModules = $this->getAccessibleModules($user);
        $requestedType = ! empty($filters['document_type']) ? strtoupper(trim((string) $filters['document_type'])) : null;
        if ($requestedType !== null) {
            if (! in_array($requestedType, $accessibleModules, true)) {
                throw new UnauthorizedException("You are not authorized to track '{$requestedType}' documents.");
            }
            $modules = [$requestedType];
        } else {
            $modules = $accessibleModules;
        }

        $search = trim((string) ($filters['search'] ?? ''));
        $statusFilter = strtolower(trim((string) ($filters['status'] ?? '')));

        $entries = collect();
        foreach ($modules as $module) {
            $entries = $entries->concat(
                $this->fetchTrackedDocumentsForModule($module, $effectiveCreatorId, $search)
            );
        }

        if ($statusFilter !== '' && $statusFilter !== 'all') {
            $entries = $entries->filter(function (array $row) use ($statusFilter) {
                if ($statusFilter === 'completed') {
                    return $row['is_completed'] === true;
                }
                if ($statusFilter === 'incomplete' || $statusFilter === 'pending') {
                    return $row['is_completed'] === false;
                }

                return strtolower((string) $row['status']) === $statusFilter;
            });
        }

        $sorted = $entries->sortByDesc(fn (array $row) => $row['created_at_ts'] ?? 0)->values();

        $perPage = min(max((int) ($filters['per_page'] ?? 50), 1), 200);
        $page = max((int) ($filters['page'] ?? 1), 1);
        $total = $sorted->count();
        $lastPage = max((int) ceil($total / $perPage), 1);
        $sliced = $sorted->forPage($page, $perPage)->values()->map(function (array $row) {
            unset($row['created_at_ts']);

            return $row;
        })->all();

        return [
            'rows' => $sliced,
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
                'scope' => $effectiveCreatorId === null ? 'all' : 'user',
                'creator_id' => $effectiveCreatorId,
            ],
        ];
    }

    /**
     * 1.3 Role-based Dashboard Overview combining aggregation, tracking summary, and permitted stock alerts.
     */
    public function getRoleOverview(User $user): array
    {
        $aggregation = $this->getCompletionAggregation($user);
        $tracking = $this->getDocumentTracking($user, ['per_page' => 10, 'page' => 1]);

        $canSeeAlerts = $user->isAdmin() || $user->hasRole([
            User::ROLE_WAREHOUSE,
            User::ROLE_PROCUREMENT,
            User::ROLE_ACCOUNTING,
            User::ROLE_VIEWER,
        ]) || $user->hasPermission('inventory.view');

        $alertsCount = 0;
        if ($canSeeAlerts) {
            $alertsCount = StockNotification::where('status', 1)->count();
        }

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'departments_id' => $user->departments_id,
            ],
            'accessible_modules' => $aggregation['accessible_modules'],
            'completion_aggregation' => $aggregation,
            'recent_tracking' => $tracking['rows'],
            'tracking_total' => $tracking['meta']['total'],
            'stock_notifications_enabled_count' => $canSeeAlerts ? $alertsCount : null,
        ];
    }

    private function canAccessModule(User $user, string $module, array $allowedRoles, array $allowedPermissions): bool
    {
        if ($user->hasRole($allowedRoles)) {
            return true;
        }

        foreach ($allowedPermissions as $perm) {
            if ($user->hasPermission($perm)) {
                return true;
            }
        }

        return false;
    }

    private function countModuleCompletion(string $module, User $user, bool $isGlobalScope): array
    {
        return match ($module) {
            'PR' => $this->aggregateSimpleStatusModule(
                'PR',
                PurchaseRequisition::query(),
                'creator',
                ['Approved', 'Approved 2', 'Ordered', 'Closed'],
                $user,
                $isGlobalScope
            ),
            'PO' => $this->aggregatePurchaseOrderModule($user, $isGlobalScope),
            'RN' => $this->aggregateSimpleStatusModule(
                'RN',
                ReceiveNote::query(),
                'creator_id',
                ['Approved', 'Approved 2'],
                $user,
                $isGlobalScope
            ),
            'BPB' => $this->aggregateSimpleStatusModule(
                'BPB',
                BpbReceiveMaterial::query(),
                'creator_id',
                ['Approved', 'Approved 2'],
                $user,
                $isGlobalScope
            ),
            'RM' => $this->aggregateSimpleStatusModule(
                'RM',
                RequestMaterial::query(),
                'creator',
                ['Approved', 'Approved 2'],
                $user,
                $isGlobalScope
            ),
            'TSR' => $this->aggregateSimpleStatusModule(
                'TSR',
                TransferStockReturn::query(),
                'creator_id',
                ['Approved', 'Approved 2'],
                $user,
                $isGlobalScope
            ),
            'STOCK_TRANSFER' => $this->aggregateStockTransferModule($user, $isGlobalScope),
        };
    }

    private function aggregateSimpleStatusModule(
        string $module,
        Builder $query,
        string $creatorColumn,
        array $completedStatuses,
        User $user,
        bool $isGlobalScope
    ): array {
        if (! $isGlobalScope) {
            $query->where($creatorColumn, $user->id);
        }

        // Count strictly distinct primary keys from non-deleted rows (softDeletes applied by model)
        $rows = (clone $query)->select(['id', 'status'])->get();
        $total = $rows->count();
        $completed = $rows->filter(fn ($r) => in_array((string) $r->getRawOriginal('status') ?: (string) $r->status, $completedStatuses, true))->count();
        $incomplete = max(0, $total - $completed);

        return [
            'module' => $module,
            'total' => $total,
            'completed' => $completed,
            'incomplete' => $incomplete,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0.0,
        ];
    }

    private function aggregatePurchaseOrderModule(User $user, bool $isGlobalScope): array
    {
        $query = PurchaseOrder::with('poType');
        if (! $isGlobalScope) {
            $query->where('creator_id', $user->id);
        }

        $rows = $query->get();
        $total = $rows->count();
        $completed = $rows->filter(function (PurchaseOrder $po) {
            $status = (string) ($po->getRawOriginal('status') ?: $po->status);
            if ($po->isServiceOrder()) {
                return $status === 'Closed';
            }

            return in_array($status, ['Approved', 'Approved 2', 'Closed'], true);
        })->count();

        $incomplete = max(0, $total - $completed);

        return [
            'module' => 'PO',
            'total' => $total,
            'completed' => $completed,
            'incomplete' => $incomplete,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0.0,
        ];
    }

    private function aggregateStockTransferModule(User $user, bool $isGlobalScope): array
    {
        $query = WarehouseStockTransfer::query()->where('status', '!=', 'Cancelled');
        if (! $isGlobalScope) {
            $query->where('creator_id', $user->id);
        }

        $rows = $query->select(['id', 'status'])->get();
        $total = $rows->count();
        $completed = $rows->filter(fn ($r) => (string) $r->status === 'Posted')->count();
        $incomplete = max(0, $total - $completed);

        return [
            'module' => 'STOCK_TRANSFER',
            'total' => $total,
            'completed' => $completed,
            'incomplete' => $incomplete,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0.0,
        ];
    }

    private function fetchTrackedDocumentsForModule(string $module, ?int $creatorId, string $search): Collection
    {
        return match ($module) {
            'PR' => $this->trackPurchaseRequisitions($creatorId, $search),
            'PO' => $this->trackPurchaseOrders($creatorId, $search),
            'RN' => $this->trackReceiveNotes($creatorId, $search),
            'BPB' => $this->trackBpbs($creatorId, $search),
            'RM' => $this->trackRequestMaterials($creatorId, $search),
            'TSR' => $this->trackTransferStockReturns($creatorId, $search),
            'STOCK_TRANSFER' => $this->trackStockTransfers($creatorId, $search),
            default => collect(),
        };
    }

    private function trackPurchaseRequisitions(?int $creatorId, string $search): Collection
    {
        $query = PurchaseRequisition::query();
        if ($creatorId !== null) {
            $query->where('creator', $creatorId);
        }
        if ($search !== '') {
            $query->where('pr_number', 'like', "%{$search}%");
        }

        $prs = $query->orderByDesc('id')->get();
        if ($prs->isEmpty()) {
            return collect();
        }

        $prIds = $prs->pluck('id')->all();
        $linkedPos = DB::table('purchase_order_has_purchase_requisitions as poi')
            ->join('purchase_requisitions_has_items as pri', 'poi.pr_has_items_id', '=', 'pri.id')
            ->join('purchase_order as po', 'poi.purchase_order_id', '=', 'po.id')
            ->whereIn('pri.purchase_requisitions_id', $prIds)
            ->whereNull('poi.deleted_at')
            ->whereNull('pri.deleted_at')
            ->whereNull('po.deleted_at')
            ->select('pri.purchase_requisitions_id as pr_id', 'po.id as po_id', 'po.po_number', 'po.status')
            ->distinct()
            ->get()
            ->groupBy('pr_id');

        return $prs->map(function (PurchaseRequisition $pr) use ($linkedPos) {
            $status = $pr->status;
            $isCompleted = in_array($status, ['Approved', 'Approved 2', 'Ordered', 'Closed'], true);
            $downstream = collect($linkedPos[$pr->id] ?? [])->map(fn ($po) => [
                'document_type' => 'PO',
                'document_id' => (int) $po->po_id,
                'document_number' => $po->po_number,
                'status' => $po->status,
            ])->values()->all();

            return [
                'document_id' => $pr->id,
                'document_number' => $pr->pr_number,
                'document_type' => 'PR',
                'created_at' => $this->formatIsoDate($pr->created_at ?? $pr->date),
                'created_at_ts' => $this->toTimestamp($pr->created_at ?? $pr->date),
                'status' => $status,
                'workflow_stage' => $this->resolveApprovalWorkflowStage($status),
                'is_completed' => $isCompleted,
                'downstream_documents' => $downstream,
            ];
        });
    }

    private function trackPurchaseOrders(?int $creatorId, string $search): Collection
    {
        $query = PurchaseOrder::with(['poType', 'closures']);
        if ($creatorId !== null) {
            $query->where('creator_id', $creatorId);
        }
        if ($search !== '') {
            $query->where('po_number', 'like', "%{$search}%");
        }

        $pos = $query->orderByDesc('id')->get();
        if ($pos->isEmpty()) {
            return collect();
        }

        $poIds = $pos->pluck('id')->all();
        $linkedRns = DB::table('purchase_order_has_receive_note as porn')
            ->join('receive_note as rn', 'porn.receive_note_id', '=', 'rn.id')
            ->whereIn('porn.purchase_order_id', $poIds)
            ->whereNull('porn.deleted_at')
            ->whereNull('rn.deleted_at')
            ->select('porn.purchase_order_id as po_id', 'rn.id as rn_id', 'rn.rn_number', 'rn.status')
            ->distinct()
            ->get()
            ->groupBy('po_id');

        $linkedBpbs = DB::table('purchase_order_has_receive_note as porn')
            ->join('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->whereIn('porn.purchase_order_id', $poIds)
            ->whereNull('porn.deleted_at')
            ->whereNull('pb.deleted_at')
            ->whereNull('bpb.deleted_at')
            ->select('porn.purchase_order_id as po_id', 'bpb.id as bpb_id', 'bpb.bpb_number', 'bpb.status')
            ->distinct()
            ->get()
            ->groupBy('po_id');

        return $pos->map(function (PurchaseOrder $po) use ($linkedRns, $linkedBpbs) {
            $status = $po->status;
            $isService = $po->isServiceOrder();
            $isCompleted = $isService
                ? ($status === 'Closed')
                : in_array($status, ['Approved', 'Approved 2', 'Closed'], true);

            $downstream = collect();
            foreach ($linkedRns[$po->id] ?? [] as $rn) {
                $downstream->push([
                    'document_type' => 'RN',
                    'document_id' => (int) $rn->rn_id,
                    'document_number' => $rn->rn_number,
                    'status' => $rn->status,
                ]);
            }
            foreach ($linkedBpbs[$po->id] ?? [] as $bpb) {
                $downstream->push([
                    'document_type' => 'BPB',
                    'document_id' => (int) $bpb->bpb_id,
                    'document_number' => $bpb->bpb_number,
                    'status' => $bpb->status,
                ]);
            }
            foreach ($po->closures as $closure) {
                $downstream->push([
                    'document_type' => 'BERITA_ACARA',
                    'document_id' => (int) $closure->id,
                    'document_number' => $closure->berita_acara_number,
                    'status' => $closure->status,
                ]);
            }

            $workflowStage = ($isService && $status === 'Approved')
                ? 'Pending Berita Acara Closure'
                : $this->resolveApprovalWorkflowStage($status);

            return [
                'document_id' => $po->id,
                'document_number' => $po->po_number,
                'document_type' => 'PO',
                'order_category' => $isService ? 'SERVICE' : 'GOODS',
                'created_at' => $this->formatIsoDate($po->created_at ?? $po->date),
                'created_at_ts' => $this->toTimestamp($po->created_at ?? $po->date),
                'status' => $status,
                'workflow_stage' => $workflowStage,
                'is_completed' => $isCompleted,
                'downstream_documents' => $downstream->values()->all(),
            ];
        });
    }

    private function trackReceiveNotes(?int $creatorId, string $search): Collection
    {
        $query = ReceiveNote::query();
        if ($creatorId !== null) {
            $query->where('creator_id', $creatorId);
        }
        if ($search !== '') {
            $query->where('rn_number', 'like', "%{$search}%");
        }

        $rns = $query->orderByDesc('id')->get();
        if ($rns->isEmpty()) {
            return collect();
        }

        $rnIds = $rns->pluck('id')->all();
        $linkedBpbs = DB::table('purchase_order_has_receive_note as porn')
            ->join('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->whereIn('porn.receive_note_id', $rnIds)
            ->whereNull('porn.deleted_at')
            ->whereNull('pb.deleted_at')
            ->whereNull('bpb.deleted_at')
            ->select('porn.receive_note_id as rn_id', 'bpb.id as bpb_id', 'bpb.bpb_number', 'bpb.status')
            ->distinct()
            ->get()
            ->groupBy('rn_id');

        return $rns->map(function (ReceiveNote $rn) use ($linkedBpbs) {
            $status = $rn->status;
            $isCompleted = in_array($status, ['Approved', 'Approved 2'], true);
            $downstream = collect($linkedBpbs[$rn->id] ?? [])->map(fn ($bpb) => [
                'document_type' => 'BPB',
                'document_id' => (int) $bpb->bpb_id,
                'document_number' => $bpb->bpb_number,
                'status' => $bpb->status,
            ])->values()->all();

            return [
                'document_id' => $rn->id,
                'document_number' => $rn->rn_number,
                'document_type' => 'RN',
                'created_at' => $this->formatIsoDate($rn->created_at ?? $rn->arrival_date),
                'created_at_ts' => $this->toTimestamp($rn->created_at ?? $rn->arrival_date),
                'status' => $status,
                'workflow_stage' => $this->resolveApprovalWorkflowStage($status),
                'is_completed' => $isCompleted,
                'downstream_documents' => $downstream,
            ];
        });
    }

    private function trackBpbs(?int $creatorId, string $search): Collection
    {
        $query = BpbReceiveMaterial::query();
        if ($creatorId !== null) {
            $query->where('creator_id', $creatorId);
        }
        if ($search !== '') {
            $query->where('bpb_number', 'like', "%{$search}%");
        }

        return $query->orderByDesc('id')->get()->map(function (BpbReceiveMaterial $bpb) {
            $status = $bpb->status;

            return [
                'document_id' => $bpb->id,
                'document_number' => $bpb->bpb_number,
                'document_type' => 'BPB',
                'bpb_category' => $bpb->isServiceBpb() ? 'SERVICE' : 'GOODS',
                'created_at' => $this->formatIsoDate($bpb->created_at ?? $bpb->receive_date),
                'created_at_ts' => $this->toTimestamp($bpb->created_at ?? $bpb->receive_date),
                'status' => $status,
                'workflow_stage' => $this->resolveApprovalWorkflowStage($status),
                'is_completed' => in_array($status, ['Approved', 'Approved 2'], true),
                'downstream_documents' => [],
            ];
        });
    }

    private function trackRequestMaterials(?int $creatorId, string $search): Collection
    {
        $query = RequestMaterial::with('department');
        if ($creatorId !== null) {
            $query->where('creator', $creatorId);
        }
        if ($search !== '') {
            $query->where('request_number', 'like', "%{$search}%");
        }

        $rms = $query->orderByDesc('id')->get();
        if ($rms->isEmpty()) {
            return collect();
        }

        $rmIds = $rms->pluck('id')->all();
        $linkedTsrs = TransferStockReturn::whereIn('request_material_id', $rmIds)
            ->get()
            ->groupBy('request_material_id');

        return $rms->map(function (RequestMaterial $rm) use ($linkedTsrs) {
            $status = $rm->status;
            $downstream = collect($linkedTsrs[$rm->id] ?? [])->map(fn (TransferStockReturn $tsr) => [
                'document_type' => 'TSR',
                'document_id' => $tsr->id,
                'document_number' => $tsr->return_number,
                'status' => $tsr->status,
            ])->values()->all();

            return [
                'document_id' => $rm->id,
                'document_number' => $rm->request_number,
                'document_type' => 'RM',
                'created_at' => $this->formatIsoDate($rm->created_at ?? $rm->request_date),
                'created_at_ts' => $this->toTimestamp($rm->created_at ?? $rm->request_date),
                'status' => $status,
                'workflow_stage' => $this->resolveApprovalWorkflowStage($status),
                'is_completed' => in_array($status, ['Approved', 'Approved 2'], true),
                'downstream_documents' => $downstream,
            ];
        });
    }

    private function trackTransferStockReturns(?int $creatorId, string $search): Collection
    {
        $query = TransferStockReturn::with('requestMaterial');
        if ($creatorId !== null) {
            $query->where('creator_id', $creatorId);
        }
        if ($search !== '') {
            $query->where('return_number', 'like', "%{$search}%");
        }

        return $query->orderByDesc('id')->get()->map(function (TransferStockReturn $tsr) {
            $status = $tsr->status;

            return [
                'document_id' => $tsr->id,
                'document_number' => $tsr->return_number,
                'document_type' => 'TSR',
                'created_at' => $this->formatIsoDate($tsr->created_at ?? $tsr->return_date),
                'created_at_ts' => $this->toTimestamp($tsr->created_at ?? $tsr->return_date),
                'status' => $status,
                'workflow_stage' => $this->resolveApprovalWorkflowStage($status),
                'is_completed' => in_array($status, ['Approved', 'Approved 2'], true),
                'downstream_documents' => [],
            ];
        });
    }

    private function trackStockTransfers(?int $creatorId, string $search): Collection
    {
        $query = WarehouseStockTransfer::with(['sourceWarehouse', 'destinationWarehouse']);
        if ($creatorId !== null) {
            $query->where('creator_id', $creatorId);
        }
        if ($search !== '') {
            $query->where('transfer_number', 'like', "%{$search}%");
        }

        return $query->orderByDesc('id')->get()->map(function (WarehouseStockTransfer $tr) {
            $status = (string) $tr->status;

            return [
                'document_id' => $tr->id,
                'document_number' => $tr->transfer_number,
                'document_type' => 'STOCK_TRANSFER',
                'created_at' => $this->formatIsoDate($tr->created_at ?? $tr->transfer_date),
                'created_at_ts' => $this->toTimestamp($tr->created_at ?? $tr->transfer_date),
                'status' => $status,
                'workflow_stage' => $status === 'Posted' ? 'Completed' : $status,
                'is_completed' => $status === 'Posted',
                'downstream_documents' => [],
            ];
        });
    }

    private function resolveApprovalWorkflowStage(string $status): string
    {
        return match ($status) {
            'Waiting for Approve 1', 'Pending' => 'Tier 1 Approval',
            'Waiting for Approve 2', 'Approved 1' => 'Tier 2 Approval',
            'Approved', 'Approved 2', 'Ordered' => 'Completed',
            'Closed' => 'Closed',
            'Rejected' => 'Rejected',
            default => $status !== '' ? $status : 'Draft',
        };
    }

    private function formatIsoDate($value): ?string
    {
        if (empty($value)) {
            return null;
        }

        try {
            return Carbon::parse($value)->toIso8601String();
        } catch (\Throwable $e) {
            return is_string($value) ? $value : null;
        }
    }

    private function toTimestamp($value): int
    {
        if (empty($value)) {
            return 0;
        }

        try {
            return Carbon::parse($value)->getTimestamp();
        } catch (\Throwable $e) {
            return 0;
        }
    }
}
