<?php

namespace App\Services\Procurement;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\AdditionalCost;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseOrderService
{
    public function createPo(
        array $headerData,
        array $items,
        array $additionalCosts = [],
        int $userId = 1
    ): PurchaseOrder {
        return $this->createOrder($headerData, $items, $additionalCosts, $userId);
    }

    /**
     * Create a Purchase Order directly linked to an approved Purchase Requisition.
     */
    public function createPoFromPr(
        int $prId,
        array $headerData,
        array $itemsData = [],
        array $additionalCosts = [],
        int $userId = 1
    ): PurchaseOrder {
        $pr = \App\Models\PurchaseRequisition::with('items.item')->findOrFail($prId);

        // If items are not customized, convert all PR items directly
        if (empty($itemsData)) {
            $itemsData = $pr->items->map(function ($prItem) {
                return [
                    'pr_has_items_id' => $prItem->id,
                    'items_id' => $prItem->items_id,
                    'order' => (float) $prItem->quantity,
                    'price' => 0.0,
                    'discount_val' => 0.0,
                ];
            })->toArray();
        } else {
            // Ensure pr_has_items_id is mapped if items_id is given
            foreach ($itemsData as &$item) {
                if (empty($item['pr_has_items_id']) && !empty($item['items_id'])) {
                    $matchedPrItem = $pr->items->where('items_id', $item['items_id'])->first();
                    if ($matchedPrItem) {
                        $item['pr_has_items_id'] = $matchedPrItem->id;
                    }
                }
            }
            unset($item);
        }

        return $this->createOrder($headerData, $itemsData, $additionalCosts, $userId);
    }

    /**
     * Create a new Purchase Order with calculated items and additional costs.
     */
    public function createOrder(
        array $headerData,
        array $items,
        array $additionalCosts = [],
        int $userId = 1
    ): PurchaseOrder {
        if (empty($items)) {
            throw new InvalidArgumentException("A Purchase Order must contain at least one item.");
        }

        return DB::transaction(function () use ($headerData, $items, $additionalCosts, $userId) {
            $poNumber = $headerData['po_number'] ?? DocumentNumberGenerator::generatePoNumber();

            $poTypeId = $headerData['po_types_id'] ?? \App\Models\PoType::firstOrCreate(['code' => 'STD'], ['name' => 'PO Standard'])->id;
            $valutaId = $headerData['valutas_id'] ?? \App\Models\Valuta::firstOrCreate(['code' => 'IDR'], ['name' => 'Rupiah'])->id;
            $delivTermId = $headerData['delivery_terms_id'] ?? \App\Models\DeliveryTerm::firstOrCreate(['name' => 'Loco Surabaya'])->id;
            $payTermId = $headerData['payment_terms_id'] ?? \App\Models\PaymentTerm::first()?->id ?? 1;
            $payMethodId = $headerData['payment_methods_id'] ?? \App\Models\PaymentMethod::first()?->id ?? 1;
            $dueDate = $headerData['due_date'] ?? now()->addDays(14)->format('Y-m-d');
            $latestDeliv = $headerData['latest_delivery'] ?? now()->addDays(14);

            $order = PurchaseOrder::create([
                'po_number' => $poNumber,
                'creator_id' => $userId,
                'po_types_id' => $poTypeId,
                'date' => $headerData['date'] ?? now()->format('d-M-Y'),
                'due_date' => $dueDate,
                'valutas_id' => $valutaId,
                'rate' => $headerData['rate'] ?? '1.00',
                'supliers_id' => $headerData['supliers_id'],
                'address' => $headerData['address'] ?? '',
                'payment_terms_id' => $payTermId,
                'payment_methods_id' => $payMethodId,
                'service_subkon' => $headerData['service_subkon'] ?? 0,
                'facility_status' => $headerData['facility_status'] ?? 'FASILITAS',
                'delivery_terms_id' => $delivTermId,
                'latest_delivery' => $latestDeliv,
                'remark' => $headerData['remark'] ?? null,
                'revision' => $headerData['revision'] ?? 0,
            ]);

            $isKawasanBerikat = strtoupper($order->facility_status) === 'FASILITAS';

            foreach ($items as $item) {
                $calc = ProcurementCalculationService::calculateItemFinancials(
                    price: (float) ($item['price'] ?? 0),
                    order: (float) ($item['order'] ?? $item['quantity'] ?? 1),
                    discountVal: (float) ($item['discount_val'] ?? 0),
                    discountType: $item['discount_type'] ?? 'percentage',
                    ppnRate: (float) ($item['ppn_rate'] ?? 11),
                    isKawasanBerikat: $isKawasanBerikat,
                    pphRate: (float) ($item['pph_rate'] ?? 0),
                    isPphDeduction: (bool) ($item['is_pph_deduction'] ?? false),
                    lme: (float) ($item['lme'] ?? 0),
                    optionalRate: (float) ($item['optional_rate'] ?? 0),
                    percentageLme: (float) ($item['percentage_lme'] ?? 0)
                );

                PurchaseOrderItem::create([
                    'purchase_order_id' => $order->id,
                    'pr_has_items_id' => $item['pr_has_items_id'] ?? null,
                    'item_alias' => $item['item_alias'] ?? null,
                    'price' => $calc['price'],
                    'purchased' => (float) ($item['purchased'] ?? $calc['order']),
                    'order' => $calc['order'],
                    'discount_types_id' => $item['discount_types_id'] ?? null,
                    'discount_val' => (float) ($item['discount_val'] ?? 0),
                    'subtotal' => $calc['subtotal'],
                    'lme' => $calc['lme'],
                    'optional_rate' => $calc['optional_rate'],
                    'percentage_lme' => $calc['percentage_lme'],
                    'pph_id' => $item['pph_id'] ?? null,
                    'subtotal_pph' => $calc['pph_amount'],
                    'total' => $calc['total'],
                    'discount' => $calc['discount'],
                    'dpp' => $calc['dpp'],
                    'ppn_id' => $item['ppn_id'] ?? null,
                    'ditangguhkan_kawasan_berikat' => $isKawasanBerikat ? 1 : 0,
                    'total_addional_cost' => 0,
                    'total_pph' => $calc['pph_amount'],
                    'grand_total' => $calc['grand_total'],
                ]);
            }

            foreach ($additionalCosts as $cost) {
                AdditionalCost::create([
                    'purchase_order_id' => $order->id,
                    'additional_cost_types_id' => $cost['additional_cost_types_id'],
                    'value' => (float) ($cost['value'] ?? 0),
                ]);
            }

            return $order->load([
                'supplier',
                'valuta',
                'poType',
                'paymentTerm',
                'paymentMethod',
                'deliveryTerm',
                'items',
                'additionalCosts.type',
            ]);
        });
    }

