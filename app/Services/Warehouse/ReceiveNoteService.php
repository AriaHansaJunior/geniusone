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

        // BE-05: Strict Downstream Gating (PO must be Approved & Kawasan Berikat before receiving via RN)
        foreach ($receivedItems as $item) {
            $poId = $item['purchase_order_id'] ?? null;
            $poNum = $item['po_number'] ?? $item['poNumber'] ?? null;
            $po = $poId
                ? PurchaseOrder::with('items')->find($poId)
                : ($poNum ? PurchaseOrder::with('items')->where('po_number', $poNum)->first() : null);

            if ($po) {
                if (! in_array($po->status, ['Approved', 'Approved 2'], true)) {
                    throw new InvalidArgumentException("Cannot create Receive Note: Linked Purchase Order '{$po->po_number}' must be fully Approved first (Current status: {$po->status}).");
                }
                if (! $po->isKawasanBerikat()) {
                    throw new InvalidArgumentException("Cannot create Receive Note: Purchase Order '{$po->po_number}' is Non-Kawasan Berikat and must be received directly in Receive Material (BPB).");
                }
            }
        }

        return DB::transaction(function () use ($headerData, $receivedItems, $userId) {
            $rnNumber = $headerData['rn_number'] ?? DocumentNumberGenerator::generateRnNumber();
            if (ReceiveNote::withTrashed()->where('rn_number', $rnNumber)->exists()) {
                $rnNumber = DocumentNumberGenerator::generateRnNumber();
            }

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
                'vehicle_type' => $headerData['vehicle_type'] ?? null,
                'aju_number' => $headerData['aju_number'] ?? null,
                'no_daftar' => $headerData['no_daftar'] ?? null,
                'tanggal_daftar' => $headerData['tanggal_daftar'] ?? null,
                'note' => $headerData['note'] ?? $headerData['remark'] ?? null,
                'remark' => $headerData['remark'] ?? $headerData['note'] ?? null,
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
                $itemQty = (float) ($item['quantity'] ?? 0);
                $itemPrice = (float) ($item['price'] ?? 0);
                $itemGrandTotal = ! empty($item['grand_total']) && (float) $item['grand_total'] > 0
                    ? (float) $item['grand_total']
                    : ($itemQty * $itemPrice);

                PurchaseOrderReceiveNote::create([
                    'purchase_order_id' => $item['purchase_order_id'],
                    'po_has_items_id' => $item['po_has_items_id'] ?? null,
                    'receive_note_id' => $receiveNote->id,
                    'dn_number' => $item['dn_number'] ?? null,
                    'job_number_id' => $item['job_number_id'] ?? $defaultJobId,
                    'item_name' => $item['item_name'] ?? null,
                    'quantity' => $itemQty,
                    'rafaksi' => (float) ($item['rafaksi'] ?? 0),
                    'price' => $itemPrice,
                    'additional_price' => (float) ($item['additional_price'] ?? 0),
                    'discount' => (float) ($item['discount'] ?? 0),
                    'ppn' => (float) ($item['ppn'] ?? 0),
                    'grand_total' => $itemGrandTotal,
                    'remark' => $item['remark'] ?? $item['note'] ?? null,
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
