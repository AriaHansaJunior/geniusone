<?php

namespace App\Services\Workflow;

use App\Models\Master\Material\Item;
use App\Models\Procurement\PurchaseOrder\ApprovalPo;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\ApprovalPr;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\System\Auth\User;
use App\Models\System\Governance\ApprovalHistory;
use App\Models\Warehouse\GateReceiving\ApprovalRn;
use App\Models\Warehouse\GateReceiving\ApprovalRnReturn;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturn;
use App\Models\Warehouse\InboundStorage\ApprovalBpb;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\InboundStorage\PoRnToBpb;
use App\Models\Warehouse\RequestMaterial\ApprovalRm;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Services\AuditLogger;
use App\Services\Inventory\InventoryService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

/**
 * Unified Workflow Approval Engine for GeniusOne.
 * Implements BE-03, BE-04, BE-05, and BE-06.
 */
class DocumentApprovalWorkflowService
{
    public const STATUS_DRAFT = 'Draft';

    public const STATUS_WAITING_1 = 'Waiting for Approve 1';

    public const STATUS_WAITING_2 = 'Waiting for Approve 2';

    public const STATUS_APPROVED = 'Approved';

    public const STATUS_REJECTED = 'Rejected';

    protected InventoryService $inventoryService;

    public function __construct(?InventoryService $inventoryService = null)
    {
        $this->inventoryService = $inventoryService ?? new InventoryService;
    }

    /**
     * Resolve document model instance and metadata by module and ID.
     */
    public function resolveDocument(string $module, int $id): Model
    {
        $mod = strtolower(trim($module));

        return match ($mod) {
            'pr', 'purchase-requisition', 'purchase_requisition' => PurchaseRequisition::findOrFail($id),
            'po', 'purchase-order', 'purchase_order' => PurchaseOrder::findOrFail($id),
            'rn', 'receive-note', 'receive_note' => ReceiveNote::findOrFail($id),
            'bpb', 'bpb-receive-material', 'bpb_receive_material' => BpbReceiveMaterial::findOrFail($id),
            'rm', 'request-material', 'request_material' => RequestMaterial::findOrFail($id),
            'return', 'receive-note-return', 'receive_note_return' => ReceiveNoteReturn::findOrFail($id),
            default => throw new InvalidArgumentException("Unknown document module '{$module}'. Only operational transactions support approval."),
        };
    }

    /**
     * Normalize module key to uppercase standard code ('PR', 'PO', 'RN', 'BPB', 'RM', 'RETURN').
     */
    public function normalizeModuleKey(string $module): string
    {
        $mod = strtolower(trim($module));

        return match ($mod) {
            'pr', 'purchase-requisition', 'purchase_requisition' => 'PR',
            'po', 'purchase-order', 'purchase_order' => 'PO',
            'rn', 'receive-note', 'receive_note' => 'RN',
            'bpb', 'bpb-receive-material', 'bpb_receive_material' => 'BPB',
            'rm', 'request-material', 'request_material' => 'RM',
            'return', 'receive-note-return', 'receive_note_return' => 'RETURN',
            default => strtoupper($module),
        };
    }

