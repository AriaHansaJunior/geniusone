<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Inventory\StockAdjustment;
use App\Models\Warehouse\Inventory\StockAdjustmentItem;
use App\Services\AuditLogger;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\Inventory\InventoryService;
use App\Support\SpreadsheetParser;
use App\Support\StockAdjustmentTemplateBuilder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class StockAdjustmentApiController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = StockAdjustment::with([
            'warehouse',
            'creatorUser',
            'updatedByUser',
            'items.item.unit',
            'items.warehouse',
        ])->orderByDesc('id');

        if ($request->filled('search')) {
            $search = strtolower(trim((string) $request->query('search')));
            $query->where(function ($q) use ($search) {
                $q->where('adjustment_number', 'like', "%{$search}%")
                    ->orWhere('reference_code', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%")
                    ->orWhereHas('warehouse', fn ($wq) => $wq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('warehouseId') && is_numeric($request->query('warehouseId'))) {
            $whId = (int) $request->query('warehouseId');
            $query->where(function ($q) use ($whId) {
                $q->where('warehouses_id', $whId)
                    ->orWhereHas('items', fn ($iq) => $iq->where('warehouses_id', $whId));
            });
        }

        if ($request->filled('sourceType') && strtoupper((string) $request->query('sourceType')) !== 'ALL') {
            $query->where('source_type', strtoupper((string) $request->query('sourceType')));
        }

        if ($request->filled('startDate')) {
            $query->whereDate('adjustment_date', '>=', (string) $request->query('startDate'));
        }

        if ($request->filled('endDate')) {
            $query->whereDate('adjustment_date', '<=', (string) $request->query('endDate'));
        }

        $perPage = min(max((int) $request->query('per_page', 100), 1), 500);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginated->getCollection()->map(fn (StockAdjustment $adj) => $this->transform($adj))->values(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function show(string $code): JsonResponse
    {
        $record = $this->findByCodeOrId($code);

        return response()->json([
            'status' => 'success',
            'data' => $this->transform($record),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'warehouses_id' => 'required|integer|exists:warehouses,id',
            'adjustment_date' => 'nullable|date',
            'reference_code' => 'nullable|string|max:100',
            'note' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.items_id' => 'required|integer|exists:items,id',
            'items.*.warehouses_id' => 'nullable|integer|exists:warehouses,id',
            'items.*.adjustment_type' => 'required|in:IN,OUT,SET',
            'items.*.quantity' => 'required|numeric|gte:0',
            'items.*.coordinate_name' => 'nullable|string|max:100',
            'items.*.lot_number' => 'nullable|string|max:100',
            'items.*.remark' => 'nullable|string|max:255',
        ]);

        $defaultWarehouseId = (int) $validated['warehouses_id'];
        $adjustmentDate = ! empty($validated['adjustment_date'])
            ? Carbon::parse($validated['adjustment_date'])
            : now();

        $normalizedLines = [];
        foreach ($validated['items'] as $idx => $line) {
            $rowNum = $idx + 1;
            $type = strtoupper((string) $line['adjustment_type']);
            $qty = (float) $line['quantity'];
            if (in_array($type, ['IN', 'OUT'], true) && $qty <= 0) {
                throw ValidationException::withMessages([
                    'items' => ["Row {$rowNum}: Quantity must be greater than 0 for {$type} adjustment."],
                ]);
            }
            $normalizedLines[] = [
                'items_id' => (int) $line['items_id'],
                'warehouses_id' => (int) ($line['warehouses_id'] ?? $defaultWarehouseId),
                'adjustment_type' => $type,
                'quantity' => $qty,
                'coordinate_name' => $line['coordinate_name'] ?? null,
                'lot_number' => $line['lot_number'] ?? null,
                'remark' => $line['remark'] ?? null,
            ];
        }

        $record = $this->persistAndPostAdjustment(
            actorId: $actorId,
            adjustmentDate: $adjustmentDate,
            defaultWarehouseId: $defaultWarehouseId,
            sourceType: 'MANUAL',
            referenceCode: $validated['reference_code'] ?? null,
            note: $validated['note'] ?? null,
            lines: $normalizedLines
        );
        \App\Http\Controllers\Api\Common\SystemContextApiController::forgetContextCache();

        return response()->json([
            'status' => 'success',
            'message' => "Stock Adjustment {$record->adjustment_number} posted successfully.",
            'data' => $this->transform($record),
        ], 201);
    }

    public function import(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $request->validate([
            'default_warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'adjustment_date' => 'nullable|date',
            'reference_code' => 'nullable|string|max:100',
            'note' => 'nullable|string',
            'auto_create_missing_items' => 'nullable|boolean',
            'file' => 'nullable|file|max:5120|mimes:csv,txt,xlsx',
        ]);

        $autoCreateMissing = filter_var($request->input('auto_create_missing_items', false), FILTER_VALIDATE_BOOLEAN);

        $rows = [];
        if ($request->has('rows') && is_array($request->input('rows'))) {
            $rows = $request->input('rows');
        } elseif ($request->hasFile('file')) {
            $file = $request->file('file');
            $ext = strtolower((string) $file->getClientOriginalExtension());
            if ($ext === 'csv' || $ext === 'txt') {
                $rows = SpreadsheetParser::parseCsv($file->getRealPath());
            } elseif ($ext === 'xlsx') {
                try {
                    $rows = SpreadsheetParser::parseXlsx($file->getRealPath());
                } catch (RuntimeException $e) {
                    return response()->json([
                        'status' => 'error',
                        'message' => $e->getMessage(),
                    ], 503);
                }
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => "Unsupported file extension '.{$ext}'. Please upload an .xlsx or .csv file.",
                ], 422);
            }
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'No Excel/CSV file or parsed rows provided for stock adjustment import.',
            ], 422);
        }

        if (empty($rows)) {
            return response()->json([
                'status' => 'error',
                'message' => 'The uploaded spreadsheet contains no valid data rows.',
            ], 422);
        }

        $defaultWarehouseId = $request->filled('default_warehouse_id')
            ? (int) $request->input('default_warehouse_id')
            : null;
        $adjustmentDate = $request->filled('adjustment_date')
            ? Carbon::parse((string) $request->input('adjustment_date'))
            : now();

        $warehouses = Warehouse::all();
        $warehousesByCode = $warehouses->filter(fn ($w) => ! empty($w->code))
            ->keyBy(fn ($w) => strtolower(trim((string) $w->code)));
        $warehousesByName = $warehouses->keyBy(fn ($w) => strtolower(trim((string) $w->name)));

        $errors = [];
        $resolvedLines = [];

        foreach ($rows as $idx => $rawRow) {
            if (! is_array($rawRow)) {
                continue;
            }
            $rowNum = $idx + 1;
            $row = $this->normalizeRowKeys($rawRow);

            $itemCode = trim((string) (
                $row['item_code'] ?? $row['kode_item'] ?? $row['kode_barang'] ?? $row['code'] ?? $row['item'] ?? ''
            ));
            $itemNameInput = trim((string) (
                $row['item_name'] ?? $row['nama_item'] ?? $row['nama_barang'] ?? $row['name'] ?? ''
            ));
            $itemIdRaw = $row['items_id'] ?? $row['item_id'] ?? null;
            $whInput = trim((string) (
                $row['warehouse'] ?? $row['warehouse_code'] ?? $row['warehouse_name'] ?? $row['gudang'] ?? ''
            ));
            $whIdRaw = $row['warehouses_id'] ?? $row['warehouse_id'] ?? null;
            $rawType = strtoupper(trim((string) (
                $row['adjustment_type'] ?? $row['type'] ?? $row['direction'] ?? $row['jenis'] ?? ''
            )));
            $rawQty = $row['quantity'] ?? $row['qty'] ?? $row['jumlah'] ?? $row['stock'] ?? null;
            $coordinate = trim((string) ($row['coordinate'] ?? $row['coordinate_name'] ?? $row['lokasi'] ?? ''));
            $lotNumber = trim((string) ($row['lot_number'] ?? $row['no_lot'] ?? $row['lot'] ?? ''));
            $remark = trim((string) ($row['remark'] ?? $row['notes'] ?? $row['note'] ?? $row['keterangan'] ?? ''));

            if ($itemCode === '' && empty($itemIdRaw) && ($rawQty === null || $rawQty === '')) {
                continue;
            }

            $item = ! empty($itemIdRaw) && is_numeric($itemIdRaw)
                ? Item::find((int) $itemIdRaw)
                : ($itemCode !== ''
                    ? (Item::where('code', $itemCode)->first()
                        ?? Item::where('external_code', $itemCode)->first()
                        ?? Item::whereRaw('LOWER(name) = ?', [strtolower($itemCode)])->first())
                    : null);

            $newItemSpec = null;
            if (! $item) {
                if ($autoCreateMissing && $itemCode !== '') {
                    $newItemSpec = [
                        'code' => $itemCode,
                        'name' => $itemNameInput !== '' ? $itemNameInput : $itemCode,
                    ];
                } else {
                    $errors[] = "Row {$rowNum}: Item '{$itemCode}' was not found in Master Item.";
                    continue;
                }
            }

            $warehouseId = null;
            if (! empty($whIdRaw) && is_numeric($whIdRaw)) {
                $wh = Warehouse::find((int) $whIdRaw);
                $warehouseId = $wh?->id;
            } elseif ($whInput !== '') {
                $key = strtolower($whInput);
                $wh = $warehousesByCode->get($key) ?? $warehousesByName->get($key);
                if ($wh) {
                    $warehouseId = $wh->id;
                } else {
                    $errors[] = "Row {$rowNum}: Warehouse '{$whInput}' was not found.";
                    continue;
                }
            } elseif ($defaultWarehouseId) {
                $warehouseId = $defaultWarehouseId;
            }

            if (! $warehouseId) {
                $errors[] = "Row {$rowNum}: Warehouse is required (specify in Excel or select a Default Warehouse).";
                continue;
            }

            if ($rawQty === null || $rawQty === '' || ! is_numeric($rawQty)) {
                $errors[] = "Row {$rowNum}: Quantity must be a valid number.";
                continue;
            }
            $numericQty = (float) $rawQty;

            if ($rawType === '' || $rawType === '+') {
                if ($numericQty < 0) {
                    $type = 'OUT';
                    $qty = abs($numericQty);
                } else {
                    $type = 'IN';
                    $qty = $numericQty;
                }
            } elseif (in_array($rawType, ['IN', 'ADD', 'MASUK', 'PLUS'], true)) {
                $type = 'IN';
                $qty = $numericQty;
            } elseif (in_array($rawType, ['OUT', 'SUB', 'KELUAR', 'MINUS'], true)) {
                $type = 'OUT';
                $qty = abs($numericQty);
            } elseif (in_array($rawType, ['SET', 'EXACT', 'OPNAME', 'ADJUST'], true)) {
                $type = 'SET';
                $qty = $numericQty;
            } else {
                $errors[] = "Row {$rowNum}: Unsupported adjustment type '{$rawType}'. Use IN, OUT, or SET.";
                continue;
            }

            if (in_array($type, ['IN', 'OUT'], true) && $qty <= 0) {
                $errors[] = "Row {$rowNum}: Quantity for {$type} must be greater than 0.";
                continue;
            }
            if ($type === 'SET' && $qty < 0) {
                $errors[] = "Row {$rowNum}: Target stock quantity for SET cannot be negative.";
                continue;
            }

            $resolvedLines[] = [
                'items_id' => $item?->id,
                'new_item_spec' => $newItemSpec,
                'warehouses_id' => (int) $warehouseId,
                'adjustment_type' => $type,
                'quantity' => $qty,
                'coordinate_name' => $coordinate !== '' ? $coordinate : null,
                'lot_number' => $lotNumber !== '' ? $lotNumber : null,
                'remark' => $remark !== '' ? $remark : 'Excel stock injection',
            ];
        }

        if (! empty($errors)) {
            return response()->json([
                'status' => 'error',
                'message' => $errors[0],
                'errors' => ['rows' => $errors],
            ], 422);
        }

        if (empty($resolvedLines)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No valid item rows found in the uploaded file.',
            ], 422);
        }

        $headerWarehouseId = $defaultWarehouseId ?? $resolvedLines[0]['warehouses_id'];
        $record = $this->persistAndPostAdjustment(
            actorId: $actorId,
            adjustmentDate: $adjustmentDate,
            defaultWarehouseId: $headerWarehouseId,
            sourceType: 'EXCEL_IMPORT',
            referenceCode: $request->input('reference_code'),
            note: $request->input('note') ?: ('Excel import (' . count($resolvedLines) . ' rows)'),
            lines: $resolvedLines
        );
        \App\Http\Controllers\Api\Common\SystemContextApiController::forgetAllCaches();

        return response()->json([
            'status' => 'success',
            'message' => "Imported " . count($resolvedLines) . " stock adjustment row(s) via {$record->adjustment_number}.",
            'data' => $this->transform($record),
        ], 201);
    }

    public function template(): Response|JsonResponse
    {
        try {
            $binary = (new StockAdjustmentTemplateBuilder)->buildXlsxBinary();
        } catch (RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 503);
        }

        return response($binary, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="Template_Adjustment_Stock.xlsx"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
        ]);
    }

    /**
     * Create StockAdjustment + items and apply movements to warehouse_stocks, item_warehouse, items, and inventory_movements.
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function persistAndPostAdjustment(
        int $actorId,
        Carbon $adjustmentDate,
        int $defaultWarehouseId,
        string $sourceType,
        ?string $referenceCode,
        ?string $note,
        array $lines
    ): StockAdjustment {
        return DB::transaction(function () use (
            $actorId,
            $adjustmentDate,
            $defaultWarehouseId,
            $sourceType,
            $referenceCode,
            $note,
            $lines
        ) {
            $adjNumber = DocumentNumberGenerator::generateStockAdjustmentNumber($adjustmentDate);

            $adjustment = StockAdjustment::create([
                'adjustment_number' => $adjNumber,
                'warehouses_id' => $defaultWarehouseId,
                'adjustment_date' => $adjustmentDate->format('Y-m-d'),
                'source_type' => $sourceType,
                'reference_code' => $referenceCode,
                'note' => $note,
                'status' => 'Posted',
                'creator_id' => $actorId,
                'updated_by' => $actorId,
            ]);

            foreach ($lines as $lineIdx => $line) {
                if (! empty($line['items_id'])) {
                    $item = Item::query()->lockForUpdate()->findOrFail($line['items_id']);
                } elseif (! empty($line['new_item_spec'])) {
                    $item = $this->resolveOrCreateItemByCode(
                        code: (string) $line['new_item_spec']['code'],
                        name: (string) $line['new_item_spec']['name'],
                        actorId: $actorId
                    );
                } else {
                    throw ValidationException::withMessages([
                        'items' => ['Row ' . ($lineIdx + 1) . ': Item reference is missing.'],
                    ]);
                }
                $warehouseId = (int) $line['warehouses_id'];
                $warehouse = Warehouse::findOrFail($warehouseId);
                $type = $line['adjustment_type'];
                $rawQty = (float) $line['quantity'];

                $before = $this->getWarehouseQuantity($item->id, $warehouseId);

                if ($type === 'SET') {
                    $delta = $rawQty - $before;
                    $storedQty = $rawQty;
                    $movementType = $delta >= 0 ? 'IN' : 'OUT';
                    $movementQty = abs($delta);
                    $expectedAfter = $rawQty;
                } elseif ($type === 'OUT') {
                    $movementType = 'OUT';
                    $movementQty = $rawQty;
                    $storedQty = $rawQty;
                    $expectedAfter = $before - $rawQty;
                } else {
                    $movementType = 'IN';
                    $movementQty = $rawQty;
                    $storedQty = $rawQty;
                    $expectedAfter = $before + $rawQty;
                }

                if ($expectedAfter < -1e-6) {
                    throw ValidationException::withMessages([
                        'items' => [
                            "Row " . ($lineIdx + 1) . ": Insufficient stock for '{$item->code} - {$item->name}' in '{$warehouse->name}' (Current: "
                            . number_format($before, 2, '.', '') . ", Out: "
                            . number_format($rawQty, 2, '.', '') . ').',
                        ],
                    ]);
                }

                if ($movementQty > 1e-6) {
                    // Ensure warehouse_stocks row exists with current balance if pivot existed beforehand without warehouse_stocks row
                    if (
                        $movementType === 'OUT'
                        && Schema::hasTable('warehouse_stocks')
                        && ! DB::table('warehouse_stocks')->where('items_id', $item->id)->where('warehouses_id', $warehouseId)->exists()
                        && $before > 0
                    ) {
                        DB::table('warehouse_stocks')->insert([
                            'items_id' => $item->id,
                            'warehouses_id' => $warehouseId,
                            'coordinate_name' => $line['coordinate_name'],
                            'quantity' => $before,
                            'available_quantity' => $before,
                            'allocated_quantity' => 0,
                            'location_type' => 'Warehouse',
                            'last_movement_date' => now(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    $this->inventoryService->recordStockMovement(
                        item: $item,
                        warehouseId: $warehouseId,
                        movementType: $movementType,
                        quantity: $movementQty,
                        referenceType: 'STOCK_ADJUSTMENT',
                        referenceNumber: $adjNumber,
                        userId: $actorId,
                        notes: $line['remark'] ?: ("Stock Adjustment ({$type}) in {$warehouse->name}: {$adjNumber}"),
                        coordinateName: $line['coordinate_name']
                    );

                    if ($movementType === 'IN' && (! empty($line['lot_number']) || ! empty($line['coordinate_name']))) {
                        $updates = array_filter([
                            'lot_number' => $line['lot_number'] ?: null,
                            'coordinate_name' => $line['coordinate_name'] ?: null,
                        ], fn ($v) => $v !== null);
                        if (! empty($updates) && Schema::hasTable('warehouse_stocks')) {
                            DB::table('warehouse_stocks')
                                ->where('items_id', $item->id)
                                ->where('warehouses_id', $warehouseId)
                                ->update($updates);
                        }
                    }
                }

                $after = $this->getWarehouseQuantity($item->id, $warehouseId);

                StockAdjustmentItem::create([
                    'stock_adjustment_id' => $adjustment->id,
                    'items_id' => $item->id,
                    'warehouses_id' => $warehouseId,
                    'adjustment_type' => $type,
                    'quantity' => $storedQty,
                    'balance_before' => $before,
                    'balance_after' => $after,
                    'coordinate_name' => $line['coordinate_name'],
                    'lot_number' => $line['lot_number'],
                    'remark' => $line['remark'],
                ]);
            }

            AuditLogger::logAction(
                action: $sourceType === 'EXCEL_IMPORT' ? 'IMPORTED_STOCK_ADJUSTMENT' : 'CREATED_STOCK_ADJUSTMENT',
                modelName: 'StockAdjustment',
                modelId: $adjustment->id,
                before: null,
                after: [
                    'adjustment_number' => $adjNumber,
                    'source_type' => $sourceType,
                    'items_count' => count($lines),
                ],
                userId: $actorId,
                notes: "Posted Stock Adjustment {$adjNumber} ({$sourceType})"
            );

            return $adjustment->load([
                'warehouse',
                'creatorUser',
                'updatedByUser',
                'items.item.unit',
                'items.warehouse',
            ]);
        });
    }

    private function getWarehouseQuantity(int $itemId, int $warehouseId): float
    {
        return \App\Services\GeniusOneBackend::inventory()->getWarehouseStockBalance($itemId, $warehouseId);
    }

    private function resolveOrCreateItemByCode(string $code, string $name, int $actorId): Item
    {
        $existing = Item::query()->where('code', $code)->lockForUpdate()->first();
        if ($existing) {
            return $existing;
        }

        $classificationId = DB::table('classifications')->orderBy('id')->value('id');
        $facilityId = DB::table('facilities')->orderBy('id')->value('id');
        $uomId = DB::table('units_of_measurements')->orderBy('id')->value('id');
        $itemTypeId = DB::table('item_types')->orderBy('id')->value('id');

        if (! $classificationId || ! $facilityId || ! $uomId || ! $itemTypeId) {
            throw ValidationException::withMessages([
                'rows' => [
                    "Cannot auto-create Master Item '{$code}' because default reference data (Classification, Facility, Unit, or Item Type) is not seeded.",
                ],
            ]);
        }

        return Item::create([
            'code' => mb_substr($code, 0, 50),
            'name' => mb_substr($name !== '' ? $name : $code, 0, 255),
            'classifications_id' => (int) $classificationId,
            'facilities_id' => (int) $facilityId,
            'units_of_measurements_id' => (int) $uomId,
            'item_types_id' => (int) $itemTypeId,
            'status' => 1,
            'stock' => 0,
            'created_by' => $actorId,
            'updated_by' => $actorId,
        ]);
    }

    private function findByCodeOrId(string $code): StockAdjustment
    {
        $relations = [
            'warehouse',
            'creatorUser',
            'updatedByUser',
            'items.item.unit',
            'items.warehouse',
        ];

        if (is_numeric($code)) {
            return StockAdjustment::with($relations)->findOrFail((int) $code);
        }

        $clean = preg_replace('/[^A-Za-z0-9]/', '', $code);

        return StockAdjustment::with($relations)
            ->where('adjustment_number', $code)
            ->orWhereRaw("REPLACE(REPLACE(adjustment_number, '/', ''), '-', '') = ?", [$clean])
            ->firstOrFail();
    }

    private function transform(StockAdjustment $row): array
    {
        $totalIn = 0.0;
        $totalOut = 0.0;

        $items = $row->items->map(function (StockAdjustmentItem $line, int $idx) use (&$totalIn, &$totalOut) {
            if ($line->adjustment_type === 'IN') {
                $totalIn += (float) $line->quantity;
            } elseif ($line->adjustment_type === 'OUT') {
                $totalOut += (float) $line->quantity;
            } else {
                $diff = (float) $line->balance_after - (float) $line->balance_before;
                if ($diff >= 0) {
                    $totalIn += $diff;
                } else {
                    $totalOut += abs($diff);
                }
            }

            return [
                'id' => (string) $line->id,
                'no' => $idx + 1,
                'items_id' => $line->items_id,
                'itemCode' => $line->item?->code ?? '',
                'itemName' => $line->item?->name ?? '',
                'unit' => $line->item?->unit?->code ?? $line->item?->unit?->name ?? 'PCE',
                'warehouseId' => $line->warehouses_id,
                'warehouseName' => $line->warehouse?->name ?? '',
                'adjustmentType' => $line->adjustment_type,
                'quantity' => (float) $line->quantity,
                'balanceBefore' => (float) $line->balance_before,
                'balanceAfter' => (float) $line->balance_after,
                'coordinateName' => $line->coordinate_name ?? '',
                'lotNumber' => $line->lot_number ?? '',
                'remark' => $line->remark ?? '',
            ];
        })->values()->all();

        return [
            'id' => $row->adjustment_number,
            'rawId' => $row->id,
            'adjustmentNumber' => $row->adjustment_number,
            'warehouseId' => $row->warehouses_id,
            'warehouseName' => $row->warehouse?->name ?? ($items[0]['warehouseName'] ?? ''),
            'adjustmentDate' => $row->adjustment_date?->format('Y-m-d') ?? '',
            'sourceType' => $row->source_type ?? 'MANUAL',
            'referenceCode' => $row->reference_code ?? '',
            'note' => $row->note ?? '',
            'status' => $row->status ?? 'Posted',
            'itemCount' => count($items),
            'totalIn' => $totalIn,
            'totalOut' => $totalOut,
            'createdBy' => $row->creatorUser?->name ?? '',
            'createdAt' => $row->created_at?->format('Y-m-d H:i:s'),
            'items' => $items,
        ];
    }

    /**
     * Normalize uploaded row headers to lowercase underscore_keys.
     *
     * @param  array<string|int, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalizeRowKeys(array $row): array
    {
        $out = [];
        foreach ($row as $k => $v) {
            $normKey = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '_', (string) $k), '_'));
            $out[$normKey] = $v;
        }

        return $out;
    }
}
