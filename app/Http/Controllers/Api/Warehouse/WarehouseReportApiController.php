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
            DB::raw('COALESCE(bpb.receive_date, rn.arrival_date, bpb.created_at) as movement_date'),
            'rn.rn_number',
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

        // 4. Standardize all movements
        $rawMovements = [];

        foreach ($allInbounds as $in) {
            $qtyIn = max(0.0, (float) $in->quantity - (float) $in->rafaksi);
            $rawDate = substr((string) $in->movement_date, 0, 10) ?: date('Y-m-d');
            $rawMovements[] = [
                'type' => 'IN',
                'date' => $rawDate,
                'full_date' => (string) $in->movement_date,
                'sort_id' => (int) $in->bpb_id,
                'doc_type' => 'Receive Material (BPB)',
                'doc_number' => $in->bpb_number ?: ($in->rn_number ?: 'BPB-'.str_pad($in->bpb_id, 4, '0', STR_PAD_LEFT)),
                'reference_no' => $in->rn_number ?: '-',
                'history_doc_in' => $in->bpb_number ?: ($in->rn_number ?: '-'),
                'doc_out_ref' => '-',
                'warehouse' => $in->warehouse_name ?: 'Main Warehouse',
                'warehouse_id' => $in->warehouse_id,
                'unit' => $item->unit?->name ?? 'PCS',
                'qty_in' => $qtyIn,
                'qty_out' => 0.0,
                'job_number' => $in->job_name ?: '—',
                'no_lot' => $in->dn_number ?: 'LOT-'.substr($rawDate, 0, 4),
                'notes' => $in->bpb_note ?: ($in->rn_note ?: 'Warehouse Material Receipt (BPB)'),
            ];
        }

        foreach ($allOutbounds as $out) {
            $qtyOut = (float) $out->qty_out;
            $rawDate = substr((string) $out->movement_date, 0, 10) ?: date('Y-m-d');
            $ref = $out->destination_name ?: ($out->department_name ?: '-');
            $rawMovements[] = [
                'type' => 'OUT',
                'date' => $rawDate,
                'full_date' => (string) $out->movement_date,
                'sort_id' => (int) $out->rm_id,
                'doc_type' => 'Request Material (RM)',
                'doc_number' => $out->request_number ?: 'REQ-'.str_pad($out->rm_id, 4, '0', STR_PAD_LEFT),
                'reference_no' => $ref,
                'history_doc_in' => '-',
                'doc_out_ref' => $out->request_number ?: '-',
                'warehouse' => $out->warehouse_name ?: 'Main Warehouse',
                'warehouse_id' => $out->warehouse_id,
                'unit' => $item->unit?->name ?? 'PCS',
                'qty_in' => 0.0,
                'qty_out' => $qtyOut,
                'job_number' => $out->department_name ?: '—',
                'no_lot' => '-',
                'notes' => $out->rm_note ?: ($out->item_remark ?: 'Material Issue (Request Material)'),
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
        $categoryId = $request->query('categoryId');
        $warehouseId = $request->query('warehouseId');

        $query = Item::query()
            ->with(['category', 'unit', 'brand', 'facility']);

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if (! empty($categoryId)) {
            $query->where('categories_id', $categoryId);
        }

        $items = $query->orderBy('name')->get();

        // Map items to warehouses based on actual approved BPB material receipts
        $inboundWhMap = DB::table('po_rn_to_bpb as pb')
            ->join('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->join('purchase_order_has_receive_note as porn', 'pb.po_has_rn_id', '=', 'porn.id')
            ->join('warehouses as w', 'pb.warehouses_id', '=', 'w.id')
            ->whereIn('bpb.status', ['Approved', 'Approved 2'])
            ->select('porn.item_name', 'w.id as warehouse_id', 'w.name as warehouse_name')
            ->orderByDesc('pb.id')
            ->get()
            ->groupBy('item_name');

        $warehouses = Warehouse::where('status', 1)->pluck('name', 'id')->toArray();
        $defaultWh = ! empty($warehouses) ? array_values($warehouses)[0] : 'Main Warehouse';

        $records = $items->map(function ($item, $idx) use ($inboundWhMap, $defaultWh) {
            $stock = (float) $item->stock;
            $minStock = 10.0;
            $status = $stock <= 0 ? 'Out of Stock' : ($stock < $minStock ? 'Low Stock' : 'In Stock');
            $stockStatus = $stock > 0 ? 'Available' : 'Not Available';

            // Find matching warehouse from BPB receipts
            $matchingInbound = $inboundWhMap->get($item->name)?->first()
                ?? $inboundWhMap->first(fn ($group, $name) => str_contains($name, $item->name) || str_contains($item->name, $name))?->first();

            $whName = $matchingInbound?->warehouse_name ?? $defaultWh;
            $whId = $matchingInbound?->warehouse_id;
            $facilityName = $item->facility?->name ?? 'FASILITAS';
            $categoryName = $item->category?->name ?? 'General';
            $unitName = $item->unit?->name ?? 'PCS';

            return [
                'id' => (string) $item->id,
                'no' => $idx + 1,
                'number' => $idx + 1,
                'item_code' => $item->code,
                'materialCode' => $item->code,
                'item_name' => $item->name,
                'materialItem' => $item->name,
                'external_code' => $item->external_code ?? '-',
                'externalCode' => $item->external_code ?? '-',
                'category' => $categoryName,
                'classification' => $categoryName,
                'facility' => $facilityName,
                'coordinate' => 'A-01-01',
                'locationType' => 'Warehouse',
                'brand' => $item->brand?->name ?? '-',
                'unit' => $unitName,
                'warehouse' => $whName,
                'warehouseName' => $whName,
                'warehouse_id' => $whId,
                'current_stock' => $stock,
                'quantity' => $stock,
                'availableQty' => $stock,
                'pendingQty' => 0.0,
                'minimum_stock' => $minStock,
                'status' => $status,
                'stockStatus' => $stockStatus,
                'status_badge' => match ($status) {
                    'In Stock' => 'success',
                    'Low Stock' => 'warning',
                    default => 'danger'
                },
                'date' => date('Y-m-d'),
                'lotNumber' => 'LOT-'.date('Y'),
            ];
        });

        if (! empty($warehouseId) && $warehouseId !== 'all') {
            $records = $records->filter(function ($r) use ($warehouseId, $warehouses) {
                if (is_numeric($warehouseId)) {
                    return (int) $r['warehouse_id'] === (int) $warehouseId || ($warehouses[$warehouseId] ?? null) === $r['warehouse'];
                }

                return strtolower($r['warehouse']) === strtolower($warehouseId);
            })->values()->map(function ($r, $i) {
                $r['no'] = $i + 1;
                $r['number'] = $i + 1;

                return $r;
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $records,
            'meta' => [
                'total' => $records->count(),
            ],
        ]);
    }
}
