<?php

namespace App\Http\Controllers\Api\Procurement;

use App\Http\Controllers\Controller;
use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\Pph;
use App\Models\Master\Finance\Ppn;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Material\Item;
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\PoType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Services\AuditLogger;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\GeniusOneBackend;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PurchaseOrderApiController extends Controller
{
    /**
     * List Purchase Orders.
     */
    public function index(Request $request)
    {
        $query = PurchaseOrder::with([
            'supplier',
            'creator.department',
            'updatedByUser',
            'poType',
            'currency',
            'paymentTerm',
            'paymentMethod',
            'deliveryTerm',
            'items.directItem.unitOfMeasurement',
            'items.directItem.facility',
            'items.requisitionItem.item.unitOfMeasurement',
            'items.requisitionItem.item.facility',
            'items.requisitionItem.purchaseRequisition',
            'items.pph',
            'items.ppn',
            'approvals.user',
            'additionalCosts.type',
            'receiveNotes.receiveNote',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('po_number', 'like', "%{$s}%")
                    ->orWhere('remark', 'like', "%{$s}%")
                    ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$s}%"));
            });
        }

        $records = $query->orderBy('id', 'desc')->get();

        // Calculate Summary Cards
        $totalCount = $records->count();
        $approved1Count = $records->filter(fn ($r) => $r->status === 'Approved 1')->count();
        $approved2Count = $records->filter(fn ($r) => in_array($r->status, ['Approved 2', 'Completed']))->count();
        $readyDraftCount = $records->filter(fn ($r) => in_array($r->status, ['Draft', 'Ready']))->count();
        $grandTotalValue = $records->sum(fn ($r) => $r->grand_total);

        $stats = [
            ['Total POs', (string) $totalCount, 'Generated procurement orders'],
            ['Approved 1', (string) $approved1Count, $totalCount > 0 ? round(($approved1Count / $totalCount) * 100, 1).'% of total' : '0%'],
            ['Approved 2', (string) $approved2Count, $totalCount > 0 ? round(($approved2Count / $totalCount) * 100, 1).'% of total' : '0%'],
            ['Total Order Value', 'IDR '.number_format($grandTotalValue, 0), 'Across all line items'],
        ];

        // Format rows for Frontend Table
        $rows = $records->values()->map(function ($po, $idx) {
            return $this->formatPoRow($po, $idx + 1);
        })->toArray();

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'stats' => $stats,
                'rows' => $rows,
            ]);
        }

        return view('app', [
            'page' => 'po',
            'initialData' => ['stats' => $stats, 'rows' => $rows],
        ]);
    }

    /**
     * Show single Purchase Order detail.
     */
    public function show(Request $request, string $code)
    {
        $decodedCode = urldecode($code);
        $rawCode = str_replace('-', '/', $decodedCode);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $decodedCode);

        $numericId = null;
        if (is_numeric($decodedCode)) {
            $numericId = (int) $decodedCode;
        } elseif (preg_match('/^po-(\d+)$/i', $decodedCode, $m)) {
            $numericId = (int) $m[1];
        }

        $po = PurchaseOrder::with([
            'supplier',
            'creator.department',
            'updatedByUser',
            'poType',
            'currency',
            'paymentTerm',
            'paymentMethod',
            'deliveryTerm',
            'items.directItem.unitOfMeasurement',
            'items.directItem.facility',
            'items.requisitionItem.item.unitOfMeasurement',
            'items.requisitionItem.item.facility',
            'items.requisitionItem.purchaseRequisition',
            'items.pph',
            'items.ppn',
            'approvals.user',
            'additionalCosts.type',
            'receiveNotes.receiveNote',
        ])
            ->where(function ($q) use ($decodedCode, $rawCode, $cleanCode, $numericId) {
                $q->where('po_number', $decodedCode)
                    ->orWhere('po_number', $rawCode)
                    ->orWhereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanCode]);

                if ($numericId) {
                    $q->orWhere('id', $numericId);
                }
            })
            ->first();

        if (! $po) {
            if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
                return response()->json(['status' => 'error', 'message' => 'Purchase Order not found: '.$code], 404);
            }

            return redirect('/procurement/transactions/purchase-order')->withErrors(['error' => 'Purchase Order not found']);
        }

        $detailRow = $this->formatPoRow($po, 1, true);

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'item' => $detailRow,
            ]);
        }

        return view('app', [
            'page' => 'po-detail',
            'code' => $code,
            'initialData' => ['item' => $detailRow],
        ]);
    }

    /**
     * Format a PurchaseOrder into the TableRow structure expected by the React frontend.
     */
    public function formatPoRow(PurchaseOrder $po, int $indexNo = 1, bool $includeFullHistory = false): array
    {
        $currencyCode = $po->currency?->code ?? $po->currency?->name ?? 'IDR';
        $supplierName = $po->supplier ? "[{$po->supplier->code}] {$po->supplier->name}" : '—';
        $firstItem = $po->items->first();
        $firstItemObj = $firstItem?->directItem ?? $firstItem?->item ?? $firstItem?->requisitionItem?->item;
        $firstItemUnit = $firstItemObj?->unitOfMeasurement?->name ?? '';
        $prNumbers = $po->items->map(function ($it) {
            return $it->requisitionItem?->purchaseRequisition?->pr_number;
        })->filter()->unique()->values();
        $prNumber = $prNumbers->isNotEmpty() ? $prNumbers->join(', ') : '—';
        $rnRecord = $po->receiveNotes->first();
        $bpbNumber = $rnRecord?->bpbRecords?->first()?->bpbReceiveMaterial?->bpb_number;
        $rnNumber = $bpbNumber ?? $rnRecord?->receiveNote?->rn_number ?? '—';

        $creatorName = $po->creator?->name ?? '—';
        $createdTime = $po->created_at ? $po->created_at->format('d-m-Y H:i') : ($po->date ?? '-');
        $updatedTime = $po->updated_at ? $po->updated_at->format('d-m-Y H:i') : $createdTime;
        $status = $po->status;

        $appr1 = $po->approvals->where('approval_ke', '1')->first();
        $appr2 = $po->approvals->where('approval_ke', '2')->first();
        $releasedBy = $appr1 && $appr1->user ? ($appr1->updated_at?->format('d-m-Y H:i').' by '.$appr1->user->name) : '—';
        $approvedBy = $appr2 && $appr2->user ? ($appr2->updated_at?->format('d-m-Y H:i').' by '.$appr2->user->name) : '—';

        $totalOrderQty = (float) $po->items->sum('order');

        // Line Items
        $lineItems = $po->items->map(function ($it, $itIdx) use ($po, $currencyCode) {
            $itemObj = $it->directItem ?? $it->item ?? $it->requisitionItem?->item;
            if (! $itemObj && $it->item_alias) {
                $itemObj = Item::where('code', $it->item_alias)->orWhere('name', $it->item_alias)->first();
            }
            $unitName = $itemObj?->unitOfMeasurement?->name ?? '';
            $prNum = $it->requisitionItem?->purchaseRequisition?->pr_number ?? '—';
            $qty = (float) $it->order;
            $price = (float) $it->price;
            $disc = (float) $it->discount;
            $sub = (float) $it->subtotal;
            if ($sub <= 0 && $price > 0 && $qty > 0) {
                $sub = round($price * $qty, 2);
            }
            $rawFac = $itemObj?->facility?->name ?? ($itemObj && $itemObj->facilities_id == 3 ? 'NON FASILITAS' : ($po->facility_status ?? ''));
            $facilityName = $rawFac === '' ? '—' : (stripos((string) $rawFac, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS');

            // Calculate already received quantity in non-rejected Receive Notes
            $receivedQty = (float) \App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote::where('purchase_order_id', $po->id)
                ->where(function ($q) use ($it, $itemObj) {
                    if ($it->id) {
                        $q->where('po_has_items_id', $it->id);
                    }
                    $names = array_filter([$itemObj?->name, $it->item_alias]);
                    if (! empty($names)) {
                        $q->orWhereIn('item_name', $names);
                    }
                })
                ->whereHas('receiveNote', function ($rq) {
                    $rq->where('status', '!=', 'Rejected')
                        ->whereNull('deleted_at');
                })
                ->sum('quantity');

            $remainingQty = max(0.0, $qty - $receivedQty);
            $isFullyReceived = $qty > 0 && $receivedQty >= $qty;
            $aliasCandidate = $it->item_alias;
            if (empty($aliasCandidate) || in_array($aliasCandidate, ['—', '-'], true) || ($itemObj && $aliasCandidate === $itemObj->code)) {
                $resolvedAlias = $itemObj?->name ?? '—';
            } else {
                $resolvedAlias = $aliasCandidate;
            }

            return [
                'id' => $it->id,
                'po_has_items_id' => $it->id,
                'items_id' => $it->items_id ?? $itemObj?->id,
                'pr_has_items_id' => $it->pr_has_items_id,
                'no' => $itIdx + 1,
                'prNumber' => $prNum,
                'item' => $itemObj?->name ?? $resolvedAlias,
                'itemName' => $itemObj?->name ?? $resolvedAlias,
                'itemCode' => $itemObj?->code ?? '-',
                'itemAlias' => $resolvedAlias,
                'item_alias' => $resolvedAlias,
                'receivedQty' => $receivedQty,
                'rnQty' => $receivedQty,
                'remainingQty' => $remainingQty,
                'remainQty' => $remainingQty,
                'isFullyReceived' => $isFullyReceived,
                'facility' => $facilityName,
                'facility_status' => $facilityName,
                'rawQty' => $qty,
                'orderQty' => $qty,
                'quantity' => number_format($qty, 4).($unitName !== '' ? ' '.$unitName : ''),
                'unit' => $unitName,
                'rawPrice' => (float) $price,
                'price_numeric' => (float) $price,
                'price' => number_format($price, 2),
                'discount' => number_format($disc, 2),
                'discount_numeric' => $disc,
                'discount_val' => (float) $it->discount_val,
                'discount_types_id' => $it->discount_types_id,
                'subtotal' => number_format($sub, 2),
                'subtotal_numeric' => $sub,
                'dpp' => number_format((float) $it->dpp, 2),
                'dpp_numeric' => (float) $it->dpp,
                'priceRp' => number_format($price, 2),
                'discountRp' => number_format($disc, 2),
                'subtotalRp' => number_format($sub, 2),
                'lme' => $it->lme ? number_format((float) $it->lme, 2) : '—',
                'lme_numeric' => (float) $it->lme,
                'optionalRate' => $it->optional_rate ? number_format((float) $it->optional_rate, 2) : '—',
                'optional_rate' => (float) $it->optional_rate,
                'lmePercentage' => $it->percentage_lme ? number_format((float) $it->percentage_lme, 2) : '—',
                'percentage_lme' => (float) $it->percentage_lme,
                'pph_id' => $it->pph_id,
                'pph_rate' => (float) ($it->pph_rate ?? $it->pph?->value ?? 0),
                'pphName' => $it->pph?->name,
                'ppn_id' => $it->ppn_id,
                'subtotalPph' => number_format((float) $it->subtotal_pph, 2),
                'subtotal_pph_numeric' => (float) $it->subtotal_pph,
                'currency' => $currencyCode,
                'remark' => (string) ($it->remark ?? ($it->requisitionItem?->remark ?? '')),
            ];
        })->toArray();

        // Other Costs (BE-01: Master Additional Cost Integration)
        $otherCosts = $po->additionalCosts->map(function ($ac, $acIdx) use ($currencyCode) {
            $costName = $ac->type?->name ?? '';
            $costCode = $ac->type?->code ?? '-';

            return [
                'no' => $acIdx + 1,
                'id' => $ac->id,
                'additional_cost_types_id' => $ac->additional_cost_types_id,
                'item' => $costName,
                'itemCode' => $costCode,
                'name' => $costName,
                'costName' => $costName,
                'amount' => number_format((float) $ac->value, 2),
                'nominal' => $currencyCode.' '.number_format((float) $ac->value, 2),
                'value' => (float) $ac->value,
                'currency' => $currencyCode,
                'remark' => $ac->note ?? '-',
                'note' => $ac->note ?? '-',
            ];
        })->toArray();

        // History / Audit Trail (BE-04 & BE-06: Real Centralized Audit Trail)
        $history = [];
        $approvalHistories = \App\Models\System\Governance\ApprovalHistory::where('document_type', 'PO')
            ->where(function ($q) use ($po) {
                $q->where('document_id', $po->id)
                    ->orWhere('document_number', $po->po_number);
            })
            ->with('user')
            ->orderBy('created_at', 'asc')
            ->get();

        if ($approvalHistories->isNotEmpty()) {
            $history = $approvalHistories->map(function ($h) {
                $meta = is_array($h->metadata) ? $h->metadata : [];
                $userName = $h->user?->name ?? ($meta['actor_name'] ?? '—');
                $actionLabel = ucwords(str_replace('_', ' ', strtolower($h->action)));

                return [
                    'user' => $userName,
                    'activity' => $actionLabel,
                    'logTime' => $h->created_at ? $h->created_at->format('d-m-Y H:i') : '-',
                    'badgeTone' => str_contains($h->action, 'APPROVE') ? 'blue' : (str_contains($h->action, 'PRINT') ? 'purple' : (str_contains($h->action, 'CREATE') ? 'green' : 'gray')),
                    'note' => $h->note,
                ];
            })->toArray();
        }

        if (empty($history)) {
            $history = [
                ['user' => $creatorName, 'activity' => 'Transaction Created', 'logTime' => "{$createdTime} pm", 'badgeTone' => 'green'],
            ];
            if ($appr1 && $appr1->user) {
                $history[] = ['user' => $appr1->user->name, 'activity' => 'Approve 1 Purchase Order', 'logTime' => ($appr1->updated_at?->format('d-m-Y H:i') ?? "{$createdTime} pm"), 'badgeTone' => 'blue'];
            }
            if ($appr2 && $appr2->user) {
                $history[] = ['user' => $appr2->user->name, 'activity' => 'Approve 2 Purchase Order', 'logTime' => ($appr2->updated_at?->format('d-m-Y H:i') ?? "{$createdTime} pm"), 'badgeTone' => 'cyan'];
            }
        }

        $rawPoFac = strtoupper((string) ($po->facility_status ?? ''));
        $itemFacilities = $po->items->map(function ($it) {
            $itemObj = $it->directItem ?? $it->item ?? $it->requisitionItem?->item;
            if (! $itemObj && $it->item_alias) {
                $itemObj = \App\Models\Master\Material\Item::where('code', $it->item_alias)->orWhere('name', $it->item_alias)->first();
            }
            $raw = $itemObj?->facility?->name;
            if (! $raw && $itemObj && $itemObj->facilities_id == 3) {
                return 'NON FASILITAS';
            }

            return $raw ? strtoupper(trim($raw)) : null;
        })->filter()->values();

        $hasNon = str_contains($rawPoFac, 'NON') || $itemFacilities->contains(fn ($f) => str_contains($f, 'NON'));

        if ($hasNon) {
            $facilityLabel = 'NON FASILITAS';
        } elseif ($itemFacilities->isNotEmpty() && $itemFacilities->every(fn ($f) => ! str_contains($f, 'NON') && (str_contains($f, 'FASILITAS') || str_contains($f, 'BERIKAT')))) {
            $facilityLabel = 'FASILITAS';
        } elseif ($rawPoFac !== '') {
            $facilityLabel = str_contains($rawPoFac, 'NON') ? 'NON FASILITAS' : 'FASILITAS';
        } else {
            $facilityLabel = $po->isKawasanBerikat() ? 'FASILITAS' : 'NON FASILITAS';
        }

        $creatorDept = $po->creator?->department?->name ?? '—';
        $paymentMethodName = $po->paymentMethod?->name ?? '';
        $paymentTermName = $po->paymentTerm?->name ?? '';
        $deliveryTermName = $po->deliveryTerm?->name ?? '';
        $poTypeName = $po->poType?->name ?? '';
        $formattedDate = $this->safeFormatDate($po->date, 'd-M-Y', $po->created_at?->format('d-M-Y') ?? '-');
        $formattedDueDate = $this->safeFormatDate($po->due_date);
        $formattedGrandTotal = $currencyCode.' '.number_format((float) $po->grand_total, 2);
        $subtotalVal = (float) $po->subtotal;
        $discountVal = (float) $po->discount;
        $dppVal = (float) $po->dpp;
        $ppnVal = (float) $po->ppn;
        $pphVal = (float) $po->pph;
        $additionalCostsVal = (float) $po->additional_costs_total;
        $grandTotalVal = (float) $po->grand_total;

        return [
            'id' => $po->id,
            '_id' => "po-{$po->id}",
            '_type' => 'po',
            'no' => $indexNo,
            'poNumber' => $po->po_number,
            '_rawNumber' => $po->po_number,
            'status' => $status,
            '_rawStatus' => $status,
            'date' => $formattedDate,
            '_rawDate' => $formattedDate,
            'dueDate' => $formattedDueDate,
            '_rawDueDate' => $formattedDueDate,
            'latestDeliveryDate' => $this->safeFormatDate($po->latest_delivery_date),
            'supplier' => $supplierName,
            '_rawSupplier' => $supplierName,
            'total' => $formattedGrandTotal,
            'totalPrice' => $formattedGrandTotal,
            '_rawTotal' => $formattedGrandTotal,
            'prNumber' => $prNumber,
            '_rawPr' => $prNumber,
            'rnNumber' => $rnNumber,
            '_rawRn' => $rnNumber,
            'items' => $lineItems,
            '_items' => $lineItems,
            'approvals' => $po->approvals->map(fn ($a) => [
                'tier' => (int) $a->approval_ke,
                'status' => $a->status === 1 ? 'Approved' : ($a->status === 2 ? 'Rejected' : 'Pending'),
                'user' => $a->user?->name ?? '—',
                'date' => $a->updated_at?->format('d-M-Y H:i') ?? '-',
                'note' => $a->note,
            ])->toArray(),
            'currency' => $currencyCode,
            '_rawCurrency' => $currencyCode,
            'rate' => (float) $po->rate,
            '_rawRate' => number_format((float) $po->rate, 2),
            'ppn_rate' => $po->ppn_rate !== null ? (float) $po->ppn_rate : null,
            'discount_overall_percent' => $po->discount_overall_percent !== null ? (float) $po->discount_overall_percent : 0.0,
            'poType' => $poTypeName,
            'paymentMethod' => $paymentMethodName ?: '—',
            '_rawPaymentMethod' => $paymentMethodName,
            'paymentTerm' => $paymentTermName ?: '—',
            '_rawPaymentTerm' => $paymentTermName,
            'deliveryTerm' => $deliveryTermName ?: '—',
            'facility' => $facilityLabel,
            'statusFacility' => $facilityLabel,
            '_rawFacility' => $facilityLabel,
            'is_kawasan_berikat' => $po->isKawasanBerikat(),
            'isKawasanBerikat' => $po->isKawasanBerikat(),
            '_rawCreatedBy' => "{$creatorName} {$createdTime}",
            '_rawLastUpdated' => "{$creatorName} {$updatedTime}",
            'lastUpdated' => ($po->updatedByUser?->name ?? $creatorName).' '.($po->updated_at?->format('d-M-Y H:i') ?? $createdTime),
            '_rawReleasedBy' => $releasedBy,
            '_rawApprovedBy' => $approvedBy,
            '_rawRemark' => $po->remark ?? '',
            'poNote' => $po->remark ?? '',
            'note' => $po->remark ?? '',
            '_rawRevision' => (string) ($po->revision ?? 0),
            '_rawSubkon' => $po->service_subkon ? 'Yes' : 'No',
            'deptCreated' => $creatorDept,
            '_rawDeptCreated' => $creatorDept,
            '_totalQty' => trim(number_format($totalOrderQty, 4).' '.($firstItemUnit ?: '')),
            '_otherCosts' => $otherCosts,
            '_financials' => [
                'subtotal' => $currencyCode.' '.number_format($subtotalVal, 2),
                'discount' => $currencyCode.' '.number_format($discountVal, 2),
                'dpp' => $currencyCode.' '.number_format($dppVal, 2),
                'ppn' => $currencyCode.' '.number_format($ppnVal, 2),
                'pph' => $currencyCode.' '.number_format($pphVal, 2),
                'additionalCosts' => $currencyCode.' '.number_format($additionalCostsVal, 2),
                'grandTotal' => $formattedGrandTotal,
                'subtotalNumeric' => $subtotalVal,
                'discountNumeric' => $discountVal,
                'dppNumeric' => $dppVal,
                'ppnNumeric' => $ppnVal,
                'pphNumeric' => $pphVal,
                'additionalCostsNumeric' => $additionalCostsVal,
                'grandTotalNumeric' => $grandTotalVal,
            ],
            '_history' => $history,
            'totalQuantity' => number_format($totalOrderQty, 4),
            'totalItem' => $po->items->count(),
            'totalOrder' => number_format($totalOrderQty, 4),
            'actions' => '',
            '_search' => "{$po->po_number} {$supplierName} {$status} {$prNumber}",
        ];
    }

    /**
     * Store newly created Purchase Order.
     */
    public function store(Request $request)
    {
        $userId = $this->requireActorId($request);

        try {
            [$headerData, $processedItems, $rawAdditionalCosts] = $this->resolvePoPayload($request);
            $po = GeniusOneBackend::po()->createPo(
                $headerData,
                $processedItems,
                $rawAdditionalCosts,
                $userId
            );
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => ['po' => [$e->getMessage()]],
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Order created successfully',
            'data' => $po->load(['supplier', 'items.prItem.item', 'items.directItem', 'additionalCosts.type']),
        ], 201);
    }

    /**
     * Update an existing Purchase Order.
     */
    public function update(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $po = $this->findPoRecord((string) $id);
        if (! $po) {
            return response()->json(['status' => 'error', 'message' => 'Purchase Order not found: '.$id], 404);
        }

        try {
            [$headerData, $processedItems, $rawAdditionalCosts] = $this->resolvePoPayload($request, $po);
            $headerData['sync_additional_costs'] = $request->hasAny(['additional_costs', 'additionalCosts', 'other_costs', 'otherCosts']);
            $updated = GeniusOneBackend::po()->updateOrder(
                $po->id,
                $headerData,
                $processedItems,
                $rawAdditionalCosts,
                $userId
            );
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => ['po' => [$e->getMessage()]],
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Order updated successfully',
            'data' => $updated->load(['supplier', 'items.prItem.item', 'items.directItem', 'additionalCosts.type']),
            'item' => $this->formatPoRow($updated->fresh(['additionalCosts.type', 'items.requisitionItem.item.facility', 'items.directItem.facility', 'items.pph', 'items.ppn']), 1, true),
        ]);
    }

    /**
     * Soft-delete an unlocked Purchase Order.
     */
    public function destroy(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $po = $this->findPoRecord((string) $id);
        if (! $po) {
            return response()->json(['status' => 'error', 'message' => 'Purchase Order not found: '.$id], 404);
        }

        try {
            GeniusOneBackend::po()->deleteOrder($po->id, $userId);
        } catch (InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Order deleted successfully',
        ]);
    }

    /**
     * Add an additional cost to an existing PO.
     */
    public function storeAdditionalCost(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $po = $this->findPoRecord((string) $id);
        if (! $po) {
            return response()->json(['status' => 'error', 'message' => 'Purchase Order not found: '.$id], 404);
        }

        try {
            GeniusOneBackend::po()->assertNotLocked($po);

            $costData = [
                'additional_cost_types_id' => $request->input('additional_cost_types_id') ?? $request->input('costId') ?? $request->input('type_id'),
                'name' => $request->input('name') ?? $request->input('costName') ?? $request->input('item'),
                'value' => (float) ($request->input('value') ?? $request->input('amount') ?? $request->input('nominal') ?? 0),
                'note' => $request->input('note') ?? $request->input('remark'),
            ];

            $cost = GeniusOneBackend::po()->addAdditionalCost($po, $costData);

            AuditLogger::logWorkflow(
                documentType: 'PO',
                documentNumber: $po->po_number,
                action: 'REVISED',
                fromStatus: $po->status,
                toStatus: $po->status,
                userId: $userId,
                extra: ['additional_cost_added' => $cost->id, 'amount' => $cost->value]
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        $updatedPo = $po->fresh(['additionalCosts.type', 'items.requisitionItem.item.facility', 'items.directItem.facility', 'items.pph', 'items.ppn']);
        $formatted = $this->formatPoRow($updatedPo, 1, true);

        return response()->json([
            'status' => 'success',
            'message' => 'Additional cost added successfully',
            'data' => $cost->load('type'),
            'item' => $formatted,
        ], 201);
    }

    /**
     * Remove an additional cost from an unlocked Purchase Order.
     */
    public function destroyAdditionalCost(Request $request, $id, $costId)
    {
        $userId = $this->requireActorId($request);
        $po = $this->findPoRecord((string) $id);
        if (! $po) {
            return response()->json(['status' => 'error', 'message' => 'Purchase Order not found: '.$id], 404);
        }

        try {
            GeniusOneBackend::po()->deleteAdditionalCost($po, (int) $costId);

            AuditLogger::logWorkflow(
                documentType: 'PO',
                documentNumber: $po->po_number,
                action: 'REVISED',
                fromStatus: $po->status,
                toStatus: $po->status,
                userId: $userId,
                extra: ['additional_cost_removed' => (int) $costId]
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        $updatedPo = $po->fresh(['additionalCosts.type', 'items.requisitionItem.item.facility', 'items.directItem.facility', 'items.pph', 'items.ppn']);

        return response()->json([
            'status' => 'success',
            'message' => 'Additional cost removed successfully',
            'item' => $this->formatPoRow($updatedPo, 1, true),
        ]);
    }

    /**
     * Approve Purchase Order.
     */
    public function approve(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $tier = (int) $request->input('tier', 1);
        $note = $request->input('note');

        $poModel = $this->findPoRecord((string) $id);
        $resolvedId = $poModel ? $poModel->id : (int) $id;

        $po = GeniusOneBackend::procurement()->approvePo($resolvedId, $userId, $tier, $note);

        return response()->json([
            'status' => 'success',
            'message' => "Purchase Order Tier {$tier} approved successfully",
            'data' => $po,
        ]);
    }

    /**
     * Reject Purchase Order.
     */
    public function reject(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $tier = (int) $request->input('tier', 1);
        $reason = $request->input('reason', 'Rejected by approver');

        $poModel = $this->findPoRecord((string) $id);
        $resolvedId = $poModel ? $poModel->id : (int) $id;

        $po = GeniusOneBackend::procurement()->rejectPo($resolvedId, $userId, $tier, $reason);

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Order rejected successfully',
            'data' => $po,
        ]);
    }

    private function findPoRecord(string $codeOrId): ?PurchaseOrder
    {
        if (is_numeric($codeOrId)) {
            $found = PurchaseOrder::find((int) $codeOrId);
            if ($found) {
                return $found;
            }
        }
        if (preg_match('/^po-(\d+)$/i', $codeOrId, $m)) {
            $found = PurchaseOrder::find((int) $m[1]);
            if ($found) {
                return $found;
            }
        }

        $rawCode = str_replace('-', '/', $codeOrId);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $codeOrId);

        return PurchaseOrder::where('po_number', $codeOrId)
            ->orWhere('po_number', $rawCode)
            ->orWhereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanCode])
            ->first();
    }

    /**
     * Validate and normalize PO header, items, and additional costs for store/update.
     */
    private function resolvePoPayload(Request $request, ?PurchaseOrder $existingPo = null): array
    {
        $poTypeId = $this->resolveMasterId(
            $request->input('po_types_id') ?? $request->input('poType') ?? $request->input('po_type'),
            PoType::class,
            ['code', 'name'],
            $existingPo?->po_types_id ?? PoType::where('status', 1)->value('id') ?? PoType::value('id'),
            'PO Type'
        );

        $supInput = $request->input('supliers_id') ?? $request->input('supplier_id') ?? $request->input('supplierId') ?? $request->input('supplier');
        $supId = null;
        if (! empty($supInput)) {
            $supInputStr = (string) $supInput;
            $cleanedId = preg_replace('/^sup-?/i', '', $supInputStr);
            if (is_numeric($supInput) && Supplier::where('id', (int) $supInput)->exists()) {
                $supId = (int) $supInput;
            } elseif (is_numeric($cleanedId) && Supplier::where('id', (int) $cleanedId)->exists()) {
                $supId = (int) $cleanedId;
            } else {
                $sup = Supplier::where('code', $supInputStr)
                    ->orWhere('name', $supInputStr)
                    ->orWhere('name', 'like', "%{$supInputStr}%")
                    ->first();
                $supId = $sup?->id;
            }
        } elseif ($existingPo) {
            $supId = $existingPo->supliers_id;
        }
        if (! $supId) {
            throw new InvalidArgumentException('Supplier is required and must exist in Supplier Master.');
        }

        $valutaId = $this->resolveMasterId(
            $request->input('valutas_id') ?? $request->input('currency_id') ?? $request->input('currency'),
            Valuta::class,
            ['code', 'name'],
            $existingPo?->valutas_id ?? Valuta::where('code', 'IDR')->value('id') ?? Valuta::value('id'),
            'Currency'
        );

        $payTermId = $this->resolveMasterId(
            $request->input('payment_terms_id') ?? $request->input('paymentTerm'),
            PaymentTerm::class,
            ['name'],
            $existingPo?->payment_terms_id ?? PaymentTerm::value('id'),
            'Payment Term'
        );

        $payMethodId = $this->resolveMasterId(
            $request->input('payment_methods_id') ?? $request->input('paymentMethod'),
            PaymentMethod::class,
            ['name'],
            $existingPo?->payment_methods_id ?? PaymentMethod::value('id'),
            'Payment Method'
        );

        $delivTermId = $this->resolveMasterId(
            $request->input('delivery_terms_id') ?? $request->input('deliveryTerm'),
            DeliveryTerm::class,
            ['name'],
            $existingPo?->delivery_terms_id ?? DeliveryTerm::value('id'),
            'Delivery Term'
        );

        $rawItems = $request->input('items', []);
        if (! $existingPo && (empty($rawItems) || ! is_array($rawItems))) {
            throw new InvalidArgumentException('At least one line item is required to create a Purchase Order.');
        }

        $headerPpnRate = (float) ($request->input('ppn_rate') ?? $request->input('ppnRate') ?? $existingPo?->ppn_rate ?? 11);
        $headerDiscountOverall = (float) ($request->input('discount_overall_percent') ?? $request->input('discountOverallPercent') ?? $existingPo?->discount_overall_percent ?? 0);

        $processedItems = [];
        foreach ($rawItems as $idx => $it) {
            $orderQty = (float) ($it['order'] ?? $it['orderQty'] ?? $it['quantity'] ?? 0);
            if ($orderQty <= 0) {
                throw new InvalidArgumentException('Order quantity at row '.($idx + 1).' must be greater than zero.');
            }
            $price = (float) ($it['price'] ?? 0);
            $prHasItemId = ! empty($it['pr_has_items_id']) && is_numeric($it['pr_has_items_id']) ? (int) $it['pr_has_items_id'] : null;

            if (! $prHasItemId && ! empty($it['prNumber']) && $it['prNumber'] !== '—' && $it['prNumber'] !== '-') {
                $cleanPr = preg_replace('/[^A-Za-z0-9]/', '', (string) $it['prNumber']);
                $matchedPr = PurchaseRequisition::whereRaw("REPLACE(REPLACE(pr_number, '/', ''), '-', '') = ?", [$cleanPr])
                    ->orWhere('pr_number', $it['prNumber'])
                    ->first();
                if ($matchedPr) {
                    $itemCode = $it['itemCode'] ?? $it['code'] ?? null;
                    $itemName = $it['itemName'] ?? $it['item_name'] ?? $it['item'] ?? null;
                    $matchedPrItem = $matchedPr->items()
                        ->where('is_closed', false)
                        ->when($itemCode && $itemCode !== '—' && $itemCode !== '-', function ($q) use ($itemCode) {
                            $q->whereHas('item', fn ($iq) => $iq->where('code', $itemCode));
                        })
                        ->when($itemName && $itemName !== '—', function ($q) use ($itemName) {
                            $q->whereHas('item', fn ($iq) => $iq->where('name', $itemName));
                        })
                        ->first()
                        ?? $matchedPr->items()->where('is_closed', false)->first()
                        ?? $matchedPr->items->first();
                    $prHasItemId = $matchedPrItem?->id;
                }
            }

            $discVal = (float) ($it['discount_val'] ?? $it['discountPercent'] ?? 0);
            $discType = $it['discount_type'] ?? null;
            if ($discVal <= 0 || $discType === 'none') {
                $discTypeId = null;
                $discType = 'none';
                $discVal = 0;
            } else {
                $rawDiscTypeId = $it['discount_types_id'] ?? ($discType === 'amount' || $discType === 'nominal' ? 2 : 1);
                $discTypeId = ! empty($rawDiscTypeId) && is_numeric($rawDiscTypeId) && DB::table('discount_types')->where('id', $rawDiscTypeId)->exists()
                    ? (int) $rawDiscTypeId
                    : null;
            }

            $pphId = ! empty($it['pph_id']) && is_numeric($it['pph_id']) ? Pph::where('id', (int) $it['pph_id'])->value('id') : null;
            $ppnId = ! empty($it['ppn_id']) && is_numeric($it['ppn_id']) ? Ppn::where('id', (int) $it['ppn_id'])->value('id') : null;
            $pphModel = $pphId ? Pph::find($pphId) : null;
            $ppnModel = $ppnId ? Ppn::find($ppnId) : null;

            $itemsId = ! empty($it['items_id']) && is_numeric($it['items_id']) ? Item::where('id', (int) $it['items_id'])->value('id') : null;
            $aliasCandidate = $it['item_alias'] ?? $it['itemAlias'] ?? $it['itemName'] ?? $it['item_name'] ?? null;
            if ($prHasItemId && (empty($aliasCandidate) || in_array($aliasCandidate, ['—', '-'], true))) {
                $prItem = PurchaseRequisitionItem::with('item')->find($prHasItemId);
                if ($prItem?->item?->name) {
                    $aliasCandidate = $prItem->item->name;
                }
            }

            $processedItems[] = [
                'pr_has_items_id' => $prHasItemId,
                'items_id' => $itemsId,
                'item_code' => $it['itemCode'] ?? $it['code'] ?? null,
                'itemName' => $it['itemName'] ?? $it['item_name'] ?? null,
                'item_alias' => $aliasCandidate,
                'price' => $price,
                'order' => $orderQty,
                'purchased' => (float) ($it['purchased'] ?? $orderQty),
                'discount_type' => $discType,
                'discount_types_id' => $discTypeId,
                'discount_val' => $discVal,
                'pph_id' => $pphId,
                'pph_rate' => (float) ($it['pph_rate'] ?? $it['pphRate'] ?? $pphModel?->value ?? 0),
                'is_pph_deduction' => array_key_exists('is_pph_deduction', $it) ? (bool) $it['is_pph_deduction'] : (bool) ($pphModel?->deduction ?? false),
                'ppn_id' => $ppnId,
                'ppn_rate' => (float) ($it['ppn_rate'] ?? $it['ppnRate'] ?? $ppnModel?->value ?? $headerPpnRate),
                'lme' => (float) ($it['lme'] ?? 0),
                'optional_rate' => (float) ($it['optional_rate'] ?? $it['optionalRate'] ?? 0),
                'percentage_lme' => (float) ($it['percentage_lme'] ?? $it['lmePercentage'] ?? 0),
                'remark' => ! empty($it['remark']) ? $it['remark'] : ($it['note'] ?? null),
            ];
        }

        $supplierModel = Supplier::find($supId);
        $rawFacInput = $request->input('facility_status') ?? $request->input('statusFacility');
        $headerData = [
            'po_number' => $existingPo?->po_number ?? ($request->input('po_number') ?? DocumentNumberGenerator::generatePoNumber()),
            'po_types_id' => $poTypeId,
            'supliers_id' => $supId,
            'date' => $request->input('date') ?? $existingPo?->date ?? now()->format('Y-m-d'),
            'due_date' => $request->input('due_date') ?? $existingPo?->due_date ?? now()->addDays(14)->format('Y-m-d'),
            'valutas_id' => $valutaId,
            'rate' => (string) ($request->input('rate') ?? $request->input('exchangeRate') ?? $existingPo?->rate ?? '1.00'),
            'ppn_rate' => $headerPpnRate,
            'discount_overall_percent' => $headerDiscountOverall,
            'address' => $request->input('address') ?? $request->input('supplierAddress') ?? $existingPo?->address ?? ($supplierModel?->address ?? ''),
            'payment_terms_id' => $payTermId,
            'payment_methods_id' => $payMethodId,
            'delivery_terms_id' => $delivTermId,
            'latest_delivery' => $request->input('latest_delivery') ?? $existingPo?->latest_delivery ?? now()->addDays(14)->format('Y-m-d'),
            'service_subkon' => $request->has('service_subkon') ? ($request->boolean('service_subkon') ? 1 : 0) : ($existingPo?->service_subkon ?? 0),
            'facility_status' => $rawFacInput !== null && $rawFacInput !== ''
                ? (stripos((string) $rawFacInput, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS')
                : ($existingPo?->facility_status ?? ''),
            'is_kawasan_berikat' => $request->has('is_kawasan_berikat')
                ? $request->boolean('is_kawasan_berikat')
                : ($existingPo?->is_kawasan_berikat ?? false),
            'status' => $existingPo?->status ?? 'Waiting for Approve 1',
            'remark' => $request->input('remark') ?? $request->input('remarkPo') ?? ($existingPo?->remark ?? ''),
        ];

        $rawAdditionalCosts = $request->input('additional_costs')
            ?? $request->input('additionalCosts')
            ?? $request->input('other_costs')
            ?? $request->input('otherCosts')
            ?? [];

        return [$headerData, $processedItems, is_array($rawAdditionalCosts) ? $rawAdditionalCosts : []];
    }

    private function resolveMasterId($input, string $modelClass, array $columns, ?int $defaultId, string $label): int
    {
        if (! empty($input)) {
            if (is_numeric($input) && $modelClass::where('id', (int) $input)->exists()) {
                return (int) $input;
            }
            $str = trim((string) $input);
            $query = $modelClass::query();
            foreach ($columns as $i => $col) {
                if ($i === 0) {
                    $query->where($col, $str)->orWhere($col, 'like', "%{$str}%");
                } else {
                    $query->orWhere($col, $str)->orWhere($col, 'like', "%{$str}%");
                }
            }
            $found = $query->first();
            if ($found) {
                return $found->id;
            }
        }

        if ($defaultId) {
            return $defaultId;
        }

        throw new InvalidArgumentException("{$label} master data is missing.");
    }

    /**
     * Safely format dates, handling Excel serial numbers and irregular formats.
     */
    private function safeFormatDate($dateVal, string $format = 'd-M-Y', string $default = '-'): string
    {
        if (empty($dateVal)) {
            return $default;
        }

        try {
            if (is_numeric($dateVal) && (int) $dateVal > 20000 && (int) $dateVal < 70000) {
                return Carbon::createFromTimestampUTC(((int) $dateVal - 25569) * 86400)->format($format);
            }

            return Carbon::parse($dateVal)->format($format);
        } catch (\Throwable $e) {
            return is_string($dateVal) ? $dateVal : $default;
        }
    }
}
