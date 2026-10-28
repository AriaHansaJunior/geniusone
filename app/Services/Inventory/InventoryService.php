<?php

namespace App\Services\Inventory;

use App\Models\Master\Material\Item;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
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
        int $userId = 1,
        array $extraMetadata = []
    ): Item {
        return DB::transaction(function () use ($itemId, $quantityDelta, $reason, $userId) {
            $item = Item::lockForUpdate()->findOrFail($itemId);
            $previousStock = (float) $item->stock;
            $newStock = $previousStock + $quantityDelta;

            if ($newStock < 0) {
                throw new InvalidArgumentException(
                    "Insufficient stock for item '{$item->name}' (Code: {$item->code}). ".
                    "Current: {$previousStock}, Requested delta: {$quantityDelta}."
                );
            }

            $item->update([
                'stock' => $newStock,
                'updated_by' => $userId,
            ]);

            AuditLogger::logAction(
                action: 'STOCK_ADJUSTMENT',
                modelName: 'Item',
                modelId: $item->id,
                before: ['stock' => $previousStock],
                after: ['stock' => $newStock, 'delta' => $quantityDelta, 'reason' => $reason],
                userId: $userId,
                notes: "Stock adjusted for item {$item->code}: {$reason}"
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
        int $userId = 1,
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
        int $userId = 1
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
}
