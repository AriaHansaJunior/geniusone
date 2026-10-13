<?php

namespace App\ViewModels;

use App\Models\PurchaseRequisition;

class PurchaseRequisitionViewModel
{
    protected PurchaseRequisition $pr;

    public function __construct(PurchaseRequisition $pr)
    {
        $this->pr = $pr;
    }

    public static function fromModel(PurchaseRequisition $pr): self
    {
        return new self($pr);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->pr->id,
            'pr_number' => $this->pr->pr_number,
            'date_pr' => $this->pr->date_pr ? date('Y-m-d', strtotime($this->pr->date_pr)) : null,
            'formatted_date' => $this->pr->date_pr ? date('d M Y', strtotime($this->pr->date_pr)) : '-',
            'status' => $this->pr->status ?? 'Draft',
            'status_badge' => $this->getStatusBadge(),
            'notes' => $this->pr->notes,
            'department' => [
                'id' => $this->pr->department_id,
                'name' => $this->pr->department?->name ?? '-',
            ],
            'creator' => [
                'id' => $this->pr->creator_id,
                'name' => $this->pr->creator?->name ?? 'System',
                'username' => $this->pr->creator?->username ?? '',
            ],
            'items' => $this->pr->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'item_id' => $item->items_id,
                    'code' => $item->item?->code ?? '-',
                    'name' => $item->item?->name ?? '-',
                    'unit' => $item->item?->unitOfMeasurement?->name ?? 'PCS',
                    'quantity' => (float) $item->quantity,
                    'note' => $item->notes,
                ];
            })->values()->toArray(),
            'total_items_count' => $this->pr->items->count(),
            'total_quantity' => (float) $this->pr->items->sum('quantity'),
            'approvals' => $this->pr->approvals->map(function ($appr) {
                return [
                    'tier' => (int) $appr->approval_ke,
                    'status' => $appr->status === 1 ? 'Approved' : ($appr->status === 2 ? 'Rejected' : 'Pending'),
                    'status_badge' => $appr->status === 1 ? 'success' : ($appr->status === 2 ? 'danger' : 'warning'),
                    'approver_name' => $appr->user?->name ?? '-',
                    'approved_at' => $appr->updated_at?->format('d M Y H:i'),
                ];
            })->values()->toArray(),
            'is_fully_approved' => in_array($this->pr->status, ['Approved 2', 'Completed']),
            'can_be_converted_to_po' => in_array($this->pr->status, ['Approved 1', 'Approved 2']),
        ];
    }

    protected function getStatusBadge(): string
    {
        return match ($this->pr->status) {
            'Approved 2', 'Completed' => 'success',
            'Approved 1' => 'info',
            'Rejected' => 'danger',
            'Pending', 'Draft' => 'warning',
            default => 'secondary',
        };
    }
}
