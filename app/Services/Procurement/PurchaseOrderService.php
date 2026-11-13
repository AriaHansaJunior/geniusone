<?php

namespace App\Services\Procurement;

use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\Pph;
use App\Models\Master\Finance\Ppn;
use App\Models\Master\Finance\Valuta;
use App\Models\Procurement\PurchaseOrder\AdditionalCost;
use App\Models\Procurement\PurchaseOrder\AdditionalCostType;
use App\Models\Procurement\PurchaseOrder\PoType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseOrderService
{
    public function createPo(
        array $headerData,
        array $items,
        array $additionalCosts = [],
        ?int $userId = null
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
        ?int $userId = null
    ): PurchaseOrder {
        $pr = PurchaseRequisition::with('items.item')->findOrFail($prId);

        // BE-05: Strict Downstream Gating (PR must be Approved before PO generation)
        $isPrApproved = in_array($pr->status, ['Approved', 'Approved 2', 'Outstanding', 'Ordered', 'Partial Closing'], true)
            || (method_exists($pr, 'isFullyApproved') && $pr->isFullyApproved());

        if (! $isPrApproved) {
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
        ?int $userId = null
    ): PurchaseOrder {
        $actorId = $userId ?? Auth::id();
        if (! $actorId) {
            throw new InvalidArgumentException('Authenticated user ID is required to create a Purchase Order.');
        }
        if (empty($items)) {
            throw new InvalidArgumentException('A Purchase Order must contain at least one item.');
        }

        $this->validateLinkedPrItems($items);
        $resolvedFacility = $this->resolveFacilityStatus($headerData, $items);

        return DB::transaction(function () use ($headerData, $items, $additionalCosts, $actorId, $resolvedFacility) {
            $poNumber = $headerData['po_number'] ?? DocumentNumberGenerator::generatePoNumber();

            $poTypeId = $headerData['po_types_id'] ?? PoType::where('status', 1)->value('id') ?? PoType::value('id');
            $valutaId = $headerData['valutas_id'] ?? Valuta::where('code', 'IDR')->value('id') ?? Valuta::value('id');
            $delivTermId = $headerData['delivery_terms_id'] ?? DeliveryTerm::value('id');
            $payTermId = $headerData['payment_terms_id'] ?? PaymentTerm::value('id');
            $payMethodId = $headerData['payment_methods_id'] ?? PaymentMethod::value('id');

            if (! $poTypeId || ! $valutaId || ! $delivTermId || ! $payTermId || ! $payMethodId) {
                throw new InvalidArgumentException('Required master procurement/finance data (PO Type, Currency, Delivery Term, Payment Term, Payment Method) is missing.');
            }
            if (empty($headerData['supliers_id'])) {
                throw new InvalidArgumentException('Supplier is required to create a Purchase Order.');
            }

            $dueDate = $headerData['due_date'] ?? now()->addDays(14)->format('Y-m-d');
            $latestDeliv = $headerData['latest_delivery'] ?? now()->addDays(14);
            $isKawasanBerikat = strtoupper($resolvedFacility) === 'FASILITAS'
                ? true
                : (bool) ($headerData['is_kawasan_berikat'] ?? false);

            $order = PurchaseOrder::create([
                'po_number' => $poNumber,
                'creator_id' => $actorId,
                'po_types_id' => $poTypeId,
                'date' => $headerData['date'] ?? now()->format('d-M-Y'),
                'due_date' => $dueDate,
                'valutas_id' => $valutaId,
                'rate' => $headerData['rate'] ?? '1.00',
                'ppn_rate' => (float) ($headerData['ppn_rate'] ?? 11),
                'discount_overall_percent' => (float) ($headerData['discount_overall_percent'] ?? 0),
                'supliers_id' => $headerData['supliers_id'],
                'address' => $headerData['address'] ?? '',
                'payment_terms_id' => $payTermId,
                'payment_methods_id' => $payMethodId,
                'service_subkon' => $headerData['service_subkon'] ?? 0,
                'facility_status' => $resolvedFacility,
                'is_kawasan_berikat' => $isKawasanBerikat,
                'delivery_terms_id' => $delivTermId,
                'latest_delivery' => $latestDeliv,
                'status' => $headerData['status'] ?? 'Waiting for Approve 1',
                'remark' => $headerData['remark'] ?? null,
                'revision' => $headerData['revision'] ?? 0,
            ]);

            $this->persistOrderItems($order, $items, $isKawasanBerikat, $headerData);
            $this->persistAdditionalCosts($order, $additionalCosts);

            \App\Services\AuditLogger::logWorkflow(
                documentType: 'PO',
                documentNumber: $order->po_number,
                action: 'CREATED',
                fromStatus: null,
                toStatus: $order->status,
                userId: $actorId,
                extra: ['facility_status' => $order->facility_status, 'total_items' => count($items)]
            );

            return $order->load([
                'supplier',
                'valuta',
                'poType',
                'paymentTerm',
                'paymentMethod',
                'deliveryTerm',
                'items.pph',
                'items.ppn',
                'additionalCosts.type',
            ]);
        });
    }

    /**
     * Update an existing unlocked Purchase Order.
     */
    public function updateOrder(
        int $id,
        array $headerData,
        array $items = [],
        array $additionalCosts = [],
        ?int $userId = null
    ): PurchaseOrder {
        $actorId = $userId ?? Auth::id();
        if (! $actorId) {
            throw new InvalidArgumentException('Authenticated user ID is required to update a Purchase Order.');
        }

        return DB::transaction(function () use ($id, $headerData, $items, $additionalCosts, $actorId) {
            $order = PurchaseOrder::with(['items', 'additionalCosts'])->findOrFail($id);
            $this->assertNotLocked($order);

            if (! empty($items)) {
                $this->validateLinkedPrItems($items);
            }

            $facilityInput = array_key_exists('facility_status', $headerData) || ! empty($items)
                ? $this->resolveFacilityStatus(array_merge(['facility_status' => $order->facility_status], $headerData), $items)
                : $order->facility_status;
            $isKawasanBerikat = strtoupper((string) $facilityInput) === 'FASILITAS'
                ? true
                : (bool) ($headerData['is_kawasan_berikat'] ?? $order->is_kawasan_berikat);

            $order->update([
                'po_types_id' => $headerData['po_types_id'] ?? $order->po_types_id,
                'date' => $headerData['date'] ?? $order->date,
                'due_date' => $headerData['due_date'] ?? $order->due_date,
                'valutas_id' => $headerData['valutas_id'] ?? $order->valutas_id,
                'rate' => $headerData['rate'] ?? $order->rate,
                'ppn_rate' => array_key_exists('ppn_rate', $headerData) ? (float) $headerData['ppn_rate'] : $order->ppn_rate,
                'discount_overall_percent' => array_key_exists('discount_overall_percent', $headerData)
                    ? (float) $headerData['discount_overall_percent']
                    : $order->discount_overall_percent,
                'supliers_id' => $headerData['supliers_id'] ?? $order->supliers_id,
                'address' => $headerData['address'] ?? $order->address,
                'payment_terms_id' => $headerData['payment_terms_id'] ?? $order->payment_terms_id,
                'payment_methods_id' => $headerData['payment_methods_id'] ?? $order->payment_methods_id,
                'service_subkon' => $headerData['service_subkon'] ?? $order->service_subkon,
                'facility_status' => $facilityInput,
                'is_kawasan_berikat' => $isKawasanBerikat,
                'delivery_terms_id' => $headerData['delivery_terms_id'] ?? $order->delivery_terms_id,
                'latest_delivery' => $headerData['latest_delivery'] ?? $order->latest_delivery,
                'remark' => $headerData['remark'] ?? $order->remark,
                'updated_by' => $actorId,
            ]);

            if (! empty($items)) {
                PurchaseOrderItem::where('purchase_order_id', $order->id)->delete();
                $this->persistOrderItems($order, $items, $isKawasanBerikat, array_merge(['ppn_rate' => $order->ppn_rate], $headerData));
            }

            if (array_key_exists('sync_additional_costs', $headerData) && $headerData['sync_additional_costs']) {
                AdditionalCost::where('purchase_order_id', $order->id)->delete();
                $this->persistAdditionalCosts($order, $additionalCosts);
            }

            \App\Services\AuditLogger::logWorkflow(
                documentType: 'PO',
                documentNumber: $order->po_number,
                action: 'UPDATED',
                fromStatus: $order->status,
                toStatus: $order->status,
                userId: $actorId,
                extra: ['facility_status' => $order->facility_status]
            );

            return $order->fresh([
                'supplier',
                'valuta',
                'poType',
                'paymentTerm',
                'paymentMethod',
                'deliveryTerm',
                'items.pph',
                'items.ppn',
                'additionalCosts.type',
            ]);
        });
    }

    private function validateLinkedPrItems(array $items): void
    {
        foreach ($items as $it) {
            if (! empty($it['pr_has_items_id'])) {
                $prItem = PurchaseRequisitionItem::with('purchaseRequisition.approvals', 'item')->find($it['pr_has_items_id']);
                if ($prItem && $prItem->purchaseRequisition) {
                    $linkedPr = $prItem->purchaseRequisition;
                    $isApproved = in_array($linkedPr->status, ['Approved', 'Approved 2', 'Outstanding', 'Ordered', 'Partial Closing'], true)
                        || (method_exists($linkedPr, 'isFullyApproved') && $linkedPr->isFullyApproved())
                        || ($linkedPr->approvals && $linkedPr->approvals->where('approval_ke', '2')->where('status', 1)->isNotEmpty());

                    if (! $isApproved) {
                        throw new InvalidArgumentException("Cannot create Purchase Order: Linked PR '{$linkedPr->pr_number}' is not fully Approved.");
                    }
                }
                if ($prItem && $prItem->is_closed) {
                    throw new InvalidArgumentException("Cannot create Purchase Order: Linked PR item '{$prItem->item?->name}' has been marked as Closed.");
                }
            }
        }
    }

    private function resolveFacilityStatus(array $headerData, array $items): string
    {
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
            return 'NON FASILITAS';
        }
        if ($masterItemFacilities->isNotEmpty() && $masterItemFacilities->every(fn ($f) => ! str_contains($f, 'NON') && (str_contains($f, 'FASILITAS') || str_contains($f, 'BERIKAT')))) {
            return 'FASILITAS';
        }
        if ($rawFacHeader !== '') {
            return str_contains($rawFacHeader, 'NON') ? 'NON FASILITAS' : 'FASILITAS';
        }

        return 'NON FASILITAS';
    }

    private function persistOrderItems(PurchaseOrder $order, array $items, bool $isKawasanBerikat, array $headerData): void
    {
        foreach ($items as $item) {
            $rawDiscVal = (float) ($item['discount_val'] ?? $item['discountPercent'] ?? 0);
            $rawDiscType = $item['discount_type'] ?? null;
            $rawDiscTypeId = $item['discount_types_id'] ?? null;

            $resolvedDiscTypeId = null;
            if ($rawDiscVal > 0) {
                if (! empty($rawDiscTypeId) && DB::table('discount_types')->where('id', $rawDiscTypeId)->exists()) {
                    $resolvedDiscTypeId = (int) $rawDiscTypeId;
                } elseif ($rawDiscType === 'percentage' || $rawDiscType === 'percent' || $rawDiscTypeId == 1) {
                    $resolvedDiscTypeId = DB::table('discount_types')->where('name', 'like', '%percent%')->value('id');
                } elseif ($rawDiscType === 'amount' || $rawDiscType === 'nominal' || $rawDiscTypeId == 2) {
                    $resolvedDiscTypeId = DB::table('discount_types')->where('name', 'like', '%nominal%')->orWhere('name', 'like', '%amount%')->value('id');
                }
            }

            $resolvedPphId = ! empty($item['pph_id']) && DB::table('pph')->where('id', $item['pph_id'])->exists()
                ? (int) $item['pph_id']
                : null;
            $pphModel = $resolvedPphId ? Pph::find($resolvedPphId) : null;

            $resolvedPpnId = ! empty($item['ppn_id']) && DB::table('ppn')->where('id', $item['ppn_id'])->exists()
                ? (int) $item['ppn_id']
                : null;
            $ppnModel = $resolvedPpnId ? Ppn::find($resolvedPpnId) : null;

            $resolvedPrHasItemId = ! empty($item['pr_has_items_id']) && DB::table('purchase_requisitions_has_items')->where('id', $item['pr_has_items_id'])->exists()
                ? (int) $item['pr_has_items_id']
                : null;

            $orderQty = (float) ($item['order'] ?? $item['quantity'] ?? 0);
            if ($orderQty <= 0) {
                throw new InvalidArgumentException('Purchase Order line item order quantity must be greater than zero.');
            }

            $effectivePpnRate = (float) ($item['ppn_rate'] ?? $ppnModel?->value ?? $headerData['ppn_rate'] ?? 11);
            $effectivePphRate = (float) ($item['pph_rate'] ?? $pphModel?->value ?? $headerData['pph_rate'] ?? 0);
            $effectivePphDeduction = array_key_exists('is_pph_deduction', $item)
                ? (bool) $item['is_pph_deduction']
                : (bool) ($pphModel?->deduction ?? $headerData['is_pph_deduction'] ?? false);

            $calc = ProcurementCalculationService::calculateItemFinancials(
                price: (float) ($item['price'] ?? 0),
                order: $orderQty,
                discountVal: $rawDiscVal,
                discountType: $rawDiscType ?? ($resolvedDiscTypeId == 2 ? 'amount' : ($resolvedDiscTypeId == 1 ? 'percentage' : 'none')),
                ppnRate: $effectivePpnRate,
                isKawasanBerikat: $isKawasanBerikat,
                pphRate: $effectivePphRate,
                isPphDeduction: $effectivePphDeduction,
                lme: (float) ($item['lme'] ?? 0),
                optionalRate: (float) ($item['optional_rate'] ?? 0),
                percentageLme: (float) ($item['percentage_lme'] ?? 0)
            );

            $prItem = $resolvedPrHasItemId ? PurchaseRequisitionItem::with('item')->find($resolvedPrHasItemId) : null;

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
            if ($aliasInput === '' || in_array($aliasInput, ['—', '-'], true) || ($mItem && $aliasInput === $mItem->code) || ($prItem?->item && $aliasInput === $prItem->item->code)) {
                $aliasInput = $mItem?->name ?? $prItem?->item?->name ?? $item['itemName'] ?? $item['item'] ?? '';
            }

            $itemRemark = ! empty($item['remark']) && $item['remark'] !== '-' ? $item['remark'] : ($item['note'] ?? $prItem?->remark ?? null);

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
                'pph_rate' => $effectivePphRate,
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
    }

    private function persistAdditionalCosts(PurchaseOrder $order, array $additionalCosts): void
    {
        foreach ($additionalCosts as $cost) {
            $rawTypeId = $cost['additional_cost_types_id'] ?? $cost['costId'] ?? $cost['type_id'] ?? null;
            $typeId = is_numeric($rawTypeId) && DB::table('additional_cost_types')->where('id', (int) $rawTypeId)->exists()
                ? (int) $rawTypeId
                : null;
            if (! $typeId && ! empty($cost['name'] ?? $cost['costName'] ?? $cost['item'] ?? null)) {
                $cName = trim((string) ($cost['name'] ?? $cost['costName'] ?? $cost['item']));
                $type = AdditionalCostType::where('name', $cName)
                    ->orWhere('code', $cName)
                    ->orWhereRaw('? LIKE CONCAT(\'%\', name, \'%\')', [$cName])
                    ->orWhereRaw('? LIKE CONCAT(code, \'%\')', [$cName])
                    ->first();
                $typeId = $type?->id;
            }

            if ($typeId) {
                AdditionalCost::create([
                    'purchase_order_id' => $order->id,
                    'additional_cost_types_id' => $typeId,
                    'value' => (float) ($cost['value'] ?? $cost['nominal'] ?? $cost['amount'] ?? 0),
                    'note' => $cost['note'] ?? $cost['remark'] ?? null,
                ]);
            }
        }
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
            'creator.department',
            'updatedByUser',
            'items.directItem.unitOfMeasurement',
            'items.directItem.facility',
            'items.requisitionItem.item.unitOfMeasurement',
            'items.pph',
            'items.ppn',
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
            'items.pph',
            'items.ppn',
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
     * Delete an additional cost from an unlocked Purchase Order.
     */
    public function deleteAdditionalCost(PurchaseOrder $order, int $costId): bool
    {
        $this->assertNotLocked($order);
        $cost = AdditionalCost::where('purchase_order_id', $order->id)->findOrFail($costId);

        return (bool) $cost->delete();
    }

    /**
     * BE-05: Assert that document is not immutable/locked.
     */
    public function assertNotLocked(PurchaseOrder $order): void
    {
        if (in_array($order->status, ['Approved', 'Approved 2', 'Completed'], true)) {
            throw new InvalidArgumentException("Purchase Order '{$order->po_number}' is fully Approved and locked from modifications.");
        }
    }
}
