<?php

namespace App\Services\Procurement;

use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Services\Workflow\DocumentApprovalWorkflowService;
use InvalidArgumentException;

class ApprovalWorkflowService
{
    public function __construct(
        protected ?DocumentApprovalWorkflowService $workflow = null
    ) {}

    protected function workflowService(): DocumentApprovalWorkflowService
    {
        return $this->workflow ?? app(DocumentApprovalWorkflowService::class);
    }

    /**
     * Approve Purchase Requisition (Tier 1 or Tier 2).
     */
    public function approvePr(int $prId, int $userId, int $tier = 1, ?string $note = null): PurchaseRequisition
    {
        if (! in_array($tier, [1, 2], true)) {
            throw new InvalidArgumentException('PR Approval tier must be 1 or 2.');
        }

        /** @var PurchaseRequisition $pr */
        $pr = $this->workflowService()->approve('PR', $prId, $userId, $tier, $note);

        return $pr->fresh(['approvals.user']);
    }

    /**
     * Reject Purchase Requisition.
     */
    public function rejectPr(int $prId, int $userId, int $tier = 1, ?string $reason = null): PurchaseRequisition
    {
        $resolvedReason = trim((string) $reason);
        if (strlen($resolvedReason) < 3) {
            $resolvedReason = 'Rejected by approver';
        }

        /** @var PurchaseRequisition $pr */
        $pr = $this->workflowService()->reject('PR', $prId, $userId, $tier, $resolvedReason);

        return $pr->fresh(['approvals.user']);
    }

    /**
     * Approve Purchase Order (Tier 1 or Tier 2).
     */
    public function approvePo(int $poId, int $userId, int $tier = 1, ?string $note = null): PurchaseOrder
    {
        if (! in_array($tier, [1, 2], true)) {
            throw new InvalidArgumentException('PO Approval tier must be 1 or 2.');
        }

        /** @var PurchaseOrder $po */
        $po = $this->workflowService()->approve('PO', $poId, $userId, $tier, $note);

        return $po->fresh(['approvals.user']);
    }

    /**
     * Reject Purchase Order.
     */
    public function rejectPo(int $poId, int $userId, int $tier = 1, ?string $reason = null): PurchaseOrder
    {
        $resolvedReason = trim((string) $reason);
        if (strlen($resolvedReason) < 3) {
            $resolvedReason = 'Rejected by approver';
        }

        /** @var PurchaseOrder $po */
        $po = $this->workflowService()->reject('PO', $poId, $userId, $tier, $resolvedReason);

        return $po->fresh(['approvals.user']);
    }
}
