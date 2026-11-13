<?php

namespace App\Services\Inventory;

use App\Models\Master\Material\Item;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

class InventoryService
{
    /**
     * Get real-time stock balance for an item.
     */
    public function getItemStock(int $itemId): float
    {
        $item = Item::findOrFail($itemId);

        return (float) $item->stock;
    }

    /**
     * Adjust physical item stock with full audit tracking.
     *
     * @param  float  $quantityDelta  Positive for addition, negative for deduction
     */
    public function adjustStock(
        int $itemId,
        float $quantityDelta,
        string $reason,
        ?int $userId = null,
        array $extraMetadata = []
    ): Item {
        $resolvedUserId = $userId ?? Auth::id();

        return DB::transaction(function () use ($itemId, $quantityDelta, $reason, $resolvedUserId, $extraMetadata) {
            $item = Item::lockForUpdate()->findOrFail($itemId);
            $previousStock = (float) $item->stock;
            $newStock = $previousStock + $quantityDelta;

            if ($newStock < 0) {
                throw new InvalidArgumentException(
                    "Insufficient stock for item '{$item->name}' (Code: {$item->code}). ".
                    "Current: {$previousStock}, Requested delta: {$quantityDelta}."
                );
            }

            $item->update(array_filter([
                'stock' => $newStock,
                'updated_by' => $resolvedUserId,
            ], static fn ($value) => $value !== null));

            AuditLogger::logAction(
                action: 'STOCK_ADJUSTMENT',
                modelName: 'Item',
                modelId: $item->id,
                before: ['stock' => $previousStock],
                after: ['stock' => $newStock, 'delta' => $quantityDelta, 'reason' => $reason],
                userId: $resolvedUserId,
                notes: "Stock adjusted for item {$item->code}: {$reason}",
                extra: $extraMetadata
            );

            return $item->fresh();
        });
    }

    /**
     * Inbound stock receipt (e.g. from BPB receipt).
     */
    public function recordInboundStock(
        int $itemId,
        float $quantity,
        string $referenceDoc,
        ?int $userId = null,
        ?int $warehouseId = null
    ): Item {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Inbound quantity must be greater than zero.');
        }

        return $this->adjustStock(
            itemId: $itemId,
            quantityDelta: $quantity,
            reason: "Material Inbound BPB Receipt ({$referenceDoc})".($warehouseId ? " to WH #{$warehouseId}" : ''),
            userId: $userId,
            extraMetadata: ['warehouse_id' => $warehouseId, 'document' => $referenceDoc]
        );
    }

    /**
     * Outbound stock deduction (e.g. material issue / dispatch).
     */
    public function recordOutboundStock(
        int $itemId,
        float $quantity,
        string $referenceDoc,
        ?int $userId = null
    ): Item {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Outbound quantity must be greater than zero.');
        }

        return $this->adjustStock(
            itemId: $itemId,
            quantityDelta: -$quantity,
            reason: "Material Outbound Issue ({$referenceDoc})",
            userId: $userId,
            extraMetadata: ['document' => $referenceDoc]
        );
    }

    /**
     * Unified stock movement handler used by DocumentApprovalWorkflowService.
     */
    public function recordStockMovement(
        Item $item,
        ?int $warehouseId,
        string $movementType,
        float $quantity,
        string $referenceType,
        string $referenceNumber,
        ?int $userId = null,
        ?string $notes = null,
        ?int $coordinateId = null,
        ?string $coordinateName = null
    ): Item {
        $delta = strtoupper($movementType) === 'OUT' ? -$quantity : $quantity;
        $reason = $notes ?? "{$referenceType} ({$referenceNumber})";

        if ($warehouseId && Schema::hasTable('warehouse_stocks')) {
            $wsQuery = DB::table('warehouse_stocks')
                ->where('items_id', $item->id)
                ->where('warehouses_id', $warehouseId);

            if ($coordinateId) {
                $wsQuery->where('warehouse_coordinates_id', $coordinateId);
            }

            $ws = $wsQuery->first() ?? DB::table('warehouse_stocks')
                ->where('items_id', $item->id)
                ->where('warehouses_id', $warehouseId)
                ->first();

            if ($ws) {
                $newQty = max(0.0, (float) $ws->quantity + $delta);
                DB::table('warehouse_stocks')->where('id', $ws->id)->update([
                    'quantity' => $newQty,
                    'available_quantity' => max(0.0, $newQty - (float) $ws->allocated_quantity),
                    'last_movement_date' => now(),
                    'updated_at' => now(),
                ]);
            } elseif ($delta > 0) {
                $resolvedCoord = null;
                if ((! $coordinateId || ! $coordinateName) && Schema::hasTable('warehouse_coordinates')) {
                    $coordQuery = DB::table('warehouse_coordinates')->where('warehouses_id', $warehouseId);
                    if ($coordinateId) {
                        $coordQuery->where('id', $coordinateId);
                    }
                    $resolvedCoord = $coordQuery->orderBy('id')->first(['id', 'name']);
                }

                $finalCoordinateId = $coordinateId ?? $resolvedCoord?->id;
                $finalCoordinateName = $coordinateName ?? $resolvedCoord?->name;

                DB::table('warehouse_stocks')->insert([
                    'items_id' => $item->id,
                    'warehouses_id' => $warehouseId,
                    'warehouse_coordinates_id' => $finalCoordinateId,
                    'coordinate_name' => $finalCoordinateName,
                    'quantity' => $delta,
                    'available_quantity' => $delta,
                    'allocated_quantity' => 0,
                    'location_type' => 'Warehouse',
                    'last_movement_date' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        return $this->adjustStock(
            itemId: $item->id,
            quantityDelta: $delta,
            reason: $reason,
            userId: $userId,
            extraMetadata: [
                'warehouse_id' => $warehouseId,
                'coordinate_id' => $coordinateId,
                'movement_type' => $movementType,
                'reference_type' => $referenceType,
                'reference_number' => $referenceNumber,
            ]
        );
    }
}
