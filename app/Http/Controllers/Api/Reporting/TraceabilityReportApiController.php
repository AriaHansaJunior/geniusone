<?php

namespace App\Http\Controllers\Api\Reporting;

use App\Http\Controllers\Controller;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
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

        $viewModel = PrPoTraceabilityViewModel::create($matrix, $summary);

        $stats = [
            ['Total PO Transactions', (string) ($summary['po']['total'] ?? 0), 'PO documents recorded'],
            ['Gate Fulfillment Rate', ($summary['warehouse']['fulfillment_rate_percent'] ?? 0).'%', 'Based on RN net weight'],
            ['Total Ordered', number_format($summary['warehouse']['ordered_quantity'] ?? 0, 2).' Unit', 'Accumulated PO quantity'],
            ['Outstanding Inbound', number_format($summary['warehouse']['outstanding_quantity'] ?? 0, 2).' Unit', 'Awaiting receipt'],
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
                'unit' => $item['unit'] ?? '',
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
                        'unit' => $item['unit'] ?? '',
                        'qty' => (float) $item['ordered_quantity'],
                        'unitPrice' => (float) ($item['price'] ?? 0),
                        'discount' => 0.0,
                        'subtotal' => (float) (($item['price'] ?? 0) * $item['ordered_quantity']),
                        'qtyBpb' => (float) $item['net_received_quantity'],
                        'qtyOutstanding' => (float) $item['outstanding_quantity'],
                        'remark' => '',
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
     * Get live Purchase Requisition Report from MySQL.
     */
    public function prReport(Request $request)
    {
        $query = PurchaseRequisition::with([
            'department',
            'section',
            'creatorUser',
            'items.item.unitOfMeasurement',
            'items.item.facility',
            'items.jobNumberModel',
            'items.orderItems.purchaseOrder',
            'approvals.user',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('pr_number', 'like', "%{$s}%")
                    ->orWhereHas('department', fn ($dq) => $dq->where('name', 'like', "%{$s}%"))
                    ->orWhereHas('items.item', fn ($iq) => $iq->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%"));
            });
        }
        if ($request->filled('department_id')) {
            $query->where('departments_id', $request->department_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        $records = $query->orderBy('id', 'desc')->get();

        $rows = $records->values()->map(function ($pr, $idx) {
            $firstItem = $pr->items->first();
            $poNumbers = $pr->items->flatMap(fn ($it) => $it->orderItems ? $it->orderItems->map(fn ($oi) => $oi->purchaseOrder?->po_number) : collect())
                ->filter()->unique()->values();
            $jobNumbers = $pr->items->map(fn ($it) => $it->jobNumberModel?->code ?? $it->jobNumberModel?->name ?? $it->job_number)
                ->filter()->unique()->values();
            $unitName = $firstItem?->item?->unitOfMeasurement?->name ?? '';

            $status = $pr->status ?? 'Waiting for Approve 1';
            $appr2 = $pr->approvals->where('approval_ke', '2')->first();
            $isApproved2 = ($status === 'Approved') || ($appr2 && (int) $appr2->status === 1);
            $allClosed = $pr->items->isNotEmpty() && $pr->items->every(fn ($it) => (bool) $it->is_closed);
            $unclosed = $pr->items->filter(fn ($it) => ! (bool) $it->is_closed);
            $fullyOrderedCount = $unclosed->filter(fn ($it) => $it->orderItems && (float) $it->orderItems->sum('order') >= (float) $it->quantity)->count();
            if ($allClosed) {
                $status = 'Closing';
            } elseif ($isApproved2 && $unclosed->count() > 0 && $fullyOrderedCount >= $unclosed->count()) {
                $status = 'Ordered';
            } elseif ($isApproved2) {
                $status = 'Outstanding';
            }

            $lineItems = $pr->items->values()->map(function ($it, $itIdx) use ($pr) {
                $ordered = $it->orderItems ? (float) $it->orderItems->sum('order') : 0.0;
                $qty = (float) $it->quantity;
                $unit = $it->item?->unitOfMeasurement?->name ?? '';

                return [
                    'no' => $itIdx + 1,
                    'id' => $it->id,
                    'itemCode' => $it->item?->code ?? '-',
                    'itemName' => $it->item?->name ?? '—',
                    'unit' => $unit,
                    'qty' => $qty,
                    'quantity' => number_format($qty, 4).($unit !== '' ? " {$unit}" : ''),
                    'orderedQty' => $ordered,
                    'remainingQty' => max(0.0, $qty - $ordered),
                    'jobNumber' => $it->jobNumberModel?->code ?? $it->jobNumberModel?->name ?? ($it->job_number ?: '—'),
                    'poNumber' => $it->orderItems ? ($it->orderItems->map(fn ($oi) => $oi->purchaseOrder?->po_number)->filter()->unique()->join(', ') ?: '—') : '—',
                    'status' => $it->is_closed ? 'Closing' : ($ordered >= $qty && $qty > 0 ? 'Ordered' : ($ordered > 0 ? 'Partial' : ($pr->status ?? 'Waiting for Approve 1'))),
                    'remark' => $it->remark ?? $it->note ?? '',
                ];
            })->toArray();

            return [
                'no' => $idx + 1,
                'id' => $pr->id,
                '_id' => "pr-{$pr->id}",
                'prNumber' => $pr->pr_number,
                'pr_number' => $pr->pr_number,
                'date' => $pr->date ?: ($pr->created_at?->format('Y-m-d') ?? '-'),
                'dueDate' => $pr->due_date ?: '-',
                'deptRequest' => $pr->department?->name ?? '—',
                'department' => $pr->department?->name ?? '—',
                'section' => $pr->section?->name ?? '—',
                'jobNumber' => $jobNumbers->isNotEmpty() ? $jobNumbers->join(', ') : '—',
                'poNumber' => $poNumbers->isNotEmpty() ? $poNumbers->join(', ') : '—',
                'totalItem' => $pr->items->count(),
                'totalQuantity' => (float) $pr->items->sum('quantity'),
                'totalQtyFormatted' => number_format((float) $pr->items->sum('quantity'), 4).($unitName !== '' ? " {$unitName}" : ''),
                'unit' => $unitName,
                'status' => $status,
                'createdBy' => $pr->creatorUser?->name ?? '—',
                'remark' => $firstItem?->note ?? $firstItem?->remark ?? '',
                'items' => $lineItems,
            ];
        })->values();

        if ($request->filled('status') && strtolower($request->status) !== 'all') {
            $statusFilter = strtolower($request->status);
            $rows = $rows->filter(fn ($r) => strtolower($r['status']) === $statusFilter)->values()->map(function ($r, $i) {
                $r['no'] = $i + 1;

                return $r;
            });
        }

        return response()->json([
            'status' => 'success',
            'stats' => [
                ['Total PRs', (string) $rows->count(), 'Filtered requisition records'],
                ['Ordered / Complete', (string) $rows->where('status', 'Ordered')->count(), 'Converted to PO'],
                ['Outstanding', (string) $rows->where('status', 'Outstanding')->count(), 'Approved & awaiting PO'],
                ['Total Line Items', (string) $rows->sum('totalItem'), 'Across all PRs'],
            ],
            'rows' => $rows->values(),
        ]);
    }

    /**
     * Get live Purchase Order Report from MySQL.
     */
    public function poReport(Request $request)
    {
        $query = PurchaseOrder::with([
            'supplier',
            'currency',
            'poType',
            'paymentTerm',
            'paymentMethod',
            'deliveryTerm',
            'creator.department',
            'items.directItem.unitOfMeasurement',
            'items.directItem.facility',
            'items.requisitionItem.item.unitOfMeasurement',
            'items.requisitionItem.item.facility',
            'items.requisitionItem.purchaseRequisition',
            'items.pph',
            'items.ppn',
            'additionalCosts.type',
            'receiveNotes.receiveNote',
            'approvals.user',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('po_number', 'like', "%{$s}%")
                    ->orWhereHas('supplier', fn ($sq) => $sq->where('name', 'like', "%{$s}%")->orWhere('code', 'like', "%{$s}%"))
                    ->orWhereHas('items.directItem', fn ($iq) => $iq->where('name', 'like', "%{$s}%"));
            });
        }
        if ($request->filled('supplier_id')) {
            $query->where('supliers_id', $request->supplier_id);
        }
        if ($request->filled('status') && strtolower($request->status) !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $records = $query->orderBy('id', 'desc')->get();

        $rows = $records->values()->map(function ($po, $idx) {
            $currencyCode = $po->currency?->code ?? $po->currency?->name ?? 'IDR';
            $supplierName = $po->supplier ? "[{$po->supplier->code}] {$po->supplier->name}" : '—';
            $prNumbers = $po->items->map(fn ($it) => $it->requisitionItem?->purchaseRequisition?->pr_number)->filter()->unique()->values();
            $rnRecord = $po->receiveNotes->first();

            $lineItems = $po->items->values()->map(function ($it, $itIdx) use ($currencyCode) {
                $itemObj = $it->directItem ?? $it->item ?? $it->requisitionItem?->item;
                $unit = $itemObj?->unitOfMeasurement?->name ?? '';

                return [
                    'no' => $itIdx + 1,
                    'id' => $it->id,
                    'itemCode' => $itemObj?->code ?? '-',
                    'itemName' => $itemObj?->name ?? ($it->item_alias ?: '—'),
                    'prNumber' => $it->requisitionItem?->purchaseRequisition?->pr_number ?? '—',
                    'unit' => $unit,
                    'qty' => (float) $it->order,
                    'price' => (float) $it->price,
                    'discount' => (float) $it->discount,
                    'dpp' => (float) $it->dpp,
                    'subtotal' => (float) $it->subtotal,
                    'subtotalPph' => (float) $it->subtotal_pph,
                    'currency' => $currencyCode,
                    'remark' => $it->remark ?? '',
                ];
            })->toArray();

            return [
                'no' => $idx + 1,
                'id' => $po->id,
                '_id' => "po-{$po->id}",
                'poNumber' => $po->po_number,
                'po_number' => $po->po_number,
                'date' => $po->date ?: ($po->created_at?->format('Y-m-d') ?? '-'),
                'dueDate' => $po->due_date ?: '-',
                'supplier' => $supplierName,
                'supplierName' => $po->supplier?->name ?? '—',
                'poType' => $po->poType?->name ?? '—',
                'facility' => $po->facility_status ?: ($po->isKawasanBerikat() ? 'FASILITAS' : 'NON FASILITAS'),
                'currency' => $currencyCode,
                'rate' => (float) $po->rate,
                'paymentTerm' => $po->paymentTerm?->name ?? '—',
                'prNumber' => $prNumbers->isNotEmpty() ? $prNumbers->join(', ') : '—',
                'rnNumber' => $rnRecord?->receiveNote?->rn_number ?? '—',
                'deptCreated' => $po->creator?->department?->name ?? '—',
                'createdBy' => $po->creator?->name ?? '—',
                'totalItem' => $po->items->count(),
                'totalQuantity' => (float) $po->items->sum('order'),
                'subtotal' => (float) $po->subtotal,
                'discount' => (float) $po->discount,
                'dpp' => (float) $po->dpp,
                'ppn' => (float) $po->ppn,
                'pph' => (float) $po->pph,
                'additionalCosts' => (float) $po->additional_costs_total,
                'grandTotal' => (float) $po->grand_total,
                'total' => $currencyCode.' '.number_format((float) $po->grand_total, 2),
                'status' => $po->status ?? 'Waiting for Approve 1',
                'items' => $lineItems,
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'stats' => [
                ['Total POs', (string) $rows->count(), 'Filtered PO records'],
                ['Approved', (string) $rows->whereIn('status', ['Approved', 'Approved 2', 'Completed'])->count(), 'Ready / received'],
                ['Pending Approval', (string) $rows->whereIn('status', ['Waiting for Approve 1', 'Waiting for Approve 2', 'Approved 1', 'Draft'])->count(), 'Awaiting authorization'],
                ['Total Grand Value', 'IDR '.number_format((float) $rows->sum('grandTotal'), 2), 'Gross sum'],
            ],
            'rows' => $rows->values(),
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
