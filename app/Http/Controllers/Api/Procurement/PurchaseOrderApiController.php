<?php

namespace App\Http\Controllers\Api\Procurement;

use App\Http\Controllers\Controller;
use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\PoType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\System\Audit\Log;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\GeniusOneBackend;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PurchaseOrderApiController extends Controller
{
    /**
     * List Purchase Orders.
     */
    public function index(Request $request)
    {
        $query = PurchaseOrder::with([
            'supplier',
            'creator',
            'updatedByUser',
            'poType',
            'currency',
            'paymentTerm',
            'paymentMethod',
            'deliveryTerm',
            'items.requisitionItem.item.unitOfMeasurement',
            'items.requisitionItem.item.facility',
            'items.requisitionItem.purchaseRequisition',
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
            'creator',
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
        $firstItemUnit = $firstItem?->item?->unitOfMeasurement?->name ?? 'PCS';
        $prNumbers = $po->items->map(function ($it) {
            return $it->requisitionItem?->purchaseRequisition?->pr_number;
        })->filter()->unique()->values();
        $prNumber = $prNumbers->isNotEmpty() ? $prNumbers->join(', ') : '—';
        $rnRecord = $po->receiveNotes->first();
        $bpbNumber = $rnRecord?->bpbRecords?->first()?->bpbReceiveMaterial?->bpb_number;
        $rnNumber = $bpbNumber ?? $rnRecord?->receiveNote?->rn_number ?? '—';

        $creatorName = $po->creator?->name ?? 'Michelle';
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
                $itemObj = \App\Models\Master\Material\Item::where('code', $it->item_alias)->orWhere('name', $it->item_alias)->first();
            }
            $unitName = $itemObj?->unitOfMeasurement?->name ?? 'PCS';
            $prNum = $it->requisitionItem?->purchaseRequisition?->pr_number ?? '—';
            $qty = (float) $it->order;
            $price = (float) $it->price;
            $disc = (float) $it->discount;
            $sub = (float) $it->subtotal;
            if ($sub <= 0 && $price > 0 && $qty > 0) {
                $sub = round($price * $qty, 2);
            }
            $rawFac = $itemObj?->facility?->name ?? ($itemObj && $itemObj->facilities_id == 3 ? 'NON FASILITAS' : ($po->facility_status ?? 'FASILITAS'));
            $facilityName = stripos((string) $rawFac, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS';

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
                $resolvedAlias = $itemObj?->name ?? 'Industrial Material';
            } else {
                $resolvedAlias = $aliasCandidate;
            }

            return [
                'id' => $it->id,
                'po_has_items_id' => $it->id,
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
                'quantity' => number_format($qty, 4).' '.$unitName,
                'unit' => $unitName,
                'rawPrice' => (float) $price,
                'price_numeric' => (float) $price,
                'price' => number_format($price, 2),
                'discount' => number_format($disc, 2),
                'subtotal' => number_format($sub, 2),
                'priceRp' => number_format($price, 2),
                'discountRp' => number_format($disc, 2),
                'subtotalRp' => number_format($sub, 2),
                'lme' => $it->lme ? number_format((float) $it->lme, 2) : '—',
                'optionalRate' => $it->optional_rate ? number_format((float) $it->optional_rate, 2) : '—',
                'lmePercentage' => $it->percentage_lme ? number_format((float) $it->percentage_lme, 2) : '—',
                'subtotalPph' => number_format((float) $it->subtotal_pph, 2),
                'currency' => $currencyCode,
                'remark' => (string) ($it->remark ?? ($it->requisitionItem?->remark ?? '')),
            ];
        })->toArray();

        // Other Costs (BE-01: Master Additional Cost Integration)
        $otherCosts = $po->additionalCosts->map(function ($ac, $acIdx) use ($currencyCode) {
            $costName = $ac->type?->name ?? 'Operational Freight / Handling';
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
                $userName = $h->user?->name ?? ($meta['actor_name'] ?? 'System');
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
        } else {
            $facilityLabel = str_contains($rawPoFac, 'NON') ? 'NON FASILITAS' : 'FASILITAS';
        }

        return [
            'id' => $po->id,
            '_id' => "po-{$po->id}",
            '_type' => 'po',
            'poNumber' => $po->po_number,
            '_rawNumber' => $po->po_number,
            'status' => $status,
            '_rawStatus' => $status,
            'date' => $this->safeFormatDate($po->date, 'd-M-Y', $po->created_at?->format('d-M-Y') ?? '-'),
            '_rawDate' => $this->safeFormatDate($po->date, 'd-M-Y', $po->created_at?->format('d-M-Y') ?? '-'),
            'dueDate' => $this->safeFormatDate($po->due_date),
            '_rawDueDate' => $this->safeFormatDate($po->due_date),
            'supplier' => $supplierName,
            '_rawSupplier' => $supplierName,
            'total' => $currencyCode.' '.number_format((float) $po->grand_total, 2),
            '_rawTotal' => $currencyCode.' '.number_format((float) $po->grand_total, 2),
            'prNumber' => $prNumber,
            '_rawPr' => $prNumber,
            'rnNumber' => $rnNumber,
            '_rawRn' => $rnNumber,
            'items' => $lineItems,
            '_items' => $lineItems,
            'approvals' => $po->approvals->map(fn ($a) => [
                'tier' => (int) $a->approval_ke,
                'status' => $a->status === 1 ? 'Approved' : 'Pending',
                'user' => $a->user?->name ?? 'System',
                'date' => $a->updated_at?->format('d-M-Y H:i') ?? '-',
                'note' => $a->note,
            ])->toArray(),
            '_rawCurrency' => $currencyCode,
            '_rawRate' => number_format((float) $po->rate, 2),
            '_rawPaymentMethod' => $po->paymentMethod?->name ?? 'Cash On Delivery',
            '_rawPaymentTerm' => $po->paymentTerm?->name ?? 'Cash On Delivery',
            'facility' => $facilityLabel,
            '_rawFacility' => $facilityLabel,
            'is_kawasan_berikat' => $po->isKawasanBerikat(),
            'isKawasanBerikat' => $po->isKawasanBerikat(),
            '_rawCreatedBy' => "{$creatorName} {$createdTime}",
            '_rawLastUpdated' => "{$creatorName} {$updatedTime}",
            '_rawReleasedBy' => $releasedBy,
            '_rawApprovedBy' => $approvedBy,
            '_rawRemark' => $po->remark ?? '',
            'poNote' => $po->remark ?? '',
            'note' => $po->remark ?? '',
            '_rawRevision' => (string) ($po->revision ?? 0),
            '_rawSubkon' => $po->service_subkon ? 'Yes' : 'No',
            '_rawDeptCreated' => 'Purchasing',
            '_totalQty' => number_format($totalOrderQty, 4)." {$firstItemUnit}",
            '_items' => $lineItems,
            '_otherCosts' => $otherCosts,
            '_financials' => [
                'subtotal' => $currencyCode.' '.number_format((float) $po->subtotal, 2),
                'discount' => $currencyCode.' '.number_format((float) $po->discount, 2),
                'dpp' => $currencyCode.' '.number_format((float) $po->dpp, 2),
                'ppn' => $currencyCode.' '.number_format((float) $po->ppn, 2),
                'pph' => $currencyCode.' '.number_format((float) $po->pph, 2),
                'additionalCosts' => $currencyCode.' '.number_format((float) $po->additional_costs_total, 2),
                'grandTotal' => $currencyCode.' '.number_format((float) $po->grand_total, 2),
            ],
            '_history' => $history,
            'no' => $indexNo,
            'poNumber' => $po->po_number,
            'date' => $this->safeFormatDate($po->date, 'd-M-Y', $po->created_at?->format('d-M-Y') ?? '-'),
            'supplier' => $supplierName,
            'facility' => $facilityLabel,
            'statusFacility' => $facilityLabel,
            'deptCreated' => $po->creator?->department?->name ?? 'Purchasing',
            'totalPrice' => $currencyCode.' '.number_format((float) $po->grand_total, 2),
            'totalQuantity' => number_format($totalOrderQty, 4),
            'status' => $status,
            'lastUpdated' => ($po->updatedByUser?->name ?? $creatorName).' '.($po->updated_at?->format('d-M-Y H:i') ?? $createdTime),
            'paymentTerm' => $po->paymentTerm?->name ?? 'Cash On Delivery',
            'totalItem' => $po->items->count(),
            'totalOrder' => number_format($totalOrderQty, 4),
            'total' => $currencyCode.' '.number_format((float) $po->grand_total, 2),
            'actions' => '',
            '_search' => "{$po->po_number} {$supplierName} {$status} {$prNumber}",
        ];
    }

    /**
     * Store newly created Purchase Order.
     */
    public function store(Request $request)
    {
        $userId = $request->user()?->id ?? 1;

        // Resolve PO Type ID
        $poTypeInput = $request->input('po_types_id') ?? $request->input('poType') ?? $request->input('po_type');
        $poTypeId = null;
        if (is_numeric($poTypeInput) && PoType::where('id', $poTypeInput)->exists()) {
            $poTypeId = (int) $poTypeInput;
        } elseif (! empty($poTypeInput)) {
            $pt = PoType::where('code', $poTypeInput)->orWhere('name', 'like', "%{$poTypeInput}%")->first();
            $poTypeId = $pt?->id;
        }
        if (! $poTypeId) {
            $poTypeId = PoType::first()?->id ?? 1;
        }

        // Resolve Supplier ID
        $supInput = $request->input('supliers_id') ?? $request->input('supplier_id') ?? $request->input('supplierId') ?? $request->input('supplier');
        $supId = null;
        if (is_numeric($supInput) && Supplier::where('id', $supInput)->exists()) {
            $supId = (int) $supInput;
        } elseif (! empty($supInput)) {
            // Check if input is formatted like "sup-1" or "SUP-001"
            $cleaned = preg_replace('/^sup-?/i', '', (string) $supInput);
            if (is_numeric($cleaned) && Supplier::where('id', $cleaned)->exists()) {
                $supId = (int) $cleaned;
            } else {
                $sup = Supplier::where('code', $supInput)->orWhere('name', 'like', "%{$supInput}%")->first();
                $supId = $sup?->id;
            }
        }
        if (! $supId) {
            $supId = Supplier::first()?->id ?? 1;
        }

        // Resolve Valuta / Currency ID
        $valutaInput = $request->input('valutas_id') ?? $request->input('currency_id') ?? $request->input('currency');
        $valutaId = null;
        if (is_numeric($valutaInput) && Valuta::where('id', $valutaInput)->exists()) {
            $valutaId = (int) $valutaInput;
        } elseif (! empty($valutaInput)) {
            $v = Valuta::where('code', 'like', "%{$valutaInput}%")->orWhere('name', 'like', "%{$valutaInput}%")->first();
            $valutaId = $v?->id;
        }
        if (! $valutaId) {
            $valutaId = Valuta::first()?->id ?? 1;
        }

        // Resolve Payment Term ID
        $payTermInput = $request->input('payment_terms_id') ?? $request->input('paymentTerm');
        $payTermId = is_numeric($payTermInput) && PaymentTerm::where('id', $payTermInput)->exists()
            ? (int) $payTermInput
            : (PaymentTerm::first()?->id ?? 1);

        // Resolve Payment Method ID
        $payMethodInput = $request->input('payment_methods_id') ?? $request->input('paymentMethod');
        $payMethodId = is_numeric($payMethodInput) && PaymentMethod::where('id', $payMethodInput)->exists()
            ? (int) $payMethodInput
            : (PaymentMethod::first()?->id ?? 1);

        // Resolve Delivery Term ID
        $delivTermInput = $request->input('delivery_terms_id') ?? $request->input('deliveryTerm');
        $delivTermId = is_numeric($delivTermInput) && DeliveryTerm::where('id', $delivTermInput)->exists()
            ? (int) $delivTermInput
            : (DeliveryTerm::first()?->id ?? 1);

        // Resolve Line Items
        $rawItems = $request->input('items', []);
        if (empty($rawItems)) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => ['items' => ['At least one item is required.']],
            ], 422);
        }

        $processedItems = [];
        foreach ($rawItems as $it) {
            $orderQty = (float) ($it['order'] ?? $it['orderQty'] ?? $it['quantity'] ?? 1);
            $price = (float) ($it['price'] ?? 0);
            $prHasItemId = ! empty($it['pr_has_items_id']) && is_numeric($it['pr_has_items_id']) ? (int) $it['pr_has_items_id'] : null;

            // Resolve pr_has_items_id from prNumber if provided
            if (! $prHasItemId && ! empty($it['prNumber']) && $it['prNumber'] !== '—' && $it['prNumber'] !== '-') {
                $cleanPr = preg_replace('/[^A-Za-z0-9]/', '', (string) $it['prNumber']);
                $matchedPr = \App\Models\Procurement\PurchaseRequest\PurchaseRequisition::whereRaw("REPLACE(REPLACE(pr_number, '/', ''), '-', '') = ?", [$cleanPr])
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
                $discTypeId = ! empty($rawDiscTypeId) && is_numeric($rawDiscTypeId) && \Illuminate\Support\Facades\DB::table('discount_types')->where('id', $rawDiscTypeId)->exists()
                    ? (int) $rawDiscTypeId
                    : null;
            }

            $pphId = ! empty($it['pph_id']) && is_numeric($it['pph_id']) && \Illuminate\Support\Facades\DB::table('pph')->where('id', $it['pph_id'])->exists() ? (int) $it['pph_id'] : null;
            $ppnId = ! empty($it['ppn_id']) && is_numeric($it['ppn_id']) && \Illuminate\Support\Facades\DB::table('ppn')->where('id', $it['ppn_id'])->exists() ? (int) $it['ppn_id'] : null;

            $aliasCandidate = $it['item_alias'] ?? $it['itemAlias'] ?? $it['itemName'] ?? $it['item_name'] ?? null;
            if ($prHasItemId && (empty($aliasCandidate) || in_array($aliasCandidate, ['—', '-'], true))) {
                $prItem = \App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem::with('item')->find($prHasItemId);
                if ($prItem?->item?->name) {
                    $aliasCandidate = $prItem->item->name;
                }
            }

            $processedItems[] = [
                'pr_has_items_id' => $prHasItemId,
                'item_alias' => $aliasCandidate,
                'price' => $price,
                'order' => $orderQty,
                'purchased' => (float) ($it['purchased'] ?? $orderQty),
                'discount_type' => $discType,
                'discount_types_id' => $discTypeId,
                'discount_val' => $discVal,
                'pph_id' => $pphId,
                'ppn_id' => $ppnId,
                'remark' => !empty($it['remark']) ? $it['remark'] : ($it['note'] ?? null),
            ];
        }

        $poNumber = $request->input('po_number') ?? DocumentNumberGenerator::generatePoNumber();
        $date = $request->input('date') ?? now()->format('Y-m-d');
        $dueDate = $request->input('due_date') ?? now()->addDays(14)->format('Y-m-d');
        $latestDeliv = $request->input('latest_delivery') ?? now()->addDays(14);

        $rawFacInput = $request->input('facility_status') ?? $request->input('statusFacility') ?? 'FASILITAS';
        $facilityStatus = stripos((string) $rawFacInput, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS';

        $headerData = [
            'po_number' => $poNumber,
            'po_types_id' => $poTypeId,
            'supliers_id' => $supId,
            'date' => $date,
            'due_date' => $dueDate,
            'valutas_id' => $valutaId,
            'rate' => (string) ($request->input('rate') ?? $request->input('exchangeRate') ?? '1.00'),
            'address' => $request->input('address') ?? $request->input('supplierAddress') ?? '-',
            'payment_terms_id' => $payTermId,
            'payment_methods_id' => $payMethodId,
            'delivery_terms_id' => $delivTermId,
            'latest_delivery' => $latestDeliv,
            'service_subkon' => $request->boolean('service_subkon', false) ? 1 : 0,
            'facility_status' => $facilityStatus,
            'is_kawasan_berikat' => $facilityStatus === 'FASILITAS'
                ? true
                : $request->boolean('is_kawasan_berikat', false),
            'status' => 'Waiting for Approve 1',
            'remark' => $request->input('remark') ?? $request->input('remarkPo') ?? '',
        ];

        $rawAdditionalCosts = $request->input('additional_costs')
            ?? $request->input('additionalCosts')
            ?? $request->input('other_costs')
            ?? $request->input('otherCosts')
            ?? [];

        $po = GeniusOneBackend::po()->createPo(
            $headerData,
            $processedItems,
            $rawAdditionalCosts,
            $userId
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Order created successfully',
            'data' => $po->load(['supplier', 'items.prItem.item', 'additionalCosts.type']),
        ], 201);
    }

    /**
     * Add an additional cost to an existing PO.
     */
    public function storeAdditionalCost(Request $request, $id)
    {
        $rawCode = str_replace('-', '/', (string) $id);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', (string) $id);

        $po = PurchaseOrder::where('po_number', $rawCode)
            ->orWhere('po_number', $id)
            ->orWhere('id', is_numeric($id) ? (int) $id : null)
            ->orWhereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanCode])
            ->first();

        if (! $po) {
            return response()->json(['status' => 'error', 'message' => 'Purchase Order not found: '.$id], 404);
        }

        $userId = $request->user()?->id ?? 1;

        $costData = [
            'additional_cost_types_id' => $request->input('additional_cost_types_id') ?? $request->input('costId') ?? $request->input('type_id'),
            'name' => $request->input('name') ?? $request->input('costName') ?? $request->input('item'),
            'value' => (float) ($request->input('value') ?? $request->input('amount') ?? $request->input('nominal') ?? 0),
            'note' => $request->input('note') ?? $request->input('remark'),
        ];

        $cost = GeniusOneBackend::po()->addAdditionalCost($po, $costData);

        \App\Services\AuditLogger::logWorkflow(
            documentType: 'PO',
            documentNumber: $po->po_number,
            action: 'REVISED',
            fromStatus: $po->status,
            toStatus: $po->status,
            userId: $userId,
            extra: ['additional_cost_added' => $cost->id, 'amount' => $cost->value]
        );

        $updatedPo = $po->fresh(['additionalCosts.type', 'items.requisitionItem.item.facility']);
        $formatted = $this->formatPoRow($updatedPo, 1, true);

        return response()->json([
            'status' => 'success',
            'message' => 'Additional cost added successfully',
            'data' => $cost->load('type'),
            'item' => $formatted,
        ], 201);
    }

    /**
     * Remove an additional cost from a PO (Disabled per business rules: additional costs on PO cannot be deleted).
     */
    public function destroyAdditionalCost(Request $request, $id, $costId)
    {
        return response()->json([
            'status' => 'error',
            'message' => 'Additional costs recorded on Purchase Order detail cannot be deleted.',
        ], 403);
    }

    /**
     * Approve Purchase Order.
     */
    public function approve(Request $request, $id)
    {
        $userId = $request->user()?->id ?? 1;
        $tier = (int) $request->input('tier', 1);
        $note = $request->input('note');

        if (! is_numeric($id)) {
            $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', (string) $id);
            $found = PurchaseOrder::whereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanCode])->first();
            $id = $found ? $found->id : $id;
        }

        $po = GeniusOneBackend::procurement()->approvePo((int) $id, $userId, $tier, $note);

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
        $userId = $request->user()?->id ?? 1;
        $tier = (int) $request->input('tier', 1);
        $reason = $request->input('reason', 'Rejected by approver');

        if (! is_numeric($id)) {
            $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', (string) $id);
            $found = PurchaseOrder::whereRaw("REPLACE(REPLACE(po_number, '/', ''), '-', '') = ?", [$cleanCode])->first();
            $id = $found ? $found->id : $id;
        }

        $po = GeniusOneBackend::procurement()->rejectPo((int) $id, $userId, $tier, $reason);

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Order rejected successfully',
            'data' => $po,
        ]);
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
