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
     */
    public function stockCard(Request $request): JsonResponse
    {
        $startDate = $request->query('startDate', date('Y-m-01'));
        $endDate = $request->query('endDate', date('Y-m-t'));
        $itemQuery = $request->query('itemCode');
        $warehouseId = $request->query('warehouseId');
        $unit = $request->query('unit');

        // Locate item
        $item = null;
        if (! empty($itemQuery)) {
            $item = Item::where('code', $itemQuery)
                ->orWhere('id', is_numeric($itemQuery) ? (int) $itemQuery : 0)
                ->orWhere('name', 'like', "%{$itemQuery}%")
                ->first();
        }

        if (! $item) {
            $item = Item::first();
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

        // Fetch actual inbound gate receipts (RN & BPB) matching the item
        $inbounds = DB::table('purchase_order_has_receive_note as porn')
            ->join('receive_note as rn', 'porn.receive_note_id', '=', 'rn.id')
            ->leftJoin('po_rn_to_bpb as pb', 'pb.po_has_rn_id', '=', 'porn.id')
            ->leftJoin('bpb_receive_material as bpb', 'pb.bpb_receive_material_id', '=', 'bpb.id')
            ->leftJoin('warehouses as w', 'pb.warehouses_id', '=', 'w.id')
            ->where(function ($q) use ($item) {
                $q->where('porn.item_name', 'like', "%{$item->name}%")
                    ->orWhere('porn.item_name', 'like', "%{$item->code}%");
            })
            ->whereBetween('rn.arrival_date', ["{$startDate} 00:00:00", "{$endDate} 23:59:59"])
            ->select([
                'rn.id as rn_id',
                'rn.rn_number',
                'rn.arrival_date as date',
                'bpb.bpb_number',
                'porn.quantity as qty_in',
                'w.name as warehouse_name',
                'rn.note',
            ])
            ->get();

        $currentStock = (float) $item->stock;
        $totalIn = (float) $inbounds->sum('qty_in');
        $totalOut = 0.0;
        $beginningBalance = max(0.0, $currentStock - $totalIn + $totalOut);

        $runningBalance = $beginningBalance;
        $movements = [];

        foreach ($inbounds as $idx => $entry) {
            $qtyIn = (float) $entry->qty_in;
            $runningBalance += $qtyIn;

            $movements[] = [
                'id' => (string) ($idx + 1),
                'date' => substr($entry->date, 0, 10),
                'doc_type' => 'BPB Inbound',
                'doc_number' => $entry->bpb_number ?: $entry->rn_number ?: 'BPB-'.str_pad($entry->rn_id, 4, '0', STR_PAD_LEFT),
                'reference_no' => $entry->rn_number ?: '-',
                'warehouse' => $entry->warehouse_name ?: 'Main Warehouse',
                'unit' => $item->unit?->name ?? 'PCS',
                'qty_in' => $qtyIn,
                'qty_out' => 0.0,
                'balance' => $runningBalance,
                'notes' => $entry->note ?: 'Gate Inbound Arrival',
            ];
        }

        // If no transactional movements occurred in period, show baseline entry
        if (empty($movements)) {
            $movements[] = [
                'id' => '1',
                'date' => $startDate,
                'doc_type' => 'Beginning Balance',
                'doc_number' => 'BAL-INITIAL',
                'reference_no' => '-',
                'warehouse' => 'Main Warehouse',
                'unit' => $item->unit?->name ?? 'PCS',
                'qty_in' => 0.0,
                'qty_out' => 0.0,
                'balance' => $currentStock,
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
                    'total_in' => $totalIn,
                    'total_out' => $totalOut,
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
            ->with(['category', 'unit', 'brand']);

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

        $warehouses = Warehouse::where('status', 1)->pluck('name')->toArray();
        $defaultWh = ! empty($warehouses) ? $warehouses[0] : 'Main Warehouse';

        $records = $items->map(function ($item, $idx) use ($defaultWh) {
            $stock = (float) $item->stock;
            $minStock = 10.0;
            $status = $stock <= 0 ? 'Out of Stock' : ($stock < $minStock ? 'Low Stock' : 'In Stock');

            return [
                'id' => (string) $item->id,
                'no' => $idx + 1,
                'item_code' => $item->code,
                'item_name' => $item->name,
                'category' => $item->category?->name ?? 'General',
                'brand' => $item->brand?->name ?? '-',
                'unit' => $item->unit?->name ?? 'PCS',
                'warehouse' => $defaultWh,
                'current_stock' => $stock,
                'minimum_stock' => $minStock,
                'status' => $status,
                'status_badge' => match ($status) {
                    'In Stock' => 'success',
                    'Low Stock' => 'warning',
                    default => 'danger'
                },
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
