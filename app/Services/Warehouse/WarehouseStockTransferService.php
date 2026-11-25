<?php

namespace App\Services\Warehouse;

use App\Http\Controllers\Api\Common\SystemContextApiController;
use App\Models\Master\Material\Item;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\Inventory\WarehouseStock;
use App\Models\Warehouse\Inventory\WarehouseStockTransfer;
use App\Models\Warehouse\Inventory\WarehouseStockTransferItem;
use App\Services\AuditLogger;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\Inventory\InventoryService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WarehouseStockTransferService
{
    public function __construct(
        private readonly InventoryService $inventoryService
    ) {}

    /**
     * Create a warehouse stock transfer and optionally post it atomically in the same transaction.
     *
     * @return array{transfer: WarehouseStockTransfer, idempotent_replay: bool}
     */
    public function createTransfer(array $payload, int $actorId, bool $autoPost = true): array
    {
        $idempotencyKey = ! empty($payload['idempotency_key'])
            ? trim((string) $payload['idempotency_key'])
            : null;

        if ($idempotencyKey !== null) {
            $existing = WarehouseStockTransfer::with($this->defaultRelations())
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return [
                    'transfer' => $existing,
                    'idempotent_replay' => true,
                ];
            }
        }

        $sourceWarehouseId = (int) ($payload['source_warehouse_id'] ?? 0);
        $destinationWarehouseId = (int) ($payload['destination_warehouse_id'] ?? 0);
        $sourceCoordinateId = ! empty($payload['source_coordinate_id']) ? (int) $payload['source_coordinate_id'] : null;
        $destinationCoordinateId = ! empty($payload['destination_coordinate_id']) ? (int) $payload['destination_coordinate_id'] : null;

        if ($sourceWarehouseId <= 0 || $destinationWarehouseId <= 0) {
            throw ValidationException::withMessages([
                'warehouses' => ['Both source_warehouse_id and destination_warehouse_id are required.'],
            ]);
        }

        if ($sourceWarehouseId === $destinationWarehouseId) {
            throw ValidationException::withMessages([
                'destination_warehouse_id' => ['Destination warehouse must be different from source warehouse.'],
            ]);
        }

        $sourceWarehouse = Warehouse::find($sourceWarehouseId);
        if (! $sourceWarehouse || ($sourceWarehouse->status !== null && (int) $sourceWarehouse->status !== 1)) {
            throw ValidationException::withMessages([
                'source_warehouse_id' => ['Source warehouse is invalid or inactive.'],
            ]);
        }

        $destinationWarehouse = Warehouse::find($destinationWarehouseId);
        if (! $destinationWarehouse || ($destinationWarehouse->status !== null && (int) $destinationWarehouse->status !== 1)) {
            throw ValidationException::withMessages([
                'destination_warehouse_id' => ['Destination warehouse is invalid or inactive.'],
            ]);
        }

        if ($sourceCoordinateId !== null) {
            $srcCoord = WarehouseCoordinate::find($sourceCoordinateId);
            if (! $srcCoord || (int) $srcCoord->warehouses_id !== $sourceWarehouseId) {
                throw ValidationException::withMessages([
                    'source_coordinate_id' => ['Source coordinate does not belong to the selected source warehouse.'],
                ]);
            }
        }

        if ($destinationCoordinateId !== null) {
            $dstCoord = WarehouseCoordinate::find($destinationCoordinateId);
            if (! $dstCoord || (int) $dstCoord->warehouses_id !== $destinationWarehouseId) {
                throw ValidationException::withMessages([
                    'destination_coordinate_id' => ['Destination coordinate does not belong to the selected destination warehouse.'],
                ]);
            }
        }

        $rawItems = $payload['items'] ?? [];
        if (empty($rawItems) && ! empty($payload['items_id'])) {
            $rawItems = [[
                'items_id' => $payload['items_id'],
                'quantity' => $payload['quantity'] ?? 0,
                'unit' => $payload['unit'] ?? null,
                'lot_number' => $payload['lot_number'] ?? null,
                'remark' => $payload['remark'] ?? null,
            ]];
        }

        if (empty($rawItems) || ! is_array($rawItems)) {
            throw ValidationException::withMessages([
                'items' => ['At least one transfer item is required.'],
            ]);
        }

        $normalizedItems = $this->validateAndNormalizeItems($rawItems, $sourceWarehouse);
        $transferDate = ! empty($payload['transfer_date'])
            ? Carbon::parse($payload['transfer_date'])
            : Carbon::now();

        $transfer = DB::transaction(function () use (
            $sourceWarehouseId,
            $destinationWarehouseId,
            $sourceCoordinateId,
            $destinationCoordinateId,
            $transferDate,
            $payload,
            $idempotencyKey,
            $actorId,
            $normalizedItems,
            $autoPost
        ) {
            $transferNumber = DocumentNumberGenerator::generateWarehouseTransferNumber($transferDate);

            $transfer = WarehouseStockTransfer::create([
                'transfer_number' => $transferNumber,
                'source_warehouse_id' => $sourceWarehouseId,
                'destination_warehouse_id' => $destinationWarehouseId,
                'source_coordinate_id' => $sourceCoordinateId,
                'destination_coordinate_id' => $destinationCoordinateId,
                'transfer_date' => $transferDate->format('Y-m-d'),
                'reference_code' => ! empty($payload['reference_code']) ? trim((string) $payload['reference_code']) : null,
                'idempotency_key' => $idempotencyKey,
                'status' => 'Draft',
                'note' => $payload['note'] ?? null,
                'creator_id' => $actorId,
                'updated_by' => $actorId,
            ]);

            foreach ($normalizedItems as $line) {
                WarehouseStockTransferItem::create([
                    'warehouse_stock_transfer_id' => $transfer->id,
                    'items_id' => $line['items_id'],
                    'quantity' => $line['quantity'],
                    'unit' => $line['unit'],
                    'lot_number' => $line['lot_number'],
                    'remark' => $line['remark'],
                ]);
            }

            if ($autoPost) {
                $this->executeAtomicTransfer($transfer->id, $actorId);
            } else {
                AuditLogger::logAction(
                    action: 'CREATE_WAREHOUSE_STOCK_TRANSFER',
                    modelName: 'WarehouseStockTransfer',
                    modelId: $transfer->id,
                    before: null,
                    after: [
                        'transfer_number' => $transfer->transfer_number,
                        'status' => 'Draft',
                    ],
                    userId: $actorId,
                    notes: "Created Warehouse Stock Transfer Draft {$transfer->transfer_number}"
                );
            }

            return $transfer->fresh($this->defaultRelations());
        });

        SystemContextApiController::forgetContextCache();

        return [
            'transfer' => $transfer,
            'idempotent_replay' => false,
        ];
    }

    /**
     * Post an existing Draft transfer atomically.
     */
    public function postTransfer(int $transferId, int $actorId): WarehouseStockTransfer
    {
        $transfer = DB::transaction(function () use ($transferId, $actorId) {
            $this->executeAtomicTransfer($transferId, $actorId);

            return WarehouseStockTransfer::with($this->defaultRelations())->findOrFail($transferId);
        });

        SystemContextApiController::forgetContextCache();

        return $transfer;
    }

    /**
     * Cancel a Draft transfer (cannot cancel an already Posted transfer).
     */
    public function cancelTransfer(int $transferId, int $actorId, ?string $reason = null): WarehouseStockTransfer
    {
        $transfer = DB::transaction(function () use ($transferId, $actorId, $reason) {
            $locked = WarehouseStockTransfer::lockForUpdate()->findOrFail($transferId);

            if ($locked->status === 'Posted') {
                throw ValidationException::withMessages([
                    'status' => ['Posted stock transfer cannot be cancelled. Create a reverse transfer instead.'],
                ]);
            }

            if ($locked->status === 'Cancelled') {
                throw ValidationException::withMessages([
                    'status' => ['Stock transfer is already Cancelled.'],
                ]);
            }

            $oldNote = $locked->note;
            $locked->update([
                'status' => 'Cancelled',
                'note' => $reason ? trim(($oldNote ? $oldNote."\n" : '').'Cancelled: '.$reason) : $oldNote,
                'updated_by' => $actorId,
            ]);

            AuditLogger::logAction(
                action: 'CANCEL_WAREHOUSE_STOCK_TRANSFER',
                modelName: 'WarehouseStockTransfer',
                modelId: $locked->id,
                before: ['status' => 'Draft'],
                after: ['status' => 'Cancelled'],
                userId: $actorId,
                notes: "Cancelled Warehouse Stock Transfer {$locked->transfer_number}"
            );

            return $locked->fresh($this->defaultRelations());
        });

        SystemContextApiController::forgetContextCache();

        return $transfer;
    }

    /**
     * Execute OUT + IN stock movements under sorted warehouse/item locks to preserve integrity.
     */
    private function executeAtomicTransfer(int $transferId, int $actorId): void
    {
        $transfer = WarehouseStockTransfer::with(['items.item', 'sourceWarehouse', 'destinationWarehouse'])
            ->lockForUpdate()
            ->findOrFail($transferId);

        if ($transfer->status === 'Posted') {
            throw ValidationException::withMessages([
                'status' => ["Stock transfer '{$transfer->transfer_number}' has already been Posted and cannot be double-processed."],
            ]);
        }

        if ($transfer->status === 'Cancelled') {
            throw ValidationException::withMessages([
                'status' => ["Cancelled stock transfer '{$transfer->transfer_number}' cannot be Posted."],
            ]);
        }

        if ((int) $transfer->source_warehouse_id === (int) $transfer->destination_warehouse_id) {
            throw ValidationException::withMessages([
                'destination_warehouse_id' => ['Destination warehouse must be different from source warehouse.'],
            ]);
        }

        $items = $transfer->items;
        if ($items->isEmpty()) {
            throw ValidationException::withMessages([
                'items' => ['Stock transfer must contain at least one item line.'],
            ]);
        }

        // Deterministic sorted lock ordering prevents deadlocks under concurrent warehouse transfers
        $itemIds = $items->pluck('items_id')->map(fn ($id) => (int) $id)->unique()->sort()->values()->all();
        $warehouseIds = collect([(int) $transfer->source_warehouse_id, (int) $transfer->destination_warehouse_id])
            ->unique()
            ->sort()
            ->values()
            ->all();

        WarehouseStock::whereIn('items_id', $itemIds)
            ->whereIn('warehouses_id', $warehouseIds)
            ->orderBy('warehouses_id')
            ->orderBy('items_id')
            ->lockForUpdate()
            ->get();

        // Aggregate per-item requested qty across lines so split lines cannot bypass stock check
        $requestedTotals = [];
        foreach ($items as $line) {
            $itemId = (int) $line->items_id;
            $qty = (float) $line->quantity;
            if ($qty <= 0) {
                throw ValidationException::withMessages([
                    'items' => ['Transfer quantity must be greater than zero.'],
                ]);
            }
            $requestedTotals[$itemId] = ($requestedTotals[$itemId] ?? 0.0) + $qty;
        }

        foreach ($requestedTotals as $itemId => $totalNeeded) {
            $available = $this->inventoryService->getWarehouseStockBalance($itemId, (int) $transfer->source_warehouse_id);
            if ($available + 0.0001 < $totalNeeded) {
                $itemName = Item::find($itemId)?->name ?? "Item #{$itemId}";
                throw ValidationException::withMessages([
                    'items' => [
                        "Insufficient available stock in warehouse '{$transfer->sourceWarehouse?->name}' for '{$itemName}'. Available: {$available}, requested: {$totalNeeded}.",
                    ],
                ]);
            }
        }

        $srcName = $transfer->sourceWarehouse?->name ?? "WH#{$transfer->source_warehouse_id}";
        $dstName = $transfer->destinationWarehouse?->name ?? "WH#{$transfer->destination_warehouse_id}";
        $srcCoordName = $transfer->sourceCoordinate?->name;
        $dstCoordName = $transfer->destinationCoordinate?->name;

        foreach ($items as $line) {
            $qty = (float) $line->quantity;
            $lotNote = $line->lot_number ? " [Lot: {$line->lot_number}]" : '';
            $itemModel = $line->item ?? Item::findOrFail((int) $line->items_id);

            $this->inventoryService->recordStockMovement(
                item: $itemModel,
                warehouseId: (int) $transfer->source_warehouse_id,
                movementType: 'OUT',
                quantity: $qty,
                referenceType: 'WAREHOUSE_TRANSFER',
                referenceNumber: $transfer->transfer_number,
                userId: $actorId,
                notes: "Inter-warehouse transfer OUT to {$dstName}{$lotNote}",
                coordinateId: $transfer->source_coordinate_id ? (int) $transfer->source_coordinate_id : null,
                coordinateName: $srcCoordName
            );

            $this->inventoryService->recordStockMovement(
                item: $itemModel,
                warehouseId: (int) $transfer->destination_warehouse_id,
                movementType: 'IN',
                quantity: $qty,
                referenceType: 'WAREHOUSE_TRANSFER',
                referenceNumber: $transfer->transfer_number,
                userId: $actorId,
                notes: "Inter-warehouse transfer IN from {$srcName}{$lotNote}",
                coordinateId: $transfer->destination_coordinate_id ? (int) $transfer->destination_coordinate_id : null,
                coordinateName: $dstCoordName
            );
        }

        $transfer->update([
            'status' => 'Posted',
            'posted_by' => $actorId,
            'posted_at' => Carbon::now(),
            'updated_by' => $actorId,
        ]);

        AuditLogger::logAction(
            action: 'POST_WAREHOUSE_STOCK_TRANSFER',
            modelName: 'WarehouseStockTransfer',
            modelId: $transfer->id,
            before: ['status' => 'Draft'],
            after: [
                'status' => 'Posted',
                'transfer_number' => $transfer->transfer_number,
                'source_warehouse_id' => $transfer->source_warehouse_id,
                'destination_warehouse_id' => $transfer->destination_warehouse_id,
            ],
            userId: $actorId,
            notes: "Posted Warehouse Stock Transfer {$transfer->transfer_number}"
        );
    }

    /**
     * Validate item existence, active status, master-data warehouse relation, and source availability.
     *
     * @return array<int, array<string, mixed>>
     */
    private function validateAndNormalizeItems(array $rawItems, Warehouse $sourceWarehouse): array
    {
        $normalized = [];
        $aggregatedByItem = [];

        foreach ($rawItems as $idx => $raw) {
            $itemId = (int) ($raw['items_id'] ?? $raw['item_id'] ?? 0);
            $qty = (float) ($raw['quantity'] ?? 0);

            if ($itemId <= 0) {
                throw ValidationException::withMessages([
                    "items.{$idx}.items_id" => ['Each transfer line must specify a valid master item.'],
                ]);
            }

            if ($qty <= 0) {
                throw ValidationException::withMessages([
                    "items.{$idx}.quantity" => ['Transfer quantity must be greater than zero.'],
                ]);
            }

            $item = Item::with('unitOfMeasurement')->find($itemId);
            if (! $item || ($item->status !== null && (int) $item->status !== 1)) {
                throw ValidationException::withMessages([
                    "items.{$idx}.items_id" => ['Selected item does not exist or is inactive in Master Data.'],
                ]);
            }

            $hasWarehouseStockRecord = WarehouseStock::where('items_id', $item->id)
                ->where('warehouses_id', $sourceWarehouse->id)
                ->exists();
            $hasItemWarehouseRelation = DB::table('item_warehouse')
                ->where('items_id', $item->id)
                ->where('warehouses_id', $sourceWarehouse->id)
                ->exists();
            $balance = $this->inventoryService->getWarehouseStockBalance($item->id, $sourceWarehouse->id);

            if (! $hasWarehouseStockRecord && ! $hasItemWarehouseRelation && $balance <= 0) {
                throw ValidationException::withMessages([
                    "items.{$idx}.items_id" => [
                        "Item '{$item->name}' is not registered or available in source warehouse '{$sourceWarehouse->name}'.",
                    ],
                ]);
            }

            $aggregatedByItem[$item->id] = [
                'name' => $item->name,
                'total' => ($aggregatedByItem[$item->id]['total'] ?? 0.0) + $qty,
                'balance' => $balance,
            ];

            $unit = ! empty($raw['unit'])
                ? trim((string) $raw['unit'])
                : ($item->unitOfMeasurement?->code ?? $item->unitOfMeasurement?->name ?? 'PCE');

            $normalized[] = [
                'items_id' => $item->id,
                'quantity' => $qty,
                'unit' => $unit,
                'lot_number' => ! empty($raw['lot_number']) ? trim((string) $raw['lot_number']) : null,
                'remark' => ! empty($raw['remark']) ? trim((string) $raw['remark']) : null,
            ];
        }

        foreach ($aggregatedByItem as $info) {
            if ($info['balance'] + 0.0001 < $info['total']) {
                throw ValidationException::withMessages([
                    'items' => [
                        "Insufficient available stock in source warehouse '{$sourceWarehouse->name}' for '{$info['name']}'. Available: {$info['balance']}, requested: {$info['total']}.",
                    ],
                ]);
            }
        }

        return $normalized;
    }

    public function defaultRelations(): array
    {
        return [
            'sourceWarehouse',
            'destinationWarehouse',
            'sourceCoordinate',
            'destinationCoordinate',
            'creator',
            'postedByUser',
            'items.item.unitOfMeasurement',
        ];
    }
}
