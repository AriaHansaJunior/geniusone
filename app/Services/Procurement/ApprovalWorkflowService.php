<?php

namespace App\Services\Procurement;

use App\Models\Procurement\PurchaseOrder\ApprovalPo;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\ApprovalPr;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ApprovalWorkflowService
{
    /**
     * Approve Purchase Requisition (Tier 1 or Tier 2).
     */
    public function approvePr(int $prId, int $userId, int $tier = 1, ?string $note = null): PurchaseRequisition
    {
        if (! in_array($tier, [1, 2])) {
            throw new InvalidArgumentException('PR Approval tier must be 1 or 2.');
        }

        return DB::transaction(function () use ($prId, $userId, $tier, $note) {
            $pr = PurchaseRequisition::findOrFail($prId);
            $previousStatus = $pr->status;
            $newStatus = ($tier === 1) ? 'Approved 1' : 'Approved 2';

            // Check if already approved at this tier
            $existing = ApprovalPr::where('purchase_requisitions_id', $pr->id)
                ->where('approval_ke', (string) $tier)
                ->first();

            if ($existing && $existing->status === 1) {
                throw new InvalidArgumentException("PR has already been approved at Tier {$tier}.");
            }

            ApprovalPr::updateOrCreate(
                [
                    'purchase_requisitions_id' => $pr->id,
                    'approval_ke' => (string) $tier,
                ],
                [
                    'users_id' => $userId,
                    'status' => 1,
                ]
            );

            $pr->update([
                'status' => $newStatus,
                'updated_by' => $userId,
            ]);

            AuditLogger::logWorkflow(
                documentType: 'PR',
                documentNumber: $pr->pr_number,
                action: "APPROVAL_{$tier}",
                fromStatus: $previousStatus,
                toStatus: $newStatus,
                userId: $userId,
                extra: ['tier' => $tier, 'note' => $note]
            );

            return $pr->fresh(['approvals.user']);
        });
    }

    /**
     * Reject Purchase Requisition.
     */
    public function rejectPr(int $prId, int $userId, int $tier = 1, ?string $reason = null): PurchaseRequisition
    {
        return DB::transaction(function () use ($prId, $userId, $tier, $reason) {
            $pr = PurchaseRequisition::findOrFail($prId);
            $previousStatus = $pr->status;

            ApprovalPr::updateOrCreate(
                [
                    'purchase_requisitions_id' => $pr->id,
                    'approval_ke' => (string) $tier,
                ],
                [
                    'users_id' => $userId,
                    'status' => 2, // Rejected status code
                ]
            );

            $pr->update([
                'status' => 'Rejected',
                'updated_by' => $userId,
            ]);

            AuditLogger::logWorkflow(
                documentType: 'PR',
                documentNumber: $pr->pr_number,
                action: "REJECT_{$tier}",
                fromStatus: $previousStatus,
                toStatus: 'Rejected',
                userId: $userId,
                extra: ['reason' => $reason]
            );

            return $pr->fresh(['approvals.user']);
        });
    }

    /**
     * Approve Purchase Order (Tier 1 or Tier 2).
     */
    public function approvePo(int $poId, int $userId, int $tier = 1, ?string $note = null): PurchaseOrder
    {
        if (! in_array($tier, [1, 2])) {
            throw new InvalidArgumentException('PO Approval tier must be 1 or 2.');
        }

        return DB::transaction(function () use ($poId, $userId, $tier, $note) {
            $po = PurchaseOrder::findOrFail($poId);
            $previousStatus = $po->remark ?? 'Pending Approval';
            $newStatus = ($tier === 1) ? 'Approved 1' : 'Approved 2';

            ApprovalPo::updateOrCreate(
                [
                    'purchase_order_id' => $po->id,
                    'approval_ke' => (string) $tier,
                ],
                [
                    'users_id' => $userId,
                    'status' => 1,
                ]
            );

            $po->update([
                'updated_by' => $userId,
            ]);

            AuditLogger::logWorkflow(
                documentType: 'PO',
                documentNumber: $po->po_number,
                action: "APPROVAL_{$tier}",
                fromStatus: $previousStatus,
                toStatus: $newStatus,
                userId: $userId,
                extra: ['tier' => $tier, 'note' => $note]
            );

            return $po->fresh(['approvals.user']);
        });
    }

    /**
     * Reject Purchase Order.
     */
    public function rejectPo(int $poId, int $userId, int $tier = 1, ?string $reason = null): PurchaseOrder
    {
        return DB::transaction(function () use ($poId, $userId, $tier, $reason) {
            $po = PurchaseOrder::findOrFail($poId);

            ApprovalPo::updateOrCreate(
                [
                    'purchase_order_id' => $po->id,
                    'approval_ke' => (string) $tier,
                ],
                [
                    'users_id' => $userId,
                    'status' => 2,
                ]
            );

            $po->update([
                'updated_by' => $userId,
            ]);

            AuditLogger::logWorkflow(
                documentType: 'PO',
                documentNumber: $po->po_number,
                action: "REJECT_{$tier}",
                fromStatus: 'Under Review',
                toStatus: 'Rejected',
                userId: $userId,
                extra: ['reason' => $reason]
            );

            return $po->fresh(['approvals.user']);
        });
    }
}
