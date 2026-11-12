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

        $activeMappings = $this->rn->purchaseOrders
            ->flatMap(fn ($poItem) => $poItem->bpbMappings ?? collect())
            ->filter(fn ($map) => $map->bpbReceiveMaterial && $map->bpbReceiveMaterial->status !== 'Rejected');

        $bpbNumbers = $activeMappings
            ->map(fn ($map) => $map->bpbReceiveMaterial?->bpb_number)
            ->filter()
            ->unique()
            ->values();
        $primaryBpb = $bpbNumbers->first();
        $firstBpbObj = $activeMappings->first()?->bpbReceiveMaterial;

        $appr1 = $this->rn->approvals->where('approval_ke', '1')->where('status', 1)->first();
        $appr2 = $this->rn->approvals->where('approval_ke', '2')->where('status', 1)->first();

        return [
            'id' => $this->rn->id,
            'rn_number' => $this->rn->rn_number,
            'status' => $this->rn->status,
            'bpb_number' => $primaryBpb,
            'bpb_numbers' => $bpbNumbers->toArray(),
            'bpb_status' => $firstBpbObj?->status,
            'is_received_in_bpb' => ! empty($primaryBpb),
            'is_bpb_approved' => $firstBpbObj && $firstBpbObj->status === 'Approved',
            'arrival_date' => $this->rn->arrival_date ? date('Y-m-d H:i', strtotime($this->rn->arrival_date)) : null,
            'formatted_arrival_date' => $this->rn->arrival_date ? date('d M Y H:i', strtotime($this->rn->arrival_date)) : '-',
            'license_plate' => $this->rn->license_plate ?? '-',
            'licensePlate' => $this->rn->license_plate ?? '-',
            'vehicle_type' => $this->rn->vehicle_type ?? '-',
            'vehicleType' => $this->rn->vehicle_type ?? '-',
            'aju_number' => $this->rn->aju_number ?? '00004001456220261014004999',
            'ajuNumber' => $this->rn->aju_number ?? '00004001456220261014004999',
            'no_daftar' => $this->rn->no_daftar ?? '090400',
            'noDaftar' => $this->rn->no_daftar ?? '090400',
            'tanggal_daftar' => $this->rn->tanggal_daftar ? date('Y-m-d', strtotime($this->rn->tanggal_daftar)) : ($this->rn->arrival_date ? date('Y-m-d', strtotime($this->rn->arrival_date)) : '-'),
            'tanggalDaftar' => $this->rn->tanggal_daftar ? date('Y-m-d', strtotime($this->rn->tanggal_daftar)) : ($this->rn->arrival_date ? date('Y-m-d', strtotime($this->rn->arrival_date)) : '-'),
            'sj_number' => $this->rn->sj_number ?? '-',
            'sjNumber' => $this->rn->sj_number ?? '-',
            'sj_date' => $this->rn->sj_date ? date('d M Y', strtotime($this->rn->sj_date)) : '-',
            'sjDate' => $this->rn->sj_date ? date('d M Y', strtotime($this->rn->sj_date)) : '-',
            'pl_number' => $this->rn->pl_number ?? '-',
            'nomorPackingList' => $this->rn->pl_number ?? ($this->rn->sj_number ?? '-'),
            'pl_date' => $this->rn->pl_date ?? '-',
            'tanggalPackingList' => $this->rn->pl_date ? date('d M Y', strtotime($this->rn->pl_date)) : ($this->rn->sj_date ? date('d M Y', strtotime($this->rn->sj_date)) : '-'),
            'invoice_number' => $this->rn->invoice_number ?? '-',
            'invoiceNumber' => $this->rn->invoice_number ?? '-',
            'invoice_date' => $this->rn->invoice_date ?? '-',
            'invoiceDate' => $this->rn->invoice_date ?? '-',
            'tax_invoice' => $this->rn->tax_invoice ?? '-',
            'taxInvoiceNumber' => $this->rn->tax_invoice ?? '-',
            'tax_invoice_date' => $this->rn->tax_invoice_date ?? '-',
            'taxInvoiceDate' => $this->rn->tax_invoice_date ?? '-',
            'approval_1_at' => $appr1 ? ($appr1->updated_at?->format('d-m-Y H:i').' by '.($appr1->user?->name ?? 'Approver 1')) : '-',
            'approval_2_at' => $appr2 ? ($appr2->updated_at?->format('d-m-Y H:i').' by '.($appr2->user?->name ?? 'Approver 2')) : '-',
            'note' => $this->rn->note ?? ($this->rn->remark ?? '-'),
            'notes' => $this->rn->note ?? ($this->rn->remark ?? '-'),
            'description' => $this->rn->note ?? ($this->rn->remark ?? '-'),
            'remark' => $this->rn->note ?? ($this->rn->remark ?? '-'),
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
                    'formatted_price' => $currencyCode.' '.number_format((float) $poItem->price, 2),
                    'grand_total' => (float) $poItem->grand_total,
                    'formatted_grand_total' => $currencyCode.' '.number_format((float) $poItem->grand_total, 2),
                    'remark' => $poItem->remark ?? '-',
                    'note' => $poItem->remark ?? '-',
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
