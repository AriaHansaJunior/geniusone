<?php

namespace App\Services\Warehouse;

use App\Models\Warehouse\GateReceiving\ApprovalRn;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\ApprovalBpb;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class WarehouseApprovalService
{
    /**
     * Approve Receive Note (RN).
     *
     * @param  int  $tier  1 = QC/Gate Inspector, 2 = Warehouse Supervisor
     */
    public function approveRn(int $rnId, int $userId, int $tier = 1, ?string $note = null): ReceiveNote
    {
        if (! in_array($tier, [1, 2])) {
            throw new InvalidArgumentException('RN Approval tier must be 1 or 2.');
        }

        return DB::transaction(function () use ($rnId, $userId, $tier, $note) {
            $rn = ReceiveNote::findOrFail($rnId);
            $newStatus = ($tier === 1) ? 'Approved 1' : 'Approved 2';

            // Check if already approved at this tier
            $existing = ApprovalRn::where('receive_note_id', $rn->id)
                ->where('approval_ke', (string) $tier)
                ->first();

            if ($existing && $existing->status === 1) {
                throw new InvalidArgumentException("Receive Note has already been approved at Tier {$tier}.");
            }

            ApprovalRn::updateOrCreate(
                [
                    'receive_note_id' => $rn->id,
                    'approval_ke' => (string) $tier,
                ],
                [
                    'users_id' => $userId,
                    'status' => 1, // Approved
                ]
            );

            $rn->update([
                'updated_by' => $userId,
            ]);

            AuditLogger::logWorkflow(
                documentType: 'RN',
                documentNumber: $rn->rn_number,
                action: "APPROVAL_{$tier}",
                fromStatus: 'Pending',
                toStatus: $newStatus,
                userId: $userId,
                extra: ['tier' => $tier, 'note' => $note]
            );

            return $rn->fresh(['approvals.user', 'supplier', 'purchaseOrders']);
        });
    }

    /**
     * Reject Receive Note (RN).
     */
    public function rejectRn(int $rnId, int $userId, int $tier = 1, ?string $reason = null): ReceiveNote
    {
        return DB::transaction(function () use ($rnId, $userId, $tier, $reason) {
            $rn = ReceiveNote::findOrFail($rnId);

            ApprovalRn::updateOrCreate(
                [
                    'receive_note_id' => $rn->id,
                    'approval_ke' => (string) $tier,
                ],
                [
                    'users_id' => $userId,
                    'status' => 2, // Rejected
                ]
            );

            $rn->update([
                'updated_by' => $userId,
            ]);

            AuditLogger::logWorkflow(
                documentType: 'RN',
                documentNumber: $rn->rn_number,
                action: "REJECT_{$tier}",
                fromStatus: 'Pending',
                toStatus: 'Rejected',
                userId: $userId,
                extra: ['reason' => $reason]
            );

            return $rn->fresh(['approvals.user', 'supplier']);
        });
    }

    /**
     * Approve BPB Receive Material (Warehouse Inbound Slip).
     *
     * @param  int  $tier  1 = Warehouse Officer, 2 = Warehouse Head / Manager
     */
    public function approveBpb(int $bpbId, int $userId, int $tier = 1, ?string $note = null): BpbReceiveMaterial
    {
        if (! in_array($tier, [1, 2])) {
            throw new InvalidArgumentException('BPB Approval tier must be 1 or 2.');
        }

        return DB::transaction(function () use ($bpbId, $userId, $tier, $note) {
            $bpb = BpbReceiveMaterial::findOrFail($bpbId);
            $newStatus = ($tier === 1) ? 'Approved 1' : 'Approved 2';

            $existing = ApprovalBpb::where('bpb_receive_material_id', $bpb->id)
                ->where('approval_ke', (string) $tier)
                ->first();

            if ($existing && $existing->status === 1) {
                throw new InvalidArgumentException("BPB has already been approved at Tier {$tier}.");
            }

            ApprovalBpb::updateOrCreate(
                [
                    'bpb_receive_material_id' => $bpb->id,
                    'approval_ke' => (string) $tier,
                ],
                [
                    'users_id' => $userId,
                    'status' => 1, // Approved
                ]
            );

            $bpb->update([
                'updated_by' => $userId,
            ]);

            AuditLogger::logWorkflow(
                documentType: 'BPB',
                documentNumber: $bpb->bpb_number,
                action: "APPROVAL_{$tier}",
                fromStatus: 'Pending',
                toStatus: $newStatus,
                userId: $userId,
                extra: ['tier' => $tier, 'note' => $note]
            );

            return $bpb->fresh(['approvals.user', 'mappings.warehouse', 'creator']);
        });
    }

    /**
     * Reject BPB Receive Material.
     */
    public function rejectBpb(int $bpbId, int $userId, int $tier = 1, ?string $reason = null): BpbReceiveMaterial
    {
        return DB::transaction(function () use ($bpbId, $userId, $tier, $reason) {
            $bpb = BpbReceiveMaterial::findOrFail($bpbId);

            ApprovalBpb::updateOrCreate(
                [
                    'bpb_receive_material_id' => $bpb->id,
                    'approval_ke' => (string) $tier,
                ],
                [
                    'users_id' => $userId,
                    'status' => 2, // Rejected
                ]
            );

            $bpb->update([
                'updated_by' => $userId,
            ]);

            AuditLogger::logWorkflow(
                documentType: 'BPB',
                documentNumber: $bpb->bpb_number,
                action: "REJECT_{$tier}",
                fromStatus: 'Pending',
                toStatus: 'Rejected',
                userId: $userId,
                extra: ['reason' => $reason]
            );

            return $bpb->fresh(['approvals.user', 'creator']);
        });
    }
}
