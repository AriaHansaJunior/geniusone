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
            'items.requisitionItem.purchaseRequisition',
            'approvals.user',
            'additionalCosts',
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
        $rawCode = str_replace('-', '/', $code);
        $po = PurchaseOrder::with([
            'supplier',
            'creator',
            'updatedByUser',
            'poType',
            'currency',
            'paymentTerm',
            'paymentMethod',
            'deliveryTerm',
            'items.requisitionItem.item.unitOfMeasurement',
            'items.requisitionItem.purchaseRequisition',
            'approvals.user',
            'additionalCosts',
            'receiveNotes.receiveNote',
        ])
            ->where('po_number', $rawCode)
            ->orWhere('po_number', $code)
            ->orWhere('id', is_numeric($code) ? $code : null)
            ->first();

        if (! $po) {
            $po = PurchaseOrder::with([
                'supplier',
                'creator',
                'updatedByUser',
                'poType',
                'currency',
                'paymentTerm',
                'paymentMethod',
                'deliveryTerm',
                'items.requisitionItem.item.unitOfMeasurement',
                'items.requisitionItem.purchaseRequisition',
                'approvals.user',
                'additionalCosts',
                'receiveNotes.receiveNote',
            ])->first();
        }

        if (! $po) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['error' => 'Purchase Order not found'], 404);
            }

            return redirect('/po')->withErrors(['error' => 'Purchase Order not found']);
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
        $currencyCode = $po->currency?->name ?? 'IDR';
        $supplierName = $po->supplier ? "[{$po->supplier->code}] {$po->supplier->name}" : '—';
        $firstItem = $po->items->first();
        $firstItemUnit = $firstItem?->item?->unitOfMeasurement?->name ?? 'PCS';
        $firstPr = $firstItem?->requisitionItem?->purchaseRequisition;
        $prNumber = $firstPr?->pr_number ?? '—';
        $rnRecord = $po->receiveNotes->first();
        $rnNumber = $rnRecord?->receiveNote?->rn_number ?? '—';

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
            $itemObj = $it->item;
            $unitName = $itemObj?->unitOfMeasurement?->name ?? 'PCS';
            $prNum = $it->requisitionItem?->purchaseRequisition?->pr_number ?? '—';
            $qty = (float) $it->order;
            $price = (float) $it->price;
            $disc = (float) $it->discount;
            $sub = (float) $it->subtotal;

            return [
                'no' => $itIdx + 1,
                'prNumber' => $prNum,
                'item' => $itemObj?->name ?? 'Industrial Material',
                'itemCode' => $itemObj?->code ?? '-',
                'itemAlias' => $it->item_alias ?? '—',
                'quantity' => number_format($qty, 4).' '.$unitName,
                'unit' => $unitName,
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
                'remark' => $po->remark ?? 'U/ Proses BB',
            ];
        })->toArray();

        // Other Costs
        $otherCosts = $po->additionalCosts->map(function ($ac, $acIdx) use ($currencyCode) {
            return [
                'no' => $acIdx + 1,
                'item' => $ac->name ?? 'Operational Freight / Handling',
                'itemCode' => '-',
                'nominal' => $currencyCode.' '.number_format((float) $ac->value, 2),
                'currency' => $currencyCode,
                'remark' => $ac->note ?? '-',
            ];
        })->toArray();

        // History / Audit Trail
        $history = [];
        $logs = Log::where('tipe', 'like', '%PURCHASE_ORDER%')
            ->orWhere('tipe', 'like', '%PO%')
            ->orderBy('id', 'asc')
            ->take(10)
            ->get();

        if ($logs->isNotEmpty()) {
            $history = $logs->map(function ($log) {
                return [
                    'user' => $log->user?->name ?? 'System',
                    'activity' => $log->tipe ?? 'PO Operation',
                    'logTime' => $log->created_at ? $log->created_at->format('d-m-Y h:i:s a') : '-',
                    'badgeTone' => str_contains($log->tipe, 'APPROVE') ? 'blue' : (str_contains($log->tipe, 'CREATE') ? 'green' : 'gray'),
                ];
            })->toArray();
        }

        if (empty($history)) {
            $history = [
                ['user' => $creatorName, 'activity' => 'Transaction Created', 'logTime' => "{$createdTime} pm", 'badgeTone' => 'green'],
            ];
            if ($appr1 && $appr1->user) {
                $history[] = ['user' => $appr1->user->name, 'activity' => 'Approve 1 Purchase Order', 'logTime' => ($appr1->updated_at?->format('d-m-Y h:i:s a') ?? "{$createdTime} pm"), 'badgeTone' => 'blue'];
            }
            if ($appr2 && $appr2->user) {
                $history[] = ['user' => $appr2->user->name, 'activity' => 'Approve 2 Purchase Order', 'logTime' => ($appr2->updated_at?->format('d-m-Y h:i:s a') ?? "{$createdTime} pm"), 'badgeTone' => 'cyan'];
            }
        }

        return [
            '_id' => "po-{$po->id}",
            '_type' => 'po',
            '_rawNumber' => $po->po_number,
            '_rawStatus' => $status,
            '_rawDate' => $po->date ? Carbon::parse($po->date)->format('d-M-Y') : ($po->created_at?->format('d-M-Y') ?? '-'),
            '_rawDueDate' => $po->due_date ? Carbon::parse($po->due_date)->format('d-M-Y') : '-',
            '_rawSupplier' => $supplierName,
            '_rawTotal' => $currencyCode.' '.number_format((float) $po->grand_total, 2),
            '_rawPr' => $prNumber,
            '_rawPo' => $po->po_number,
            '_rawRn' => $rnNumber,
            '_rawCurrency' => $currencyCode,
            '_rawRate' => number_format((float) $po->rate, 2),
            '_rawPaymentMethod' => $po->paymentMethod?->name ?? 'Cash On Delivery',
            '_rawPaymentTerm' => $po->paymentTerm?->name ?? 'Cash On Delivery',
            '_rawFacility' => $po->facility_status ?? 'FASILITAS',
            '_rawCreatedBy' => "{$creatorName} {$createdTime}",
            '_rawLastUpdated' => "{$creatorName} {$updatedTime}",
            '_rawReleasedBy' => $releasedBy,
            '_rawApprovedBy' => $approvedBy,
            '_rawRemark' => $po->remark ?? 'U/ Proses BB',
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
            'date' => $po->date ? Carbon::parse($po->date)->format('d-M-Y') : ($po->created_at?->format('d-M-Y') ?? '-'),
            'supplier' => $supplierName,
            'status' => $status,
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

            $processedItems[] = [
                'pr_has_items_id' => $prHasItemId,
                'item_alias' => $it['item_alias'] ?? $it['itemName'] ?? $it['item_name'] ?? null,
                'price' => $price,
                'order' => $orderQty,
                'purchased' => (float) ($it['purchased'] ?? $orderQty),
                'discount_types_id' => $it['discount_types_id'] ?? null,
                'discount_val' => (float) ($it['discount_val'] ?? $it['discountPercent'] ?? 0),
                'pph_id' => $it['pph_id'] ?? null,
                'ppn_id' => $it['ppn_id'] ?? null,
            ];
        }

        $poNumber = $request->input('po_number') ?? DocumentNumberGenerator::generatePoNumber();
        $date = $request->input('date') ?? now()->format('Y-m-d');
        $dueDate = $request->input('due_date') ?? now()->addDays(14)->format('Y-m-d');
        $latestDeliv = $request->input('latest_delivery') ?? now()->addDays(14);

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
            'facility_status' => $request->input('facility_status') ?? $request->input('statusFacility') ?? 'FASILITAS',
            'remark' => $request->input('remark') ?? $request->input('remarkPo') ?? '',
        ];

        $po = GeniusOneBackend::po()->createPo(
            $headerData,
            $processedItems,
            $request->input('additional_costs', []),
            $userId
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Order created successfully',
            'data' => $po->load(['supplier', 'items.prItem.item', 'additionalCosts']),
        ], 201);
    }

    /**
     * Approve Purchase Order.
     */
    public function approve(Request $request, int $id)
    {
        $userId = $request->user()?->id ?? 1;
        $tier = (int) $request->input('tier', 1);
        $note = $request->input('note');

        $po = GeniusOneBackend::procurement()->approvePo($id, $userId, $tier, $note);

        return response()->json([
            'message' => "Purchase Order Tier {$tier} approved successfully",
            'data' => $po,
        ]);
    }

    /**
     * Reject Purchase Order.
     */
    public function reject(Request $request, int $id)
    {
        $userId = $request->user()?->id ?? 1;
        $tier = (int) $request->input('tier', 1);
        $reason = $request->input('reason', 'Rejected by approver');

        $po = GeniusOneBackend::procurement()->rejectPo($id, $userId, $tier, $reason);

        return response()->json([
            'message' => 'Purchase Order rejected successfully',
            'data' => $po,
        ]);
    }
}
