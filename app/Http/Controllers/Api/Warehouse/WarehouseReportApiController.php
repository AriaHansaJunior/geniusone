<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Warehouse\Facility\Warehouse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseReportApiController extends Controller
{
    private function parseToWib(string $value): Carbon
    {
        $trimmed = trim($value);
        $hasTz = preg_match('/(Z|[+-]\d{2}:?\d{2})$/i', $trimmed) === 1;
        $dt = $hasTz
            ? Carbon::parse($trimmed)
            : Carbon::parse($trimmed, (string) config('app.timezone', 'UTC'));

        return $dt->setTimezone('Asia/Jakarta');
    }

    private function resolveMovementTimestamp(
        array &$timeQueues,
        string $refType,
        string $refNumber,
        ?int $warehouseId,
        ?string $docDate,
        ?string $docUpdatedAt = null,
        bool $preferDocDateOnly = false
    ): string {
        $keyWithWh = strtoupper($refType) . '|' . $refNumber . '|' . ($warehouseId ?? '');
        $keyNoWh = strtoupper($refType) . '|' . $refNumber . '|';

        $imTime = null;
        if (! empty($timeQueues[$keyWithWh])) {
            $imTime = array_shift($timeQueues[$keyWithWh]);
        } elseif (! empty($timeQueues[$keyNoWh])) {
            $imTime = array_shift($timeQueues[$keyNoWh]);
        }

        if ($imTime) {
            try {
                $parsedIm = $this->parseToWib((string) $imTime);
                if ($preferDocDateOnly && $docDate && preg_match('/^\d{4}-\d{2}-\d{2}/', trim($docDate), $m)) {
                    return $m[0] . ' ' . $parsedIm->format('H:i:s');
                }

                return $parsedIm->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                // fallback below
            }
        }

        $trimmedDoc = trim((string) $docDate);
        if ($trimmedDoc !== '') {
            try {
                $hasExplicitTime = preg_match('/\d{2}:\d{2}:\d{2}/', $trimmedDoc) === 1;
                if ($hasExplicitTime) {
                    $parsedDoc = $this->parseToWib($trimmedDoc);
                    if ($parsedDoc->format('H:i:s') !== '00:00:00') {
                        return $parsedDoc->format('Y-m-d H:i:s');
                    }
                }
                if ($docUpdatedAt) {
                    $parsedUpd = $this->parseToWib((string) $docUpdatedAt);
                    $datePrefix = preg_match('/^\d{4}-\d{2}-\d{2}/', $trimmedDoc, $m)
                        ? $m[0]
                        : $parsedUpd->format('Y-m-d');

                    return $datePrefix . ' ' . $parsedUpd->format('H:i:s');
                }

                return Carbon::parse($trimmedDoc, 'Asia/Jakarta')->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                // ignore
            }
        }

        if ($docUpdatedAt) {
            try {
                return $this->parseToWib((string) $docUpdatedAt)->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                // ignore
            }
        }

        return now('Asia/Jakarta')->format('Y-m-d H:i:s');
    }

    /**
     * Get Stock Card (Kartu Stok) transaction ledger for an item over a date range.
     * Integrates Inbound (BPB Receive Material) and Outbound (Request Material).
     */
    public function stockCard(Request $request): JsonResponse
    {
        $startDate = $request->query('startDate', date('Y-m-01'));
        $endDate = $request->query('endDate', date('Y-m-t'));
        $itemQuery = $request->query('itemCode') ?? $request->query('item');
        $warehouseId = $request->query('warehouseId');
        $unit = $request->query('unit');

        // 1. Locate Item
        $item = null;
        if (! empty($itemQuery)) {
            $item = Item::with(['category', 'unit', 'brand', 'facility'])
                ->where('code', $itemQuery)
                ->orWhere('id', is_numeric($itemQuery) ? (int) $itemQuery : 0)
                ->orWhere('name', $itemQuery)
                ->orWhere('name', 'like', "%{$itemQuery}%")
                ->first();
        } else {
            $item = Item::with(['category', 'unit', 'brand', 'facility'])->orderBy('code')->first();
        }

        if (! $item) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'item' => null,
                    'summary' => [
                        'beginning_balance' => 0,
                        'total_in' => 0,
                        'total_out' => 0,
                        'ending_balance' => 0,
                    ],
                    'movements' => [],
                ],
            ]);
        }

        // 2. Fetch Inbound physical receipts (Approved BPB Receive Material)
        $inboundsQuery = DB::table('purchase_order_has_receive_note as porn')
            ->join('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->leftJoin('receive_note as rn', 'porn.receive_note_id', '=', 'rn.id')
            ->leftJoin('purchase_order as po', 'porn.purchase_order_id', '=', 'po.id')
            ->leftJoin('warehouses as w', 'pb.warehouses_id', '=', 'w.id')
            ->leftJoin('job_number as j', 'porn.job_number_id', '=', 'j.id')
            ->leftJoin('purchase_order_has_purchase_requisitions as poi', 'porn.po_has_items_id', '=', 'poi.id')
            ->leftJoin('purchase_requisitions_has_items as pri', 'poi.pr_has_items_id', '=', 'pri.id')
            ->whereIn('bpb.status', ['Approved', 'Approved 2'])
            ->whereNull('bpb.deleted_at')
            ->whereNull('pb.deleted_at')
            ->whereNull('porn.deleted_at')
            ->where(function ($q) use ($item) {
                $q->where('poi.items_id', $item->id)
                    ->orWhere('pri.items_id', $item->id)
                    ->orWhere('porn.item_name', $item->name)
                    ->orWhere('porn.item_name', $item->code);
            });

        if (! empty($warehouseId) && $warehouseId !== 'all' && $warehouseId !== 'All Warehouse') {
            if (is_numeric($warehouseId)) {
                $inboundsQuery->where('pb.warehouses_id', (int) $warehouseId);
            } else {
                $inboundsQuery->where('w.name', $warehouseId);
            }
        }

        $allInbounds = $inboundsQuery->select([
            'bpb.id as bpb_id',
            'bpb.bpb_number',
            'bpb.source_type',
            DB::raw('COALESCE(bpb.receive_date, rn.arrival_date, bpb.created_at) as movement_date'),
            'bpb.updated_at as doc_updated_at',
            'rn.rn_number',
            'po.po_number',
            'porn.quantity',
            'porn.rafaksi',
            'porn.dn_number',
            'porn.remark as item_remark',
            'w.name as warehouse_name',
            'w.id as warehouse_id',
            'j.code as job_code',
            'j.name as job_name',
            'bpb.note as bpb_note',
            'rn.note as rn_note',
        ])->get();

        // 3. Fetch Outbound issues (Approved Request Material)
        $outboundsQuery = DB::table('request_material_item as rmi')
            ->join('request_material as rm', 'rmi.request_material_id', '=', 'rm.id')
            ->leftJoin('warehouses as w', 'rm.warehouses_id', '=', 'w.id')
            ->leftJoin('destination_location as dl', 'rm.destination_location_id', '=', 'dl.id')
            ->leftJoin('departments as dept', 'rm.departments_id', '=', 'dept.id')
            ->where('rmi.items_id', $item->id)
            ->whereIn('rm.status', ['Approved', 'Approved 2'])
            ->whereNull('rm.deleted_at')
            ->whereNull('rmi.deleted_at');

        if (! empty($warehouseId) && $warehouseId !== 'all' && $warehouseId !== 'All Warehouse') {
            if (is_numeric($warehouseId)) {
                $outboundsQuery->where('rm.warehouses_id', (int) $warehouseId);
            } else {
                $outboundsQuery->where('w.name', $warehouseId);
            }
        }

        $allOutbounds = $outboundsQuery->select([
            'rm.id as rm_id',
            'rm.request_number',
            'rm.job_number as rm_job_number',
            DB::raw('COALESCE(rm.request_date, rm.created_at) as movement_date'),
            'rm.updated_at as doc_updated_at',
            'rmi.request as qty_out',
            'w.name as warehouse_name',
            'w.id as warehouse_id',
            'dl.name as destination_name',
            'dept.name as department_name',
            'rm.note as rm_note',
            'rmi.remark as item_remark',
        ])->get();

        // 4. Fetch Returns from Request Material (Approved Transfer Stock Return)
        $returnsQuery = DB::table('transfer_stock_return_items as ri')
            ->join('transfer_stock_returns as r', 'ri.transfer_stock_return_id', '=', 'r.id')
            ->leftJoin('warehouses as w', 'r.warehouses_id', '=', 'w.id')
            ->leftJoin('request_material as rm', 'r.request_material_id', '=', 'rm.id')
            ->where('ri.items_id', $item->id)
            ->whereIn('r.status', ['Approved', 'Approved 2']);

        if (! empty($warehouseId) && $warehouseId !== 'all' && $warehouseId !== 'All Warehouse') {
            if (is_numeric($warehouseId)) {
                $returnsQuery->where('r.warehouses_id', (int) $warehouseId);
            } else {
                $returnsQuery->where('w.name', $warehouseId);
            }
        }

        $allReturns = $returnsQuery->select([
            'r.id as return_id',
            'r.return_number',
            'r.job_number as return_job_number',
            DB::raw('COALESCE(r.return_date, r.created_at) as movement_date'),
            'r.updated_at as doc_updated_at',
            'ri.quantity as qty_in',
            'ri.remark as item_remark',
            'r.note as return_note',
            'rm.request_number as rm_number',
            'w.name as warehouse_name',
            'w.id as warehouse_id',
        ])->get();

        // 5. Fetch additional recorded inventory_movements not directly covered by BPB / RM / TSR documents
        $extraMovementsQuery = DB::table('inventory_movements as im')
            ->leftJoin('warehouses as w', 'im.warehouses_id', '=', 'w.id')
            ->leftJoin('stock_adjustments as sa', function ($join) {
                $join->on('im.reference_number', '=', 'sa.adjustment_number')
                    ->where('im.reference_type', '=', 'STOCK_ADJUSTMENT');
            })
            ->where('im.items_id', $item->id)
            ->whereNotIn('im.reference_type', [
                'BPB',
                'BPB_REVERSAL',
                'RM',
                'RM_REVERSAL',
                'TRANSFER_STOCK_RETURN',
                'TSR_REVERSAL',
            ]);

        if (! empty($warehouseId) && $warehouseId !== 'all' && $warehouseId !== 'All Warehouse') {
            if (is_numeric($warehouseId)) {
                $extraMovementsQuery->where('im.warehouses_id', (int) $warehouseId);
            } else {
                $extraMovementsQuery->where('w.name', $warehouseId);
            }
        }

        $extraMovements = $extraMovementsQuery->select([
            'im.id',
            'im.movement_type',
            'im.quantity',
            'im.reference_type',
            'im.reference_number',
            'im.notes',
            DB::raw('COALESCE(sa.adjustment_date, im.created_at) as movement_date'),
            'w.name as warehouse_name',
            'w.id as warehouse_id',
        ])->get();

        $itemUnit = $item->unit?->code ?? $item->unit?->nama ?? $item->unit?->name ?? '—';

        $movementTimeQueues = [];
        foreach (DB::table('inventory_movements')
            ->where('items_id', $item->id)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['reference_type', 'reference_number', 'warehouses_id', 'created_at']) as $imRow) {
            $k = strtoupper((string) $imRow->reference_type) . '|' . (string) $imRow->reference_number . '|' . (string) ($imRow->warehouses_id ?? '');
            $movementTimeQueues[$k][] = (string) $imRow->created_at;
        }

        // 6. Standardize all movements
        $rawMovements = [];

        foreach ($allInbounds as $in) {
            $qtyIn = max(0.0, (float) $in->quantity - (float) $in->rafaksi);
            $docNumber = $in->bpb_number ?: ($in->rn_number ?: '-');
            $exactTs = $this->resolveMovementTimestamp(
                $movementTimeQueues,
                'BPB',
                (string) $docNumber,
                $in->warehouse_id ? (int) $in->warehouse_id : null,
                (string) $in->movement_date,
                $in->doc_updated_at ?? null
            );
            $whName = $in->warehouse_name ?: '—';

            $jobNum = $in->job_code ?: ($in->job_name ?: '—');

            $rawMovements[] = [
                'type' => 'IN',
                'date' => $exactTs,
                'date_ymd' => substr($exactTs, 0, 10),
                'full_date' => $exactTs,
                'sort_id' => (int) $in->bpb_id,
                'doc_type' => 'Receive Material (BPB)',
                'doc_number' => $docNumber,
                'reference_no' => $in->bpb_number ?: ($in->rn_number ?: ($in->po_number ?: '-')),
                'history_doc_in' => $in->rn_number ?: ($in->po_number ? 'Direct PO: '.$in->po_number : '-'),
                'doc_out_ref' => '—',
                'warehouse' => $whName,
                'warehouse_id' => $in->warehouse_id,
                'unit' => $itemUnit,
                'qty_in' => $qtyIn,
                'qty_out' => 0.0,
                'job_number' => $jobNum,
                'no_lot' => $in->dn_number ?: '—',
                'notes' => $in->bpb_note ?: '—',
            ];
        }

        foreach ($allOutbounds as $out) {
            $qtyOut = (float) $out->qty_out;
            $whName = $out->warehouse_name ?: '—';
            $docRef = $out->request_number ?: '—';
            $exactTs = $this->resolveMovementTimestamp(
                $movementTimeQueues,
                'RM',
                (string) $docRef,
                $out->warehouse_id ? (int) $out->warehouse_id : null,
                (string) $out->movement_date,
                $out->doc_updated_at ?? null
            );
            $desc = $out->rm_note ?: ($out->destination_name ?: ($out->department_name ?: '—'));
            $jobNum = $out->rm_job_number ?: ($out->department_name ?: '—');

            $rawMovements[] = [
                'type' => 'OUT',
                'date' => $exactTs,
                'date_ymd' => substr($exactTs, 0, 10),
                'full_date' => $exactTs,
                'sort_id' => (int) $out->rm_id,
                'doc_type' => 'Request Material (RM)',
                'doc_number' => $docRef,
                'reference_no' => $docRef,
                'history_doc_in' => '—',
                'doc_out_ref' => $docRef,
                'warehouse' => $whName,
                'warehouse_id' => $out->warehouse_id,
                'unit' => $itemUnit,
                'qty_in' => 0.0,
                'qty_out' => $qtyOut,
                'job_number' => $jobNum,
                'no_lot' => '—',
                'notes' => $desc,
            ];
        }

        foreach ($allReturns as $ret) {
            $qtyIn = (float) $ret->qty_in;
            $exactTs = $this->resolveMovementTimestamp(
                $movementTimeQueues,
                'TRANSFER_STOCK_RETURN',
                (string) $ret->return_number,
                $ret->warehouse_id ? (int) $ret->warehouse_id : null,
                (string) $ret->movement_date,
                $ret->doc_updated_at ?? null
            );
            $whName = $ret->warehouse_name ?: '—';

            $rawMovements[] = [
                'type' => 'IN',
                'date' => $exactTs,
                'date_ymd' => substr($exactTs, 0, 10),
                'full_date' => $exactTs,
                'sort_id' => (int) $ret->return_id,
                'doc_type' => 'Transfer Stock Return',
                'doc_number' => $ret->return_number,
                'reference_no' => $ret->return_number,
                'history_doc_in' => $ret->return_number,
                'doc_out_ref' => $ret->rm_number ?: '—',
                'warehouse' => $whName,
                'warehouse_id' => $ret->warehouse_id,
                'unit' => $itemUnit,
                'qty_in' => $qtyIn,
                'qty_out' => 0.0,
                'job_number' => $ret->return_job_number ?: ($ret->item_remark ?: '—'),
                'no_lot' => '—',
                'notes' => $ret->return_note ?: '—',
            ];
        }

        foreach ($extraMovements as $extra) {
            $isOut = strtoupper((string) $extra->movement_type) === 'OUT';
            $qty = abs((float) $extra->quantity);
            if ($qty <= 0) {
                continue;
            }
            $refNumber = $extra->reference_number ?: ($extra->reference_type ?: 'ADJUSTMENT');
            $refTypeStr = strtoupper((string) ($extra->reference_type ?: 'STOCK_ADJUSTMENT'));
            $exactTs = $this->resolveMovementTimestamp(
                $movementTimeQueues,
                $refTypeStr,
                (string) $refNumber,
                $extra->warehouse_id ? (int) $extra->warehouse_id : null,
                (string) $extra->movement_date,
                null,
                $refTypeStr === 'STOCK_ADJUSTMENT'
            );

            $rawMovements[] = [
                'type' => $isOut ? 'OUT' : 'IN',
                'date' => $exactTs,
                'date_ymd' => substr($exactTs, 0, 10),
                'full_date' => $exactTs,
                'sort_id' => (int) $extra->id,
                'doc_type' => (string) ($extra->reference_type ?: 'Stock Adjustment'),
                'doc_number' => $refNumber,
                'reference_no' => $refNumber,
                'history_doc_in' => $isOut ? '—' : $refNumber,
                'doc_out_ref' => $isOut ? $refNumber : '—',
                'warehouse' => $extra->warehouse_name ?: '—',
                'warehouse_id' => $extra->warehouse_id,
                'unit' => $itemUnit,
                'qty_in' => $isOut ? 0.0 : $qty,
                'qty_out' => $isOut ? $qty : 0.0,
                'job_number' => '—',
                'no_lot' => '—',
                'notes' => $extra->notes ?: '—',
            ];
        }

        // 7. Sort chronologically by full timestamp (YYYY-MM-DD HH:mm:ss)
        usort($rawMovements, function ($a, $b) {
            $cmp = strcmp($a['date'], $b['date']);
            if ($cmp !== 0) {
                return $cmp;
            }
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'IN' ? -1 : 1;
            }

            return $a['sort_id'] <=> $b['sort_id'];
        });

        // 8. Calculate opening balance and running ledger strictly from DB stock & movements
        if (! empty($warehouseId) && $warehouseId !== 'all' && $warehouseId !== 'All Warehouse') {
            $whPivot = DB::table('item_warehouse as iw')
                ->leftJoin('warehouses as w', 'iw.warehouses_id', '=', 'w.id')
                ->where('iw.items_id', $item->id)
                ->when(is_numeric($warehouseId), fn ($q) => $q->where('iw.warehouses_id', (int) $warehouseId), fn ($q) => $q->where('w.name', $warehouseId));
            $currentStock = $whPivot->exists()
                ? (float) $whPivot->sum('iw.quantity')
                : (float) DB::table('warehouse_stocks as ws')
                    ->leftJoin('warehouses as w', 'ws.warehouses_id', '=', 'w.id')
                    ->where('ws.items_id', $item->id)
                    ->when(is_numeric($warehouseId), fn ($q) => $q->where('ws.warehouses_id', (int) $warehouseId), fn ($q) => $q->where('w.name', $warehouseId))
                    ->sum('ws.quantity');
        } else {
            $hasPivotRows = DB::table('item_warehouse')->where('items_id', $item->id)->exists();
            $currentStock = $hasPivotRows
                ? (float) DB::table('item_warehouse')->where('items_id', $item->id)->sum('quantity')
                : (float) $item->stock;
        }

        $allInSum = 0.0;
        $allOutSum = 0.0;
        $priorInSum = 0.0;
        $priorOutSum = 0.0;
        $periodInSum = 0.0;
        $periodOutSum = 0.0;

        foreach ($rawMovements as $m) {
            $allInSum += $m['qty_in'];
            $allOutSum += $m['qty_out'];
            if ($m['date_ymd'] < $startDate) {
                $priorInSum += $m['qty_in'];
                $priorOutSum += $m['qty_out'];
            } elseif ($m['date_ymd'] <= $endDate) {
                $periodInSum += $m['qty_in'];
                $periodOutSum += $m['qty_out'];
            }
        }

        $baseline = $currentStock - $allInSum + $allOutSum;
        $beginningBalance = $baseline + $priorInSum - $priorOutSum;

        $runningBalance = $beginningBalance;
        $movements = [];

        foreach ($rawMovements as $m) {
            if ($m['date_ymd'] < $startDate) {
                continue;
            }
            if ($m['date_ymd'] > $endDate) {
                break;
            }

            $runningBalance += $m['qty_in'] - $m['qty_out'];

            $movements[] = [
                'id' => (string) (count($movements) + 1),
                'no' => count($movements) + 1,
                'date' => $m['date'],
                'doc_type' => $m['doc_type'],
                'doc_number' => $m['doc_number'],
                'reference_no' => $m['reference_no'],
                'history_doc_in' => $m['history_doc_in'],
                'doc_out_ref' => $m['doc_out_ref'],
                'warehouse' => $m['warehouse'],
                'unit' => $m['unit'],
                'qty_in' => $m['qty_in'],
                'qty_out' => $m['qty_out'],
                'balance' => $runningBalance,
                'job_number' => $m['job_number'],
                'no_lot' => $m['no_lot'],
                'notes' => $m['notes'],
            ];
        }

        // Order history newest-first while preserving chronologically calculated running balances & sequential row numbers.
        $movements = array_reverse($movements);
        foreach ($movements as $idx => &$movementRow) {
            $movementRow['no'] = $idx + 1;
        }
        unset($movementRow);

        return response()->json([
            'status' => 'success',
            'data' => [
                'item' => [
                    'id' => $item->id,
                    'code' => $item->code,
                    'name' => $item->name,
                    'unit' => $itemUnit,
                    'category' => $item->category?->name ?? '—',
                    'current_stock' => $currentStock,
                ],
                'summary' => [
                    'beginning_balance' => $beginningBalance,
                    'total_in' => $periodInSum,
                    'total_out' => $periodOutSum,
                    'ending_balance' => $runningBalance,
                ],
                'movements' => $movements,
            ],
        ]);
    }

    /**
     * Get Stock Item balance listing across inventory items.
     */
    public function stockItem(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $classification = $request->query('classification');
        $facility = $request->query('facility');
        $stockStatus = $request->query('stock');
        $warehouseId = $request->query('warehouseId');

        $query = DB::table('item_warehouse as iw')
            ->join('items as i', 'iw.items_id', '=', 'i.id')
            ->join('warehouses as w', 'iw.warehouses_id', '=', 'w.id')
            ->leftJoin('categories as cat', 'i.categories_id', '=', 'cat.id')
            ->leftJoin('classifications as cls', 'i.classifications_id', '=', 'cls.id')
            ->leftJoin('facilities as fac', 'i.facilities_id', '=', 'fac.id')
            ->leftJoin('units_of_measurements as u', 'i.units_of_measurements_id', '=', 'u.id')
            ->select([
                'i.id as item_id',
                'i.code as materialCode',
                'i.external_code as externalCode',
                'i.name as materialItem',
                DB::raw('COALESCE(cls.name, cat.name) as classification'),
                'cat.name as category_name',
                'fac.name as facility',
                'iw.warehouses_id as warehouse_id',
                'w.name as warehouseName',
                'u.code as unit_code',
                'u.name as unit_name',
                'iw.quantity',
                'iw.quantity as availableQty',
                DB::raw('0 as pendingQty'),
                DB::raw("'—' as coordinate"),
                DB::raw("'Warehouse' as locationType"),
                DB::raw('NULL as lotNumber'),
                'iw.updated_at as last_movement_date',
                DB::raw('0 as minimum_stock'),
            ])
            ->whereNull('i.deleted_at')
            ->whereNull('w.deleted_at');

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('i.name', 'like', "%{$search}%")
                    ->orWhere('i.code', 'like', "%{$search}%")
                    ->orWhere('i.external_code', 'like', "%{$search}%");
            });
        }

        if (! empty($classification) && $classification !== 'All Classifications') {
            $query->where(function ($q) use ($classification) {
                $q->where('cls.name', $classification)->orWhere('cat.name', $classification);
            });
        }

        if (! empty($facility) && $facility !== 'All Facilities') {
            if (stripos($facility, 'non') !== false) {
                $query->where('fac.name', 'like', '%non%');
            } else {
                $query->where('fac.name', 'not like', '%non%');
            }
        }

        if (! empty($stockStatus) && $stockStatus !== 'All') {
            if ($stockStatus === 'Available') {
                $query->where('iw.quantity', '>', 0);
            } elseif ($stockStatus === 'Not Available') {
                $query->where('iw.quantity', '<=', 0);
            }
        }

        if (! empty($warehouseId) && $warehouseId !== 'all' && $warehouseId !== 'All Warehouse') {
            if (is_numeric($warehouseId)) {
                $query->where('iw.warehouses_id', (int) $warehouseId);
            } else {
                $query->where('w.name', $warehouseId);
            }
        }

        $stockRows = $query->orderBy('i.code')->orderBy('w.name')->get();

        $records = $stockRows->groupBy('item_id')->map(function ($rows) {
            $item = $rows->first();
            $warehouseBalances = $rows->map(function ($row) {
                return [
                    'warehouseId' => $row->warehouse_id ? (int) $row->warehouse_id : null,
                    'warehouseName' => $row->warehouseName ?: '—',
                    'quantity' => (float) $row->quantity,
                    'availableQuantity' => (float) ($row->availableQty ?? $row->quantity),
                    'allocatedQuantity' => (float) ($row->pendingQty ?? 0),
                    'coordinate' => $row->coordinate ?: '—',
                    'locationType' => $row->locationType ?: 'Warehouse',
                    'lastMovementDate' => $row->last_movement_date
                        ? substr((string) $row->last_movement_date, 0, 10)
                        : '—',
                    'lotNumber' => $row->lotNumber ?: '—',
                ];
            })->values();
            $stock = (float) $warehouseBalances->sum('quantity');
            $available = (float) $warehouseBalances->sum('availableQuantity');
            $allocated = (float) $warehouseBalances->sum('allocatedQuantity');
            $minStock = (float) ($item->minimum_stock ?? 0);
            $status = $stock <= 0
                ? 'Out of Stock'
                : ($minStock > 0 && $stock <= $minStock ? 'Low Stock' : 'In Stock');
            $stockStatusLabel = $stock > 0 ? 'Available' : 'Not Available';
            $unit = $item->unit_code ?: ($item->unit_name ?: '—');

            return [
                'id' => (string) $item->item_id,
                'item_id' => (int) $item->item_id,
                'item_code' => $item->materialCode,
                'materialCode' => $item->materialCode,
                'item_name' => $item->materialItem,
                'materialItem' => $item->materialItem,
                'external_code' => $item->externalCode ?: '—',
                'externalCode' => $item->externalCode ?: '—',
                'category' => $item->category_name ?: ($item->classification ?: '—'),
                'classification' => $item->classification ?: '—',
                'facility' => (stripos((string) ($item->facility ?? ''), 'non') !== false) ? 'NON FASILITAS' : 'FASILITAS',
                'unit' => $unit,
                'warehouseBalances' => $warehouseBalances,
                'current_stock' => $stock,
                'quantity' => $stock,
                'availableQty' => $available,
                'pendingQty' => $allocated,
                'minimum_stock' => $minStock,
                'status' => $status,
                'stockStatus' => $stockStatusLabel,
                'status_badge' => match ($status) {
                    'In Stock' => 'success',
                    'Low Stock' => 'warning',
                    default => 'danger',
                },
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'data' => $records,
            'meta' => [
                'total' => $records->count(),
            ],
        ]);
    }

    public function stockItemMovements(Request $request, int $itemId): JsonResponse
    {
        $query = DB::table('inventory_movements as im')
            ->leftJoin('warehouses as w', 'im.warehouses_id', '=', 'w.id')
            ->leftJoin('users as u', 'im.users_id', '=', 'u.id')
            ->where('im.items_id', $itemId)
            ->select([
                'im.id',
                'im.movement_type as movementType',
                'im.quantity',
                'im.balance_before as balanceBefore',
                'im.balance_after as balanceAfter',
                'im.reference_type as referenceType',
                'im.reference_number as referenceNumber',
                'im.notes',
                'im.created_at as date',
                'w.name as warehouseName',
                'u.name as userName',
            ]);

        if ($request->filled('warehouseId') && is_numeric($request->query('warehouseId'))) {
            $query->where('im.warehouses_id', (int) $request->query('warehouseId'));
        }

        $movements = $query->orderByDesc('im.created_at')
            ->orderByDesc('im.id')
            ->limit(100)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $movements,
            'meta' => ['total' => $movements->count()],
        ]);
    }

    /**
     * Receive Material Report (Inbound BPB & Receive Note physical receipts).
     */
    public function receiveMaterialReport(Request $request): JsonResponse
    {
        $startDate = $request->query('startDate');
        $endDate = $request->query('endDate');
        $warehouse = $request->query('warehouse');
        $search = trim((string) $request->query('search', ''));

        $rows = DB::table('bpb_receive_material as bpb')
            ->join('po_rn_to_bpb as pb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->join('purchase_order_has_receive_note as porn', 'pb.po_has_rn_id', '=', 'porn.id')
            ->leftJoin('receive_note as rn', 'porn.receive_note_id', '=', 'rn.id')
            ->leftJoin('purchase_order as po', 'porn.purchase_order_id', '=', 'po.id')
            ->leftJoin('supliers as sup', 'po.supliers_id', '=', 'sup.id')
            ->leftJoin('supliers as rnsup', 'rn.supliers_id', '=', 'rnsup.id')
            ->leftJoin('warehouses as w', 'pb.warehouses_id', '=', 'w.id')
            ->leftJoin('warehouse_coordinates as wc', 'pb.warehouse_coordinates_id', '=', 'wc.id')
            ->leftJoin('purchase_order_has_purchase_requisitions as poi', 'porn.po_has_items_id', '=', 'poi.id')
            ->leftJoin('purchase_requisitions_has_items as pri', 'poi.pr_has_items_id', '=', 'pri.id')
            ->leftJoin('items as it', function ($join) {
                $join->on('it.id', '=', DB::raw('COALESCE(poi.items_id, pri.items_id)'));
            })
            ->leftJoin('units_of_measurements as u', 'it.units_of_measurements_id', '=', 'u.id')
            ->whereNull('bpb.deleted_at')
            ->whereNull('pb.deleted_at')
            ->whereNull('porn.deleted_at')
            ->select([
                'bpb.id as bpb_id',
                'pb.id as mapping_id',
                'bpb.bpb_number',
                'bpb.source_type',
                'bpb.status',
                DB::raw('COALESCE(bpb.receive_date, rn.arrival_date, bpb.created_at) as movement_date'),
                'rn.rn_number',
                'po.po_number',
                'po.facility_status',
                DB::raw('COALESCE(sup.name, rnsup.name) as supplier_name'),
                'w.name as warehouse_name',
                'wc.name as coordinate_name',
                'it.code as item_code',
                DB::raw('COALESCE(it.name, porn.item_name) as item_name'),
                DB::raw('COALESCE(u.code, u.name) as unit'),
                'porn.quantity as gross_qty',
                'porn.rafaksi',
                'porn.dn_number',
            ])
            ->orderByDesc('bpb.id')
            ->get()
            ->map(function ($r, $idx) {
                $dateIso = $this->normalizeDateYmd((string) $r->movement_date);
                $gross = (float) ($r->gross_qty ?? 0);
                $raf = (float) ($r->rafaksi ?? 0);

                return [
                    'id' => (string) ($r->mapping_id ?? ($r->bpb_id.'-'.$idx)),
                    'bpb_number' => $r->bpb_number ?: '-',
                    'date' => $dateIso,
                    'source_type' => $r->source_type === 'PO' ? 'Direct PO' : 'Via RN',
                    'rn_number' => $r->rn_number ?: '-',
                    'po_number' => $r->po_number ?: '-',
                    'supplier' => $r->supplier_name ?: '-',
                    'facility' => $r->facility_status ?: 'FASILITAS',
                    'warehouse' => $r->warehouse_name ?: '-',
                    'coordinate' => $r->coordinate_name ?: '-',
                    'item_code' => $r->item_code ?: '-',
                    'item_name' => $r->item_name ?: '-',
                    'unit' => $r->unit ?: 'PCE',
                    'gross_qty' => $gross,
                    'rafaksi' => $raf,
                    'net_qty' => max(0.0, $gross - $raf),
                    'lot_number' => $r->dn_number ?: '-',
                    'status' => $r->status ?: 'Waiting for Approve 1',
                ];
            })
            ->filter(function ($r) use ($startDate, $endDate, $warehouse, $search) {
                if ($startDate && $r['date'] < $startDate) {
                    return false;
                }
                if ($endDate && $r['date'] > $endDate) {
                    return false;
                }
                if ($warehouse && $warehouse !== 'All Warehouse' && strcasecmp($r['warehouse'], $warehouse) !== 0) {
                    return false;
                }
                if ($search !== '') {
                    $q = strtolower($search);
                    $hay = strtolower("{$r['bpb_number']} {$r['rn_number']} {$r['po_number']} {$r['supplier']} {$r['item_code']} {$r['item_name']}");
                    if (! str_contains($hay, $q)) {
                        return false;
                    }
                }

                return true;
            })
            ->values()
            ->map(function ($r, $i) {
                $r['no'] = $i + 1;

                return $r;
            });

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    /**
     * Stock Transfer & Return Report (Transfer Stock Return + Material Issue Transfers).
     */
    public function stockTransferReport(Request $request): JsonResponse
    {
        $startDate = $request->query('startDate');
        $endDate = $request->query('endDate');
        $search = trim((string) $request->query('search', ''));

        $returns = DB::table('transfer_stock_return_items as ri')
            ->join('transfer_stock_returns as r', 'ri.transfer_stock_return_id', '=', 'r.id')
            ->leftJoin('items as i', 'ri.items_id', '=', 'i.id')
            ->leftJoin('units_of_measurements as u', 'i.units_of_measurements_id', '=', 'u.id')
            ->leftJoin('warehouses as w', 'r.warehouses_id', '=', 'w.id')
            ->leftJoin('request_material as rm', 'r.request_material_id', '=', 'rm.id')
            ->select([
                'ri.id',
                'r.return_number as doc_number',
                DB::raw('COALESCE(r.return_date, r.created_at) as movement_date'),
                'i.code as item_code',
                'i.name as item_name',
                DB::raw('COALESCE(u.code, u.name) as unit'),
                'ri.quantity',
                'w.name as warehouse_name',
                'rm.request_number as ref_number',
                'r.job_number',
                'r.status',
                'r.note',
            ])
            ->get()
            ->map(fn ($r) => [
                'id' => 'tsr-'.$r->id,
                'doc_type' => 'Transfer Stock Return',
                'doc_number' => $r->doc_number,
                'date' => $this->normalizeDateYmd((string) $r->movement_date),
                'item_code' => $r->item_code ?: '-',
                'item_name' => $r->item_name ?: '-',
                'unit' => $r->unit ?: 'PCE',
                'quantity' => (float) $r->quantity,
                'warehouse' => $r->warehouse_name ?: '-',
                'destination' => $r->ref_number ? "Return from {$r->ref_number}" : 'Warehouse Return',
                'job_number' => $r->job_number ?: '-',
                'status' => $r->status ?: 'Waiting for Approve 1',
                'note' => $r->note ?: '-',
            ]);

        $issues = DB::table('request_material_item as rmi')
            ->join('request_material as rm', 'rmi.request_material_id', '=', 'rm.id')
            ->leftJoin('items as i', 'rmi.items_id', '=', 'i.id')
            ->leftJoin('units_of_measurements as u', 'i.units_of_measurements_id', '=', 'u.id')
            ->leftJoin('warehouses as w', 'rm.warehouses_id', '=', 'w.id')
            ->leftJoin('destination_location as dl', 'rm.destination_location_id', '=', 'dl.id')
            ->leftJoin('departments as dept', 'rm.departments_id', '=', 'dept.id')
            ->whereNull('rm.deleted_at')
            ->whereNull('rmi.deleted_at')
            ->select([
                'rm.id as rm_id',
                'rmi.items_id as item_id',
                'rm.request_number as doc_number',
                DB::raw('COALESCE(rm.request_date, rm.created_at) as movement_date'),
                'i.code as item_code',
                'i.name as item_name',
                DB::raw('COALESCE(u.code, u.name) as unit'),
                'rmi.request as quantity',
                'w.name as warehouse_name',
                'dl.name as destination_name',
                'dept.name as department_name',
                'rm.job_number',
                'rm.status',
                'rm.note',
            ])
            ->get()
            ->map(fn ($r, $idx) => [
                'id' => "rm-{$r->rm_id}-{$r->item_id}-{$idx}",
                'doc_type' => 'Material Transfer / Request',
                'doc_number' => $r->doc_number,
                'date' => $this->normalizeDateYmd((string) $r->movement_date),
                'item_code' => $r->item_code ?: '-',
                'item_name' => $r->item_name ?: '-',
                'unit' => $r->unit ?: 'PCE',
                'quantity' => (float) $r->quantity,
                'warehouse' => $r->warehouse_name ?: '-',
                'destination' => $r->destination_name ?: ($r->department_name ?: 'Production Floor'),
                'job_number' => $r->job_number ?: '-',
                'status' => $r->status ?: 'Waiting for Approve 1',
                'note' => $r->note ?: '-',
            ]);

        $rows = $returns->concat($issues)
            ->sortByDesc('date')
            ->filter(function ($r) use ($startDate, $endDate, $search) {
                if ($startDate && $r['date'] < $startDate) {
                    return false;
                }
                if ($endDate && $r['date'] > $endDate) {
                    return false;
                }
                if ($search !== '') {
                    $q = strtolower($search);
                    $hay = strtolower("{$r['doc_number']} {$r['doc_type']} {$r['item_code']} {$r['item_name']} {$r['warehouse']} {$r['destination']}");
                    if (! str_contains($hay, $q)) {
                        return false;
                    }
                }

                return true;
            })
            ->values()
            ->map(function ($r, $i) {
                $r['no'] = $i + 1;

                return $r;
            });

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    /**
     * Stock Mutation Report (Opening + In - Out = Ending per item over date range).
     */
    public function stockMutationReport(Request $request): JsonResponse
    {
        $startDate = $request->query('startDate', date('Y-m-01'));
        $endDate = $request->query('endDate', date('Y-m-d'));
        $search = trim((string) $request->query('search', ''));

        $items = DB::table('items as i')
            ->leftJoin('units_of_measurements as u', 'i.units_of_measurements_id', '=', 'u.id')
            ->leftJoin('classifications as cls', 'i.classifications_id', '=', 'cls.id')
            ->leftJoin('facilities as fac', 'i.facilities_id', '=', 'fac.id')
            ->whereNull('i.deleted_at')
            ->select([
                'i.id',
                'i.code',
                'i.name',
                'i.stock',
                DB::raw('COALESCE(u.code, u.name) as unit'),
                'cls.name as classification',
                'fac.name as facility',
            ])
            ->orderBy('i.code')
            ->get();

        // Aggregate Inbound (BPB Approved) per item
        $bpbInbounds = DB::table('purchase_order_has_receive_note as porn')
            ->join('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->leftJoin('purchase_order_has_purchase_requisitions as poi', 'porn.po_has_items_id', '=', 'poi.id')
            ->leftJoin('purchase_requisitions_has_items as pri', 'poi.pr_has_items_id', '=', 'pri.id')
            ->whereIn('bpb.status', ['Approved', 'Approved 2'])
            ->whereNull('bpb.deleted_at')
            ->whereNull('pb.deleted_at')
            ->whereNull('porn.deleted_at')
            ->select([
                DB::raw('COALESCE(poi.items_id, pri.items_id) as item_id'),
                'porn.item_name',
                'porn.quantity',
                'porn.rafaksi',
                DB::raw('COALESCE(bpb.receive_date, bpb.created_at) as movement_date'),
            ])
            ->get();

        // Aggregate Outbound (Request Material Approved) per item
        $rmOutbounds = DB::table('request_material_item as rmi')
            ->join('request_material as rm', 'rmi.request_material_id', '=', 'rm.id')
            ->whereIn('rm.status', ['Approved', 'Approved 2'])
            ->whereNull('rm.deleted_at')
            ->whereNull('rmi.deleted_at')
            ->select([
                'rmi.items_id as item_id',
                'rmi.request as qty',
                DB::raw('COALESCE(rm.request_date, rm.created_at) as movement_date'),
            ])
            ->get();

        // Aggregate Return Inbound (Transfer Stock Return Approved)
        $tsrInbounds = DB::table('transfer_stock_return_items as ri')
            ->join('transfer_stock_returns as r', 'ri.transfer_stock_return_id', '=', 'r.id')
            ->whereIn('r.status', ['Approved', 'Approved 2'])
            ->select([
                'ri.items_id as item_id',
                'ri.quantity as qty',
                DB::raw('COALESCE(r.return_date, r.created_at) as movement_date'),
            ])
            ->get();

        $itemById = $items->keyBy('id');
        $idByName = [];
        foreach ($items as $it) {
            $idByName[strtolower(trim((string) $it->name))] = $it->id;
            $idByName[strtolower(trim((string) $it->code))] = $it->id;
        }

        $statsByItem = [];
        $initStat = fn () => ['all_in' => 0.0, 'all_out' => 0.0, 'prior_in' => 0.0, 'prior_out' => 0.0, 'period_in' => 0.0, 'period_out' => 0.0];

        foreach ($bpbInbounds as $in) {
            $itemId = $in->item_id ?: ($idByName[strtolower(trim((string) $in->item_name))] ?? null);
            if (! $itemId || ! $itemById->has($itemId)) {
                continue;
            }
            if (! isset($statsByItem[$itemId])) {
                $statsByItem[$itemId] = $initStat();
            }
            $qty = max(0.0, (float) $in->quantity - (float) $in->rafaksi);
            $d = $this->normalizeDateYmd((string) $in->movement_date);
            $statsByItem[$itemId]['all_in'] += $qty;
            if ($d < $startDate) {
                $statsByItem[$itemId]['prior_in'] += $qty;
            } elseif ($d <= $endDate) {
                $statsByItem[$itemId]['period_in'] += $qty;
            }
        }

        foreach ($tsrInbounds as $in) {
            $itemId = $in->item_id;
            if (! $itemId || ! $itemById->has($itemId)) {
                continue;
            }
            if (! isset($statsByItem[$itemId])) {
                $statsByItem[$itemId] = $initStat();
            }
            $qty = max(0.0, (float) $in->qty);
            $d = $this->normalizeDateYmd((string) $in->movement_date);
            $statsByItem[$itemId]['all_in'] += $qty;
            if ($d < $startDate) {
                $statsByItem[$itemId]['prior_in'] += $qty;
            } elseif ($d <= $endDate) {
                $statsByItem[$itemId]['period_in'] += $qty;
            }
        }

        foreach ($rmOutbounds as $out) {
            $itemId = $out->item_id;
            if (! $itemId || ! $itemById->has($itemId)) {
                continue;
            }
            if (! isset($statsByItem[$itemId])) {
                $statsByItem[$itemId] = $initStat();
            }
            $qty = max(0.0, (float) $out->qty);
            $d = $this->normalizeDateYmd((string) $out->movement_date);
            $statsByItem[$itemId]['all_out'] += $qty;
            if ($d < $startDate) {
                $statsByItem[$itemId]['prior_out'] += $qty;
            } elseif ($d <= $endDate) {
                $statsByItem[$itemId]['period_out'] += $qty;
            }
        }

        $rows = collect();
        foreach ($items as $it) {
            $st = $statsByItem[$it->id] ?? $initStat();
            $currentStock = (float) $it->stock;
            if ($currentStock <= 0 && $st['all_in'] <= 0 && $st['all_out'] <= 0) {
                continue;
            }
            $baseline = $currentStock - $st['all_in'] + $st['all_out'];
            $opening = $baseline + $st['prior_in'] - $st['prior_out'];
            $ending = $opening + $st['period_in'] - $st['period_out'];

            if ($search !== '') {
                $q = strtolower($search);
                $hay = strtolower("{$it->code} {$it->name} {$it->classification} {$it->facility}");
                if (! str_contains($hay, $q)) {
                    continue;
                }
            }

            $rows->push([
                'id' => (string) $it->id,
                'item_code' => $it->code ?: '-',
                'item_name' => $it->name,
                'classification' => $it->classification ?: '-',
                'facility' => $it->facility ?: 'FASILITAS',
                'unit' => $it->unit ?: 'PCE',
                'opening' => round($opening, 4),
                'total_in' => round($st['period_in'], 4),
                'total_out' => round($st['period_out'], 4),
                'ending' => round($ending, 4),
                'current_stock' => round($currentStock, 4),
            ]);
        }

        $rows = $rows->values()->map(function ($r, $i) {
            $r['no'] = $i + 1;

            return $r;
        });

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    /**
     * Outstanding Material Requests Report (Request Materials pending or awaiting return/fulfillment).
     */
    public function outstandingRequestReport(Request $request): JsonResponse
    {
        $startDate = $request->query('startDate');
        $endDate = $request->query('endDate');
        $search = trim((string) $request->query('search', ''));

        $returnedByRmItem = DB::table('transfer_stock_return_items as ri')
            ->join('transfer_stock_returns as r', 'ri.transfer_stock_return_id', '=', 'r.id')
            ->where('r.status', '!=', 'Rejected')
            ->selectRaw('ri.items_id, r.request_material_id, SUM(ri.quantity) as returned_qty')
            ->groupBy('ri.items_id', 'r.request_material_id')
            ->get()
            ->keyBy(fn ($r) => "{$r->request_material_id}-{$r->items_id}");

        $rows = DB::table('request_material_item as rmi')
            ->join('request_material as rm', 'rmi.request_material_id', '=', 'rm.id')
            ->leftJoin('items as i', 'rmi.items_id', '=', 'i.id')
            ->leftJoin('units_of_measurements as u', 'i.units_of_measurements_id', '=', 'u.id')
            ->leftJoin('warehouses as w', 'rm.warehouses_id', '=', 'w.id')
            ->leftJoin('departments as dept', 'rm.departments_id', '=', 'dept.id')
            ->leftJoin('destination_location as dl', 'rm.destination_location_id', '=', 'dl.id')
            ->whereNull('rm.deleted_at')
            ->whereNull('rmi.deleted_at')
            ->select([
                'rm.id as rm_id',
                'rm.request_number',
                DB::raw('COALESCE(rm.request_date, rm.created_at) as movement_date'),
                'rm.status',
                'rm.job_number',
                'i.id as item_id',
                'i.code as item_code',
                'i.name as item_name',
                DB::raw('COALESCE(u.code, u.name) as unit'),
                'rmi.request as requested_qty',
                'w.name as warehouse_name',
                'dept.name as department_name',
                'dl.name as destination_name',
                'rm.note',
            ])
            ->orderByDesc('rm.id')
            ->get()
            ->map(function ($r, $idx) use ($returnedByRmItem) {
                $retObj = $returnedByRmItem->get("{$r->rm_id}-{$r->item_id}");
                $returned = (float) ($retObj?->returned_qty ?? 0);
                $requested = (float) $r->requested_qty;
                $isApproved = in_array($r->status, ['Approved', 'Approved 2'], true);

                return [
                    'id' => "out-{$r->rm_id}-{$r->item_id}-{$idx}",
                    'request_number' => $r->request_number,
                    'date' => $this->normalizeDateYmd((string) $r->movement_date),
                    'department' => $r->department_name ?: '-',
                    'warehouse' => $r->warehouse_name ?: '-',
                    'destination' => $r->destination_name ?: '-',
                    'item_code' => $r->item_code ?: '-',
                    'item_name' => $r->item_name ?: '-',
                    'unit' => $r->unit ?: 'PCE',
                    'requested_qty' => $requested,
                    'issued_qty' => $isApproved ? $requested : 0.0,
                    'returned_qty' => $returned,
                    'outstanding_qty' => $isApproved ? 0.0 : $requested,
                    'job_number' => $r->job_number ?: '-',
                    'status' => $r->status ?: 'Waiting for Approve 1',
                    'note' => $r->note ?: '-',
                ];
            })
            ->filter(function ($r) use ($startDate, $endDate, $search) {
                if ($startDate && $r['date'] < $startDate) {
                    return false;
                }
                if ($endDate && $r['date'] > $endDate) {
                    return false;
                }
                if ($search !== '') {
                    $q = strtolower($search);
                    $hay = strtolower("{$r['request_number']} {$r['item_code']} {$r['item_name']} {$r['department']} {$r['warehouse']}");
                    if (! str_contains($hay, $q)) {
                        return false;
                    }
                }

                return true;
            })
            ->values()
            ->map(function ($r, $i) {
                $r['no'] = $i + 1;

                return $r;
            });

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }
}
