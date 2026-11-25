<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Api\Common\SystemContextApiController;
use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\System\Auth\User;
use App\Models\System\Governance\ApprovalHistory;
use App\Models\Warehouse\Inventory\TransferStockReturn;
use App\Models\Warehouse\Inventory\TransferStockReturnItem;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Services\AuditLogger;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\Inventory\InventoryService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransferStockReturnApiController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = TransferStockReturn::with([
            'warehouse',
            'requestMaterial.destinationLocation',
            'requestMaterial.department',
            'jobNumberModel',
            'creatorUser',
            'updatedByUser',
            'items.item.unit',
        ])->orderByDesc('id');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('return_number', 'like', "%{$search}%")
                    ->orWhere('production_code', 'like', "%{$search}%")
                    ->orWhere('job_number', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%")
                    ->orWhereHas('warehouse', fn ($wq) => $wq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('requestMaterial', fn ($rmq) => $rmq->where('request_number', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->query('status')) {
            if (strtolower($status) !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($warehouseId = $request->query('warehouse_id')) {
            if (is_numeric($warehouseId)) {
                $query->where('warehouses_id', (int) $warehouseId);
            }
        }

        if ($from = $request->query('date_from')) {
            $query->whereDate('return_date', '>=', $from);
        }

        if ($to = $request->query('date_to')) {
            $query->whereDate('return_date', '<=', $to);
        }

        $perPage = min(max((int) $request->query('per_page', 100), 1), 500);
        $paginated = $query->paginate($perPage);
        $rows = $paginated->getCollection()->map(fn (TransferStockReturn $row) => $this->transform($row));

        return response()->json([
            'status' => 'success',
            'data' => $rows,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'warehouses_id' => 'required|integer|exists:warehouses,id',
            'request_material_id' => 'required|integer|exists:request_material,id',
            'production_code' => 'nullable|string|max:100',
            'job_number_id' => 'nullable|integer|exists:job_number,id',
            'job_number' => 'nullable|string|max:100',
            'return_date' => 'nullable|date',
            'note' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.items_id' => 'required|integer|exists:items,id',
            'items.*.quantity' => 'required|numeric|gt:0',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.source_location' => 'nullable|string|max:150',
            'items.*.destination_location' => 'nullable|string|max:150',
            'items.*.remark' => 'nullable|string|max:255',
        ]);

        $rm = RequestMaterial::with(['items.item', 'destinationLocation'])->findOrFail($validated['request_material_id']);
        $this->validateReturnAgainstRequestMaterial($rm, $validated['items']);

        $record = DB::transaction(function () use ($validated, $actorId, $rm) {
            $returnDate = ! empty($validated['return_date'])
                ? Carbon::parse($validated['return_date'])
                : now();

            $returnNumber = DocumentNumberGenerator::generateTransferReturnNumber($returnDate);

            $tsr = TransferStockReturn::create([
                'return_number' => $returnNumber,
                'production_code' => $validated['production_code'] ?? $rm->request_number,
                'request_material_id' => $rm->id,
                'warehouses_id' => (int) $validated['warehouses_id'],
                'job_number_id' => $validated['job_number_id'] ?? $rm->job_number_id,
                'job_number' => $validated['job_number'] ?? $rm->job_number,
                'return_date' => $returnDate->format('Y-m-d'),
                'note' => $validated['note'] ?? null,
                'status' => 'Waiting for Approve 1',
                'creator_id' => $actorId,
                'updated_by' => $actorId,
            ]);

            foreach ($validated['items'] as $itemData) {
                $item = Item::with('unit')->find($itemData['items_id']);
                TransferStockReturnItem::create([
                    'transfer_stock_return_id' => $tsr->id,
                    'items_id' => (int) $itemData['items_id'],
                    'quantity' => (float) $itemData['quantity'],
                    'unit' => $itemData['unit'] ?? $item?->unit?->name ?? 'PCE',
                    'source_location' => $itemData['source_location'] ?? ($rm->destinationLocation?->name ?? 'Production Floor'),
                    'destination_location' => $itemData['destination_location'] ?? $tsr->warehouse?->name,
                    'remark' => $itemData['remark'] ?? null,
                ]);
            }

            AuditLogger::logAction(
                action: 'CREATED_TRANSFER_STOCK_RETURN',
                modelName: 'TransferStockReturn',
                modelId: $tsr->id,
                before: null,
                after: ['return_number' => $tsr->return_number, 'items_count' => count($validated['items'])],
                userId: $actorId,
                notes: "Created Transfer Stock Return {$tsr->return_number}"
            );

            return $tsr->load([
                'warehouse',
                'requestMaterial.destinationLocation',
                'jobNumberModel',
                'creatorUser',
                'updatedByUser',
                'items.item.unit',
            ]);
        });

        SystemContextApiController::forgetContextCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Transfer Stock Return created successfully.',
            'data' => $this->transform($record),
        ], 201);
    }

    public function show(string $code): JsonResponse
    {
        $record = $this->findByCodeOrId($code);

        return response()->json([
            'status' => 'success',
            'data' => $this->transform($record),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $tsr = TransferStockReturn::findOrFail($id);

        if ($tsr->status === 'Approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'Approved Transfer Stock Return cannot be edited.',
            ], 422);
        }

        $validated = $request->validate([
            'warehouses_id' => 'sometimes|integer|exists:warehouses,id',
            'request_material_id' => 'nullable|integer|exists:request_material,id',
            'production_code' => 'nullable|string|max:100',
            'job_number_id' => 'nullable|integer|exists:job_number,id',
            'job_number' => 'nullable|string|max:100',
            'return_date' => 'nullable|date',
            'note' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.items_id' => 'required_with:items|integer|exists:items,id',
            'items.*.quantity' => 'required_with:items|numeric|gt:0',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.source_location' => 'nullable|string|max:150',
            'items.*.destination_location' => 'nullable|string|max:150',
            'items.*.remark' => 'nullable|string|max:255',
        ]);

        $targetRmId = array_key_exists('request_material_id', $validated)
            ? $validated['request_material_id']
            : $tsr->request_material_id;

        if (! $targetRmId) {
            throw ValidationException::withMessages([
                'request_material_id' => ['Transfer Stock Return must reference an Approved Request Material.'],
            ]);
        }

        $rm = RequestMaterial::with(['items.item'])->findOrFail($targetRmId);
        $itemsToCheck = $validated['items'] ?? $tsr->items()->get()->map(fn ($line) => [
            'items_id' => $line->items_id,
            'quantity' => $line->quantity,
        ])->all();
        $this->validateReturnAgainstRequestMaterial($rm, $itemsToCheck, $tsr->id);

        DB::transaction(function () use ($tsr, $validated, $actorId, $targetRmId) {
            $tsr->update([
                'warehouses_id' => $validated['warehouses_id'] ?? $tsr->warehouses_id,
                'request_material_id' => $targetRmId,
                'production_code' => array_key_exists('production_code', $validated) ? $validated['production_code'] : $tsr->production_code,
                'job_number_id' => array_key_exists('job_number_id', $validated) ? $validated['job_number_id'] : $tsr->job_number_id,
                'job_number' => array_key_exists('job_number', $validated) ? $validated['job_number'] : $tsr->job_number,
                'return_date' => ! empty($validated['return_date']) ? Carbon::parse($validated['return_date'])->format('Y-m-d') : $tsr->return_date,
                'note' => array_key_exists('note', $validated) ? $validated['note'] : $tsr->note,
                'updated_by' => $actorId,
            ]);

            if (! empty($validated['items'])) {
                $tsr->items()->delete();
                foreach ($validated['items'] as $itemData) {
                    $item = Item::with('unit')->find($itemData['items_id']);
                    TransferStockReturnItem::create([
                        'transfer_stock_return_id' => $tsr->id,
                        'items_id' => (int) $itemData['items_id'],
                        'quantity' => (float) $itemData['quantity'],
                        'unit' => $itemData['unit'] ?? $item?->unit?->name ?? 'PCE',
                        'source_location' => $itemData['source_location'] ?? 'Production Floor',
                        'destination_location' => $itemData['destination_location'] ?? $tsr->warehouse?->name,
                        'remark' => $itemData['remark'] ?? null,
                    ]);
                }
            }
        });

        $tsr = $this->findByCodeOrId((string) $tsr->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Transfer Stock Return updated successfully.',
            'data' => $this->transform($tsr),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $tsr = TransferStockReturn::findOrFail($id);

        if ($tsr->status === 'Approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'Approved Transfer Stock Return cannot be deleted.',
            ], 422);
        }

        DB::transaction(function () use ($tsr, $actorId) {
            $num = $tsr->return_number;
            $tsr->items()->delete();
            $tsr->delete();
            AuditLogger::logAction(
                action: 'DELETED_TRANSFER_STOCK_RETURN',
                modelName: 'TransferStockReturn',
                modelId: $tsr->id,
                before: ['return_number' => $num],
                after: null,
                userId: $actorId,
                notes: "Deleted Transfer Stock Return {$num}"
            );
        });

        SystemContextApiController::forgetContextCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Transfer Stock Return deleted successfully.',
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $user = User::findOrFail($actorId);
        $tsr = TransferStockReturn::with(['items.item', 'warehouse'])->findOrFail($id);

        if (in_array($tsr->status, ['Approved', 'Approved 2'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Transfer Stock Return is already Approved.',
            ], 422);
        }

        if ($tsr->status === 'Rejected') {
            return response()->json([
                'status' => 'error',
                'message' => 'Rejected Transfer Stock Return cannot be approved directly.',
            ], 422);
        }

        $previousStatus = $tsr->status ?: 'Waiting for Approve 1';
        $requestedTier = (int) $request->input('tier', 0);
        $note = $request->input('note');

        if (in_array($previousStatus, ['Draft', 'Waiting for Approve 1'], true)) {
            if ($requestedTier === 2) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Stage 2 approval can only be performed after Stage 1 approval is completed.',
                ], 422);
            }
            $approvedTier = 1;
            $newStatus = 'Waiting for Approve 2';
        } elseif (in_array($previousStatus, ['Waiting for Approve 2', 'Approved 1'], true)) {
            if ($requestedTier === 1) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Stage 1 approval has already been completed.',
                ], 422);
            }
            $approvedTier = 2;
            $newStatus = 'Approved';
        } else {
            return response()->json([
                'status' => 'error',
                'message' => "Transfer Stock Return status '{$previousStatus}' is not valid for approval.",
            ], 422);
        }

        $permKey = "tsr.approve_{$approvedTier}";
        $hasPerm = $user->isSuperAdmin()
            || $user->isAdmin()
            || $user->hasPermission($permKey)
            || $user->hasPermission('tsr.approve')
            || $user->hasPermission('tsr.*')
            || ($approvedTier === 1 && $user->hasRole(['approver_tier1', 'approver', 'manager']))
            || ($approvedTier === 2 && $user->hasRole(['approver_tier2', 'approver', 'director']));

        if (! $hasPerm) {
            return response()->json([
                'status' => 'error',
                'message' => "User does not have permission '{$permKey}' to approve Transfer Stock Return Stage {$approvedTier}.",
            ], 403);
        }

        DB::transaction(function () use ($tsr, $actorId, $approvedTier, $newStatus, $note) {
            $lockedTsr = TransferStockReturn::with(['items.item', 'warehouse'])->lockForUpdate()->findOrFail($tsr->id);
            $lockedPrevious = $lockedTsr->status ?: 'Waiting for Approve 1';

            if (! $lockedTsr->request_material_id) {
                throw ValidationException::withMessages([
                    'request_material_id' => ['Transfer Stock Return must reference an Approved Request Material before approval.'],
                ]);
            }

            $rm = RequestMaterial::with(['items.item'])->find($lockedTsr->request_material_id);
            if (! $rm) {
                throw ValidationException::withMessages([
                    'request_material_id' => ['Referenced Request Material could not be found.'],
                ]);
            }

            $this->validateReturnAgainstRequestMaterial(
                $rm,
                $lockedTsr->items->map(fn ($line) => [
                    'items_id' => $line->items_id,
                    'quantity' => $line->quantity,
                ])->all(),
                $lockedTsr->id
            );

            $lockedTsr->update([
                'status' => $newStatus,
                'updated_by' => $actorId,
            ]);

            if ($newStatus === 'Approved') {
                foreach ($lockedTsr->items as $line) {
                    if ($line->item) {
                        $this->inventoryService->recordStockMovement(
                            item: $line->item,
                            warehouseId: $lockedTsr->warehouses_id,
                            movementType: 'IN',
                            quantity: (float) $line->quantity,
                            referenceType: 'TRANSFER_STOCK_RETURN',
                            referenceNumber: $lockedTsr->return_number,
                            userId: $actorId,
                            notes: "Transfer Stock Return Receipt ({$lockedTsr->return_number})"
                        );
                    }
                }
            }

            ApprovalHistory::create([
                'document_type' => 'TRANSFER_STOCK_RETURN',
                'document_id' => $lockedTsr->id,
                'document_number' => $lockedTsr->return_number,
                'action' => $approvedTier === 2 ? 'APPROVE_2' : 'APPROVE_1',
                'tier' => $approvedTier,
                'user_id' => $actorId,
                'note' => $note,
                'from_status' => $lockedPrevious,
                'to_status' => $newStatus,
            ]);
        });

        $tsr->refresh();
        SystemContextApiController::forgetContextCache();

        return response()->json([
            'status' => 'success',
            'message' => "Transfer Stock Return {$tsr->return_number} updated to '{$tsr->status}'.",
            'data' => $this->transform($this->findByCodeOrId((string) $tsr->id)),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $user = User::findOrFail($actorId);
        $tier = (int) $request->input('tier', 1);

        $hasPerm = $user->isSuperAdmin()
            || $user->isAdmin()
            || $user->hasPermission('tsr.reject')
            || $user->hasPermission('tsr.approve_1')
            || $user->hasPermission('tsr.approve_2')
            || $user->hasPermission('tsr.approve')
            || $user->hasPermission('tsr.*')
            || ($tier === 1 && $user->hasRole(['approver_tier1', 'approver', 'manager']))
            || ($tier === 2 && $user->hasRole(['approver_tier2', 'approver', 'director']));

        if (! $hasPerm) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden: Insufficient approval authority to reject Transfer Stock Return.',
            ], 403);
        }

        $note = trim((string) ($request->input('reason') ?? $request->input('note') ?? ''));

        $tsr = DB::transaction(function () use ($id, $actorId, $tier, $note) {
            $lockedTsr = TransferStockReturn::query()->lockForUpdate()->findOrFail($id);

            if (in_array($lockedTsr->status, ['Approved', 'Approved 2'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Approved Transfer Stock Return cannot be rejected.'],
                ]);
            }
            if ($lockedTsr->status === 'Rejected') {
                throw ValidationException::withMessages([
                    'status' => ['Transfer Stock Return is already Rejected.'],
                ]);
            }

            $previous = $lockedTsr->status ?: 'Waiting for Approve 1';
            $lockedTsr->update([
                'status' => 'Rejected',
                'note' => $note !== '' ? $note : $lockedTsr->note,
                'updated_by' => $actorId,
            ]);

            ApprovalHistory::create([
                'document_type' => 'TRANSFER_STOCK_RETURN',
                'document_id' => $lockedTsr->id,
                'document_number' => $lockedTsr->return_number,
                'action' => 'REJECT',
                'tier' => $tier,
                'user_id' => $actorId,
                'note' => $note,
                'from_status' => $previous,
                'to_status' => 'Rejected',
            ]);

            return $lockedTsr->fresh();
        });

        SystemContextApiController::forgetContextCache();

        return response()->json([
            'status' => 'success',
            'message' => "Transfer Stock Return {$tsr->return_number} rejected.",
            'data' => $this->transform($this->findByCodeOrId((string) $tsr->id)),
        ]);
    }

    /**
     * Source items available for return from Approved Request Materials.
     * GET /api/warehouse/transfer-stock-returns/available-sources
     */
    public function availableSourceItems(Request $request): JsonResponse
    {
        $rmList = RequestMaterial::with(['items.item.unit', 'warehouse', 'destinationLocation', 'department', 'jobNumberModel'])
            ->whereIn('status', ['Approved', 'Approved 2'])
            ->orderByDesc('id')
            ->get();

        $alreadyReturned = DB::table('transfer_stock_return_items as tsri')
            ->join('transfer_stock_returns as tsr', 'tsri.transfer_stock_return_id', '=', 'tsr.id')
            ->where('tsr.status', '!=', 'Rejected')
            ->select('tsr.request_material_id', 'tsri.items_id', DB::raw('SUM(tsri.quantity) as total_ret'))
            ->groupBy('tsr.request_material_id', 'tsri.items_id')
            ->get()
            ->keyBy(fn ($r) => "{$r->request_material_id}_{$r->items_id}");

        $sources = $rmList->map(function (RequestMaterial $rm) use ($alreadyReturned) {
            $items = $rm->items->map(function ($line) use ($rm, $alreadyReturned) {
                $key = "{$rm->id}_{$line->items_id}";
                $returnedQty = (float) ($alreadyReturned[$key]->total_ret ?? 0);
                $issuedQty = (float) $line->request;
                $remaining = max(0.0, $issuedQty - $returnedQty);

                return [
                    'items_id' => $line->items_id,
                    'itemCode' => $line->item?->code ?? '',
                    'itemName' => $line->item?->name ?? '',
                    'unit' => $line->item?->unit?->name ?? 'PCE',
                    'issuedQty' => $issuedQty,
                    'returnedQty' => $returnedQty,
                    'remainingReturnableQty' => $remaining,
                    'sourceLocation' => $rm->destinationLocation?->name ?? 'Production Floor',
                    'remark' => $line->remark ?? '',
                ];
            })->filter(fn ($i) => $i['remainingReturnableQty'] > 0)->values();

            return [
                'id' => $rm->id,
                'requestNumber' => $rm->request_number,
                'requestDate' => $rm->request_date,
                'warehouses_id' => $rm->warehouses_id,
                'warehouseName' => $rm->warehouse?->name ?? '',
                'department' => $rm->department?->name ?? '',
                'destinationLocation' => $rm->destinationLocation?->name ?? '',
                'job_number_id' => $rm->job_number_id,
                'jobNumber' => $rm->jobNumberModel?->name ?? $rm->job_number ?? '',
                'items' => $items,
            ];
        })->filter(fn ($s) => $s['items']->isNotEmpty())->values();

        return response()->json([
            'status' => 'success',
            'data' => $sources,
        ]);
    }

    /**
     * Enforce that every returned item originates from an Approved Request Material
     * and does not exceed its remaining returnable quantity.
     */
    private function validateReturnAgainstRequestMaterial(RequestMaterial $rm, array $submittedItems, ?int $excludeTsrId = null): void
    {
        if (! in_array($rm->status, ['Approved', 'Approved 2'], true)) {
            throw ValidationException::withMessages([
                'request_material_id' => ["Request Material '{$rm->request_number}' must be fully Approved before items can be returned."],
            ]);
        }

        $issuedByItem = [];
        foreach ($rm->items as $rmLine) {
            $issuedQty = (float) ($rmLine->request ?? 0);
            if ($issuedQty > 0) {
                $issuedByItem[$rmLine->items_id] = ($issuedByItem[$rmLine->items_id] ?? 0.0) + $issuedQty;
            }
        }

        if (empty($issuedByItem)) {
            throw ValidationException::withMessages([
                'request_material_id' => ["Request Material '{$rm->request_number}' has no issued items eligible for return."],
            ]);
        }

        $alreadyReturnedByItem = DB::table('transfer_stock_return_items as tsri')
            ->join('transfer_stock_returns as tsr', 'tsri.transfer_stock_return_id', '=', 'tsr.id')
            ->where('tsr.request_material_id', $rm->id)
            ->where('tsr.status', '!=', 'Rejected')
            ->when($excludeTsrId !== null, fn ($q) => $q->where('tsr.id', '!=', $excludeTsrId))
            ->groupBy('tsri.items_id')
            ->select('tsri.items_id', DB::raw('SUM(tsri.quantity) as total_ret'))
            ->pluck('total_ret', 'items_id');

        $requestedByItem = [];
        foreach ($submittedItems as $line) {
            $itemId = (int) ($line['items_id'] ?? 0);
            $qty = (float) ($line['quantity'] ?? 0);
            $requestedByItem[$itemId] = ($requestedByItem[$itemId] ?? 0.0) + $qty;
        }

        foreach ($requestedByItem as $itemId => $returnQty) {
            if (! array_key_exists($itemId, $issuedByItem)) {
                $itemModel = Item::find($itemId);
                $label = $itemModel ? trim("{$itemModel->code} - {$itemModel->name}") : "Item #{$itemId}";
                throw ValidationException::withMessages([
                    'items' => ["Item '{$label}' does not belong to Approved Request Material '{$rm->request_number}' and cannot be returned."],
                ]);
            }

            $issuedQty = $issuedByItem[$itemId];
            $returnedBefore = (float) ($alreadyReturnedByItem[$itemId] ?? 0.0);
            $remaining = max(0.0, $issuedQty - $returnedBefore);

            if ($returnQty - 1e-6 > $remaining) {
                $itemModel = Item::find($itemId);
                $label = $itemModel ? trim("{$itemModel->code} - {$itemModel->name}") : "Item #{$itemId}";
                throw ValidationException::withMessages([
                    'items' => [
                        "Return quantity for '{$label}' (" . number_format($returnQty, 2, '.', '')
                        . ") exceeds remaining returnable quantity (" . number_format($remaining, 2, '.', '')
                        . ") from '{$rm->request_number}'.",
                    ],
                ]);
            }
        }
    }

    private function findByCodeOrId(string $code): TransferStockReturn
    {
        $relations = [
            'warehouse',
            'requestMaterial.destinationLocation',
            'requestMaterial.department',
            'jobNumberModel',
            'creatorUser',
            'updatedByUser',
            'items.item.unit',
        ];

        if (is_numeric($code)) {
            return TransferStockReturn::with($relations)->findOrFail((int) $code);
        }

        $clean = preg_replace('/[^A-Za-z0-9]/', '', $code);

        return TransferStockReturn::with($relations)
            ->where('return_number', $code)
            ->orWhereRaw("REPLACE(REPLACE(return_number, '/', ''), '-', '') = ?", [$clean])
            ->firstOrFail();
    }

    private function transform(TransferStockReturn $row): array
    {
        $totalQty = $row->items->sum('quantity');

        return [
            'id' => $row->return_number,
            'rawId' => $row->id,
            'returnNumber' => $row->return_number,
            'productionCode' => $row->production_code ?: ($row->requestMaterial?->request_number ?? ''),
            'requestMaterialId' => $row->request_material_id,
            'requestMaterialNumber' => $row->requestMaterial?->request_number ?? '',
            'warehouseId' => $row->warehouses_id,
            'warehouse' => $row->warehouse?->name ?? '',
            'jobNumberId' => $row->job_number_id,
            'jobNumber' => $row->jobNumberModel?->name ?? $row->job_number ?? '',
            'returnDate' => $row->return_date?->format('Y-m-d') ?? '',
            'returnDateFormatted' => $row->return_date?->format('d M Y') ?? '',
            'note' => $row->note ?? '',
            'status' => $row->status ?? 'Waiting for Approve 1',
            'createdBy' => $row->creatorUser?->name ?? '',
            'updatedBy' => $row->updatedByUser?->name ?? '',
            'totalQty' => (float) $totalQty,
            'itemCount' => $row->items->count(),
            'createdAt' => $row->created_at?->format('Y-m-d H:i:s'),
            'updatedAt' => $row->updated_at?->format('Y-m-d H:i:s'),
            'items' => $row->items->map(fn (TransferStockReturnItem $line, int $idx) => [
                'id' => (string) $line->id,
                'no' => $idx + 1,
                'items_id' => $line->items_id,
                'itemCode' => $line->item?->code ?? '',
                'itemName' => $line->item?->name ?? '',
                'quantity' => (float) $line->quantity,
                'unit' => $line->unit ?: ($line->item?->unit?->name ?? 'PCE'),
                'sourceLocation' => $line->source_location ?: ($row->requestMaterial?->destinationLocation?->name ?? ''),
                'destinationLocation' => $line->destination_location ?: ($row->warehouse?->name ?? ''),
                'remark' => $line->remark ?? '',
            ])->values()->all(),
        ];
    }
}

