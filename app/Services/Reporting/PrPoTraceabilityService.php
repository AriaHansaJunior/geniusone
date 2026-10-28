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
            'items.requisitionItem.item.unitOfMeasurement',
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
            })->filter()->unique('pr_id')->values();

            foreach ($po->items as $poItem) {
                // Find all physical RN receipts for this PO item
                $rnReceipts = $po->receiveNotes->filter(function ($rnItem) use ($poItem) {
                    return $rnItem->item_name === $poItem->item?->name;
                });

                $totalGateReceived = (float) $rnReceipts->sum('quantity');
                $totalRafaksi = (float) $rnReceipts->sum('rafaksi');
                $netReceived = $totalGateReceived - $totalRafaksi;
                $orderedQty = (float) $poItem->quantity;
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
                    'currency' => $po->currency?->name ?? 'IDR',
                    'linked_prs' => $linkedPrs,
                    'item_id' => $poItem->items_id,
                    'item_code' => $poItem->item?->code,
                    'item_name' => $poItem->item?->name,
                    'unit' => $poItem->item?->unitOfMeasurement?->name ?? 'PCS',
                    'ordered_quantity' => $orderedQty,
                    'price' => (float) $poItem->price,
                    'gate_received_quantity' => $totalGateReceived,
                    'rafaksi_deducted' => $totalRafaksi,
                    'net_received_quantity' => $netReceived,
                    'outstanding_quantity' => $outstanding,
                    'fulfillment_status' => $fulfillmentStatus,
                    'rn_count' => $rnReceipts->count(),
                    'bpb_details' => $bpbDetails->unique('bpb_number')->values(),
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
        $totalPrCount = PurchaseRequisition::count();
        $approvedPrCount = PurchaseRequisition::whereIn('status', ['Approved 1', 'Approved 2'])->count();

        $totalPoCount = PurchaseOrder::count();
        $approvedPoCount = PurchaseOrder::whereHas('approvals', fn ($q) => $q->where('status', 1))->count();
        $totalPoValue = (float) DB::table('purchase_order_has_purchase_requisitions')->sum('grand_total');

        $totalRnCount = ReceiveNote::count();
        $totalBpbCount = BpbReceiveMaterial::count();

        // Calculate outstanding items count
        $allPoLines = (float) DB::table('purchase_order_has_purchase_requisitions')->sum('order');
        $allReceivedLines = (float) DB::table('purchase_order_has_receive_note')->sum('quantity');
        $allRafaksi = (float) DB::table('purchase_order_has_receive_note')->sum('rafaksi');
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
