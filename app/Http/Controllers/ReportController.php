<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\GeniusOneBackend;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * List PR-PO Traceability Report.
     */
    public function index(Request $request)
    {
        $matrix = GeniusOneBackend::traceability()->getTraceabilityMatrix([
            'po_number' => $request->query('search'),
        ]);

        $summary = GeniusOneBackend::traceability()->getExecutiveSummary();

        // Calculate KPI Stats Cards
        $totalRecords = $matrix->count();
        $completedRecords = $matrix->filter(fn($r) => $r['fulfillment_status'] === 'FULLY_RECEIVED')->count();
        $outstandingRecords = $totalRecords - $completedRecords;
        $totalValue = $matrix->sum(fn($r) => $r['price'] * $r['ordered_quantity']);

        $stats = [
            ["Report records", (string) $totalRecords, "PR–PO tracking line items"],
            ["Completed records", (string) $completedRecords, $totalRecords > 0 ? round(($completedRecords / $totalRecords) * 100, 1) . "% fulfilled" : "0%"],
            ["Outstanding records", (string) $outstandingRecords, $totalRecords > 0 ? round(($outstandingRecords / $totalRecords) * 100, 1) . "% in progress" : "0%"],
            ["Total value", "IDR " . number_format($totalValue, 0), "Across all procurement items"],
        ];

        // Format rows for Frontend Table
        $rows = $matrix->values()->map(function ($row, $idx) {
            return $this->formatReportRow($row, $idx + 1);
        })->toArray();

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'stats' => $stats,
                'rows' => $rows,
            ]);
        }

        return view('app', [
            'page' => 'report',
            'initialData' => ['stats' => $stats, 'rows' => $rows],
        ]);
    }

    /**
     * Show single Report item detail.
     */
    public function show(Request $request, string $code)
    {
        $rawCode = str_replace('-', '/', $code);
        $matrix = GeniusOneBackend::traceability()->getTraceabilityMatrix();

        $matched = $matrix->first(function ($r) use ($code, $rawCode) {
            $poSlug = str_replace(['/', ' '], ['-', '_'], $r['po_number']);
            $firstPr = !empty($r['linked_prs']) ? $r['linked_prs'][0]['pr_number'] : '';
            $prSlug = str_replace(['/', ' '], ['-', '_'], $firstPr);
            $combined = "{$firstPr} / {$r['po_number']}";
            $combSlug = str_replace(['/', ' '], ['-', '_'], $combined);

            return strcasecmp($r['po_number'], $code) === 0
                || strcasecmp($r['po_number'], $rawCode) === 0
                || strcasecmp($poSlug, $code) === 0
                || strcasecmp($firstPr, $code) === 0
                || strcasecmp($firstPr, $rawCode) === 0
                || strcasecmp($prSlug, $code) === 0
                || strcasecmp($combSlug, $code) === 0;
        });

        if (!$matched && $matrix->isNotEmpty()) {
            $matched = $matrix->first();
        }

        if (!$matched) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['error' => 'Report record not found'], 404);
            }
            return redirect('/report')->withErrors(['error' => 'Report record not found']);
        }

        $detailRow = $this->formatReportRow($matched, 1);

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'item' => $detailRow,
            ]);
        }

        return view('app', [
            'page' => 'report-detail',
            'code' => $code,
            'initialData' => ['item' => $detailRow],
        ]);
    }

    /**
     * Format a traceability matrix record into TableRow structure.
     */
    protected function formatReportRow(array $r, int $indexNo = 1): array
    {
        $firstPr = !empty($r['linked_prs']) ? $r['linked_prs'][0] : null;
        $prNum = $firstPr ? $firstPr['pr_number'] : '—';
        $prDate = $firstPr && !empty($firstPr['pr_date']) ? Carbon::parse($firstPr['pr_date'])->format('d-m-Y') : '01-10-2026';
        $poNum = $r['po_number'];
        $poDate = !empty($r['po_date']) ? Carbon::parse($r['po_date'])->format('d-m-Y') : '08-10-2026';

        $firstBpb = !empty($r['bpb_details']) && $r['bpb_details']->isNotEmpty() ? $r['bpb_details']->first() : null;
        $bpbNum = $firstBpb ? ($firstBpb['bpb_number'] ?? '—') : '—';
        $bpbDate = $firstBpb && !empty($firstBpb['receive_date']) ? Carbon::parse($firstBpb['receive_date'])->format('d-m-Y') : '—';

        $qtyPr = (float) $r['ordered_quantity'];
        $qtyPo = (float) $r['ordered_quantity'];
        $qtyBpb = (float) $r['net_received_quantity'];
        $outstanding = (float) $r['outstanding_quantity'];

        $price = (float) $r['price'];
        $subtotal = $qtyPo * $price;
        $ppn = $subtotal * 0.12;

        $prStatus = $firstPr['pr_status'] ?? 'Approved 2';
        $poStatus = $r['po_status'] ?? 'Approved 2';
        $overallStatus = $outstanding == 0 && $qtyBpb > 0 ? 'Complete' : ($qtyBpb > 0 ? 'Partial' : 'Outstanding');

        return [
            '_id' => "rep-{$indexNo}",
            '_type' => 'report',
            '_rawNumber' => "{$prNum} / {$poNum}",
            '_rawStatus' => $overallStatus,
            '_rawDate' => $poDate,
            '_rawSupplier' => $r['supplier_name'] ?? '—',
            '_rawTotal' => "{$r['currency']} " . number_format($subtotal, 2),
            '_rawPr' => $prNum,
            '_rawPo' => $poNum,
            '_rawRn' => $bpbNum !== '—' ? $bpbNum : '—',
            '_rawRemark' => "Pengadaan Material Operasional",
            '_rawPrDate' => $prDate,
            '_rawRequiredDate' => Carbon::parse($poDate)->addDays(14)->format('d-m-Y'),
            '_rawApproved2Date' => Carbon::parse($prDate)->addDays(1)->format('d-m-Y'),
            '_rawStatusPr' => $prStatus,
            '_rawStatusPo' => $poStatus,
            '_rawDeptRequest' => 'PPIC',
            '_rawSection' => 'Section 2',
            '_rawPoDate' => $poDate,
            '_rawMaterialName' => $r['item_name'] ?? 'Material',
            '_rawMaterialCode' => $r['item_code'] ?? '-',
            '_rawQtyPr' => number_format($qtyPr, 2),
            '_rawQtyPo' => number_format($qtyPo, 2),
            '_rawBpbNumber' => $bpbNum,
            '_rawBpbDate' => $bpbDate,
            '_rawQtyBpb' => number_format($qtyBpb, 2),
            '_rawOutstandingPp' => number_format($outstanding, 2),
            '_rawCurrency' => $r['currency'] ?? 'IDR',
            '_rawPrice' => number_format($price, 2),
            '_rawTotalPpn' => number_format($ppn, 2),
            '_rawTotalPph' => "0.00",
            '_rawAdditionalCost' => "0.00",
            '_rawSubTotal' => number_format($subtotal, 2),
            '_rawDnNumber' => '—',
            '_rawTypeBc' => 'BC 4.0',
            '_rawFacility' => 'Facility',
            '_rawAjuNumber' => '—',
            '_rawSppbNumber' => '—',
            '_rawDescription' => "Pengadaan Operasional: {$r['item_name']}",
            'no' => $indexNo,
            'prNumber' => $prNum,
            'prDate' => $prDate,
            'requiredDate' => Carbon::parse($poDate)->addDays(14)->format('d-m-Y'),
            'approved2Date' => Carbon::parse($prDate)->addDays(1)->format('d-m-Y'),
            'statusPr' => $prStatus,
            'statusPo' => $poStatus,
            'deptRequest' => 'PPIC',
            'section' => 'Section 2',
            'poNumber' => $poNum,
            'poDate' => $poDate,
            'supplier' => $r['supplier_name'] ?? '—',
            'materialName' => $r['item_name'] ?? 'Material',
            'materialCode' => $r['item_code'] ?? '-',
            'qtyPr' => number_format($qtyPr, 0),
            'qtyPo' => number_format($qtyPo, 0),
            'bpbNumber' => $bpbNum,
            'bpbDate' => $bpbDate,
            'qtyBpb' => number_format($qtyBpb, 0),
            'outstandingPp' => number_format($outstanding, 0),
            'currency' => $r['currency'] ?? 'IDR',
            'price' => number_format($price, 2),
            'totalPpn' => number_format($ppn, 2),
            'totalPph' => "0.00",
            'additionalCost' => "0.00",
            'subTotal' => number_format($subtotal, 2),
            'dnNumber' => '—',
            'typeBc' => 'BC 4.0',
            'facility' => 'Facility',
            'ajuNumber' => '—',
            'sppbNumber' => '—',
            'description' => $r['item_name'] ?? '-',
            'actions' => '',
            '_search' => "{$prNum} {$poNum} {$r['supplier_name']} {$r['item_name']} {$r['item_code']} {$overallStatus}",
        ];
    }
}