    /**
     * BE-03: Execute Stage 1 or Stage 2 Approval.
     */
    public function approve(string $module, int $id, int $userId, int $tier = 1, ?string $note = null): Model
    {
        if (! in_array($tier, [1, 2], true)) {
            throw new InvalidArgumentException('Approval tier must be 1 or 2.');
        }

        $user = User::findOrFail($userId);
        $normKey = $this->normalizeModuleKey($module);
        $permKey = strtolower($normKey).".approve_{$tier}";

        if (! $user->hasPermission($permKey) && ! $user->hasPermission(strtolower($normKey).'.*')) {
            throw new InvalidArgumentException("User does not have permission '{$permKey}' to approve {$normKey} Stage {$tier}.");
        }

        return DB::transaction(function () use ($module, $normKey, $id, $user, $tier, $note) {
            $doc = $this->resolveDocument($module, $id);
            $currentStatus = $this->getDocumentStatus($doc);

            // Gating Rule: Tier 1 approval requires Waiting 1 or Draft
            if ($tier === 1) {
                if (in_array($currentStatus, [self::STATUS_WAITING_2, self::STATUS_APPROVED, 'Approved 1', 'Approved 2'])) {
                    throw new InvalidArgumentException("Document has already passed Stage 1 approval (Current status: {$currentStatus}).");
                }
            }

            // Gating Rule: Tier 2 approval strictly requires that Tier 1 was completed (Waiting 2)
            if ($tier === 2) {
                if ($currentStatus !== self::STATUS_WAITING_2 && $currentStatus !== 'Approved 1') {
                    throw new InvalidArgumentException("Stage 2 approval can only be performed after Stage 1 approval is completed. (Current status: {$currentStatus}).");
                }
            }

            $newStatus = ($tier === 1) ? self::STATUS_WAITING_2 : self::STATUS_APPROVED;

            // 1. Record in Module Specific Approval Table
            $this->updateModuleApprovalRecord($normKey, $doc->id, $user->id, $tier, 1, $note);

            // 2. Update Document Status & Track Actor
            $this->setDocumentStatus($doc, $newStatus, $user->id);

            // 3. BE-05: Post Inventory (Masuk Gudang) on BPB Stage 2 Approval
            if ($normKey === 'BPB' && $tier === 2) {
                $this->postBpbStockToInventory($doc, $user->id);
            }

            // 4. BE-05: Deduct Inventory on RM Stage 2 Approval
            if ($normKey === 'RM' && $tier === 2) {
                $this->deductRmStockFromInventory($doc, $user->id);
            }

            // 5. BE-06: Centralized Audit Trail History
            ApprovalHistory::create([
                'document_type' => $normKey,
                'document_id' => $doc->id,
                'document_number' => $this->getDocumentNumber($doc),
                'user_id' => $user->id,
                'action' => ($tier === 1) ? ApprovalHistory::ACTION_APPROVE_1 : ApprovalHistory::ACTION_APPROVE_2,
                'tier' => $tier,
                'from_status' => $currentStatus,
                'to_status' => $newStatus,
                'note' => $note,
                'metadata' => [
                    'actor_name' => $user->name,
                    'actor_role' => $user->role,
                ],
            ]);

            AuditLogger::logWorkflow(
                documentType: $normKey,
                documentNumber: $this->getDocumentNumber($doc),
                action: "APPROVAL_STAGE_{$tier}",
                fromStatus: $currentStatus,
                toStatus: $newStatus,
                userId: $user->id,
                extra: ['tier' => $tier, 'note' => $note]
            );

            return $doc->fresh();
        });
    }

