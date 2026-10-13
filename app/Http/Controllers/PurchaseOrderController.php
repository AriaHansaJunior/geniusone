<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PurchaseOrder;
use App\Models\Log;
use Carbon\Carbon;

class PurchaseOrderController extends Controller
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
                  ->orWhereHas('supplier', fn($sq) => $sq->where('name', 'like', "%{$s}%"));
            });
        }

        $records = $query->orderBy('id', 'desc')->get();

        // Calculate Summary Cards
        $totalCount = $records->count();
        $approved1Count = $records->filter(fn($r) => $r->status === 'Approved 1')->count();
        $approved2Count = $records->filter(fn($r) => in_array($r->status, ['Approved 2', 'Completed']))->count();
        $readyDraftCount = $records->filter(fn($r) => in_array($r->status, ['Draft', 'Ready']))->count();
        $grandTotalValue = $records->sum(fn($r) => $r->grand_total);

        $stats = [
            ["Total POs", (string) $totalCount, "Generated procurement orders"],
            ["Approved 1", (string) $approved1Count, $totalCount > 0 ? round(($approved1Count / $totalCount) * 100, 1) . "% of total" : "0%"],
            ["Approved 2", (string) $approved2Count, $totalCount > 0 ? round(($approved2Count / $totalCount) * 100, 1) . "% of total" : "0%"],
            ["Total Order Value", "IDR " . number_format($grandTotalValue, 0), "Across all line items"],
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

        if (!$po) {
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

        if (!$po) {
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
    protected function formatPoRow(PurchaseOrder $po, int $indexNo = 1, bool $includeFullHistory = false): array
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
        $releasedBy = $appr1 && $appr1->user ? ($appr1->updated_at?->format('d-m-Y H:i') . ' by ' . $appr1->user->name) : '—';
        $approvedBy = $appr2 && $appr2->user ? ($appr2->updated_at?->format('d-m-Y H:i') . ' by ' . $appr2->user->name) : '—';

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
                'quantity' => number_format($qty, 4) . ' ' . $unitName,
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
                'nominal' => $currencyCode . ' ' . number_format((float) $ac->value, 2),
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
            '_rawTotal' => "{$currencyCode} " . number_format($po->grand_total, 2),
            '_rawPr' => $prNumber,
            '_rawPo' => $po->po_number,
            '_rawRn' => $rnNumber,
            '_rawCurrency' => $currencyCode,
            '_rawRate' => number_format((float) $po->rate, 2),
            '_rawPaymentMethod' => $po->paymentMethod?->name ?? 'TRANSFER',
            '_rawPaymentTerm' => $po->paymentTerm?->name ?? '100% by TT full amount within 14 days after received Invoice',
            '_rawFacility' => $po->facility_status ?? 'FASILITAS',
            '_rawDeptCreated' => 'PROCUREMENT',
            '_rawCreatedBy' => "{$createdTime} by {$creatorName}",
            '_rawLastUpdated' => "{$updatedTime} by " . ($po->updatedByUser?->name ?? $creatorName),
            '_rawReleasedBy' => $releasedBy,
            '_rawApprovedBy' => $approvedBy,
            '_rawRemark' => $po->remark ?? 'U/ Proses BB',
            '_rawRevision' => $po->revision ?? '—',
            '_rawSubkon' => $po->service_subkon ? 'Yes' : '—',
            '_totalQty' => number_format($totalOrderQty, 2) . ' ' . $firstItemUnit,
            '_items' => $lineItems,
            '_financials' => [
                'totalQty' => number_format($totalOrderQty, 2),
                'subtotal' => "{$currencyCode} " . number_format($po->subtotal, 2),
                'dpp' => "{$currencyCode} " . number_format($po->dpp, 2),
                'vat' => "{$currencyCode} " . number_format($po->ppn, 2),
                'vatRate' => '12%',
                'grandTotal' => "{$currencyCode} " . number_format($po->grand_total, 2),
            ],
            '_otherCosts' => $otherCosts,
            '_history' => $history,
            'no' => $indexNo,
            'poNumber' => $po->po_number,
            'date' => $po->date ? Carbon::parse($po->date)->format('d-M-Y') : ($po->created_at?->format('d-M-Y') ?? '-'),
            'prNumber' => $prNumber,
            'supplier' => $supplierName,
            'statusFacility' => $po->facility_status ?? 'FASILITAS',
            'deptCreated' => 'PROCUREMENT',
            'totalPrice' => "{$currencyCode} " . number_format($po->grand_total, 2),
            'totalQuantity' => $po->items->count(),
            'status' => $status,
            'lastUpdated' => "{$creatorName} {$createdTime}",
            'actions' => '',
            '_search' => "{$po->po_number} {$supplierName} {$prNumber} {$status} {$po->facility_status}",
        ];
    }
}
