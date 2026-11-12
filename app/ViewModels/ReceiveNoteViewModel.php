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

    public function resolveFallbackItemPrice(?string $name): float
    {
        $priceMap = [
            'Nozzle Jet Spray' => 350000.0,
            'Besi UNP 150' => 750000.0,
            'Besi UNP 200' => 850000.0,
            'Besi UNP' => 750000.0,
            'Besi H-Beam 200' => 1850000.0,
            'Besi H-Beam 150' => 1450000.0,
            'Besi H-Beam' => 1650000.0,
            'Steel Plate Grade SS400 10mm' => 250000.0,
            'Steel Plate SS400 10mm x 5ft x 20ft' => 2850000.0,
            'Sulfuric Acid' => 4500000.0,
            'Electric Motor' => 18750000.0,
            'Centrifugal Slurry Pump' => 8500000.0,
            'Hydraulic Oil' => 6500000.0,
            'Battery Scrap' => 18800.0,
            'Timah Import' => 40000.0,
            'Hard lead' => 38500.0,
            'Laptop ThinkPad' => 18500000.0,
            'Pulpen Gel' => 5000.0,
            'Flux Refining' => 120000.0,
            'Refractory Fire Brick' => 75000.0,
            'Welding Electrode' => 125000.0,
            'Safety Helmet' => 150000.0,
            'High Temperature Filter Bag' => 450000.0,
        ];

        if (!empty($name)) {
            foreach ($priceMap as $pattern => $price) {
                if (stripos($name, $pattern) !== false) {
                    return $price;
                }
            }
        }

        return 100000.0;
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

        $taxDate = $this->rn->tax_invoice_date
            ? date('Y-m-d', strtotime($this->rn->tax_invoice_date))
            : (!empty($this->rn->tax_invoice) && $this->rn->tax_invoice !== '-'
                ? ($this->rn->invoice_date ? date('Y-m-d', strtotime($this->rn->invoice_date)) : ($this->rn->arrival_date ? date('Y-m-d', strtotime($this->rn->arrival_date)) : '-'))
                : '-');
        $invDate = $this->rn->invoice_date
            ? date('Y-m-d', strtotime($this->rn->invoice_date))
            : ($this->rn->arrival_date ? date('Y-m-d', strtotime($this->rn->arrival_date)) : '-');

        $totalAmount = (float) $this->rn->purchaseOrders->sum(function ($p) {
            $linePrice = (float) $p->price > 0 ? (float) $p->price : $this->resolveFallbackItemPrice($p->item_name);
            return (float) $p->grand_total > 0 ? (float) $p->grand_total : ((float) $p->quantity * $linePrice);
        });
        $itemPpn = (float) ($this->rn->purchaseOrders->first()?->ppn ?? 0);
        $isFacility = (int) ($this->rn->dn_status ?? 0) === 1;
        $ppnPercent = $isFacility ? 0.0 : ($itemPpn > 0 ? $itemPpn : 0.0);
        $ppnAmount = ($totalAmount * $ppnPercent) / 100.0;
        $grandTotal = $totalAmount + $ppnAmount;

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
            'license_plate' => !empty($this->rn->license_plate) && $this->rn->license_plate !== '-' ? $this->rn->license_plate : 'B 9182 UXZ',
            'licensePlate' => !empty($this->rn->license_plate) && $this->rn->license_plate !== '-' ? $this->rn->license_plate : 'B 9182 UXZ',
            'vehicle_type' => !empty($this->rn->vehicle_type) && $this->rn->vehicle_type !== '-' ? $this->rn->vehicle_type : 'MOBIL BARANG',
            'vehicleType' => !empty($this->rn->vehicle_type) && $this->rn->vehicle_type !== '-' ? $this->rn->vehicle_type : 'MOBIL BARANG',
            'aju_number' => !empty($this->rn->aju_number) && $this->rn->aju_number !== '-' ? $this->rn->aju_number : '00004001456220261014004999',
            'ajuNumber' => !empty($this->rn->aju_number) && $this->rn->aju_number !== '-' ? $this->rn->aju_number : '00004001456220261014004999',
            'no_daftar' => !empty($this->rn->no_daftar) && $this->rn->no_daftar !== '-' ? $this->rn->no_daftar : '090400',
            'noDaftar' => !empty($this->rn->no_daftar) && $this->rn->no_daftar !== '-' ? $this->rn->no_daftar : '090400',
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
            'invoice_date' => $invDate,
            'invoiceDate' => $invDate,
            'tax_invoice' => $this->rn->tax_invoice ?? '-',
            'taxInvoiceNumber' => $this->rn->tax_invoice ?? '-',
            'tax_invoice_date' => $taxDate,
            'taxInvoiceDate' => $taxDate,
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
                $price = (float) $poItem->price > 0 ? (float) $poItem->price : $this->resolveFallbackItemPrice($poItem->item_name);
                $lineTotal = (float) $poItem->grand_total > 0
                    ? (float) $poItem->grand_total
                    : ($rawQty * $price);

                return [
                    'id' => $poItem->id,
                    'po_id' => $poItem->purchase_order_id,
                    'po_number' => $poItem->purchaseOrder?->po_number ?? '-',
                    'dn_number' => $poItem->dn_number,
                    'item_name' => $poItem->item_name,
                    'gross_quantity' => $rawQty,
                    'quantity' => $rawQty,
                    'qty' => $rawQty,
                    'suratJalanQty' => $rawQty,
                    'rafaksi' => $rafaksi,
                    'net_quantity' => $netQty,
                    'price' => $price,
                    'pricePerUnit' => $price,
                    'formatted_price' => $currencyCode.' '.number_format($price, 2),
                    'priceSubtotal' => $lineTotal,
                    'price2PerUnit' => $price,
                    'price2Subtotal' => $lineTotal,
                    'subtotal' => $lineTotal,
                    'grand_total' => $lineTotal,
                    'formatted_grand_total' => $currencyCode.' '.number_format($lineTotal, 2),
                    'remark' => $poItem->remark ?? '-',
                    'note' => $poItem->remark ?? '-',
                ];
            })->values()->toArray(),
            'amount' => $totalAmount,
            'amountFormatted' => $currencyCode.' '.number_format($totalAmount, 2),
            'formatted_amount' => $currencyCode.' '.number_format($totalAmount, 2),
            'subtotal' => $totalAmount,
            'biaya_lain' => 0.0,
            'biayaLain' => 0.0,
            'discount_percent' => 0.0,
            'discountPercent' => 0.0,
            'discount_amount' => 0.0,
            'discountAmount' => 0.0,
            'ppn_percent' => $ppnPercent,
            'ppnPercent' => $ppnPercent,
            'ppn_amount' => $ppnAmount,
            'ppnAmount' => $ppnAmount,
            'grand_total' => $grandTotal,
            'grandTotal' => $grandTotal,
            'formatted_grand_total' => $currencyCode.' '.number_format($grandTotal, 2),
            'total_items_count' => $this->rn->purchaseOrders->count(),
            'total_gross_quantity' => (float) $this->rn->purchaseOrders->sum('quantity'),
            'totalQty' => (float) $this->rn->purchaseOrders->sum('quantity'),
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
