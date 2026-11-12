<?php

namespace App\Services\Procurement;

use App\Models\DeliveryTerm;
use App\Models\PaymentMethod;
use App\Models\PaymentTerm;
use App\Models\PoType;
use App\Models\Procurement\PurchaseOrder\AdditionalCost;
use App\Models\Procurement\PurchaseOrder\AdditionalCostType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Models\Valuta;
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
        $pr = PurchaseRequisition::with('items.item')->findOrFail($prId);

        // BE-05: Strict Downstream Gating (PR must be Approved before PO generation)
        if (! in_array($pr->status, ['Approved', 'Approved 2'], true)) {
            throw new InvalidArgumentException("Cannot create Purchase Order: Purchase Requisition '{$pr->pr_number}' must be fully Approved first (Current status: {$pr->status}).");
        }

        // BE-05: Exclude Closed PR items from downstream PO generation
        $activePrItems = $pr->items->filter(fn ($it) => ! $it->is_closed);
        if ($activePrItems->isEmpty()) {
            throw new InvalidArgumentException("Cannot create Purchase Order: All line items in PR '{$pr->pr_number}' have been marked as Closed.");
        }

        // If items are not customized, convert all active PR items directly
        if (empty($itemsData)) {
            $itemsData = $activePrItems->map(function ($prItem) {
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
                if (empty($item['pr_has_items_id']) && ! empty($item['items_id'])) {
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
            throw new InvalidArgumentException('A Purchase Order must contain at least one item.');
        }

        // BE-05: Enforce that any explicitly linked PR items belong to an Approved PR and are NOT Closed
        foreach ($items as $it) {
            if (! empty($it['pr_has_items_id'])) {
                $prItem = PurchaseRequisitionItem::with('purchaseRequisition', 'item')->find($it['pr_has_items_id']);
                if ($prItem && ! in_array($prItem->purchaseRequisition?->status, ['Approved', 'Approved 2'], true)) {
                    throw new InvalidArgumentException("Cannot create Purchase Order: Linked PR '{$prItem->purchaseRequisition?->pr_number}' is not fully Approved.");
                }
                if ($prItem && $prItem->is_closed) {
                    throw new InvalidArgumentException("Cannot create Purchase Order: Linked PR item '{$prItem->item?->name}' has been marked as Closed.");
                }
            }
        }

        // BE-01: Resolve Facility Status directly from Master Item
        $rawFacHeader = strtoupper((string) ($headerData['facility_status'] ?? ''));
        $masterItemFacilities = collect();
        foreach ($items as $it) {
            $mItem = null;
            if (! empty($it['items_id'])) {
                $mItem = \App\Models\Master\Material\Item::with('facility')->find($it['items_id']);
            } elseif (! empty($it['pr_has_items_id'])) {
                $pItem = PurchaseRequisitionItem::with('item.facility')->find($it['pr_has_items_id']);
                $mItem = $pItem?->item;
            }
            if (! $mItem) {
                $identifier = $it['item_code'] ?? $it['item_alias'] ?? $it['itemName'] ?? null;
                if ($identifier) {
                    $mItem = \App\Models\Master\Material\Item::with('facility')
                        ->where('code', $identifier)
                        ->orWhere('name', $identifier)
                        ->first();
                }
            }
            if ($mItem?->facility) {
                $masterItemFacilities->push(strtoupper(trim($mItem->facility->name)));
            } elseif ($mItem && $mItem->facilities_id == 3) {
                $masterItemFacilities->push('NON FASILITAS');
            }
        }

        $hasNon = str_contains($rawFacHeader, 'NON') || $masterItemFacilities->contains(fn ($f) => str_contains($f, 'NON'));

        if ($hasNon) {
            $resolvedFacility = 'NON FASILITAS';
        } elseif ($masterItemFacilities->isNotEmpty() && $masterItemFacilities->every(fn ($f) => ! str_contains($f, 'NON') && (str_contains($f, 'FASILITAS') || str_contains($f, 'BERIKAT')))) {
            $resolvedFacility = 'FASILITAS';
        } else {
            $resolvedFacility = str_contains($rawFacHeader, 'NON') ? 'NON FASILITAS' : 'FASILITAS';
        }

        return DB::transaction(function () use ($headerData, $items, $additionalCosts, $userId, $resolvedFacility) {
            $poNumber = $headerData['po_number'] ?? DocumentNumberGenerator::generatePoNumber();

            $poTypeId = $headerData['po_types_id'] ?? PoType::firstOrCreate(['code' => 'STD'], ['name' => 'PO Standard'])->id;
            $valutaId = $headerData['valutas_id'] ?? Valuta::firstOrCreate(['code' => 'IDR'], ['name' => 'Rupiah'])->id;
            $delivTermId = $headerData['delivery_terms_id'] ?? DeliveryTerm::firstOrCreate(['name' => 'Loco Surabaya'])->id;
            $payTermId = $headerData['payment_terms_id'] ?? PaymentTerm::first()?->id ?? 1;
            $payMethodId = $headerData['payment_methods_id'] ?? PaymentMethod::first()?->id ?? 1;
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
                'facility_status' => $resolvedFacility,
                'delivery_terms_id' => $delivTermId,
                'latest_delivery' => $latestDeliv,
                'status' => $headerData['status'] ?? 'Waiting for Approve 1',
                'remark' => $headerData['remark'] ?? null,
                'revision' => $headerData['revision'] ?? 0,
            ]);

            $isKawasanBerikat = strtoupper($order->facility_status) === 'FASILITAS';

            foreach ($items as $item) {
                // Determine discount type and value safely to ensure no foreign key violation
                $rawDiscVal = (float) ($item['discount_val'] ?? $item['discountPercent'] ?? 0);
                $rawDiscType = $item['discount_type'] ?? null;
                $rawDiscTypeId = $item['discount_types_id'] ?? null;

                $resolvedDiscTypeId = null;
                if ($rawDiscVal > 0) {
                    if (! empty($rawDiscTypeId) && DB::table('discount_types')->where('id', $rawDiscTypeId)->exists()) {
                        $resolvedDiscTypeId = (int) $rawDiscTypeId;
                    } elseif ($rawDiscType === 'percentage' || $rawDiscType === 'percent' || $rawDiscTypeId == 1) {
                        $resolvedDiscTypeId = DB::table('discount_types')->where('name', 'like', '%percent%')->value('id');
                        if (! $resolvedDiscTypeId) {
                            $resolvedDiscTypeId = DB::table('discount_types')->insertGetId([
                                'name' => 'Percentage',
                                'status' => '1',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    } elseif ($rawDiscType === 'amount' || $rawDiscType === 'nominal' || $rawDiscTypeId == 2) {
                        $resolvedDiscTypeId = DB::table('discount_types')->where('name', 'like', '%nominal%')->orWhere('name', 'like', '%amount%')->value('id');
                        if (! $resolvedDiscTypeId) {
                            $resolvedDiscTypeId = DB::table('discount_types')->insertGetId([
                                'name' => 'Nominal',
                                'status' => '1',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }

                // Check PPH foreign key safely
                $resolvedPphId = null;
                if (! empty($item['pph_id'])) {
                    if (DB::table('pph')->where('id', $item['pph_id'])->exists()) {
                        $resolvedPphId = (int) $item['pph_id'];
                    }
                }

                // Check PPN foreign key safely
                $resolvedPpnId = null;
                if (! empty($item['ppn_id'])) {
                    if (DB::table('ppn')->where('id', $item['ppn_id'])->exists()) {
                        $resolvedPpnId = (int) $item['ppn_id'];
                    }
                }

                // Check PR Item foreign key safely
                $resolvedPrHasItemId = null;
                if (! empty($item['pr_has_items_id'])) {
                    if (DB::table('purchase_requisitions_has_items')->where('id', $item['pr_has_items_id'])->exists()) {
                        $resolvedPrHasItemId = (int) $item['pr_has_items_id'];
                    }
                }

                $calc = ProcurementCalculationService::calculateItemFinancials(
                    price: (float) ($item['price'] ?? 0),
                    order: (float) ($item['order'] ?? $item['quantity'] ?? 1),
                    discountVal: $rawDiscVal,
                    discountType: $rawDiscType ?? ($resolvedDiscTypeId == 2 ? 'amount' : ($resolvedDiscTypeId == 1 ? 'percentage' : 'none')),
                    ppnRate: (float) ($item['ppn_rate'] ?? 11),
                    isKawasanBerikat: $isKawasanBerikat,
                    pphRate: (float) ($item['pph_rate'] ?? 0),
                    isPphDeduction: (bool) ($item['is_pph_deduction'] ?? false),
                    lme: (float) ($item['lme'] ?? 0),
                    optionalRate: (float) ($item['optional_rate'] ?? 0),
                    percentageLme: (float) ($item['percentage_lme'] ?? 0)
                );

                $prItem = $resolvedPrHasItemId ? \App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem::with('item')->find($resolvedPrHasItemId) : null;

                // Resolve items_id
                $resolvedItemId = null;
                if (! empty($item['items_id']) && DB::table('items')->where('id', $item['items_id'])->exists()) {
                    $resolvedItemId = (int) $item['items_id'];
                } elseif ($prItem?->items_id) {
                    $resolvedItemId = (int) $prItem->items_id;
                } else {
                    $identifier = $item['item_code'] ?? $item['item_alias'] ?? $item['itemName'] ?? $item['item'] ?? null;
                    if ($identifier) {
                        $resolvedItemId = DB::table('items')
                            ->where('code', $identifier)
                            ->orWhere('name', $identifier)
                            ->value('id');
                    }
                }

                $mItem = $resolvedItemId ? \App\Models\Master\Material\Item::find($resolvedItemId) : null;
                $aliasInput = trim((string) ($item['item_alias'] ?? $item['itemAlias'] ?? ''));
                if ($aliasInput === '' || in_array($aliasInput, ['—', '-'], true)) {
                    $aliasInput = $mItem?->name ?? $prItem?->item?->name ?? $item['itemName'] ?? $item['item'] ?? 'Industrial Material';
                }

                $itemRemark = !empty($item['remark']) && $item['remark'] !== '-' ? $item['remark'] : ($item['note'] ?? $prItem?->remark ?? null);

                PurchaseOrderItem::create([
                    'purchase_order_id' => $order->id,
                    'pr_has_items_id' => $resolvedPrHasItemId,
                    'items_id' => $resolvedItemId,
                    'item_alias' => $aliasInput,
                    'price' => $calc['price'],
                    'purchased' => (float) ($item['purchased'] ?? $calc['order']),
                    'order' => $calc['order'],
                    'discount_types_id' => $resolvedDiscTypeId,
                    'discount_val' => $rawDiscVal,
                    'subtotal' => $calc['subtotal'],
                    'lme' => $calc['lme'],
                    'optional_rate' => $calc['optional_rate'],
                    'percentage_lme' => $calc['percentage_lme'],
                    'pph_id' => $resolvedPphId,
                    'subtotal_pph' => $calc['pph_amount'],
                    'total' => $calc['total'],
                    'discount' => $calc['discount'],
                    'dpp' => $calc['dpp'],
                    'ppn_id' => $resolvedPpnId,
                    'ditangguhkan_kawasan_berikat' => $isKawasanBerikat ? 1 : 0,
                    'total_addional_cost' => 0,
                    'total_pph' => $calc['pph_amount'],
                    'grand_total' => $calc['grand_total'],
                    'remark' => $itemRemark,
                ]);
            }

            foreach ($additionalCosts as $cost) {
                $rawTypeId = $cost['additional_cost_types_id'] ?? $cost['costId'] ?? $cost['type_id'] ?? null;
                $typeId = is_numeric($rawTypeId) && DB::table('additional_cost_types')->where('id', (int) $rawTypeId)->exists()
                    ? (int) $rawTypeId
                    : null;
                if (! $typeId && ! empty($cost['name'] ?? $cost['costName'] ?? $cost['item'] ?? null)) {
                    $cName = trim($cost['name'] ?? $cost['costName'] ?? $cost['item']);
                    // Match by code, exact name, or string containing code/name (e.g. "CRN - Jasa Crane / Lifting")
                    $type = AdditionalCostType::where('name', $cName)
                        ->orWhere('code', $cName)
                        ->orWhereRaw('? LIKE CONCAT(\'%\', name, \'%\')', [$cName])
                        ->orWhereRaw('? LIKE CONCAT(code, \'%\')', [$cName])
                        ->first();

                    if (! $type) {
                        $baseCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $cName), 0, 4)) ?: 'COST';
                        $code = $baseCode;
                        $suffix = 1;
                        while (AdditionalCostType::where('code', $code)->exists()) {
                            $code = substr($baseCode, 0, 3).$suffix;
                            $suffix++;
                        }
                        $type = AdditionalCostType::firstOrCreate(
                            ['name' => substr($cName, 0, 45)],
                            ['code' => $code, 'status' => 1]
                        );
                    }
                    $typeId = $type?->id;
                }

                if ($typeId && DB::table('additional_cost_types')->where('id', $typeId)->exists()) {
                    AdditionalCost::create([
                        'purchase_order_id' => $order->id,
                        'additional_cost_types_id' => $typeId,
                        'value' => (float) ($cost['value'] ?? $cost['nominal'] ?? $cost['amount'] ?? 0),
                        'note' => $cost['note'] ?? $cost['remark'] ?? null,
                    ]);
                }
            }

            \App\Services\AuditLogger::logWorkflow(
                documentType: 'PO',
                documentNumber: $order->po_number,
                action: 'CREATED',
                fromStatus: null,
                toStatus: $order->status,
                userId: $userId,
                extra: ['facility_status' => $order->facility_status, 'total_items' => count($items)]
            );

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

        if (! empty($filters['search'])) {
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

        if (! empty($filters['supplier_id'])) {
            $query->where('supliers_id', $filters['supplier_id']);
        }

        if (! empty($filters['facility_status'])) {
            $query->where('facility_status', $filters['facility_status']);
        }

        if (! empty($filters['po_type_id'])) {
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

            // BE-05: Locking check
            $this->assertNotLocked($order);

            if ($userId) {
                $order->update(['updated_by' => $userId]);
            }

            PurchaseOrderItem::where('purchase_order_id', $order->id)->delete();
            AdditionalCost::where('purchase_order_id', $order->id)->delete();

            return (bool) $order->delete();
        });
    }

    /**
     * Add an additional cost to an existing PO.
     */
    public function addAdditionalCost(PurchaseOrder $order, array $costData): AdditionalCost
    {
        $rawTypeId = $costData['additional_cost_types_id'] ?? $costData['costId'] ?? $costData['type_id'] ?? null;
        $typeId = is_numeric($rawTypeId) && DB::table('additional_cost_types')->where('id', (int) $rawTypeId)->exists()
            ? (int) $rawTypeId
            : null;
        if (! $typeId && ! empty($costData['name'] ?? $costData['costName'] ?? $costData['item'] ?? null)) {
            $cName = trim($costData['name'] ?? $costData['costName'] ?? $costData['item']);
            $type = AdditionalCostType::where('name', $cName)
                ->orWhere('code', $cName)
                ->orWhereRaw('? LIKE CONCAT(\'%\', name, \'%\')', [$cName])
                ->orWhereRaw('? LIKE CONCAT(code, \'%\')', [$cName])
                ->first();

            if (! $type) {
                $baseCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $cName), 0, 4)) ?: 'COST';
                $code = $baseCode;
                $suffix = 1;
                while (AdditionalCostType::where('code', $code)->exists()) {
                    $code = substr($baseCode, 0, 3).$suffix;
                    $suffix++;
                }
                $type = AdditionalCostType::firstOrCreate(
                    ['name' => substr($cName, 0, 45)],
                    ['code' => $code, 'status' => 1]
                );
            }
            $typeId = $type?->id;
        }

        if (! $typeId) {
            throw new InvalidArgumentException('Valid additional cost type or name is required.');
        }

        return AdditionalCost::create([
            'purchase_order_id' => $order->id,
            'additional_cost_types_id' => $typeId,
            'value' => (float) ($costData['value'] ?? $costData['nominal'] ?? $costData['amount'] ?? 0),
            'note' => $costData['note'] ?? $costData['remark'] ?? null,
        ]);
    }

    /**
     * Delete an additional cost from a PO.
     */
    public function deleteAdditionalCost(PurchaseOrder $order, int $costId): bool
    {
        return (bool) AdditionalCost::where('purchase_order_id', $order->id)
            ->where('id', $costId)
            ->delete();
    }

    /**
     * BE-05: Assert that document is not immutable/locked.
     */
    public function assertNotLocked(PurchaseOrder $order): void
    {
        if (in_array($order->status, ['Approved', 'Approved 2'], true)) {
            throw new InvalidArgumentException("Purchase Order '{$order->po_number}' is fully Approved and locked from modifications.");
        }
    }
}
