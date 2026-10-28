<?php

namespace App\Services\Warehouse;

use App\Models\JobNumber;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ReceiveNoteService
{
    /**
     * Create a new physical Receive Note (RN) entry for incoming materials.
     */
    public function createReceiveNote(array $headerData, array $receivedItems, int $userId = 1): ReceiveNote
    {
        if (empty($receivedItems)) {
            throw new InvalidArgumentException('A Receive Note must link to at least one PO item.');
        }

        // BE-05: Strict Downstream Gating (PO must be Approved before receiving materials)
        foreach ($receivedItems as $item) {
            $poId = $item['purchase_order_id'] ?? null;
            if ($poId) {
                $po = PurchaseOrder::find($poId);
                if ($po && ! in_array($po->status, ['Approved', 'Approved 2'], true)) {
                    throw new InvalidArgumentException("Cannot create Receive Note: Linked Purchase Order '{$po->po_number}' must be fully Approved first (Current status: {$po->status}).");
                }
            }
        }

        return DB::transaction(function () use ($headerData, $receivedItems, $userId) {
            $rnNumber = $headerData['rn_number'] ?? DocumentNumberGenerator::generateRnNumber();

            $receiveNote = ReceiveNote::create([
                'rn_number' => $rnNumber,
                'status' => $headerData['status'] ?? 'Waiting for Approve 1',
                'supliers_id' => $headerData['supliers_id'],
                'currencies_id' => $headerData['currencies_id'],
                'rate' => (float) ($headerData['rate'] ?? 1.0),
                'arrival_date' => $headerData['arrival_date'] ?? now(),
                'invoice_number' => $headerData['invoice_number'] ?? null,
                'invoice_date' => $headerData['invoice_date'] ?? null,
                'tax_invoice' => $headerData['tax_invoice'] ?? null,
                'tax_invoice_date' => $headerData['tax_invoice_date'] ?? null,
                'license_plate' => $headerData['license_plate'] ?? null,
                'note' => $headerData['note'] ?? null,
                'sj_number' => $headerData['sj_number'] ?? null,
                'sj_date' => $headerData['sj_date'] ?? null,
                'pl_number' => $headerData['pl_number'] ?? null,
                'pl_date' => $headerData['pl_date'] ?? null,
                'dn_status' => $headerData['dn_status'] ?? 0,
                'service_subkon' => $headerData['service_subkon'] ?? 0,
                'updated_by' => $userId,
            ]);

            $defaultJobId = JobNumber::first()?->id ?? 1;

            foreach ($receivedItems as $item) {
                PurchaseOrderReceiveNote::create([
                    'purchase_order_id' => $item['purchase_order_id'],
                    'receive_note_id' => $receiveNote->id,
                    'dn_number' => $item['dn_number'] ?? null,
                    'job_number_id' => $item['job_number_id'] ?? $defaultJobId,
                    'item_name' => $item['item_name'] ?? null,
                    'quantity' => (float) ($item['quantity'] ?? 0),
                    'rafaksi' => (float) ($item['rafaksi'] ?? 0),
                    'price' => (float) ($item['price'] ?? 0),
                    'additional_price' => (float) ($item['additional_price'] ?? 0),
                    'discount' => (float) ($item['discount'] ?? 0),
                    'ppn' => (float) ($item['ppn'] ?? 0),
                    'grand_total' => (float) ($item['grand_total'] ?? 0),
                ]);
            }

            return $receiveNote->load(['supplier', 'currency', 'purchaseOrders.purchaseOrder']);
        });
    }

    /**
     * Find Receive Note by document code or ID.
     */
    public function findByCode(string $code): ?ReceiveNote
    {
        return ReceiveNote::with([
            'supplier',
            'currency',
            'updatedByUser',
            'purchaseOrders.purchaseOrder',
            'purchaseOrders.jobNumber',
            'approvals.user',
        ])
            ->where('rn_number', $code)
            ->orWhere('id', is_numeric($code) ? $code : null)
            ->first();
    }

    /**
     * List Receive Notes with pagination and filters.
     */
    public function listReceiveNotes(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = ReceiveNote::with([
            'supplier',
            'currency',
            'purchaseOrders.purchaseOrder',
        ]);

        if (! empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('rn_number', 'like', "%{$s}%")
                    ->orWhere('sj_number', 'like', "%{$s}%")
                    ->orWhere('license_plate', 'like', "%{$s}%")
                    ->orWhereHas('supplier', function ($sq) use ($s) {
                        $sq->where('name', 'like', "%{$s}%");
                    });
            });
        }

        if (! empty($filters['supplier_id'])) {
            $query->where('supliers_id', $filters['supplier_id']);
        }

        $sortField = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        $query->orderBy($sortField, $sortOrder);

        return $query->paginate($perPage);
    }

    /**
     * BE-05: Assert that Receive Note is not immutable/locked.
     */
    public function assertNotLocked(ReceiveNote $rn): void
    {
        if (in_array($rn->status, ['Approved', 'Approved 2'], true)) {
            throw new InvalidArgumentException("Receive Note '{$rn->rn_number}' is fully Approved and locked from modifications.");
        }
    }
}