    /**
     * BE-04: Execute UnApprove 1 or UnApprove 2.
     */
    public function unapprove(string $module, int $id, int $userId, int $tier = 1, ?string $reason = null): Model
    {
        if (! in_array($tier, [1, 2], true)) {
            throw new InvalidArgumentException('UnApprove tier must be 1 or 2.');
        }

        $user = User::findOrFail($userId);
        $normKey = $this->normalizeModuleKey($module);
        $permKey = strtolower($normKey).".unapprove_{$tier}";

        if (! $user->hasPermission($permKey) && ! $user->hasPermission(strtolower($normKey).'.*')) {
            throw new InvalidArgumentException("User does not have permission '{$permKey}' to unapprove {$normKey} Stage {$tier}.");
        }

        return DB::transaction(function () use ($module, $normKey, $id, $user, $tier, $reason) {
            $doc = $this->resolveDocument($module, $id);
            $currentStatus = $this->getDocumentStatus($doc);

            // BE-05: Verify Downstream Dependencies before allowing UnApprove
            $this->assertNoDownstreamDependency($normKey, $doc);

            if ($tier === 1) {
                // UnApprove 1 cancels Stage 1 AND Stage 2 if present, rolling back to Waiting 1
                $newStatus = self::STATUS_WAITING_1;

                // Revert inventory if BPB was Approved
                if ($normKey === 'BPB' && in_array($currentStatus, [self::STATUS_APPROVED, 'Approved 2'])) {
                    $this->rollbackBpbStockFromInventory($doc, $user->id);
                }

                // Revert inventory if RM was Approved
                if ($normKey === 'RM' && in_array($currentStatus, [self::STATUS_APPROVED, 'Approved 2'])) {
                    $this->rollbackRmStockToInventory($doc, $user->id);
                }

                $this->resetModuleApprovalRecord($normKey, $doc->id, 1);
                $this->resetModuleApprovalRecord($normKey, $doc->id, 2);
            } else {
                // UnApprove 2 cancels only Stage 2, rolling back to Waiting 2
                if (! in_array($currentStatus, [self::STATUS_APPROVED, 'Approved 2'])) {
                    throw new InvalidArgumentException("Cannot UnApprove Stage 2 because document is not in Approved status (Current status: {$currentStatus}).");
                }

                $newStatus = self::STATUS_WAITING_2;

                // Revert inventory if BPB was Approved
                if ($normKey === 'BPB') {
                    $this->rollbackBpbStockFromInventory($doc, $user->id);
                }

                // Revert inventory if RM was Approved
                if ($normKey === 'RM') {
                    $this->rollbackRmStockToInventory($doc, $user->id);
                }

                $this->resetModuleApprovalRecord($normKey, $doc->id, 2);
            }

            $this->setDocumentStatus($doc, $newStatus, $user->id);

            ApprovalHistory::create([
                'document_type' => $normKey,
                'document_id' => $doc->id,
                'document_number' => $this->getDocumentNumber($doc),
                'user_id' => $user->id,
                'action' => ($tier === 1) ? ApprovalHistory::ACTION_UNAPPROVE_1 : ApprovalHistory::ACTION_UNAPPROVE_2,
                'tier' => $tier,
                'from_status' => $currentStatus,
                'to_status' => $newStatus,
                'note' => $reason ?? "Unapproved by {$user->name}",
                'metadata' => [
                    'actor_name' => $user->name,
                    'actor_role' => $user->role,
                ],
            ]);

            AuditLogger::logWorkflow(
                documentType: $normKey,
                documentNumber: $this->getDocumentNumber($doc),
                action: "UNAPPROVAL_STAGE_{$tier}",
                fromStatus: $currentStatus,
                toStatus: $newStatus,
                userId: $user->id,
                extra: ['tier' => $tier, 'reason' => $reason]
            );

            return $doc->fresh();
        });
    }

    /**
     * BE-04: Reject Document with Mandatory Reason.
     */
    public function reject(string $module, int $id, int $userId, int $tier = 1, string $reason = ''): Model
    {
        $reason = trim($reason);
        if (strlen($reason) < 3) {
            throw new InvalidArgumentException('A valid rejection reason (minimum 3 characters) is required.');
        }

        $user = User::findOrFail($userId);
        $normKey = $this->normalizeModuleKey($module);
        $permKey = strtolower($normKey).".approve_{$tier}";

        if (! $user->hasPermission($permKey) && ! $user->hasPermission(strtolower($normKey).'.*')) {
            throw new InvalidArgumentException("User does not have authority to reject {$normKey} Stage {$tier}.");
        }

        return DB::transaction(function () use ($module, $normKey, $id, $user, $tier, $reason) {
            $doc = $this->resolveDocument($module, $id);
            $currentStatus = $this->getDocumentStatus($doc);

            if (in_array($currentStatus, [self::STATUS_APPROVED, 'Approved 2'])) {
                throw new InvalidArgumentException('Cannot reject document that has already been fully Approved. Use UnApprove first.');
            }

            // 1. Update module approval table (status = 2 / Rejected)
            $this->updateModuleApprovalRecord($normKey, $doc->id, $user->id, $tier, 2, $reason);

            // 2. Set status to Rejected & store rejection note
            $this->setDocumentStatus($doc, self::STATUS_REJECTED, $user->id, $reason);

            // 3. Centralized Audit Trail
            ApprovalHistory::create([
                'document_type' => $normKey,
                'document_id' => $doc->id,
                'document_number' => $this->getDocumentNumber($doc),
                'user_id' => $user->id,
                'action' => ApprovalHistory::ACTION_REJECT,
                'tier' => $tier,
                'from_status' => $currentStatus,
                'to_status' => self::STATUS_REJECTED,
                'note' => $reason,
                'metadata' => [
                    'actor_name' => $user->name,
                    'actor_role' => $user->role,
                ],
            ]);

            AuditLogger::logWorkflow(
                documentType: $normKey,
                documentNumber: $this->getDocumentNumber($doc),
                action: "REJECT_STAGE_{$tier}",
                fromStatus: $currentStatus,
                toStatus: self::STATUS_REJECTED,
                userId: $user->id,
                extra: ['tier' => $tier, 'reason' => $reason]
            );

            return $doc->fresh();
        });
    }

