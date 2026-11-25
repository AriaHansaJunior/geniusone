<?php

namespace App\Services\Reporting;

use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PrPoTraceabilityService
{
    /**
     * Get end-to-end traceability matrix for PR -> PO -> RN -> BPB.
     *
     * @param  array  $filters  ['pr_id', 'po_id', 'supplier_id', 'date_from', 'date_to', 'status']
     */
    public function getTraceabilityMatrix(array $filters = []): Collection
    {
        $query = PurchaseOrder::with([
            'supplier',
            'valuta',
            'items.directItem.unitOfMeasurement',
            'items.directItem.facility',
            'items.requisitionItem.item.unitOfMeasurement',
            'items.requisitionItem.item.facility',
            'items.requisitionItem.purchaseRequisition',
            'receiveNotes.receiveNote',
            'receiveNotes.bpbMappings.bpbReceiveMaterial',
            'receiveNotes.bpbMappings.warehouse',
            'approvals',
        ]);

        if (! empty($filters['po_id'])) {
            $query->where('id', $filters['po_id']);
        }

        if (! empty($filters['po_number'])) {
            $query->where('po_number', 'like', "%{$filters['po_number']}%");
        }

        if (! empty($filters['supplier_id'])) {
            $query->where('supliers_id', $filters['supplier_id']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $purchaseOrders = $query->get();

        $matrix = collect();

        foreach ($purchaseOrders as $po) {
            // Find linked PRs
            $linkedPrs = $po->items->map(function ($poItem) {
                $pr = $poItem->requisitionItem?->purchaseRequisition;
                if (! $pr) {
                    return null;
                }

                return [
                    'pr_id' => $pr->id,
                    'pr_number' => $pr->pr_number,
                    'pr_date' => $pr->date,
                    'pr_status' => $pr->status,
                ];
            })->filter()->unique('pr_id')->values()->all();

            foreach ($po->items as $poItem) {
                $resolvedItem = $poItem->directItem ?? $poItem->item;
                // Find all non-rejected physical RN receipts for this PO item
                $rnReceipts = $po->receiveNotes->filter(function ($rnItem) use ($poItem, $resolvedItem) {
                    if ($rnItem->receiveNote && $rnItem->receiveNote->status === 'Rejected') {
                        return false;
                    }
                    if (! empty($rnItem->po_has_items_id)) {
                        return (int) $rnItem->po_has_items_id === (int) $poItem->id;
                    }
                    $candidateNames = array_filter([$resolvedItem?->name, $poItem->item_alias]);

                    return in_array($rnItem->item_name, $candidateNames, true);
                });

                $totalGateReceived = (float) $rnReceipts->sum('quantity');
                $totalRafaksi = (float) $rnReceipts->sum('rafaksi');
                $netReceived = $totalGateReceived - $totalRafaksi;
                $orderedQty = (float) ($poItem->order ?? $poItem->quantity ?? 0);
                $outstanding = max(0, $orderedQty - $netReceived);

                // Determine fulfillment status
                if ($totalGateReceived == 0) {
                    $fulfillmentStatus = 'ORDERED'; // Awaiting delivery
                } elseif ($netReceived < $orderedQty) {
                    $fulfillmentStatus = 'PARTIAL_RECEIVED';
                } elseif ($netReceived == $orderedQty) {
                    $fulfillmentStatus = 'FULLY_RECEIVED';
                } else {
                    $fulfillmentStatus = 'OVER_RECEIVED';
                }

                // Apply status filter if specified
                if (! empty($filters['status']) && $filters['status'] !== $fulfillmentStatus) {
                    continue;
                }

                // Collect BPB and Warehouse allocations
                $bpbDetails = collect();
                foreach ($rnReceipts as $receipt) {
                    foreach ($receipt->bpbMappings as $bpbMap) {
                        $bpbDetails->push([
                            'bpb_number' => $bpbMap->bpbReceiveMaterial?->bpb_number,
                            'receive_date' => $bpbMap->bpbReceiveMaterial?->receive_date,
                            'warehouse_id' => $bpbMap->warehouses_id,
                            'warehouse_name' => $bpbMap->warehouse?->name,
                        ]);
                    }
                }

                $matrix->push([
                    'po_id' => $po->id,
                    'po_number' => $po->po_number,
                    'po_date' => $po->created_at?->format('Y-m-d'),
                    'po_status' => $po->status,
                    'supplier_id' => $po->supliers_id,
                    'supplier_name' => $po->supplier?->name,
                    'currency' => $po->valuta?->code ?? $po->currency?->name ?? 'IDR',
                    'linked_prs' => $linkedPrs,
                    'item_id' => $resolvedItem?->id ?? $poItem->items_id,
                    'item_code' => $resolvedItem?->code,
                    'item_name' => $resolvedItem?->name ?? $poItem->item_alias,
                    'unit' => $resolvedItem?->unitOfMeasurement?->name ?? '',
                    'ordered_quantity' => $orderedQty,
                    'price' => (float) $poItem->price,
                    'gate_received_quantity' => $totalGateReceived,
                    'rafaksi_deducted' => $totalRafaksi,
                    'net_received_quantity' => $netReceived,
                    'outstanding_quantity' => $outstanding,
                    'fulfillment_status' => $fulfillmentStatus,
                    'rn_count' => $rnReceipts->count(),
                    'bpb_details' => $bpbDetails->unique('bpb_number')->values()->all(),
                ]);
            }
        }

        return $matrix;
    }

    /**
     * Get executive dashboard KPI summary for procurement & fulfillment.
     */
    public function getExecutiveSummary(): array
    {
        $totalPrCount = PurchaseRequisition::where('status', '!=', 'Rejected')->count();
        $approvedPrCount = PurchaseRequisition::whereIn('status', ['Approved', 'Approved 1', 'Approved 2', 'Ordered', 'Outstanding', 'Partial Closing'])->count();

        $totalPoCount = PurchaseOrder::where('status', '!=', 'Rejected')->count();
        $approvedPoCount = PurchaseOrder::whereIn('status', ['Approved', 'Approved 1', 'Approved 2', 'Completed'])->count();

        $orderColumn = DB::connection()->getQueryGrammar()->wrap('poi.order');
        $poTotals = DB::table('purchase_order_has_purchase_requisitions as poi')
            ->join('purchase_order as po', 'po.id', '=', 'poi.purchase_order_id')
            ->whereNull('poi.deleted_at')
            ->whereNull('po.deleted_at')
            ->where('po.status', '!=', 'Rejected')
            ->selectRaw("COALESCE(SUM(poi.grand_total), 0) as total_value, COALESCE(SUM({$orderColumn}), 0) as total_order")
            ->first();
        $totalPoValue = (float) ($poTotals->total_value ?? 0);
        $allPoLines = (float) ($poTotals->total_order ?? 0);

        $totalRnCount = ReceiveNote::where('status', '!=', 'Rejected')->count();
        $totalBpbCount = BpbReceiveMaterial::where('status', '!=', 'Rejected')->count();

        // Calculate outstanding items count excluding rejected and soft-deleted Receive Notes
        $rnTotals = DB::table('purchase_order_has_receive_note as porn')
            ->join('receive_note as rn', 'rn.id', '=', 'porn.receive_note_id')
            ->whereNull('porn.deleted_at')
            ->whereNull('rn.deleted_at')
            ->where('rn.status', '!=', 'Rejected')
            ->selectRaw('COALESCE(SUM(porn.quantity), 0) as qty_sum, COALESCE(SUM(porn.rafaksi), 0) as rafaksi_sum')
            ->first();
        $allReceivedLines = (float) ($rnTotals->qty_sum ?? 0);
        $allRafaksi = (float) ($rnTotals->rafaksi_sum ?? 0);
        $netReceived = $allReceivedLines - $allRafaksi;
        $totalOutstandingQty = max(0, $allPoLines - $netReceived);

        return [
            'pr' => [
                'total' => $totalPrCount,
                'approved' => $approvedPrCount,
                'pending' => $totalPrCount - $approvedPrCount,
            ],
            'po' => [
                'total' => $totalPoCount,
                'approved' => $approvedPoCount,
                'pending' => $totalPoCount - $approvedPoCount,
                'total_value' => $totalPoValue,
            ],
            'warehouse' => [
                'total_rn' => $totalRnCount,
                'total_bpb' => $totalBpbCount,
                'ordered_quantity' => (float) $allPoLines,
                'net_received_quantity' => (float) $netReceived,
                'outstanding_quantity' => (float) $totalOutstandingQty,
                'fulfillment_rate_percent' => $allPoLines > 0 ? round(($netReceived / $allPoLines) * 100, 2) : 0,
            ],
        ];
    }
}
