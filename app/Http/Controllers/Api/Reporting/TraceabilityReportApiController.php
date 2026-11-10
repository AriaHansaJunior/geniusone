<?php

namespace App\Http\Controllers\Api\Reporting;

use App\Http\Controllers\Controller;
use App\Services\GeniusOneBackend;
use App\ViewModels\PrPoTraceabilityViewModel;
use Illuminate\Http\Request;

class TraceabilityReportApiController extends Controller
{
    /**
     * Get PR-PO-RN-BPB Traceability Matrix Report.
     */
    public function index(Request $request)
    {
        $matrix = GeniusOneBackend::traceability()->getTraceabilityMatrix([
            'po_number' => $request->query('search'),
            'supplier_id' => $request->query('supplier_id'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'status' => $request->query('status'),
        ]);

        $summary = GeniusOneBackend::traceability()->getExecutiveSummary();

        // Connect directly through ViewModel as requested by user architecture!
        $viewModel = PrPoTraceabilityViewModel::create($matrix, $summary);

        $stats = [
            ['Total Transaksi PO', (string) ($summary['po']['total'] ?? 0), 'PO dalam sistem'],
            ['Tingkat Pemenuhan Gate', ($summary['warehouse']['fulfillment_rate_percent'] ?? 0).'%', 'Berdasarkan berat bersih RN'],
            ['Total Dipesan', number_format($summary['warehouse']['ordered_quantity'] ?? 0, 2).' Unit', 'Akumulasi kuantitas PO'],
            ['Outstanding Inbound', number_format($summary['warehouse']['outstanding_quantity'] ?? 0, 2).' Unit', 'Menunggu penerimaan'],
        ];

        $rows = $matrix->map(function ($item, $index) {
            $firstPr = $item['linked_prs'][0] ?? null;
            $prNumber = $firstPr['pr_number'] ?? '—';
            $prId = $firstPr['pr_id'] ?? null;

            return [
                'no' => $index + 1,
                'po_id' => $item['po_id'],
                'po_number' => $item['po_number'],
                'poNumber' => $item['po_number'],
                'pr_id' => $prId,
                'pr_number' => $prNumber,
                'prNumber' => $prNumber,
                'linked_prs' => $item['linked_prs'] ?? [],
                'date' => $item['po_date'],
                'supplier' => $item['supplier_name'],
                'item_code' => $item['item_code'] ?? '-',
                'itemCode' => $item['item_code'] ?? '-',
                'item_name' => $item['item_name'],
                'itemName' => $item['item_name'],
                'unit' => $item['unit'] ?? 'PCS',
                'qty_ordered' => number_format($item['ordered_quantity'], 2),
                'qty_received' => number_format($item['net_received_quantity'], 2),
                'outstanding' => number_format($item['outstanding_quantity'], 2),
                'price' => (float) ($item['price'] ?? 0),
                'subtotal' => (float) (($item['price'] ?? 0) * $item['ordered_quantity']),
                'status' => $item['fulfillment_status'],
                'badge' => match ($item['fulfillment_status']) {
                    'FULLY_RECEIVED' => 'success',
                    'PARTIAL_RECEIVED' => 'warning',
                    default => 'info'
                },
                '_id' => (string) $item['po_id'],
                '_rawPo' => $item['po_number'],
                '_rawPr' => $prNumber,
                '_search' => strtolower("{$item['po_number']} {$prNumber} {$item['supplier_name']} {$item['item_name']}"),
                'items' => [
                    [
                        'id' => "item-{$item['po_id']}-{$index}",
                        'itemCode' => $item['item_code'] ?? '-',
                        'itemName' => $item['item_name'],
                        'prNumber' => $prNumber,
                        'unit' => $item['unit'] ?? 'PCS',
                        'qty' => (float) $item['ordered_quantity'],
                        'unitPrice' => (float) ($item['price'] ?? 0),
                        'discount' => 0.0,
                        'subtotal' => (float) (($item['price'] ?? 0) * $item['ordered_quantity']),
                        'qtyBpb' => (float) $item['net_received_quantity'],
                        'qtyOutstanding' => (float) $item['outstanding_quantity'],
                        'remark' => 'Traceability tracking',
                    ],
                ],
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'stats' => $stats,
            'rows' => $rows,
            'data' => $viewModel->toArray(),
        ]);
    }

    /**
     * Show single Traceability report record.
     */
    public function show(Request $request, string $code)
    {
        $rawCode = str_replace('-', '/', $code);
        $matrix = GeniusOneBackend::traceability()->getTraceabilityMatrix();

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

        if (! $matched) {
            return response()->json(['error' => 'Traceability record not found'], 404);
        }

        return response()->json([
            'status' => 'success',
            'item' => $matched,
        ]);
    }
}
