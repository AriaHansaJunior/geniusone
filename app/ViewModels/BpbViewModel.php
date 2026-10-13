<?php

namespace App\ViewModels;

use App\Models\BpbReceiveMaterial;

class BpbViewModel
{
    protected BpbReceiveMaterial $bpb;

    public function __construct(BpbReceiveMaterial $bpb)
    {
        $this->bpb = $bpb;
    }

    public static function fromModel(BpbReceiveMaterial $bpb): self
    {
        return new self($bpb);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->bpb->id,
            'bpb_number' => $this->bpb->bpb_number,
            'receive_date' => $this->bpb->receive_date ? date('Y-m-d', strtotime($this->bpb->receive_date)) : null,
            'formatted_receive_date' => $this->bpb->receive_date ? date('d M Y', strtotime($this->bpb->receive_date)) : '-',
            'note' => $this->bpb->note,
            'creator' => [
                'id' => $this->bpb->creator_id,
                'name' => $this->bpb->creator?->name ?? 'System',
            ],
            'allocations' => $this->bpb->mappings->map(function ($map) {
                $poRn = $map->purchaseOrderReceiveNote;

                return [
                    'id' => $map->id,
                    'warehouse' => [
                        'id' => $map->warehouses_id,
                        'name' => $map->warehouse?->name ?? '-',
                    ],
                    'po_number' => $poRn?->purchaseOrder?->po_number ?? '-',
                    'rn_number' => $poRn?->receiveNote?->rn_number ?? '-',
                    'item_name' => $poRn?->item_name ?? '-',
                    'received_quantity' => (float) ($poRn?->quantity ?? 0),
                    'rafaksi' => (float) ($poRn?->rafaksi ?? 0),
                    'net_quantity' => (float) (($poRn?->quantity ?? 0) - ($poRn?->rafaksi ?? 0)),
                ];
            })->values()->toArray(),
            'total_allocations_count' => $this->bpb->mappings->count(),
            'approvals' => $this->bpb->approvals->map(function ($appr) {
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
