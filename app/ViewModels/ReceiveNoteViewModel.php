<?php

namespace App\ViewModels;

use App\Models\Warehouse\GateReceiving\ReceiveNote;

class ReceiveNoteViewModel
{
    protected ReceiveNote $rn;

    public function __construct(ReceiveNote $rn)
    {
        $this->rn = $rn;
    }

    public static function fromModel(ReceiveNote $rn): self
    {
        return new self($rn);
    }

    public function toArray(): array
    {
        $currencyCode = $this->rn->currency?->name ?? 'IDR';

        return [
            'id' => $this->rn->id,
            'rn_number' => $this->rn->rn_number,
            'arrival_date' => $this->rn->arrival_date ? date('Y-m-d H:i', strtotime($this->rn->arrival_date)) : null,
            'formatted_arrival_date' => $this->rn->arrival_date ? date('d M Y H:i', strtotime($this->rn->arrival_date)) : '-',
            'license_plate' => $this->rn->license_plate ?? '-',
            'sj_number' => $this->rn->sj_number ?? '-',
            'sj_date' => $this->rn->sj_date ? date('d M Y', strtotime($this->rn->sj_date)) : '-',
            'invoice_number' => $this->rn->invoice_number ?? '-',
            'note' => $this->rn->note,
            'supplier' => [
                'id' => $this->rn->supliers_id,
                'name' => $this->rn->supplier?->name ?? '-',
            ],
            'items' => $this->rn->purchaseOrders->map(function ($poItem) use ($currencyCode) {
                $rawQty = (float) $poItem->quantity;
                $rafaksi = (float) $poItem->rafaksi;
                $netQty = $rawQty - $rafaksi;

                return [
                    'id' => $poItem->id,
                    'po_id' => $poItem->purchase_order_id,
                    'po_number' => $poItem->purchaseOrder?->po_number ?? '-',
                    'dn_number' => $poItem->dn_number,
                    'item_name' => $poItem->item_name,
                    'gross_quantity' => $rawQty,
                    'rafaksi' => $rafaksi,
                    'net_quantity' => $netQty,
                    'price' => (float) $poItem->price,
                    'formatted_price' => $currencyCode . ' ' . number_format((float) $poItem->price, 2),
                    'grand_total' => (float) $poItem->grand_total,
                    'formatted_grand_total' => $currencyCode . ' ' . number_format((float) $poItem->grand_total, 2),
                ];
            })->values()->toArray(),
            'total_items_count' => $this->rn->purchaseOrders->count(),
            'total_gross_quantity' => (float) $this->rn->purchaseOrders->sum('quantity'),
            'total_rafaksi' => (float) $this->rn->purchaseOrders->sum('rafaksi'),
            'total_net_quantity' => (float) ($this->rn->purchaseOrders->sum('quantity') - $this->rn->purchaseOrders->sum('rafaksi')),
            'approvals' => $this->rn->approvals->map(function ($appr) {
                return [
                    'tier' => (int) $appr->approval_ke,
                    'status' => $appr->status === 1 ? 'Approved' : ($appr->status === 2 ? 'Rejected' : 'Pending'),
                    'status_badge' => $appr->status === 1 ? 'success' : ($appr->status === 2 ? 'danger' : 'warning'),
                    'approver_name' => $appr->user?->name ?? '-',
                    'approved_at' => $appr->updated_at?->format('d M Y H:i'),
                ];
            })->values()->toArray(),
        ];
    }
}
