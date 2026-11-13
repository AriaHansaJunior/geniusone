<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Warehouse\Facility\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseReportApiController extends Controller
{
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
            'ri.quantity as qty_in',
            'ri.remark as item_remark',
            'r.note as return_note',
            'rm.request_number as rm_number',
            'w.name as warehouse_name',
            'w.id as warehouse_id',
        ])->get();

        $itemUnit = $item->unit?->code ?? $item->unit?->nama ?? $item->unit?->name ?? '—';

        // 5. Standardize all movements
        $rawMovements = [];

        foreach ($allInbounds as $in) {
            $qtyIn = max(0.0, (float) $in->quantity - (float) $in->rafaksi);
            $rawDate = substr((string) $in->movement_date, 0, 10) ?: date('Y-m-d');
            $whName = $in->warehouse_name ?: '—';

            $jobNum = $in->job_code ?: ($in->job_name ?: '—');

            $rawMovements[] = [
                'type' => 'IN',
                'date' => $rawDate,
                'full_date' => (string) $in->movement_date,
                'sort_id' => (int) $in->bpb_id,
                'doc_type' => 'Receive Material (BPB)',
                'doc_number' => $in->bpb_number ?: ($in->rn_number ?: '-'),
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
            $rawDate = substr((string) $out->movement_date, 0, 10) ?: date('Y-m-d');
            $whName = $out->warehouse_name ?: '—';

            $docRef = $out->request_number ?: '—';
            $desc = $out->rm_note ?: ($out->destination_name ?: ($out->department_name ?: '—'));
            $jobNum = $out->rm_job_number ?: ($out->department_name ?: '—');

            $rawMovements[] = [
                'type' => 'OUT',
                'date' => $rawDate,
                'full_date' => (string) $out->movement_date,
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
            $rawDate = substr((string) $ret->movement_date, 0, 10) ?: date('Y-m-d');
            $whName = $ret->warehouse_name ?: '—';

            $rawMovements[] = [
                'type' => 'IN',
                'date' => $rawDate,
                'full_date' => (string) $ret->movement_date,
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

        // 6. Sort chronologically
        usort($rawMovements, function ($a, $b) {
            $cmp = strcmp($a['date'], $b['date']);
            if ($cmp !== 0) {
                return $cmp;
            }
            $cmpDate = strcmp($a['full_date'], $b['full_date']);
            if ($cmpDate !== 0) {
                return $cmpDate;
            }
            if ($a['type'] !== $b['type']) {
                return $a['type'] === 'IN' ? -1 : 1;
            }

            return $a['sort_id'] <=> $b['sort_id'];
        });

        // 7. Calculate opening balance and running ledger strictly from DB stock & movements
        $currentStock = ! empty($warehouseId) && $warehouseId !== 'all' && $warehouseId !== 'All Warehouse'
            ? (float) DB::table('warehouse_stocks as ws')
                ->leftJoin('warehouses as w', 'ws.warehouses_id', '=', 'w.id')
                ->where('ws.items_id', $item->id)
                ->when(is_numeric($warehouseId), fn ($q) => $q->where('ws.warehouses_id', (int) $warehouseId), fn ($q) => $q->where('w.name', $warehouseId))
                ->sum('ws.quantity')
            : (float) $item->stock;

        $allInSum = 0.0;
        $allOutSum = 0.0;
        $priorInSum = 0.0;
        $priorOutSum = 0.0;
        $periodInSum = 0.0;
        $periodOutSum = 0.0;

        foreach ($rawMovements as $m) {
            $allInSum += $m['qty_in'];
            $allOutSum += $m['qty_out'];
            if ($m['date'] < $startDate) {
                $priorInSum += $m['qty_in'];
                $priorOutSum += $m['qty_out'];
            } elseif ($m['date'] <= $endDate) {
                $periodInSum += $m['qty_in'];
                $periodOutSum += $m['qty_out'];
            }
        }

        $baseline = $currentStock - $allInSum + $allOutSum;
        $beginningBalance = $baseline + $priorInSum - $priorOutSum;

        $runningBalance = $beginningBalance;
        $movements = [];

        foreach ($rawMovements as $m) {
            if ($m['date'] < $startDate) {
                continue;
            }
            if ($m['date'] > $endDate) {
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
        $coordinate = $request->query('coordinate');
        $facility = $request->query('facility');
        $location = $request->query('location');
        $stockStatus = $request->query('stock');
        $warehouseId = $request->query('warehouseId');

        $bufferSubquery = DB::table('stock_notifications')
            ->whereNull('deleted_at')
            ->where('status', 1)
            ->groupBy('items_id')
            ->selectRaw('items_id, MAX(buffer_quantity) as min_buffer');

        $query = DB::table('warehouse_stocks as ws')
            ->join('items as i', 'ws.items_id', '=', 'i.id')
            ->leftJoin('warehouses as w', 'ws.warehouses_id', '=', 'w.id')
            ->leftJoin('warehouse_coordinates as wc', 'ws.warehouse_coordinates_id', '=', 'wc.id')
            ->leftJoin('categories as cat', 'i.categories_id', '=', 'cat.id')
            ->leftJoin('classifications as cls', 'i.classifications_id', '=', 'cls.id')
            ->leftJoin('facilities as fac', 'i.facilities_id', '=', 'fac.id')
            ->leftJoin('units_of_measurements as u', 'i.units_of_measurements_id', '=', 'u.id')
            ->leftJoinSub($bufferSubquery, 'sn_agg', function ($join) {
                $join->on('sn_agg.items_id', '=', 'i.id');
            })
            ->select([
                'ws.id as stock_id',
                'i.id as item_id',
                'i.code as materialCode',
                'i.external_code as externalCode',
                'i.name as materialItem',
                DB::raw('COALESCE(cls.name, cat.name) as classification'),
                'cat.name as category_name',
                'fac.name as facility',
                'ws.warehouse_coordinates_id',
                DB::raw('COALESCE(wc.name, ws.coordinate_name) as coordinate'),
                'w.name as warehouseName',
                'w.id as warehouse_id',
                'ws.quantity',
                'ws.available_quantity as availableQty',
                'ws.allocated_quantity as pendingQty',
                'ws.lot_number as lotNumber',
                'ws.location_type as locationType',
                'ws.last_movement_date',
                'u.code as unit_code',
                'u.name as unit_name',
                DB::raw('COALESCE(sn_agg.min_buffer, 0) as minimum_stock'),
            ]);

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

        if (! empty($coordinate) && $coordinate !== 'All Coordinates') {
            $query->where(function ($q) use ($coordinate) {
                $q->where('wc.name', $coordinate)->orWhere('ws.coordinate_name', $coordinate);
            });
        }

        if (! empty($facility) && $facility !== 'All Facilities') {
            $query->where('fac.name', $facility);
        }

        if (! empty($location) && $location !== 'All') {
            $query->where('ws.location_type', $location);
        }

        if (! empty($stockStatus) && $stockStatus !== 'All') {
            if ($stockStatus === 'Available') {
                $query->where('ws.quantity', '>', 0);
            } elseif ($stockStatus === 'Not Available') {
                $query->where('ws.quantity', '<=', 0);
            }
        }

        if (! empty($warehouseId) && $warehouseId !== 'all' && $warehouseId !== 'All Warehouse') {
            if (is_numeric($warehouseId)) {
                $query->where('ws.warehouses_id', (int) $warehouseId);
            } else {
                $query->where('w.name', $warehouseId);
            }
        }

        $stockRows = $query->orderBy('i.code')->orderBy('w.name')->get();

        $records = $stockRows->values()->map(function ($it, $idx) {
            $stock = (float) $it->quantity;
            $minStock = (float) ($it->minimum_stock ?? 0);
            $status = $stock <= 0
                ? 'Out of Stock'
                : ($minStock > 0 && $stock <= $minStock ? 'Low Stock' : 'In Stock');
            $stockStatusLabel = $stock > 0 ? 'Available' : 'Not Available';
            $unit = $it->unit_code ?: ($it->unit_name ?: '—');

            return [
                'id' => (string) ($it->stock_id ?? $idx + 1),
                'item_id' => $it->item_id,
                'no' => $idx + 1,
                'number' => $idx + 1,
                'item_code' => $it->materialCode,
                'materialCode' => $it->materialCode,
                'item_name' => $it->materialItem,
                'materialItem' => $it->materialItem,
                'external_code' => $it->externalCode ?: '—',
                'externalCode' => $it->externalCode ?: '—',
                'category' => $it->category_name ?: ($it->classification ?: '—'),
                'classification' => $it->classification ?: '—',
                'facility' => $it->facility ?: '—',
                'warehouse_coordinates_id' => $it->warehouse_coordinates_id,
                'coordinate' => $it->coordinate ?: '—',
                'locationType' => $it->locationType ?: 'Warehouse',
                'unit' => $unit,
                'warehouse' => $it->warehouseName ?: '—',
                'warehouseName' => $it->warehouseName ?: '—',
                'warehouse_id' => $it->warehouse_id,
                'current_stock' => $stock,
                'quantity' => $stock,
                'availableQty' => (float) ($it->availableQty ?? $stock),
                'pendingQty' => (float) ($it->pendingQty ?? 0.0),
                'minimum_stock' => $minStock,
                'status' => $status,
                'stockStatus' => $stockStatusLabel,
                'status_badge' => match ($status) {
                    'In Stock' => 'success',
                    'Low Stock' => 'warning',
                    default => 'danger',
                },
                'date' => $it->last_movement_date ? substr((string) $it->last_movement_date, 0, 10) : '—',
                'lotNumber' => $it->lotNumber ?: '—',
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $records,
            'meta' => [
                'total' => $records->count(),
            ],
        ]);
    }
}