    /**
     * BE-04: Resubmit Document after Revision back to Waiting for Approve 1.
     */
    public function resubmit(string $module, int $id, int $userId, ?string $note = null): Model
    {
        $user = User::findOrFail($userId);
        $normKey = $this->normalizeModuleKey($module);

        return DB::transaction(function () use ($module, $normKey, $id, $user, $note) {
            $doc = $this->resolveDocument($module, $id);
            $currentStatus = $this->getDocumentStatus($doc);

            if ($currentStatus !== self::STATUS_REJECTED && $currentStatus !== self::STATUS_DRAFT) {
                throw new InvalidArgumentException('Only Draft or Rejected documents can be submitted for approval.');
            }

            $this->resetModuleApprovalRecord($normKey, $doc->id, 1);
            $this->resetModuleApprovalRecord($normKey, $doc->id, 2);

            $this->setDocumentStatus($doc, self::STATUS_WAITING_1, $user->id);

            ApprovalHistory::create([
                'document_type' => $normKey,
                'document_id' => $doc->id,
                'document_number' => $this->getDocumentNumber($doc),
                'user_id' => $user->id,
                'action' => ApprovalHistory::ACTION_RESUBMIT,
                'tier' => 1,
                'from_status' => $currentStatus,
                'to_status' => self::STATUS_WAITING_1,
                'note' => $note ?? 'Document resubmitted for approval after revision',
                'metadata' => [
                    'actor_name' => $user->name,
                ],
            ]);

            return $doc->fresh();
        });
    }

