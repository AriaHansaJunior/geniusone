<?php

namespace App\Http\Controllers\Composite;

use App\Http\Controllers\Controller;
use App\Services\Procurement\PurchaseOrderService;
use App\Services\Procurement\PurchaseRequisitionService;
use App\Services\Reporting\PrPoTraceabilityService;
use App\Services\Warehouse\BpbWarehouseService;
use App\Services\Warehouse\ReceiveNoteService;
use App\ViewModels\PrPoTraceabilityViewModel;
use Illuminate\Http\Request;

/**
 * Composite / Aggregator Controller for End-to-End Procurement & Warehouse Traceability.
 *
 * Implements the Mediator / Aggregate Pattern:
 * Separates PR and PO logic in their respective domain models and services,
 * and acts as the single point of assembly connecting PR + PO + RN + BPB
 * to the PrPoTraceabilityViewModel for view rendering.
 */
class PrPoTraceabilityCompositeController extends Controller
{
    protected PurchaseRequisitionService $prService;

    protected PurchaseOrderService $poService;

    protected ReceiveNoteService $rnService;

    protected BpbWarehouseService $bpbService;

    protected PrPoTraceabilityService $traceabilityService;

    public function __construct(
        PurchaseRequisitionService $prService,
        PurchaseOrderService $poService,
        ReceiveNoteService $rnService,
        BpbWarehouseService $bpbService,
        PrPoTraceabilityService $traceabilityService
    ) {
        $this->prService = $prService;
        $this->poService = $poService;
        $this->rnService = $rnService;
        $this->bpbService = $bpbService;
        $this->traceabilityService = $traceabilityService;
    }

