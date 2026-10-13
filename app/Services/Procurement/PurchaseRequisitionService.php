<?php

namespace App\Services\Procurement;

use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseRequisitionService
{
    public function createPr(array $headerData, array $itemsData, int $userId): PurchaseRequisition
    {
        return $this->createRequisition($headerData, $itemsData, $userId);
    }

    /**
     * Create a new Purchase Requisition with its line items.
     *
     * @param array $headerData
     * @param array $items
     * @param int $userId
     * @return PurchaseRequisition
     */
    public function createRequisition(array $headerData, array $items, int $userId): PurchaseRequisition
    {
        if (empty($items)) {
            throw new InvalidArgumentException("A Purchase Requisition must contain at least one item.");
        }

        return DB::transaction(function () use ($headerData, $items, $userId) {
            // Generate official document number if not manually provided
            $prNumber = $headerData['pr_number'] ?? DocumentNumberGenerator::generatePrNumber();

            $deptId = $headerData['departments_id'] ?? $headerData['department_id'] ?? null;
            $secId = $headerData['sections_id'] ?? $headerData['section_id'] ?? null;
            if (!$secId) {
                $firstSec = \App\Models\Section::first();
                $secId = $firstSec ? $firstSec->id : \App\Models\Section::create(['name' => 'General'])->id;
            }
            $dueDate = $headerData['due_date'] ?? now()->addDays(7)->format('Y-m-d');
            $date = $headerData['date'] ?? $headerData['date_pr'] ?? now()->format('d-M-Y');

            $requisition = PurchaseRequisition::create([
                'pr_number' => $prNumber,
                'departments_id' => $deptId,
                'creator' => $userId,
                'date' => $date,
                'due_date' => $dueDate,
                'sections_id' => $secId,
                'attachment_file' => $headerData['attachment_file'] ?? null,
                'status' => $headerData['status'] ?? 'Draft',
                'revision' => $headerData['revision'] ?? 0,
            ]);

            foreach ($items as $item) {
                PurchaseRequisitionItem::create([
                    'purchase_requisitions_id' => $requisition->id,
                    'items_id' => $item['items_id'],
                    'quantity' => (string) ($item['quantity'] ?? '1'),
                    'remark' => $item['remark'] ?? null,
                    'due_date' => $item['due_date'] ?? $requisition->due_date,
                    'note' => $item['note'] ?? $item['notes'] ?? null,
                ]);
            }

            return $requisition->load(['department', 'section', 'creatorUser', 'items.item']);
        });
    }

    /**
     * Find PR by document code or slug format (e.g. 0026/PR-IMLI/X/2026 or 0026-PR-IMLI-X-2026).
     */
    public function findByCode(string $code): ?PurchaseRequisition
    {
        // Normalize slash or hyphen formats
        $normalizedSlash = str_replace('-', '/', $code);
        $normalizedHyphen = str_replace('/', '-', $code);

        return PurchaseRequisition::with([
            'department',
            'section',
            'creatorUser',
            'updatedByUser',
            'items.item.unitOfMeasurement',
            'approvals.user',
        ])
        ->where('pr_number', $code)
        ->orWhere('pr_number', $normalizedSlash)
        ->orWhere('pr_number', $normalizedHyphen)
        ->orWhere('id', is_numeric($code) ? $code : null)
        ->first();
    }

    /**
     * Update an existing Purchase Requisition.
     */
    public function updateRequisition(int $id, array $headerData, ?array $items = null, ?int $userId = null): PurchaseRequisition
    {
        return DB::transaction(function () use ($id, $headerData, $items, $userId) {
            $requisition = PurchaseRequisition::findOrFail($id);

            // Cannot update if already fully approved or complete without revision
            if (in_array($requisition->status, ['Approved 2', 'Complete']) && !isset($headerData['revision'])) {
                throw new InvalidArgumentException("Cannot modify fully approved/completed PR without revision.");
            }

            if ($userId) {
                $headerData['updated_by'] = $userId;
            }

            $requisition->update($headerData);

            if ($items !== null) {
                // Delete previous items and reinsert
                PurchaseRequisitionItem::where('purchase_requisitions_id', $requisition->id)->delete();

                foreach ($items as $item) {
                    PurchaseRequisitionItem::create([
                        'purchase_requisitions_id' => $requisition->id,
                        'items_id' => $item['items_id'],
                        'quantity' => (string) ($item['quantity'] ?? '1'),
                        'remark' => $item['remark'] ?? null,
                        'due_date' => $item['due_date'] ?? $requisition->due_date,
                        'note' => $item['note'] ?? null,
                    ]);
                }
            }

            return $requisition->fresh(['department', 'section', 'creatorUser', 'items.item']);
        });
    }

    /**
     * List PRs with filtering, search, sorting, and pagination.
     */
    public function listRequisitions(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = PurchaseRequisition::with([
            'department',
            'section',
            'creatorUser',
            'items.item',
        ]);

        // Search by PR number or remark
        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('pr_number', 'like', "%{$s}%")
                  ->orWhereHas('items', function ($iq) use ($s) {
                      $iq->where('remark', 'like', "%{$s}%")
                         ->orWhereHas('item', function ($mq) use ($s) {
                             $mq->where('name', 'like', "%{$s}%")
                                ->orWhere('code', 'like', "%{$s}%");
                         });
                  });
            });
        }

        // Filter by Department
        if (!empty($filters['department_id'])) {
            $query->where('departments_id', $filters['department_id']);
        }

        // Filter by Section
        if (!empty($filters['section_id'])) {
            $query->where('sections_id', $filters['section_id']);
        }

        // Filter by Status
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Sorting
        $sortField = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        $query->orderBy($sortField, $sortOrder);

        return $query->paginate($perPage);
    }

    /**
     * Soft delete a Purchase Requisition.
     */
    public function deleteRequisition(int $id, ?int $userId = null): bool
    {
        return DB::transaction(function () use ($id, $userId) {
            $requisition = PurchaseRequisition::findOrFail($id);

            if ($userId) {
                $requisition->update(['updated_by' => $userId]);
            }

            PurchaseRequisitionItem::where('purchase_requisitions_id', $requisition->id)->delete();
            return (bool) $requisition->delete();
        });
    }
}
