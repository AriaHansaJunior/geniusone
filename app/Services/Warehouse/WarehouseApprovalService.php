<?php

namespace App\Services\Warehouse;

use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Services\Workflow\DocumentApprovalWorkflowService;
use InvalidArgumentException;

class WarehouseApprovalService
{
    public function __construct(
        protected ?DocumentApprovalWorkflowService $workflow = null
    ) {}

    protected function workflowService(): DocumentApprovalWorkflowService
    {
        return $this->workflow ?? app(DocumentApprovalWorkflowService::class);
    }

    /**
     * Approve Receive Note (RN).
     *
     * @param  int  $tier  1 = QC/Gate Inspector, 2 = Warehouse Supervisor
     */
    public function approveRn(int $rnId, int $userId, int $tier = 1, ?string $note = null): ReceiveNote
    {
        if (! in_array($tier, [1, 2], true)) {
            throw new InvalidArgumentException('RN Approval tier must be 1 or 2.');
        }

        /** @var ReceiveNote $rn */
        $rn = $this->workflowService()->approve('RN', $rnId, $userId, $tier, $note);

        return $rn->fresh(['approvals.user', 'supplier', 'purchaseOrders']);
    }

    /**
     * Reject Receive Note (RN).
     */
    public function rejectRn(int $rnId, int $userId, int $tier = 1, ?string $reason = null): ReceiveNote
    {
        $resolvedReason = trim((string) $reason);
        if (strlen($resolvedReason) < 3) {
            $resolvedReason = 'Rejected at gate inspection';
        }

        /** @var ReceiveNote $rn */
        $rn = $this->workflowService()->reject('RN', $rnId, $userId, $tier, $resolvedReason);

        return $rn->fresh(['approvals.user', 'supplier']);
    }

    /**
     * Approve BPB Receive Material (Warehouse Inbound Slip).
     *
     * @param  int  $tier  1 = Warehouse Officer, 2 = Warehouse Head / Manager
     */
    public function approveBpb(int $bpbId, int $userId, int $tier = 1, ?string $note = null): BpbReceiveMaterial
    {
        if (! in_array($tier, [1, 2], true)) {
            throw new InvalidArgumentException('BPB Approval tier must be 1 or 2.');
        }

        /** @var BpbReceiveMaterial $bpb */
        $bpb = $this->workflowService()->approve('BPB', $bpbId, $userId, $tier, $note);

        return $bpb->fresh(['approvals.user', 'mappings.warehouse', 'creator']);
    }

    /**
     * Reject BPB Receive Material.
     */
    public function rejectBpb(int $bpbId, int $userId, int $tier = 1, ?string $reason = null): BpbReceiveMaterial
    {
        $resolvedReason = trim((string) $reason);
        if (strlen($resolvedReason) < 3) {
            $resolvedReason = 'Rejected at warehouse inspection';
        }

        /** @var BpbReceiveMaterial $bpb */
        $bpb = $this->workflowService()->reject('BPB', $bpbId, $userId, $tier, $resolvedReason);

        return $bpb->fresh(['approvals.user', 'creator']);
    }
}