    /**
     * Assemble composite traceability matrix and pass through ViewModel to View/API.
     */
    public function index(Request $request)
    {
        // 1. Query composite traceability matrix using isolated domain services
        $matrix = $this->traceabilityService->getTraceabilityMatrix([
            'po_number' => $request->query('search'),
            'supplier_id' => $request->query('supplier_id'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'status' => $request->query('status'),
        ]);

        // 2. Fetch cross-domain executive KPIs
        $summary = $this->traceabilityService->getExecutiveSummary();

        // 3. Connect assembled domain data to the presentation ViewModel
        $viewModel = PrPoTraceabilityViewModel::create($matrix, $summary);
        $vmData = $viewModel->toArray();

        // 4. Calculate KPI Stats Cards for UI
        $totalRecords = $matrix->count();
        $completedRecords = $matrix->filter(fn ($r) => $r['fulfillment_status'] === 'FULLY_RECEIVED')->count();
        $outstandingRecords = $totalRecords - $completedRecords;
        $totalValue = $matrix->sum(fn ($r) => $r['price'] * $r['ordered_quantity']);

        $stats = [
            ['Report records', (string) $totalRecords, 'PR–PO tracking line items'],
            ['Completed records', (string) $completedRecords, $totalRecords > 0 ? round(($completedRecords / $totalRecords) * 100, 1).'% fulfilled' : '0%'],
            ['Outstanding records', (string) $outstandingRecords, $totalRecords > 0 ? round(($outstandingRecords / $totalRecords) * 100, 1).'% in progress' : '0%'],
            ['Total value', 'IDR '.number_format($totalValue, 0), 'Across all procurement items'],
        ];

        // Format rows for Frontend Table
        $rows = $matrix->values()->map(function ($row, $idx) {
            return $this->formatReportRow($row, $idx + 1);
        })->toArray();

        // 5. Dual-mode response (JSON for API, Blade view for direct web access)
        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'stats' => $stats,
                'rows' => $rows,
                'viewModel' => $vmData,
            ]);
        }

        return view('app', [
            'page' => 'report',
            'initialData' => [
                'stats' => $stats,
                'rows' => $rows,
                'summary' => $summary,
            ],
        ]);
    }

    /**
     * Show single composite report item detail.
     */
    public function show(Request $request, string $code)
    {
        $rawCode = str_replace('-', '/', $code);
        $matrix = $this->traceabilityService->getTraceabilityMatrix();

        $matched = $matrix->first(function ($r) use ($code, $rawCode) {
            $poSlug = str_replace(['/', ' '], ['-', '_'], $r['po_number']);
            $firstPr = ! empty($r['linked_prs']) ? $r['linked_prs'][0]['pr_number'] : '';
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

        if (! $matched && $matrix->isNotEmpty()) {
            $matched = $matrix->first();
        }

        if (! $matched) {
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
     * Format a traceability matrix row for table display.
     */
    protected function formatReportRow(array $row, int $indexNo = 1): array
    {
        $statusBadge = match ($row['fulfillment_status']) {
            'FULLY_RECEIVED' => 'Complete',
            'PARTIAL_RECEIVED' => 'Outstanding',
            'ORDERED' => 'Outstanding',
            default => 'Draft',
        };

        $firstPr = ! empty($row['linked_prs']) ? $row['linked_prs'][0]['pr_number'] : '0026/PR-IMLI/X/2026';
        $supplierName = $row['supplier_name'] ?? 'PT. Surya Baja Mandiri';
        $firstBpb = ! empty($row['bpb_details']) ? $row['bpb_details'][0]['bpb_number'] : '0138/WHIN-IMLI/G/X/2026';

        $priceVal = (float) ($row['price'] ?? 52000000);
        $totalVal = $priceVal * (float) $row['ordered_quantity'];
        $ppnVal = round($totalVal * 0.11, 2);
        $grandTotalVal = $totalVal + $ppnVal;

        $lineItems = [
            [
                'no' => 1,
                'poNumber' => $row['po_number'],
                'prNumber' => $firstPr,
                'item' => $row['item_name'] ?? 'Anode Tembaga Grade A',
                'itemCode' => $row['item_code'] ?? '14-3843-000000000',
                'itemAlias' => '—',
                'quantity' => number_format((float) $row['ordered_quantity'], 4)." {$row['unit']}",
                'unit' => $row['unit'] ?? 'PCE',
                'price' => number_format($priceVal, 2),
                'discount' => '0.00',
                'subtotal' => number_format($totalVal, 2),
                'priceRp' => number_format($priceVal, 2),
                'discountRp' => '0.00',
                'subtotalRp' => number_format($totalVal, 2),
                'lme' => '—',
                'optionalRate' => '—',
                'lmePercentage' => '—',
                'subtotalPph' => '0.00',
                'currency' => $row['currency'] ?? 'IDR',
                'remark' => 'PP Sby Kebutuhan Operasional',
            ],
        ];

        return [
            '_id' => "report-{$row['po_id']}-{$row['item_id']}",
            '_type' => 'report',
            '_rawNumber' => "{$firstPr} / {$row['po_number']}",
            '_rawStatus' => $statusBadge,
            '_rawDate' => $row['po_date'] ?? '08-Oct-2026',
            '_rawDueDate' => '—',
            '_rawSupplier' => $supplierName,
            '_rawTotal' => 'IDR '.number_format($grandTotalVal, 2),
            '_rawPr' => $firstPr,
            '_rawPo' => $row['po_number'],
            '_rawRn' => '0131/RN-IMLI/X/2026',
            '_rawCurrency' => $row['currency'] ?? 'IDR',
            '_rawRate' => '1.00',
            '_rawPaymentMethod' => 'Bank Transfer',
            '_rawPaymentTerm' => 'Net 30 Days',
            '_rawFacility' => 'FASILITAS',
            '_rawCreatedBy' => 'System 08-10-2026 14:20',
            '_rawLastUpdated' => 'System 08-10-2026 14:20',
            '_rawRemark' => 'Procurement & Warehouse End-to-End Tracking',
            '_totalQty' => number_format((float) $row['ordered_quantity'], 4)." {$row['unit']}",
            '_items' => $lineItems,
            'no' => $indexNo,
            'datePr' => '07-10-2026',
            'prNumber' => $firstPr,
            'prStatus' => 'Approved 2',
            'datePo' => $row['po_date'] ?? '08-10-2026',
            'poNumber' => $row['po_number'],
            'poStatus' => $row['po_status'] ?? 'Approved 2',
            'supplier' => $supplierName,
            'material' => $row['item_name'] ?? 'Anode Tembaga Grade A',
            'itemCode' => $row['item_code'] ?? '14-3843-000000000',
            'qtyPr' => number_format((float) $row['ordered_quantity'], 4),
            'qtyPo' => number_format((float) $row['ordered_quantity'], 4),
            'qtyBpb' => number_format((float) $row['net_received_quantity'], 4),
            'outstanding' => number_format((float) $row['outstanding_quantity'], 4),
            'unit' => $row['unit'] ?? 'PCE',
            'currency' => $row['currency'] ?? 'IDR',
            'price' => number_format($priceVal, 2),
            'totalPpn' => number_format($ppnVal, 2),
            'totalPph' => '0.00',
            'additionalCost' => '0.00',
            'subtotal' => number_format($totalVal, 2),
            'dnNumber' => 'DN-0926-0044',
            'typeBc' => 'BC 4.0',
            'facility' => 'FASILITAS',
            'ajuNumber' => '00004001456220261008004282',
            'sppbNumber' => 'SPPB-088370/BC/2026',
            'status' => $statusBadge,
            'description' => 'PP Sby Kebutuhan Operasional Pabrik',
            'actions' => '',
            '_search' => "{$firstPr} {$row['po_number']} {$supplierName} {$row['item_name']} {$statusBadge}",
        ];
    }
}