    /**
     * BE-06: Get Complete Approval History for a Document.
     */
    public function getApprovalHistory(string $module, int $id): array
    {
        $normKey = $this->normalizeModuleKey($module);

        return ApprovalHistory::where('document_type', $normKey)
            ->where('document_id', $id)
            ->with('user:id,name,username,role')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($h) {
                return [
                    'id' => $h->id,
                    'documentType' => $h->document_type,
                    'documentId' => $h->document_id,
                    'documentNumber' => $h->document_number,
                    'action' => $h->action,
                    'tier' => $h->tier,
                    'fromStatus' => $h->from_status,
                    'toStatus' => $h->to_status,
                    'note' => $h->note,
                    'createdAt' => $h->created_at?->format('Y-m-d H:i:s'),
                    'user' => $h->user ? [
                        'id' => $h->user->id,
                        'name' => $h->user->name,
                        'username' => $h->user->username,
                        'role' => $h->user->role,
                    ] : null,
                ];
            })
            ->toArray();
    }

    /**
     * BE-05: Check if document is immutable / locked from editing.
     */
    public function isLocked(Model $doc): bool
    {
        $status = $this->getDocumentStatus($doc);

        return in_array($status, [self::STATUS_APPROVED, 'Approved', 'Approved 2'], true);
    }

    // =========================================================================
    // HELPER & DOWNSTREAM ENFORCEMENT METHODS
    // =========================================================================

    public function getDocumentStatus(Model $doc): string
    {
        if (isset($doc->status) && ! empty($doc->status)) {
            return (string) $doc->status;
        }

        if (isset($doc->approval_status) && ! empty($doc->approval_status)) {
            return (string) $doc->approval_status;
        }

        if (isset($doc->remark) && in_array($doc->remark, [self::STATUS_APPROVED, self::STATUS_WAITING_1, self::STATUS_WAITING_2, self::STATUS_REJECTED])) {
            return (string) $doc->remark;
        }

        return self::STATUS_WAITING_1;
    }

    protected function setDocumentStatus(Model $doc, string $status, int $userId, ?string $rejectionNote = null): void
    {
        $data = ['updated_by' => $userId];

        if (Schema::hasColumn($doc->getTable(), 'status')) {
            $data['status'] = $status;
        }

        if (Schema::hasColumn($doc->getTable(), 'approval_status')) {
            $data['approval_status'] = $status;
        }

        if (Schema::hasColumn($doc->getTable(), 'rejection_note')) {
            $data['rejection_note'] = $rejectionNote;
        }

        $doc->update($data);
    }

    public function getDocumentNumber(Model $doc): string
    {
        return $doc->pr_number ?? $doc->po_number ?? $doc->rn_number ?? $doc->bpb_number ?? $doc->request_number ?? (string) $doc->id;
    }

    protected function updateModuleApprovalRecord(string $module, int $docId, int $userId, int $tier, int $status, ?string $note): void
    {
        match ($module) {
            'PR' => ApprovalPr::updateOrCreate(
                ['purchase_requisitions_id' => $docId, 'approval_ke' => (string) $tier],
                ['users_id' => $userId, 'status' => $status, 'note' => $note]
            ),
            'PO' => ApprovalPo::updateOrCreate(
                ['purchase_order_id' => $docId, 'approval_ke' => (string) $tier],
                ['users_id' => $userId, 'status' => $status, 'note' => $note]
            ),
            'RN' => ApprovalRn::updateOrCreate(
                ['receive_note_id' => $docId, 'approval_ke' => (string) $tier],
                ['users_id' => $userId, 'status' => $status, 'note' => $note]
            ),
            'BPB' => ApprovalBpb::updateOrCreate(
                ['bpb_receive_material_id' => $docId, 'approval_ke' => (string) $tier],
                ['users_id' => $userId, 'status' => $status, 'note' => $note]
            ),
            'RM' => ApprovalRm::updateOrCreate(
                ['request_material_id' => $docId, 'approval_ke' => (string) $tier],
                ['users_id' => $userId, 'status' => $status, 'note' => $note]
            ),
            'RETURN' => ApprovalRnReturn::updateOrCreate(
                ['receive_note_return_id' => $docId, 'approval_ke' => (string) $tier],
                ['users_id' => $userId, 'status' => $status, 'note' => $note]
            ),
            default => null,
        };
    }

    protected function resetModuleApprovalRecord(string $module, int $docId, int $tier): void
    {
        match ($module) {
            'PR' => ApprovalPr::where('purchase_requisitions_id', $docId)->where('approval_ke', (string) $tier)->update(['status' => 0]),
            'PO' => ApprovalPo::where('purchase_order_id', $docId)->where('approval_ke', (string) $tier)->update(['status' => 0]),
            'RN' => ApprovalRn::where('receive_note_id', $docId)->where('approval_ke', (string) $tier)->update(['status' => 0]),
            'BPB' => ApprovalBpb::where('bpb_receive_material_id', $docId)->where('approval_ke', (string) $tier)->update(['status' => 0]),
            'RM' => ApprovalRm::where('request_material_id', $docId)->where('approval_ke', (string) $tier)->update(['status' => 0]),
            'RETURN' => ApprovalRnReturn::where('receive_note_return_id', $docId)->where('approval_ke', (string) $tier)->update(['status' => 0]),
            default => null,
        };
    }

    /**
     * BE-05: Prevent unapproving documents when subsequent downstream documents exist.
     */
    protected function assertNoDownstreamDependency(string $module, Model $doc): void
    {
        if ($module === 'PR') {
            // Check if any PO items reference this PR's items
            $prItemIds = $doc->items()->pluck('id')->toArray();
            if (! empty($prItemIds)) {
                $hasPo = DB::table('purchase_order_has_purchase_requisitions')
                    ->whereIn('pr_has_items_id', $prItemIds)
                    ->exists();

                if ($hasPo) {
                    throw new InvalidArgumentException("Cannot UnApprove PR '{$doc->pr_number}': It has already been processed into Purchase Order(s). Cancel or delete the PO first.");
                }
            }
        }

        if ($module === 'PO') {
            // Check if any Receive Note references this PO
            $hasRn = PurchaseOrderReceiveNote::where('purchase_order_id', $doc->id)->exists();
            if ($hasRn) {
                throw new InvalidArgumentException("Cannot UnApprove PO '{$doc->po_number}': It has already been linked to Gate Receive Note(s). Cancel the Receive Note first.");
            }
        }

        if ($module === 'RN') {
            // Check if any BPB references this RN
            $poRnIds = $doc->purchaseOrders()->pluck('id')->toArray();
            if (! empty($poRnIds)) {
                $hasBpb = PoRnToBpb::whereIn('po_has_rn_id', $poRnIds)->exists();
                if ($hasBpb) {
                    throw new InvalidArgumentException("Cannot UnApprove Receive Note '{$doc->rn_number}': It has already been allocated in BPB (Warehouse Inbound). Cancel the BPB first.");
                }
            }
        }
    }

    /**
     * BE-05: Post BPB physical stock to warehouse inventory.
     */
    protected function postBpbStockToInventory(BpbReceiveMaterial $bpb, int $userId): void
    {
        $mappings = PoRnToBpb::with('poReceiveNote')->where('bpb_receive_material_id', $bpb->id)->get();

        foreach ($mappings as $map) {
            $poRn = $map->poReceiveNote;
            if (! $poRn) {
                continue;
            }

            $netQty = (float) $poRn->quantity - (float) $poRn->rafaksi;
            if ($netQty <= 0) {
                continue;
            }

            $item = Item::where('name', $poRn->item_name)->first()
                ?? Item::first();

            if ($item) {
                $this->inventoryService->recordStockMovement(
                    item: $item,
                    warehouseId: $map->warehouses_id,
                    movementType: 'IN',
                    quantity: $netQty,
                    referenceType: 'BPB',
                    referenceNumber: $bpb->bpb_number,
                    userId: $userId,
                    notes: "Physical Goods Received via BPB Approval: {$bpb->bpb_number}"
                );
            }
        }
    }

    /**
     * BE-05: Rollback BPB physical stock if unapproved.
     */
    protected function rollbackBpbStockFromInventory(BpbReceiveMaterial $bpb, int $userId): void
    {
        $mappings = PoRnToBpb::with('poReceiveNote')->where('bpb_receive_material_id', $bpb->id)->get();

        foreach ($mappings as $map) {
            $poRn = $map->poReceiveNote;
            if (! $poRn) {
                continue;
            }

            $netQty = (float) $poRn->quantity - (float) $poRn->rafaksi;
            if ($netQty <= 0) {
                continue;
            }

            $item = Item::where('name', $poRn->item_name)->first()
                ?? Item::first();

            if ($item) {
                $this->inventoryService->recordStockMovement(
                    item: $item,
                    warehouseId: $map->warehouses_id,
                    movementType: 'OUT',
                    quantity: $netQty,
                    referenceType: 'BPB_REVERSAL',
                    referenceNumber: $bpb->bpb_number,
                    userId: $userId,
                    notes: "Stock Reversal due to BPB Unapproval: {$bpb->bpb_number}"
                );
            }
        }
    }

    /**
     * BE-05: Deduct Request Material physical stock from inventory.
     */
    protected function deductRmStockFromInventory(RequestMaterial $rm, int $userId): void
    {
        $items = $rm->items()->with('item')->get();

        foreach ($items as $rmItem) {
            $qty = (float) ($rmItem->request_qty ?? $rmItem->quantity ?? 0);
            if ($qty <= 0) {
                continue;
            }

            $targetItem = $rmItem->item ?? Item::find($rmItem->items_id);
            if ($targetItem) {
                $warehouseId = $rm->warehouses_id ?? 1;
                $this->inventoryService->recordStockMovement(
                    item: $targetItem,
                    warehouseId: $warehouseId,
                    movementType: 'OUT',
                    quantity: $qty,
                    referenceType: 'RM',
                    referenceNumber: $rm->request_number,
                    userId: $userId,
                    notes: "Material Issued via RM Approval: {$rm->request_number}"
                );
            }
        }
    }

    /**
     * BE-05: Rollback Request Material physical stock deduction if unapproved.
     */
    protected function rollbackRmStockToInventory(RequestMaterial $rm, int $userId): void
    {
        $items = $rm->items()->with('item')->get();

        foreach ($items as $rmItem) {
            $qty = (float) ($rmItem->request_qty ?? $rmItem->quantity ?? 0);
            if ($qty <= 0) {
                continue;
            }

            $targetItem = $rmItem->item ?? Item::find($rmItem->items_id);
            if ($targetItem) {
                $warehouseId = $rm->warehouses_id ?? 1;
                $this->inventoryService->recordStockMovement(
                    item: $targetItem,
                    warehouseId: $warehouseId,
                    movementType: 'IN',
                    quantity: $qty,
                    referenceType: 'RM_REVERSAL',
                    referenceNumber: $rm->request_number,
                    userId: $userId,
                    notes: "Stock Restored due to RM Unapproval: {$rm->request_number}"
                );
            }
        }
    }
}
