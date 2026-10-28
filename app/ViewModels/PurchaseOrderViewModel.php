<?php

namespace App\ViewModels;

use App\Models\Procurement\PurchaseOrder\PurchaseOrder;

class PurchaseOrderViewModel
{
    protected PurchaseOrder $po;

    public function __construct(PurchaseOrder $po)
    {
        $this->po = $po;
    }

    public static function fromModel(PurchaseOrder $po): self
    {
        return new self($po);
    }

    public function toArray(): array
    {
        $currencyCode = $this->po->currency?->name ?? 'IDR';

        return [
            'id' => $this->po->id,
            'po_number' => $this->po->po_number,
            'status' => $this->po->status ?? 'Draft',
            'status_badge' => $this->getStatusBadge(),
            'created_at' => $this->po->created_at?->format('Y-m-d'),
            'formatted_date' => $this->po->created_at?->format('d M Y') ?? '-',
            'supplier' => [
                'id' => $this->po->supliers_id,
                'name' => $this->po->supplier?->name ?? '-',
                'email' => $this->po->supplier?->email ?? '-',
                'phone' => $this->po->supplier?->telp ?? '-',
                'address' => $this->po->supplier?->address ?? '-',
            ],
            'currency' => [
                'id' => $this->po->valutas_id,
                'code' => $currencyCode,
                'rate' => (float) $this->po->rate,
            ],
            'payment_term' => $this->po->paymentTerm?->name ?? '-',
            'delivery_term' => $this->po->deliveryTerm?->name ?? '-',
            'items' => $this->po->items->map(function ($item) use ($currencyCode) {
                return [
                    'id' => $item->id,
                    'item_id' => $item->items_id,
                    'code' => $item->item?->code ?? '-',
                    'name' => $item->item?->name ?? '-',
                    'unit' => $item->item?->unitOfMeasurement?->name ?? 'PCS',
                    'quantity' => (float) $item->quantity,
                    'price' => (float) $item->price,
                    'formatted_price' => $currencyCode.' '.number_format((float) $item->price, 2),
                    'total' => (float) $item->subtotal,
                    'formatted_total' => $currencyCode.' '.number_format((float) $item->subtotal, 2),
                    'discount' => (float) $item->discount,
                    'ppn' => (float) $item->ppn,
                    'grand_total' => (float) $item->grand_total,
                    'formatted_grand_total' => $currencyCode.' '.number_format((float) $item->grand_total, 2),
                ];
            })->values()->toArray(),
            'financials' => [
                'subtotal' => (float) $this->po->subtotal,
                'formatted_subtotal' => $currencyCode.' '.number_format((float) $this->po->subtotal, 2),
                'discount' => (float) $this->po->discount,
                'formatted_discount' => $currencyCode.' '.number_format((float) $this->po->discount, 2),
                'dpp' => (float) $this->po->dpp,
                'formatted_dpp' => $currencyCode.' '.number_format((float) $this->po->dpp, 2),
                'ppn' => (float) $this->po->ppn,
                'formatted_ppn' => $currencyCode.' '.number_format((float) $this->po->ppn, 2),
                'pph' => (float) $this->po->pph,
                'formatted_pph' => $currencyCode.' '.number_format((float) $this->po->pph, 2),
                'additional_costs' => (float) $this->po->additional_costs_total,
                'formatted_additional_costs' => $currencyCode.' '.number_format((float) $this->po->additional_costs_total, 2),
                'grand_total' => (float) $this->po->grand_total,
                'formatted_grand_total' => $currencyCode.' '.number_format((float) $this->po->grand_total, 2),
            ],
            'linked_prs' => $this->po->items->map(function ($map) {
                $pr = $map->requisitionItem?->purchaseRequisition;

                return [
                    'pr_id' => $pr?->id,
                    'pr_number' => $pr?->pr_number ?? '-',
                ];
            })->filter(fn ($x) => ! empty($x['pr_id']))->unique('pr_id')->values()->toArray(),
            'approvals' => $this->po->approvals->map(function ($appr) {
                return [
                    'tier' => (int) $appr->approval_ke,
                    'status' => $appr->status === 1 ? 'Approved' : ($appr->status === 2 ? 'Rejected' : 'Pending'),
                    'status_badge' => $appr->status === 1 ? 'success' : ($appr->status === 2 ? 'danger' : 'warning'),
                    'approver_name' => $appr->user?->name ?? '-',
                    'approved_at' => $appr->updated_at?->format('d M Y H:i'),
                ];
            })->values()->toArray(),
            'is_fully_approved' => in_array($this->po->status, ['Approved 2', 'Completed']),
            'is_ready_for_receiving' => in_array($this->po->status, ['Approved 1', 'Approved 2']),
        ];
    }

    protected function getStatusBadge(): string
    {
        return match ($this->po->status) {
            'Approved 2', 'Completed' => 'success',
            'Approved 1' => 'info',
            'Rejected' => 'danger',
            'Pending', 'Draft' => 'warning',
            default => 'secondary',
        };
    }
}
