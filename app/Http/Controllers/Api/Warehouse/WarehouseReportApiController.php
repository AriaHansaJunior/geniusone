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
        }

        if (! $item) {
            $item = Item::with(['category', 'unit', 'brand', 'facility'])->first();
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

        // 2. Fetch Inbound physical receipts (BPB Receive Material)
        $inboundsQuery = DB::table('purchase_order_has_receive_note as porn')
            ->join('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->leftJoin('receive_note as rn', 'porn.receive_note_id', '=', 'rn.id')
            ->leftJoin('purchase_order as po', 'porn.purchase_order_id', '=', 'po.id')
            ->leftJoin('warehouses as w', 'pb.warehouses_id', '=', 'w.id')
            ->leftJoin('job_number as j', 'porn.job_number_id', '=', 'j.id')
            ->where('bpb.status', '!=', 'Rejected')
            ->where(function ($q) use ($item) {
                $q->where('porn.item_name', $item->name)
                    ->orWhere('porn.item_name', $item->code)
                    ->orWhere('porn.item_name', 'like', "%{$item->name}%")
                    ->orWhereRaw('? LIKE CONCAT("%", porn.item_name, "%")', [trim($item->name)]);
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
            'w.name as warehouse_name',
            'w.id as warehouse_id',
            'j.name as job_name',
            'bpb.note as bpb_note',
            'rn.note as rn_note',
        ])->get();

        // 3. Fetch Outbound issues (Request Material)
        $outboundsQuery = DB::table('request_material_item as rmi')
            ->join('request_material as rm', 'rmi.request_material_id', '=', 'rm.id')
            ->leftJoin('warehouses as w', 'rm.warehouses_id', '=', 'w.id')
            ->leftJoin('destination_location as dl', 'rm.destination_location_id', '=', 'dl.id')
            ->leftJoin('departments as dept', 'rm.departments_id', '=', 'dept.id')
            ->where('rmi.items_id', $item->id)
            ->where('rm.status', '!=', 'Rejected');

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
            DB::raw('COALESCE(rm.request_date, rm.created_at) as movement_date'),
            'rmi.request as qty_out',
            'w.name as warehouse_name',
            'w.id as warehouse_id',
            'dl.name as destination_name',
            'dept.name as department_name',
            'rm.note as rm_note',
            'rmi.remark as item_remark',
        ])->get();

        // 4. Fetch Returns from Request Material (Transfer Stock Return)
        $returnsQuery = DB::table('transfer_stock_return_items as ri')
            ->join('transfer_stock_returns as r', 'ri.transfer_stock_return_id', '=', 'r.id')
            ->leftJoin('warehouses as w', 'r.warehouses_id', '=', 'w.id')
            ->leftJoin('request_material as rm', 'r.request_material_id', '=', 'rm.id')
            ->where('ri.items_id', $item->id)
            ->where('r.status', '!=', 'Rejected');

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
            DB::raw('COALESCE(r.return_date, r.created_at) as movement_date'),
            'ri.quantity as qty_in',
            'ri.remark as item_remark',
            'r.note as return_note',
            'rm.request_number as rm_number',
            'w.name as warehouse_name',
            'w.id as warehouse_id',
        ])->get();

        // 5. Standardize all movements
        $rawMovements = [];

        foreach ($allInbounds as $in) {
            $qtyIn = max(0.0, (float) $in->quantity - (float) $in->rafaksi);
            $rawDate = substr((string) $in->movement_date, 0, 10) ?: date('Y-m-d');
            $whClean = trim(preg_replace('/\s+[A-Z][0-9]$/', '', (string) ($in->warehouse_name ?: 'Gudang Sparepart')));

            $jobNum = '—';
            if (! empty($in->item_remark) && preg_match('/JOB-[0-9\-]+/i', $in->item_remark, $jm)) {
                $jobNum = $jm[0];
            } elseif (! empty($in->job_name)) {
                $jobNum = $in->job_name;
            }

            $rawMovements[] = [
                'type' => 'IN',
                'date' => $rawDate,
                'full_date' => (string) $in->movement_date,
                'sort_id' => (int) $in->bpb_id,
                'doc_type' => 'Receive Material (BPB)',
                'doc_number' => $in->bpb_number ?: ($in->rn_number ?: 'BPB-'.str_pad($in->bpb_id, 4, '0', STR_PAD_LEFT)),
                'reference_no' => $in->bpb_number ?: ($in->rn_number ?: ($in->po_number ?: '-')),
                'history_doc_in' => $in->rn_number ?: ($in->po_number ? 'Direct PO: '.$in->po_number : '-'),
                'doc_out_ref' => '—',
                'warehouse' => $whClean,
                'warehouse_id' => $in->warehouse_id,
                'unit' => $item->unit?->name ?? 'PCE',
                'qty_in' => $qtyIn,
                'qty_out' => 0.0,
                'job_number' => $jobNum,
                'no_lot' => $in->dn_number ?: 'LOT-'.substr($rawDate, 0, 4),
                'notes' => $in->bpb_note ?: 'Receipt BPB from Supplier',
            ];
        }

        foreach ($allOutbounds as $out) {
            $qtyOut = (float) $out->qty_out;
            $rawDate = substr((string) $out->movement_date, 0, 10) ?: date('Y-m-d');
            $whClean = trim(preg_replace('/\s+[A-Z][0-9]$/', '', (string) ($out->warehouse_name ?: 'Gudang Sparepart')));

            $docRef = $out->request_number ?: 'REQ-'.str_pad($out->rm_id, 4, '0', STR_PAD_LEFT);
            $desc = $out->destination_name ?: ($out->department_name ?: 'Material Issue');
            if (preg_match('/^([^\:]+)\:\s*(.*)$/', (string) $out->rm_note, $matches)) {
                $docRef = trim($matches[1]);
                $desc = trim($matches[2]);
            } elseif (! empty($out->rm_note)) {
                $desc = $out->rm_note;
            }

            $jobNum = $out->department_name ?: '—';
            $noLot = '—';
            if (! empty($out->item_remark)) {
                $parts = array_map('trim', explode('|', $out->item_remark));
                foreach ($parts as $p) {
                    if (str_starts_with($p, 'JOB-')) {
                        $jobNum = $p;
                    } elseif (str_starts_with($p, 'LOT-')) {
                        $noLot = $p;
                    }
                }
            }

            $rawMovements[] = [
                'type' => 'OUT',
                'date' => $rawDate,
                'full_date' => (string) $out->movement_date,
                'sort_id' => (int) $out->rm_id,
                'doc_type' => 'Request Material (RM)',
                'doc_number' => $out->request_number ?: 'REQ-'.str_pad($out->rm_id, 4, '0', STR_PAD_LEFT),
                'reference_no' => $docRef,
                'history_doc_in' => '—',
                'doc_out_ref' => $out->request_number ?: '—',
                'warehouse' => $whClean,
                'warehouse_id' => $out->warehouse_id,
                'unit' => $item->unit?->name ?? 'PCE',
                'qty_in' => 0.0,
                'qty_out' => $qtyOut,
                'job_number' => $jobNum,
                'no_lot' => $noLot,
                'notes' => $desc,
            ];
        }

        foreach ($allReturns as $ret) {
            $qtyIn = (float) $ret->qty_in;
            $rawDate = substr((string) $ret->movement_date, 0, 10) ?: date('Y-m-d');
            $whClean = trim(preg_replace('/\s+[A-Z][0-9]$/', '', (string) ($ret->warehouse_name ?: 'Gudang Sparepart')));

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
                'warehouse' => $whClean,
                'warehouse_id' => $ret->warehouse_id,
                'unit' => $item->unit?->name ?? 'PCE',
                'qty_in' => $qtyIn,
                'qty_out' => 0.0,
                'job_number' => $ret->item_remark ?: '—',
                'no_lot' => 'LOT-RET-'.substr($rawDate, 0, 4),
                'notes' => $ret->return_note ?: 'Return from Request Material via Transfer Stock Return',
            ];
        }

        // 5. Sort chronologically (date, full_date, IN before OUT on same date, sort_id)
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

        // 6. Calculate opening balance and running ledger
        $currentStock = (float) $item->stock;
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

        // Baseline opening balance before all recorded movements
        $baseline = max(0.0, $currentStock - $allInSum + $allOutSum);
        // Beginning balance at startDate
        $beginningBalance = max(0.0, $baseline + $priorInSum - $priorOutSum);

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

        // If no transactional movements in period, provide opening balance entry
        if (empty($movements)) {
            $movements[] = [
                'id' => '1',
                'no' => 1,
                'date' => $startDate,
                'doc_type' => 'Beginning Balance',
                'doc_number' => 'BAL-INITIAL',
                'reference_no' => '-',
                'history_doc_in' => '-',
                'doc_out_ref' => '-',
                'warehouse' => $item->facility?->name ?? 'Main Warehouse',
                'unit' => $item->unit?->name ?? 'PCS',
                'qty_in' => 0.0,
                'qty_out' => 0.0,
                'balance' => $beginningBalance,
                'job_number' => '—',
                'no_lot' => 'LOT-INITIAL',
                'notes' => 'Period Opening Balance',
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'item' => [
                    'id' => $item->id,
                    'code' => $item->code,
                    'name' => $item->name,
                    'unit' => $item->unit?->name ?? 'PCS',
                    'category' => $item->category?->name ?? 'Raw Material',
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
        $location = $request->query('location'); // 'Warehouse', 'Production Area', 'All'
        $stockStatus = $request->query('stock'); // 'Available', 'Not Available', 'All'
        $warehouseId = $request->query('warehouseId');

        $query = DB::table('warehouse_stocks as ws')
            ->join('items as i', 'ws.items_id', '=', 'i.id')
            ->leftJoin('warehouses as w', 'ws.warehouses_id', '=', 'w.id')
            ->leftJoin('categories as cat', 'i.categories_id', '=', 'cat.id')
            ->leftJoin('facilities as fac', 'i.facilities_id', '=', 'fac.id')
            ->leftJoin('units_of_measurements as u', 'i.units_of_measurements_id', '=', 'u.id')
            ->select([
                'ws.id as stock_id',
                'i.id as item_id',
                'i.code as materialCode',
                'i.external_code as externalCode',
                'i.name as materialItem',
                'cat.name as classification',
                'fac.name as facility',
                'ws.coordinate_name as coordinate',
                'w.name as warehouseName',
                'w.id as warehouse_id',
                'ws.quantity',
                'ws.available_quantity as availableQty',
                'ws.allocated_quantity as pendingQty',
                'ws.lot_number as lotNumber',
                'ws.location_type as locationType',
                'ws.last_movement_date',
                'u.name as unit',
            ]);

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('i.name', 'like', "%{$search}%")
                    ->orWhere('i.code', 'like', "%{$search}%")
                    ->orWhere('i.external_code', 'like', "%{$search}%");
            });
        }

        if (! empty($classification) && $classification !== 'All Classifications') {
            $query->where('cat.name', $classification);
        }

        if (! empty($coordinate) && $coordinate !== 'All Coordinates') {
            $query->where('ws.coordinate_name', $coordinate);
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

        $stockRows = $query->get();

        // Priority order mapping to preserve standard ordering matching reference
        $priorityOrder = [
            '60.154.300.101' => 1,
            '60.149.301.404' => 2,
            '50.112.100.001' => 3,
            '50.112.100.002' => 4,
            '10.002.400.012' => 5,
            '20.100.005.001' => 6,
            '30.200.010.003' => 7,
            '40.301.002.005' => 8,
            '70.500.001.008' => 9,
        ];

        $sorted = $stockRows->sortBy(function ($row) use ($priorityOrder) {
            return $priorityOrder[$row->materialCode] ?? (100 + (int) $row->item_id);
        })->values();

        $records = $sorted->map(function ($it, $idx) {
            $stock = (float) $it->quantity;
            $minStock = 10.0;
            $status = $stock <= 0 ? 'Out of Stock' : ($stock < $minStock ? 'Low Stock' : 'In Stock');
            $stockStatus = $stock > 0 ? 'Available' : 'Not Available';
            $whClean = trim(preg_replace('/\s+[A-Z][0-9]$/', '', (string) ($it->warehouseName ?: 'Gudang Sparepart')));

            return [
                'id' => (string) ($it->stock_id ?? $idx + 1),
                'no' => $idx + 1,
                'number' => $idx + 1,
                'item_code' => $it->materialCode,
                'materialCode' => $it->materialCode,
                'item_name' => $it->materialItem,
                'materialItem' => $it->materialItem,
                'external_code' => $it->externalCode ?: '—',
                'externalCode' => $it->externalCode ?: '—',
                'category' => $it->classification ?: 'General',
                'classification' => $it->classification ?: 'General',
                'facility' => $it->facility ?: 'FASILITAS',
                'coordinate' => $it->coordinate ?: 'A-01-01',
                'locationType' => $it->locationType ?: 'Warehouse',
                'unit' => $it->unit ?: 'PCE',
                'warehouse' => $whClean,
                'warehouseName' => $whClean,
                'warehouse_id' => $it->warehouse_id,
                'current_stock' => $stock,
                'quantity' => $stock,
                'availableQty' => (float) ($it->availableQty ?? $stock),
                'pendingQty' => (float) ($it->pendingQty ?? 0.0),
                'minimum_stock' => $minStock,
                'status' => $status,
                'stockStatus' => $stockStatus,
                'status_badge' => match ($status) {
                    'In Stock' => 'success',
                    'Low Stock' => 'warning',
                    default => 'danger'
                },
                'date' => substr((string) ($it->last_movement_date ?: date('Y-m-d')), 0, 10),
                'lotNumber' => $it->lotNumber ?: 'LOT-'.date('Y'),
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
