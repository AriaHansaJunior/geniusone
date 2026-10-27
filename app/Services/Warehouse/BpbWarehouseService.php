<?php

namespace App\Services\Warehouse;

use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\InboundStorage\PoRnToBpb;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Master\Material\Item;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\Inventory\InventoryService;
use App\Services\AuditLogger;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class BpbWarehouseService
{
    protected InventoryService $inventoryService;

    public function __construct(?InventoryService $inventoryService = null)
    {
        $this->inventoryService = $inventoryService ?? new InventoryService();
    }

    /**
     * Create a new BPB (Bukti Penerimaan Barang) and allocate incoming stock to warehouses.
     *
     * @param array $headerData ['receive_date', 'note', 'bpb_number']
     * @param array $mappings Array of ['po_has_rn_id', 'warehouses_id', 'item_id' => optional]
     * @param int $userId
     * @param bool $autoUpdateStock Whether to automatically increment physical item stock (default false for BE-05 workflow)
     * @return BpbReceiveMaterial
     */
    public function createBpb(
        array $headerData,
        array $mappings,
        int $userId = 1,
        bool $autoUpdateStock = false
    ): BpbReceiveMaterial {
        if (empty($mappings)) {
            throw new InvalidArgumentException("A BPB must contain at least one warehouse item allocation.");
        }

        // BE-05: Strict Downstream Gating (RN must be Approved before warehouse allocation)
        foreach ($mappings as $map) {
            $poRnId = $map['po_has_rn_id'] ?? null;
            if ($poRnId) {
                $poRn = PurchaseOrderReceiveNote::with('receiveNote')->find($poRnId);
                if ($poRn && $poRn->receiveNote && !in_array($poRn->receiveNote->status, ['Approved', 'Approved 2'], true)) {
                    throw new InvalidArgumentException("Cannot create BPB: Referenced Receive Note '{$poRn->receiveNote->rn_number}' must be fully Approved first (Current status: {$poRn->receiveNote->status}).");
                }
            }
        }

        return DB::transaction(function () use ($headerData, $mappings, $userId, $autoUpdateStock) {
            $bpbNumber = $headerData['bpb_number'] ?? DocumentNumberGenerator::generateBpbNumber();

            $bpb = BpbReceiveMaterial::create([
                'bpb_number' => $bpbNumber,
                'status' => $headerData['status'] ?? 'Waiting for Approve 1',
                'note' => $headerData['note'] ?? null,
                'receive_date' => $headerData['receive_date'] ?? now(),
                'creator_id' => $userId,
                'updated_by' => $userId,
            ]);

            foreach ($mappings as $map) {
                if (empty($map['warehouses_id'])) {
                    throw new InvalidArgumentException("Each BPB allocation item must specify a destination warehouse.");
                }

                $poRnId = $map['po_has_rn_id'] ?? null;

                $mappingRecord = PoRnToBpb::create([
                    'po_has_rn_id' => $poRnId,
                    'bpb_receive_material_id' => $bpb->id,
                    'warehouses_id' => $map['warehouses_id'],
                ]);

                // Update physical stock if enabled
                if ($autoUpdateStock && $poRnId) {
                    $poRn = PurchaseOrderReceiveNote::find($poRnId);
                    if ($poRn) {
                        $netQuantity = (float) $poRn->quantity - (float) $poRn->rafaksi;

                        // Resolve Item model: by explicit item_id or by matching name/job
                        $itemId = $map['item_id'] ?? null;
                        if (!$itemId && !empty($poRn->item_name)) {
                            $foundItem = Item::where('name', $poRn->item_name)->first();
                            $itemId = $foundItem?->id;
                        }

                        if ($itemId && $netQuantity > 0) {
                            $this->inventoryService->recordInboundStock(
                                itemId: $itemId,
                                quantity: $netQuantity,
                                referenceDoc: $bpbNumber,
                                userId: $userId,
                                warehouseId: $map['warehouses_id']
                            );
                        }
                    }
                }
            }

            AuditLogger::logAction(
                action: 'CREATE',
                modelName: 'BpbReceiveMaterial',
                modelId: $bpb->id,
                before: null,
                after: $bpb->toArray(),
                userId: $userId,
                notes: "Created BPB {$bpbNumber} with " . count($mappings) . " warehouse allocations"
            );

            return $bpb->load([
                'creator',
                'mappings.warehouse',
                'mappings.purchaseOrderReceiveNote.receiveNote',
                'mappings.purchaseOrderReceiveNote.purchaseOrder',
            ]);
        });
    }

    /**
     * Find BPB by document number or ID.
     */
    public function findByCode(string $code): ?BpbReceiveMaterial
    {
        return BpbReceiveMaterial::with([
            'creator',
            'updatedByUser',
            'mappings.warehouse',
            'mappings.purchaseOrderReceiveNote.receiveNote.supplier',
            'mappings.purchaseOrderReceiveNote.purchaseOrder',
            'approvals.user',
        ])
        ->where('bpb_number', $code)
        ->orWhere('id', is_numeric($code) ? $code : null)
        ->first();
    }

    /**
     * List BPB documents with filtering and pagination.
     */
    public function listBpbs(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = BpbReceiveMaterial::with([
            'creator',
            'mappings.warehouse',
            'mappings.purchaseOrderReceiveNote.receiveNote',
            'approvals',
        ]);

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('bpb_number', 'like', "%{$s}%")
                  ->orWhere('note', 'like', "%{$s}%");
            });
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('receive_date', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('receive_date', '<=', $filters['date_to']);
        }

        $sortField = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        $query->orderBy($sortField, $sortOrder);

        return $query->paginate($perPage);
    }

    /**
     * Soft delete BPB document with audit tracking.
     */
    public function deleteBpb(int $id, int $userId = 1): bool
    {
        return DB::transaction(function () use ($id, $userId) {
            $bpb = BpbReceiveMaterial::findOrFail($id);

            // Cascade soft-delete mapping records
            $bpb->mappings()->delete();
            $deleted = $bpb->delete();

            AuditLogger::logAction(
                action: 'DELETE',
                modelName: 'BpbReceiveMaterial',
                modelId: $id,
                before: $bpb->toArray(),
                after: null,
                userId: $userId,
                notes: "Deleted BPB document {$bpb->bpb_number}"
            );

            return (bool) $deleted;
        });
    }
}
