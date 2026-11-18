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
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

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

        $rows = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => $rows->map(fn (StockAdjustment $adj) => $this->transform($adj))->values(),
            'meta' => [
                'total' => $rows->count(),
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
        ]);

        $rows = [];
        if ($request->has('rows') && is_array($request->input('rows'))) {
            $rows = $request->input('rows');
        } elseif ($request->hasFile('file')) {
            $file = $request->file('file');
            $ext = strtolower((string) $file->getClientOriginalExtension());
            if ($ext === 'csv' || $ext === 'txt') {
                $rows = $this->parseCsv($file->getRealPath());
            } elseif ($ext === 'xlsx') {
                $rows = $this->parseXlsx($file->getRealPath());
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => "Unsupported file extension '.{$ext}'. Please upload an .xlsx, .xls, or .csv file.",
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

            if (! $item) {
                $errors[] = "Row {$rowNum}: Item '{$itemCode}' was not found in Master Item.";
                continue;
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
                'items_id' => $item->id,
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

        return response()->json([
            'status' => 'success',
            'message' => "Imported " . count($resolvedLines) . " stock adjustment row(s) via {$record->adjustment_number}.",
            'data' => $this->transform($record),
        ], 201);
    }

    public function template(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="Template_Adjustment_Stock.csv"',
        ];

        $sampleItem = Item::query()->orderBy('id')->first();
        $sampleWarehouse = Warehouse::query()->orderBy('id')->first();

        return response()->stream(function () use ($sampleItem, $sampleWarehouse) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Item Code', 'Warehouse', 'Type', 'Quantity', 'Lot Number', 'Coordinate', 'Remark']);
            fputcsv($handle, [
                $sampleItem?->code ?? '50.112.100.001',
                $sampleWarehouse?->name ?? 'Gudang Utama',
                'IN',
                '100',
                'LOT-2026-001',
                'A-01',
                'Initial stock injection',
            ]);
            fclose($handle);
        }, 200, $headers);
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
                $item = Item::query()->lockForUpdate()->findOrFail($line['items_id']);
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

    private function parseCsv(string $filePath): array
    {
        $rows = [];
        if (! file_exists($filePath) || ! is_readable($filePath)) {
            return $rows;
        }

        if (($handle = fopen($filePath, 'r')) !== false) {
            $headers = null;
            while (($data = fgetcsv($handle, 4000, ',')) !== false) {
                if ($headers === null) {
                    $headers = array_map(fn ($h) => trim((string) preg_replace('/^\xEF\xBB\xBF/', '', (string) $h)), $data);
                    continue;
                }
                if (count($data) >= 1 && ! empty(array_filter($data, fn ($v) => $v !== null && trim((string) $v) !== ''))) {
                    $row = [];
                    foreach ($headers as $i => $header) {
                        $row[$header] = $data[$i] ?? '';
                    }
                    $rows[] = $row;
                }
            }
            fclose($handle);
        }

        return $rows;
    }

    private function parseXlsx(string $filePath): array
    {
        $rows = [];
        $zip = new ZipArchive;
        if ($zip->open($filePath) !== true) {
            return $rows;
        }

        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml) {
            $xml = simplexml_load_string($sharedStringsXml);
            if ($xml) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $run) {
                            $text .= (string) ($run->t ?? '');
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml) {
            $xml = simplexml_load_string($sheetXml);
            if ($xml && isset($xml->sheetData->row)) {
                $rawRows = [];
                foreach ($xml->sheetData->row as $row) {
                    $cells = [];
                    $fallbackIdx = 0;
                    foreach ($row->c as $c) {
                        $ref = (string) $c['r'];
                        $colIdx = $ref !== '' ? $this->columnLettersToIndex($ref) : $fallbackIdx;
                        $fallbackIdx = $colIdx + 1;

                        $cellType = (string) $c['t'];
                        if ($cellType === 'inlineStr' && isset($c->is)) {
                            $val = (string) ($c->is->t ?? '');
                        } else {
                            $val = (string) ($c->v ?? '');
                            if ($cellType === 's' && $val !== '' && isset($sharedStrings[(int) $val])) {
                                $val = $sharedStrings[(int) $val];
                            }
                        }
                        $cells[$colIdx] = $val;
                    }
                    if (! empty($cells)) {
                        ksort($cells);
                        $rawRows[] = $cells;
                    }
                }

                if (count($rawRows) > 1) {
                    $headerMap = [];
                    foreach ($rawRows[0] as $colIdx => $headerName) {
                        $headerMap[$colIdx] = trim((string) $headerName);
                    }
                    for ($i = 1; $i < count($rawRows); $i++) {
                        $assoc = [];
                        foreach ($headerMap as $colIdx => $header) {
                            if ($header !== '') {
                                $assoc[$header] = $rawRows[$i][$colIdx] ?? '';
                            }
                        }
                        if (! empty(array_filter($assoc, fn ($v) => $v !== null && trim((string) $v) !== ''))) {
                            $rows[] = $assoc;
                        }
                    }
                }
            }
        }

        $zip->close();

        return $rows;
    }

    private function columnLettersToIndex(string $cellRef): int
    {
        if (! preg_match('/^([A-Z]+)/i', $cellRef, $m)) {
            return 0;
        }
        $letters = strtoupper($m[1]);
        $idx = 0;
        for ($i = 0; $i < strlen($letters); $i++) {
            $idx = ($idx * 26) + (ord($letters[$i]) - ord('A') + 1);
        }

        return max(0, $idx - 1);
    }
}
