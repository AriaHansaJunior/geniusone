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
     * Aggregate total stock per item from item_warehouse pivot or warehouse_stocks.
     *
     * @return array<int|string, float|int|string>
     */
    public function getItemStockTotals(): array
    {
        if (Schema::hasTable('item_warehouse')) {
            $pivotTotals = DB::table('item_warehouse')
                ->select('items_id', DB::raw('SUM(quantity) as total_qty'))
                ->groupBy('items_id')
                ->pluck('total_qty', 'items_id')
                ->toArray();

            if (! empty($pivotTotals)) {
                return $pivotTotals;
            }
        }

        if (Schema::hasTable('warehouse_stocks')) {
            return DB::table('warehouse_stocks')
                ->select('items_id', DB::raw('SUM(quantity) as total_qty'))
                ->groupBy('items_id')
                ->pluck('total_qty', 'items_id')
                ->toArray();
        }

        return [];
    }

    /**
     * Resolve stock quantity for an item in a specific warehouse from warehouse_stocks or item_warehouse.
     */
    public function getWarehouseStockBalance(int $itemId, int $warehouseId): float
    {
        if (Schema::hasTable('warehouse_stocks')) {
            $wsRow = DB::table('warehouse_stocks')
                ->where('items_id', $itemId)
                ->where('warehouses_id', $warehouseId)
                ->selectRaw('COUNT(*) as cnt, COALESCE(SUM(quantity), 0) as qty')
                ->first();
            if ($wsRow && (int) $wsRow->cnt > 0) {
                return (float) $wsRow->qty;
            }
        }

        if (Schema::hasTable('item_warehouse')) {
            $pivotQty = DB::table('item_warehouse')
                ->where('items_id', $itemId)
                ->where('warehouses_id', $warehouseId)
                ->value('quantity');
            if ($pivotQty !== null) {
                return (float) $pivotQty;
            }
        }

        return 0.0;
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
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Stock movement quantity must be greater than zero.');
        }

        $type = strtoupper($movementType) === 'OUT' ? 'OUT' : 'IN';
        $delta = $type === 'OUT' ? -$quantity : $quantity;
        $reason = $notes ?? "{$referenceType} ({$referenceNumber})";

        return DB::transaction(function () use (
            $item,
            $warehouseId,
            $type,
            $quantity,
            $delta,
            $referenceType,
            $referenceNumber,
            $userId,
            $reason,
            $coordinateId,
            $coordinateName
        ) {
            $warehouseBalanceBefore = (float) $item->stock;

            if ($warehouseId && Schema::hasTable('warehouse_stocks')) {
                $stockQuery = DB::table('warehouse_stocks')
                    ->where('items_id', $item->id)
                    ->where('warehouses_id', $warehouseId)
                    ->orderBy('id')
                    ->lockForUpdate();

                if ($coordinateId) {
                    $stockQuery->where('warehouse_coordinates_id', $coordinateId);
                }

                $stocks = $stockQuery->get();

                // Bootstrap warehouse_stocks from item_warehouse pivot if only pivot existed beforehand
                if ($stocks->isEmpty() && Schema::hasTable('item_warehouse')) {
                    $pivotQty = DB::table('item_warehouse')
                        ->where('items_id', $item->id)
                        ->where('warehouses_id', $warehouseId)
                        ->value('quantity');
                    if ($pivotQty !== null && (float) $pivotQty > 0) {
                        DB::table('warehouse_stocks')->insert([
                            'items_id' => $item->id,
                            'warehouses_id' => $warehouseId,
                            'warehouse_coordinates_id' => $coordinateId,
                            'coordinate_name' => $coordinateName,
                            'quantity' => (float) $pivotQty,
                            'available_quantity' => (float) $pivotQty,
                            'allocated_quantity' => 0,
                            'location_type' => 'Warehouse',
                            'last_movement_date' => now(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        $stocks = $stockQuery->get();
                    }
                }

                $warehouseBalanceBefore = (float) $stocks->sum('quantity');

                if ($type === 'OUT') {
                    $available = (float) $stocks->sum(
                        static fn ($stock) => max(0.0, (float) $stock->quantity - (float) $stock->allocated_quantity)
                    );
                    if ($available < $quantity) {
                        throw new InvalidArgumentException(
                            "Insufficient stock in warehouse #{$warehouseId} for item '{$item->name}'. ".
                            "Available: {$available}, Requested: {$quantity}."
                        );
                    }

                    $remaining = $quantity;
                    foreach ($stocks as $stock) {
                        if ($remaining <= 0) {
                            break;
                        }

                        $stockAvailable = max(
                            0.0,
                            (float) $stock->quantity - (float) $stock->allocated_quantity
                        );
                        $deduction = min($remaining, $stockAvailable);
                        if ($deduction <= 0) {
                            continue;
                        }

                        $newQuantity = (float) $stock->quantity - $deduction;
                        DB::table('warehouse_stocks')->where('id', $stock->id)->update([
                            'quantity' => $newQuantity,
                            'available_quantity' => $newQuantity - (float) $stock->allocated_quantity,
                            'last_movement_date' => now(),
                            'updated_at' => now(),
                        ]);
                        $remaining -= $deduction;
                    }
                } else {
                    $stock = $stocks->first();
                    if ($stock) {
                        $newQuantity = (float) $stock->quantity + $quantity;
                        DB::table('warehouse_stocks')->where('id', $stock->id)->update([
                            'quantity' => $newQuantity,
                            'available_quantity' => $newQuantity - (float) $stock->allocated_quantity,
                            'last_movement_date' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        $resolvedCoord = null;
                        if ((! $coordinateId || ! $coordinateName) && Schema::hasTable('warehouse_coordinates')) {
                            $coordinateQuery = DB::table('warehouse_coordinates')->where('warehouses_id', $warehouseId);
                            if ($coordinateId) {
                                $coordinateQuery->where('id', $coordinateId);
                            }
                            $resolvedCoord = $coordinateQuery->orderBy('id')->first(['id', 'name']);
                        }

                        DB::table('warehouse_stocks')->insert([
                            'items_id' => $item->id,
                            'warehouses_id' => $warehouseId,
                            'warehouse_coordinates_id' => $coordinateId ?? $resolvedCoord?->id,
                            'coordinate_name' => $coordinateName ?? $resolvedCoord?->name,
                            'quantity' => $quantity,
                            'available_quantity' => $quantity,
                            'allocated_quantity' => 0,
                            'location_type' => 'Warehouse',
                            'last_movement_date' => now(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }

                $warehouseBalanceAfter = (float) DB::table('warehouse_stocks')
                    ->where('items_id', $item->id)
                    ->where('warehouses_id', $warehouseId)
                    ->sum('quantity');

                if (Schema::hasTable('item_warehouse')) {
                    DB::table('item_warehouse')->updateOrInsert(
                        ['items_id' => $item->id, 'warehouses_id' => $warehouseId],
                        ['quantity' => $warehouseBalanceAfter, 'updated_at' => now(), 'created_at' => now()]
                    );
                }
            } else {
                $warehouseBalanceAfter = $warehouseBalanceBefore + $delta;
            }

            if ($warehouseId && Schema::hasTable('item_warehouse')) {
                $lockedItem = Item::lockForUpdate()->findOrFail($item->id);
                $previousGlobalStock = (float) $lockedItem->stock;
                $syncedGlobalStock = (float) DB::table('item_warehouse')
                    ->where('items_id', $item->id)
                    ->sum('quantity');

                $lockedItem->update(array_filter([
                    'stock' => $syncedGlobalStock,
                    'updated_by' => $userId ?? Auth::id(),
                ], static fn ($value) => $value !== null));

                AuditLogger::logAction(
                    action: 'STOCK_ADJUSTMENT',
                    modelName: 'Item',
                    modelId: $lockedItem->id,
                    before: ['stock' => $previousGlobalStock, 'warehouse_balance' => $warehouseBalanceBefore],
                    after: ['stock' => $syncedGlobalStock, 'warehouse_balance' => $warehouseBalanceAfter, 'delta' => $delta, 'reason' => $reason],
                    userId: $userId ?? Auth::id(),
                    notes: "Stock synced for item {$lockedItem->code}: {$reason}",
                    extra: [
                        'warehouse_id' => $warehouseId,
                        'coordinate_id' => $coordinateId,
                        'movement_type' => $type,
                        'reference_type' => $referenceType,
                        'reference_number' => $referenceNumber,
                    ]
                );

                $updatedItem = $lockedItem->fresh();
            } else {
                $updatedItem = $this->adjustStock(
                    itemId: $item->id,
                    quantityDelta: $delta,
                    reason: $reason,
                    userId: $userId,
                    extraMetadata: [
                        'warehouse_id' => $warehouseId,
                        'coordinate_id' => $coordinateId,
                        'movement_type' => $type,
                        'reference_type' => $referenceType,
                        'reference_number' => $referenceNumber,
                    ]
                );
            }

            if (Schema::hasTable('inventory_movements')) {
                DB::table('inventory_movements')->insert([
                    'items_id' => $item->id,
                    'warehouses_id' => $warehouseId,
                    'warehouse_coordinates_id' => $coordinateId,
                    'users_id' => $userId ?? Auth::id(),
                    'movement_type' => $type,
                    'quantity' => $quantity,
                    'balance_before' => $warehouseBalanceBefore,
                    'balance_after' => $warehouseBalanceAfter,
                    'reference_type' => $referenceType,
                    'reference_number' => $referenceNumber,
                    'notes' => $reason,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $updatedItem;
        });
    }
}