    /**
     * Find PO by document number or slug (e.g. POL-1026-0040).
     */
    public function findByCode(string $code): ?PurchaseOrder
    {
        return PurchaseOrder::with([
            'supplier',
            'valuta',
            'poType',
            'paymentTerm',
            'paymentMethod',
            'deliveryTerm',
            'creator',
            'updatedByUser',
            'items',
            'additionalCosts.type',
            'approvals.user',
            'receiveNotes.receiveNote',
        ])
        ->where('po_number', $code)
        ->orWhere('id', is_numeric($code) ? $code : null)
        ->first();
    }

    /**
     * List POs with filtering, search, and pagination.
     */
    public function listOrders(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = PurchaseOrder::with([
            'supplier',
            'valuta',
            'poType',
            'paymentTerm',
            'items',
            'approvals',
        ]);

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('po_number', 'like', "%{$s}%")
                  ->orWhere('remark', 'like', "%{$s}%")
                  ->orWhereHas('supplier', function ($sq) use ($s) {
                      $sq->where('name', 'like', "%{$s}%")
                         ->orWhere('code', 'like', "%{$s}%");
                  });
            });
        }

        if (!empty($filters['supplier_id'])) {
            $query->where('supliers_id', $filters['supplier_id']);
        }

        if (!empty($filters['facility_status'])) {
            $query->where('facility_status', $filters['facility_status']);
        }

        if (!empty($filters['po_type_id'])) {
            $query->where('po_types_id', $filters['po_type_id']);
        }

        $sortField = $filters['sort_by'] ?? 'created_at';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        $query->orderBy($sortField, $sortOrder);

        return $query->paginate($perPage);
    }

    /**
     * Delete an existing Purchase Order.
     */
    public function deleteOrder(int $id, ?int $userId = null): bool
    {
        return DB::transaction(function () use ($id, $userId) {
            $order = PurchaseOrder::findOrFail($id);

            if ($userId) {
                $order->update(['updated_by' => $userId]);
            }

            PurchaseOrderItem::where('purchase_order_id', $order->id)->delete();
            AdditionalCost::where('purchase_order_id', $order->id)->delete();

            return (bool) $order->delete();
        });
    }
}
