<?php

namespace App\Http\Controllers\Api\Procurement;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\JobNumber;
use App\Models\Master\Organization\Section;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Models\System\Governance\ApprovalHistory;
use App\Services\AuditLogger;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\GeniusOneBackend;
use Carbon\Carbon;
use Illuminate\Http\Request;
use InvalidArgumentException;

class PurchaseRequisitionApiController extends Controller
{
    /**
     * List Purchase Requisitions.
     */
    public function index(Request $request)
    {
        $query = PurchaseRequisition::with([
            'department',
            'section',
            'creatorUser',
            'items.item.unitOfMeasurement',
            'items.jobNumberModel',
            'items.item.facility',
            'items.closedByUser',
            'items.orderItems.purchaseOrder',
            'approvals.user',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('pr_number', 'like', "%{$s}%")
                    ->orWhere('notes', 'like', "%{$s}%")
                    ->orWhereHas('department', fn ($dq) => $dq->where('name', 'like', "%{$s}%"));
            });
        }

        $records = $query->orderBy('id', 'desc')->get();

        // Calculate Summary Cards
        $totalCount = $records->count();
        $approvedCount = $records->filter(fn ($r) => in_array($r->status, ['Approved 1', 'Approved 2', 'Completed']))->count();
        $draftCount = $records->filter(fn ($r) => in_array($r->status, ['Draft', 'Ready']))->count();
        $totalItems = $records->sum(fn ($r) => $r->items->count());
        $totalQuantity = $records->sum(fn ($r) => $r->items->sum('quantity'));

        $stats = [
            ['Total PR Documents', (string) $totalCount, 'Generated this month'],
            ['Approved PRs', (string) $approvedCount, 'Ready for PO conversion'],
            ['Pending Approval', (string) ($totalCount - $approvedCount), 'Draft & Pending'],
            ['Total Items Requested', number_format($totalQuantity, 2).' Units', "Across {$totalItems} line items"],
        ];

        // Format rows for Frontend Table
        $rows = $records->values()->map(function ($pr, $idx) {
            $firstItem = $pr->items->first();
            $creatorName = $pr->creatorUser?->name ?? '—';
            $createdTime = $pr->created_at ? $pr->created_at->format('d-m-Y H:i') : ($pr->date ?? '-');
            $status = $pr->status ?? 'Draft';
            $allClosed = $pr->items->isNotEmpty() && $pr->items->every(fn ($it) => (bool) $it->is_closed);
            $hasClosed = $pr->items->isNotEmpty() && $pr->items->contains(fn ($it) => (bool) $it->is_closed);

            $appr2 = $pr->approvals->where('approval_ke', '2')->first();
            $appr1 = $pr->approvals->where('approval_ke', '1')->first();
            $isApproved2 = ($status === 'Approved') || ($appr2 && (int) $appr2->status === 1);
            $isApproved1 = $isApproved2 || ($status === 'Waiting for Approve 2') || ($appr1 && (int) $appr1->status === 1);
            $baseApprovalStatus = $status;

            // Calculate Ordered / Outstanding status:
            // "Kalau sudah dibuat PO (sudah masuk ke PO) itu status dibuat ordered aja. tapi kalau masih ada yang belum di beli dibuat outstanding"
            $unclosedItems = $pr->items->filter(fn ($it) => ! (bool) $it->is_closed);
            $totalUnclosed = $unclosedItems->count();
            $itemsWithPo = $unclosedItems->filter(fn ($it) => $it->orderItems && $it->orderItems->isNotEmpty());
            $itemsFullyOrdered = $unclosedItems->filter(function ($it) {
                if (! $it->orderItems || $it->orderItems->isEmpty()) {
                    return false;
                }
                $orderedSum = (float) $it->orderItems->sum('order');

                return $orderedSum >= (float) $it->quantity;
            });

            $isFullyOrdered = $isApproved2 && $totalUnclosed > 0 && ($itemsFullyOrdered->count() >= $totalUnclosed);
            $isOutstanding = $isApproved2 && ! $isFullyOrdered;

            if ($allClosed) {
                $status = 'Closing';
            } elseif ($isFullyOrdered) {
                $status = 'Ordered';
            } elseif ($isOutstanding) {
                $status = 'Outstanding';
            } elseif ($hasClosed && in_array($status, ['Approved', 'Approved 1', 'Approved 2'])) {
                $status = 'Partial Closing';
            }

            $lineItems = $pr->items->map(function ($it, $itIdx) use ($pr) {
                $isClosed = (bool) ($it->is_closed ?? false);
                $rawFac = $it->item?->facility?->name;
                $facilityName = $rawFac ? (stripos((string) $rawFac, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS') : '—';
                $orderedQty = (float) ($it->orderItems ? $it->orderItems->sum('order') : 0);
                $remainingQty = max(0, (float) $it->quantity - $orderedQty);
                $hasPo = $it->orderItems && $it->orderItems->isNotEmpty();
                $itemPoNumbers = $it->orderItems ? $it->orderItems->map(fn ($oi) => $oi->purchaseOrder?->po_number)->filter()->unique()->values() : collect();
                $itemPoNumberStr = $itemPoNumbers->isNotEmpty() ? $itemPoNumbers->join(', ') : '—';

                $jobNumberCode = $this->resolveItemJobNumberLabel($it);

                return [
                    'id' => $it->id,
                    'pr_has_items_id' => $it->id,
                    'items_id' => $it->items_id,
                    'job_number_id' => $it->job_number_id,
                    'jobNumber' => $jobNumberCode,
                    'job_number' => $jobNumberCode,
                    'no' => $itIdx + 1,
                    'prNumber' => $pr->pr_number,
                    'item' => $it->item?->name ?? '—',
                    'itemName' => $it->item?->name ?? '—',
                    'itemCode' => $it->item?->code ?? '-',
                    'itemAlias' => '—',
                    'quantity' => number_format((float) $it->quantity, 4).' '.($it->item?->unitOfMeasurement?->name ?? ''),
                    'qty' => (float) $it->quantity,
                    'rawQty' => (float) $it->quantity,
                    'ordered_qty' => $orderedQty,
                    'remaining_qty' => $remainingQty,
                    'has_po' => $hasPo,
                    'hasPo' => $hasPo,
                    'po_count' => $it->orderItems ? $it->orderItems->count() : 0,
                    'poNumber' => $itemPoNumberStr,
                    'po_number' => $itemPoNumberStr,
                    'poNumbers' => $itemPoNumbers->toArray(),
                    'unit' => $it->item?->unitOfMeasurement?->name ?? '',
                    'remark' => $it->remark ?? $it->note ?? '',
                    'dueDate' => $this->safeFormatDate($it->due_date),
                    'is_closed' => $isClosed,
                    'isClosed' => $isClosed,
                    'closing_status' => $isClosed ? 'Closing' : 'Open',
                    'status' => $isClosed ? 'Closing' : ($pr->status ?? 'Draft'),
                    'closed_at' => $it->closed_at ? $it->closed_at->format('d-M-Y H:i') : null,
                    'closed_by' => $it->closedByUser?->name,
                    'facility' => $facilityName,
                    'facility_status' => $facilityName,
                ];
            })->toArray();

            $prRemark = $firstItem?->note ?? $firstItem?->remark ?? '';

            $poNumbers = $pr->items->flatMap(function ($it) {
                return $it->orderItems ? $it->orderItems->map(fn ($oi) => $oi->purchaseOrder?->po_number) : collect();
            })->filter()->unique()->values();
            $poNumberStr = $poNumbers->isNotEmpty() ? $poNumbers->join(', ') : '—';
            $prJobNumbers = $pr->items->map(fn ($it) => $this->resolveItemJobNumberLabel($it))
                ->filter(fn ($val) => $val !== '—')
                ->unique()
                ->values();
            $prJobNumberStr = $prJobNumbers->isNotEmpty() ? $prJobNumbers->join(', ') : '—';

            return [
                'id' => $pr->id,
                '_id' => "pr-{$pr->id}",
                '_type' => 'pr',
                '_rawNumber' => $pr->pr_number,
                '_rawStatus' => $status,
                '_rawDate' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
                '_rawDueDate' => $this->safeFormatDate($pr->due_date),
                '_rawDept' => $pr->department?->name ?? '—',
                '_rawRemark' => $prRemark,
                '_rawCreatedBy' => "{$creatorName} {$createdTime}",
                '_rawLastUpdated' => "{$creatorName} {$createdTime}",
                '_rawPr' => $pr->pr_number,
                '_rawPo' => $poNumberStr,
                'poNumber' => $poNumberStr,
                'po_number' => $poNumberStr,
                'poNumbers' => $poNumbers->toArray(),
                '_totalQty' => number_format((float) $pr->items->sum('quantity'), 4).' '.($firstItem?->item?->unitOfMeasurement?->name ?? ''),
                'items' => $lineItems,
                '_items' => $lineItems,
                'no' => $idx + 1,
                'prNumber' => $pr->pr_number,
                'date' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
                'dueDate' => $this->safeFormatDate($pr->due_date),
                'job_number_id' => $firstItem?->job_number_id,
                'jobNumber' => $prJobNumberStr,
                'job_number' => $prJobNumberStr,
                'departments_id' => $pr->departments_id,
                'sections_id' => $pr->sections_id,
                'deptRequest' => $pr->department?->name ?? '—',
                'totalItem' => $pr->items->count(),
                'totalQuantity' => number_format((float) $pr->items->sum('quantity'), 4),
                'remark' => $prRemark,
                'note' => $firstItem?->note ?? $firstItem?->remark ?? '',
                'status' => $status,
                'createdBy' => $creatorName,
                'lastUpdated' => $createdTime,
                'attachment_file' => $pr->attachment_file ? basename($pr->attachment_file) : null,
                'attachment_url' => $pr->attachment_file ? url('storage/'.$pr->attachment_file) : null,
                'actions' => '',
                '_search' => "{$pr->pr_number} {$pr->department?->name} {$creatorName} {$status} {$prRemark} {$poNumberStr}",
                'is_approved' => $isApproved2,
                'is_approved_1' => $isApproved1,
                'is_approved_2' => $isApproved2,
                'approval_status' => $baseApprovalStatus,
                'approved1_by' => $appr1?->user?->name,
                'approved1_at' => $appr1?->updated_at?->format('d-M-Y H:i'),
                'approved2_by' => $appr2?->user?->name,
                'approved2_at' => $appr2?->updated_at?->format('d-M-Y H:i'),
                'approvals' => $pr->approvals->map(fn ($a) => [
                    'tier' => (int) $a->approval_ke,
                    'status' => $a->status === 1 ? 'Approved' : 'Pending',
                    'user' => $a->user?->name ?? '—',
                    'date' => $a->updated_at?->format('d-M-Y H:i') ?? '-',
                    'note' => $a->note,
                ])->toArray(),
            ];
        })->toArray();

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'stats' => $stats,
                'rows' => $rows,
            ]);
        }

        return view('app', [
            'page' => 'pr',
            'initialData' => ['stats' => $stats, 'rows' => $rows],
        ]);
    }

    /**
     * Show single Purchase Requisition detail.
     */
    public function show(Request $request, string $code)
    {
        $rawCode = str_replace('-', '/', $code);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $code);

        $pr = PurchaseRequisition::with([
            'department',
            'section',
            'creatorUser',
            'items.item.unitOfMeasurement',
            'items.jobNumberModel',
            'items.item.facility',
            'items.closedByUser',
            'items.orderItems.purchaseOrder',
            'approvals.user',
        ])
            ->where('pr_number', $rawCode)
            ->orWhere('pr_number', $code)
            ->orWhere('id', is_numeric($code) ? (int) $code : null)
            ->orWhereRaw("REPLACE(REPLACE(pr_number, '/', ''), '-', '') = ?", [$cleanCode])
            ->first();

        if (! $pr) {
            if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
                return response()->json(['status' => 'error', 'message' => 'Purchase Requisition not found: '.$code], 404);
            }

            return redirect('/procurement/transactions/purchase-requisition')->withErrors(['error' => 'Purchase Requisition not found']);
        }

        $creatorName = $pr->creatorUser?->name ?? '—';
        $createdTime = $pr->created_at ? $pr->created_at->format('d-m-Y H:i') : ($pr->date ?? '-');
        $firstItem = $pr->items->first();

        $lineItems = $pr->items->map(function ($it, $itIdx) use ($pr) {
            $isClosed = (bool) ($it->is_closed ?? false);
            $rawFac = $it->item?->facility?->name;
            $facilityName = $rawFac ? (stripos((string) $rawFac, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS') : '—';
            $orderedQty = (float) ($it->orderItems ? $it->orderItems->sum('order') : 0);
            $remainingQty = max(0, (float) $it->quantity - $orderedQty);
            $hasPo = $it->orderItems && $it->orderItems->isNotEmpty();
            $itemPoNumbers = $it->orderItems ? $it->orderItems->map(fn ($oi) => $oi->purchaseOrder?->po_number)->filter()->unique()->values() : collect();
            $itemPoNumberStr = $itemPoNumbers->isNotEmpty() ? $itemPoNumbers->join(', ') : '—';

            return [
                'id' => $it->id,
                'pr_has_items_id' => $it->id,
                'items_id' => $it->items_id,
                'no' => $itIdx + 1,
                'prNumber' => $pr->pr_number,
                'item' => $it->item?->name ?? '—',
                'itemName' => $it->item?->name ?? '—',
                'itemCode' => $it->item?->code ?? '-',
                'itemAlias' => '—',
                'quantity' => number_format((float) $it->quantity, 4).' '.($it->item?->unitOfMeasurement?->name ?? ''),
                'qty' => (float) $it->quantity,
                'rawQty' => (float) $it->quantity,
                'ordered_qty' => $orderedQty,
                'remaining_qty' => $remainingQty,
                'has_po' => $hasPo,
                'hasPo' => $hasPo,
                'po_count' => $it->orderItems ? $it->orderItems->count() : 0,
                'poNumber' => $itemPoNumberStr,
                'po_number' => $itemPoNumberStr,
                'poNumbers' => $itemPoNumbers->toArray(),
                'unit' => $it->item?->unitOfMeasurement?->name ?? '',
                'remark' => $it->remark ?? $it->note ?? '',
                'dueDate' => $this->safeFormatDate($it->due_date),
                'is_closed' => $isClosed,
                'isClosed' => $isClosed,
                'closing_status' => $isClosed ? 'Closing' : 'Open',
                'status' => $isClosed ? 'Closing' : ($pr->status ?? 'Draft'),
                'closed_at' => $it->closed_at ? $it->closed_at->format('d-M-Y H:i') : null,
                'closed_by' => $it->closedByUser?->name,
                'facility' => $facilityName,
                'facility_status' => $facilityName,
            ];
        })->toArray();

        $allClosed = $pr->items->isNotEmpty() && $pr->items->every(fn ($it) => (bool) $it->is_closed);
        $hasClosed = $pr->items->isNotEmpty() && $pr->items->contains(fn ($it) => (bool) $it->is_closed);
        $detailStatus = $pr->status ?? 'Waiting for Approve 1';

        $appr2 = $pr->approvals->where('approval_ke', '2')->first();
        $appr1 = $pr->approvals->where('approval_ke', '1')->first();
        $isApproved2 = ($detailStatus === 'Approved') || ($appr2 && (int) $appr2->status === 1);
        $isApproved1 = $isApproved2 || ($detailStatus === 'Waiting for Approve 2') || ($appr1 && (int) $appr1->status === 1);
        $baseApprovalStatus = $detailStatus;

        // Calculate Ordered / Outstanding status:
        // "Kalau sudah dibuat PO (sudah masuk ke PO) itu status dibuat ordered aja. tapi kalau masih ada yang belum di beli dibuat outstanding"
        $unclosedItems = $pr->items->filter(fn ($it) => ! (bool) $it->is_closed);
        $totalUnclosed = $unclosedItems->count();
        $itemsWithPo = $unclosedItems->filter(fn ($it) => $it->orderItems && $it->orderItems->isNotEmpty());
        $itemsFullyOrdered = $unclosedItems->filter(function ($it) {
            if (! $it->orderItems || $it->orderItems->isEmpty()) {
                return false;
            }
            $orderedSum = (float) $it->orderItems->sum('order');

            return $orderedSum >= (float) $it->quantity;
        });

        $isFullyOrdered = $isApproved2 && $totalUnclosed > 0 && ($itemsFullyOrdered->count() >= $totalUnclosed);
        $isOutstanding = $isApproved2 && ! $isFullyOrdered;

        if ($allClosed) {
            $detailStatus = 'Closing';
        } elseif ($isFullyOrdered) {
            $detailStatus = 'Ordered';
        } elseif ($isOutstanding) {
            $detailStatus = 'Outstanding';
        } elseif ($hasClosed && in_array($detailStatus, ['Approved', 'Approved 1', 'Approved 2'])) {
            $detailStatus = 'Partial Closing';
        }

        $poNumbers = $pr->items->flatMap(function ($it) {
            return $it->orderItems ? $it->orderItems->map(fn ($oi) => $oi->purchaseOrder?->po_number) : collect();
        })->filter()->unique()->values();
        $poNumberStr = $poNumbers->isNotEmpty() ? $poNumbers->join(', ') : '—';
        $prJobNumbers = $pr->items->map(fn ($it) => $this->resolveItemJobNumberLabel($it))
            ->filter(fn ($val) => $val !== '—')
            ->unique()
            ->values();
        $prJobNumberStr = $prJobNumbers->isNotEmpty() ? $prJobNumbers->join(', ') : '—';

        $detailRow = [
            'id' => $pr->id,
            '_id' => "pr-{$pr->id}",
            '_type' => 'pr',
            'prNumber' => $pr->pr_number,
            '_rawNumber' => $pr->pr_number,
            'status' => $detailStatus,
            '_rawStatus' => $detailStatus,
            'poNumber' => $poNumberStr,
            'po_number' => $poNumberStr,
            '_rawPo' => $poNumberStr,
            'poNumbers' => $poNumbers->toArray(),
            'is_approved' => $isApproved2,
            'is_approved_1' => $isApproved1,
            'is_approved_2' => $isApproved2,
            'approval_status' => $baseApprovalStatus,
            'approved1_by' => $appr1?->user?->name,
            'approved1_at' => $appr1?->updated_at?->format('d-M-Y H:i'),
            'approved2_by' => $appr2?->user?->name,
            'approved2_at' => $appr2?->updated_at?->format('d-M-Y H:i'),
            'date' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
            '_rawDate' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
            'dueDate' => $this->safeFormatDate($pr->due_date),
            '_rawDueDate' => $this->safeFormatDate($pr->due_date),
            'job_number_id' => $firstItem?->job_number_id,
            'jobNumber' => $prJobNumberStr,
            'job_number' => $prJobNumberStr,
            'departments_id' => $pr->departments_id,
            'sections_id' => $pr->sections_id,
            'deptRequest' => $pr->department?->name ?? '—',
            '_rawDept' => $pr->department?->name ?? '—',
            'section' => $pr->section?->name ?? '—',
            'remark' => $firstItem?->note ?? $firstItem?->remark ?? '',
            '_rawRemark' => $firstItem?->note ?? $firstItem?->remark ?? '',
            'note' => $firstItem?->note ?? $firstItem?->remark ?? '',
            'attachment_file' => $pr->attachment_file ? basename($pr->attachment_file) : null,
            'attachment_url' => $pr->attachment_file ? (str_starts_with($pr->attachment_file, 'http') ? $pr->attachment_file : url('storage/'.$pr->attachment_file)) : null,
            'createdBy' => "{$creatorName} {$createdTime}",
            '_rawCreatedBy' => "{$creatorName} {$createdTime}",
            '_rawLastUpdated' => "{$creatorName} {$createdTime}",
            '_rawPr' => $pr->pr_number,
            'totalQuantity' => number_format((float) $pr->items->sum('quantity'), 4).' '.($firstItem?->item?->unitOfMeasurement?->name ?? ''),
            '_totalQty' => number_format((float) $pr->items->sum('quantity'), 4).' '.($firstItem?->item?->unitOfMeasurement?->name ?? ''),
            'items' => $lineItems,
            '_items' => $lineItems,
            'approvals' => $pr->approvals->map(fn ($a) => [
                'tier' => (int) $a->approval_ke,
                'status' => $a->status === 1 ? 'Approved' : 'Pending',
                'user' => $a->user?->name ?? '—',
                'date' => $a->updated_at?->format('d-M-Y H:i') ?? '-',
                'note' => $a->note,
            ])->toArray(),
            '_history' => $this->getPrActivityHistory($pr, $creatorName, $createdTime),
            'history' => $this->getPrActivityHistory($pr, $creatorName, $createdTime),
        ];

        if ($request->expectsJson() || $request->is('api/*') || $request->query('format') === 'json') {
            return response()->json([
                'status' => 'success',
                'item' => $detailRow,
            ]);
        }

        return view('app', [
            'page' => 'pr-detail',
            'code' => $code,
            'initialData' => ['item' => $detailRow],
        ]);
    }

    /**
     * Build real chronological activity history for PR (BE-04 & BE-06).
     */
    protected function getPrActivityHistory(PurchaseRequisition $pr, string $creatorName, string $createdTime): array
    {
        $prHistories = ApprovalHistory::where('document_type', 'PR')
            ->where(function ($q) use ($pr) {
                $q->where('document_id', $pr->id)
                    ->orWhere('document_number', $pr->pr_number);
            })
            ->with('user')
            ->orderBy('created_at', 'asc')
            ->get();

        if ($prHistories->isNotEmpty()) {
            return $prHistories->map(function ($h) {
                $meta = is_array($h->metadata) ? $h->metadata : [];
                $userName = $h->user?->name ?? ($meta['actor_name'] ?? '—');
                $actionLabel = ucwords(str_replace('_', ' ', strtolower($h->action)));

                return [
                    'user' => $userName,
                    'activity' => $actionLabel,
                    'logTime' => $h->created_at ? $h->created_at->format('d-M-Y H:i') : '-',
                    'badgeTone' => str_contains($h->action, 'APPROVE') ? 'blue' : (str_contains($h->action, 'PRINT') ? 'purple' : (str_contains($h->action, 'CREATE') ? 'green' : (str_contains($h->action, 'CLOSE') ? 'orange' : 'gray'))),
                    'note' => $h->note,
                ];
            })->toArray();
        }

        return [
            ['user' => $creatorName, 'activity' => 'Transaction Created', 'logTime' => $createdTime, 'badgeTone' => 'green'],
        ];
    }

    /**
     * Download attachment file for a Purchase Requisition.
     */
    public function downloadAttachment(Request $request, string $code)
    {
        $rawCode = str_replace('-', '/', $code);
        $pr = PurchaseRequisition::where('pr_number', $rawCode)
            ->orWhere('pr_number', $code)
            ->orWhere('id', is_numeric($code) ? (int) $code : null)
            ->first();

        if (! $pr || ! $pr->attachment_file) {
            abort(404, 'Attachment not found.');
        }

        $path = storage_path('app/public/'.$pr->attachment_file);
        if (! file_exists($path)) {
            $altPath = public_path($pr->attachment_file);
            if (file_exists($altPath)) {
                $path = $altPath;
            } else {
                abort(404, 'Attachment file not found on disk.');
            }
        }

        return response()->download($path);
    }

    /**
     * Store newly created Purchase Requisition.
     */
    public function store(Request $request)
    {
        $userId = $this->requireActorId($request);

        try {
            $deptId = $this->resolveDepartmentId($request);
            $secId = $this->resolveSectionId($request, $deptId);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => ['master' => [$e->getMessage()]],
            ], 422);
        }

        $rawItems = $request->input('items', []);
        if (empty($rawItems) || ! is_array($rawItems)) {
            return response()->json([
                'status' => 'error',
                'message' => 'At least one item is required.',
                'errors' => ['items' => ['At least one item is required.']],
            ], 422);
        }

        $prNumber = $request->input('pr_number') ?? DocumentNumberGenerator::generatePrNumber();
        $date = $this->safeToDatabaseDate($request->input('date'), now()->format('Y-m-d'));
        $dueDate = $this->safeToDatabaseDate($request->input('due_date'), now()->addDays(14)->format('Y-m-d'));
        $attachmentPath = $this->resolveAttachmentPath($request);

        try {
            $processedItems = $this->resolvePrItemsPayload($request, $rawItems, $dueDate);
            $pr = GeniusOneBackend::pr()->createPr(
                [
                    'pr_number' => $prNumber,
                    'departments_id' => $deptId,
                    'sections_id' => $secId,
                    'date' => $date,
                    'due_date' => $dueDate,
                    'attachment_file' => $attachmentPath,
                    'status' => 'Waiting for Approve 1',
                ],
                $processedItems,
                $userId
            );
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => ['items' => [$e->getMessage()]],
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Requisition created successfully',
            'data' => $pr->load(['department', 'section', 'items.item', 'items.jobNumberModel']),
        ], 201);
    }

    /**
     * Update an existing Purchase Requisition.
     */
    public function update(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $pr = $this->findPrRecord((string) $id);
        if (! $pr) {
            return response()->json(['status' => 'error', 'message' => 'Purchase Requisition not found.'], 404);
        }

        try {
            $deptId = $request->hasAny(['departments_id', 'department', 'deptRequest'])
                ? $this->resolveDepartmentId($request)
                : $pr->departments_id;
            $secId = $request->hasAny(['sections_id', 'section'])
                ? $this->resolveSectionId($request, $deptId)
                : $pr->sections_id;

            $dueDate = $this->safeToDatabaseDate($request->input('due_date'), $pr->due_date ?? now()->addDays(14)->format('Y-m-d'));
            $headerData = [
                'departments_id' => $deptId,
                'sections_id' => $secId,
                'date' => $this->safeToDatabaseDate($request->input('date'), $pr->date ?? now()->format('Y-m-d')),
                'due_date' => $dueDate,
                'revision' => $request->input('revision'),
            ];

            $attachmentPath = $this->resolveAttachmentPath($request);
            if ($attachmentPath !== null) {
                $headerData['attachment_file'] = $attachmentPath;
            }

            $processedItems = [];
            if ($request->has('items')) {
                $rawItems = $request->input('items', []);
                if (empty($rawItems) || ! is_array($rawItems)) {
                    throw new InvalidArgumentException('At least one item is required.');
                }
                $processedItems = $this->resolvePrItemsPayload($request, $rawItems, $dueDate);
            }

            $updatedPr = GeniusOneBackend::pr()->updateRequisition($pr->id, $headerData, $processedItems, $userId);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'errors' => ['pr' => [$e->getMessage()]],
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Requisition updated successfully',
            'data' => $updatedPr->load(['department', 'section', 'items.item', 'items.jobNumberModel']),
        ]);
    }

    /**
     * Soft-delete a Purchase Requisition.
     */
    public function destroy(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $pr = $this->findPrRecord((string) $id);
        if (! $pr) {
            return response()->json(['status' => 'error', 'message' => 'Purchase Requisition not found.'], 404);
        }

        try {
            GeniusOneBackend::pr()->deleteRequisition($pr->id, $userId);
        } catch (InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Requisition deleted successfully',
        ]);
    }

    private function resolveItemJobNumberLabel(PurchaseRequisitionItem $it): string
    {
        return $it->jobNumberModel?->code
            ?? $it->jobNumberModel?->name
            ?? ($it->job_number ?: '—');
    }

    private function findPrRecord(string $codeOrId): ?PurchaseRequisition
    {
        if (is_numeric($codeOrId)) {
            $found = PurchaseRequisition::find((int) $codeOrId);
            if ($found) {
                return $found;
            }
        }

        $normalizedSlash = str_replace('-', '/', $codeOrId);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $codeOrId);

        return PurchaseRequisition::where('pr_number', $codeOrId)
            ->orWhere('pr_number', $normalizedSlash)
            ->orWhereRaw("REPLACE(REPLACE(pr_number, '/', ''), '-', '') = ?", [$cleanCode])
            ->first();
    }

    private function resolveDepartmentId(Request $request): int
    {
        $deptInput = $request->input('departments_id') ?? $request->input('department') ?? $request->input('deptRequest');
        if (is_numeric($deptInput)) {
            $dept = Department::find((int) $deptInput);
            if ($dept) {
                return $dept->id;
            }
        } elseif (! empty($deptInput) && is_string($deptInput)) {
            $trimmed = trim($deptInput);
            $dept = Department::where('name', $trimmed)
                ->orWhere('name', 'like', "%{$trimmed}%")
                ->first();
            if ($dept) {
                return $dept->id;
            }
        }

        throw new InvalidArgumentException('Department is required and must match a valid Department master record.');
    }

    private function resolveSectionId(Request $request, int $deptId): int
    {
        $secInput = $request->input('sections_id') ?? $request->input('section');
        if (is_numeric($secInput)) {
            $sec = Section::find((int) $secInput);
            if ($sec) {
                return $sec->id;
            }
            throw new InvalidArgumentException('Selected Section does not exist in Section master data.');
        }

        if (! empty($secInput) && is_string($secInput)) {
            $trimmed = trim($secInput);
            $sec = Section::where('name', $trimmed)
                ->orWhere('name', 'like', "%{$trimmed}%")
                ->first();
            if ($sec) {
                return $sec->id;
            }
            throw new InvalidArgumentException("Section '{$trimmed}' was not found in Section master data.");
        }

        $defaultSection = Section::where('departments_id', $deptId)->first() ?? Section::first();
        if (! $defaultSection) {
            throw new InvalidArgumentException('Section master data is empty. Please configure Section master data first.');
        }

        return $defaultSection->id;
    }

    private function resolveAttachmentPath(Request $request): ?string
    {
        if ($request->hasFile('attachment_file') || $request->hasFile('attachment')) {
            $file = $request->file('attachment_file') ?? $request->file('attachment');
            $filename = time().'_'.preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());

            return $file->storeAs('attachments/pr', $filename, 'public');
        }

        if ($request->filled('attachment_file') && is_string($request->input('attachment_file'))) {
            return $request->input('attachment_file');
        }

        return null;
    }

    /**
     * Resolve and validate PR line items strictly against Master Item & Job Number records.
     */
    private function resolvePrItemsPayload(Request $request, array $rawItems, string $dueDate): array
    {
        $prGeneralNote = trim((string) ($request->input('note') ?? $request->input('purpose') ?? ''));
        $headerJobId = $request->input('job_number_id');
        $headerJobCode = $request->input('job_number') ?? $request->input('jobNumber');

        $processedItems = [];
        foreach ($rawItems as $idx => $it) {
            if (! is_array($it)) {
                throw new InvalidArgumentException('Invalid item payload at row '.($idx + 1).'.');
            }

            $itemModel = null;
            if (! empty($it['items_id']) && is_numeric($it['items_id'])) {
                $itemModel = Item::find((int) $it['items_id']);
            }
            if (! $itemModel && (! empty($it['itemCode']) || ! empty($it['code']) || ! empty($it['item_code']))) {
                $code = trim((string) ($it['itemCode'] ?? $it['code'] ?? $it['item_code']));
                $itemModel = Item::where('code', $code)->first();
            }
            if (! $itemModel && (! empty($it['itemName']) || ! empty($it['name']) || ! empty($it['item_name']))) {
                $name = trim((string) ($it['itemName'] ?? $it['name'] ?? $it['item_name']));
                $itemModel = Item::where('name', $name)
                    ->orWhere('name', 'like', "%{$name}%")
                    ->first();
            }

            if (! $itemModel) {
                throw new InvalidArgumentException('Item at row '.($idx + 1).' was not found in Item Master.');
            }

            $qty = (float) ($it['quantity'] ?? 0);
            if ($qty <= 0) {
                throw new InvalidArgumentException('Quantity at row '.($idx + 1).' must be greater than zero.');
            }

            $jobId = $it['job_number_id'] ?? $headerJobId ?? null;
            $jobText = $it['job_number'] ?? $it['jobNumber'] ?? $headerJobCode ?? null;
            $resolvedJob = null;
            if (! empty($jobId) && is_numeric($jobId)) {
                $resolvedJob = JobNumber::find((int) $jobId);
            } elseif (! empty($jobText) && is_string($jobText) && $jobText !== '—') {
                $cleanJob = trim($jobText);
                $resolvedJob = JobNumber::where('code', $cleanJob)
                    ->orWhere('name', $cleanJob)
                    ->first();
            }

            $itemRemark = trim((string) ($it['remark'] ?? $it['note'] ?? $prGeneralNote));
            $processedItems[] = [
                'items_id' => $itemModel->id,
                'job_number_id' => $resolvedJob?->id,
                'job_number' => $resolvedJob ? ($resolvedJob->code ?: $resolvedJob->name) : ($jobText && $jobText !== '—' ? trim((string) $jobText) : null),
                'quantity' => $qty,
                'due_date' => $this->safeToDatabaseDate($it['dueDate'] ?? $it['due_date'] ?? null, $dueDate),
                'remark' => $itemRemark,
                'note' => $prGeneralNote !== '' ? $prGeneralNote : $itemRemark,
            ];
        }

        return $processedItems;
    }

    /**
     * Approve Purchase Requisition.
     */
    public function approve(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $tier = (int) $request->input('tier', 1);
        $note = $request->input('note');

        if (! is_numeric($id)) {
            $clean = preg_replace('/[^A-Za-z0-9]/', '', (string) $id);
            $found = PurchaseRequisition::whereRaw("REPLACE(REPLACE(pr_number, '/', ''), '-', '') = ?", [$clean])->first();
            $id = $found?->id ?? $id;
        }

        $pr = GeniusOneBackend::procurement()->approvePr((int) $id, $userId, $tier, $note);

        return response()->json([
            'status' => 'success',
            'message' => "Purchase Requisition Tier {$tier} approved successfully",
            'data' => $pr,
        ]);
    }

    /**
     * Reject Purchase Requisition.
     */
    public function reject(Request $request, $id)
    {
        $userId = $this->requireActorId($request);
        $tier = (int) $request->input('tier', 1);
        $reason = $request->input('reason', 'Rejected by approver');

        if (! is_numeric($id)) {
            $clean = preg_replace('/[^A-Za-z0-9]/', '', (string) $id);
            $found = PurchaseRequisition::whereRaw("REPLACE(REPLACE(pr_number, '/', ''), '-', '') = ?", [$clean])->first();
            $id = $found?->id ?? $id;
        }

        $pr = GeniusOneBackend::procurement()->rejectPr((int) $id, $userId, $tier, $reason);

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Requisition rejected successfully',
            'data' => $pr,
        ]);
    }

    /**
     * Resolve PR model and PR Line Item instance (BE-05).
     */
    protected function resolvePrAndItem(Request $request, $prId, $itemId): array
    {
        $rawPrId = str_replace('-', '/', (string) $prId);
        $cleanPrId = preg_replace('/[^A-Za-z0-9]/', '', (string) $prId);

        $pr = is_numeric($prId)
            ? PurchaseRequisition::find((int) $prId)
            : PurchaseRequisition::where('pr_number', $prId)
                ->orWhere('pr_number', $rawPrId)
                ->orWhereRaw("REPLACE(REPLACE(pr_number, '/', ''), '-', '') = ?", [$cleanPrId])
                ->first();

        if (! $pr) {
            abort(404, "Purchase Requisition '{$prId}' not found.");
        }

        $prItem = null;
        if (is_numeric($itemId)) {
            $prItem = PurchaseRequisitionItem::where('id', (int) $itemId)
                ->where('purchase_requisitions_id', $pr->id)
                ->first();
        }

        if (! $prItem) {
            $itemCode = $request->input('itemCode') ?? $request->input('code') ?? $itemId;
            $itemName = $request->input('itemName') ?? $request->input('name');

            $prItem = $pr->items()->where(function ($iq) use ($itemCode, $itemName) {
                if ($itemCode && $itemCode !== '-') {
                    $iq->whereHas('item', fn ($m) => $m->where('code', $itemCode));
                }
                if ($itemName) {
                    $iq->orWhereHas('item', fn ($m) => $m->where('name', $itemName));
                }
            })->first();

            if (! $prItem && is_numeric($itemId)) {
                $prItem = $pr->items()->skip((int) $itemId)->first();
            }
        }

        if (! $prItem) {
            abort(404, "PR Item '{$itemId}' not found in PR '{$pr->pr_number}'.");
        }

        return [$pr, $prItem];
    }

    /**
     * BE-05: Mark specific PR item as Closed.
     * Item remains visible with Closing status but is excluded from PO generation.
     * POST /api/procurement/purchase-requisitions/{id}/items/{itemId}/close
     */
    public function closeItem(Request $request, $id, $itemId)
    {
        [$pr, $prItem] = $this->resolvePrAndItem($request, $id, $itemId);
        $userId = $this->requireActorId($request);
        $user = \App\Models\System\Auth\User::find($userId);

        $prItem->close($userId);

        // Check if all items in PR are closed, update parent PR status
        $openItemsCount = $pr->items()->where('is_closed', false)->count();
        if ($openItemsCount === 0) {
            $pr->update(['status' => 'Closing']);
        }

        // Record in centralized audit trail (BE-04 & BE-06)
        $itemName = $prItem->item?->name ?? 'PR Item';
        $itemCode = $prItem->item?->code ?? '-';

        ApprovalHistory::create([
            'document_type' => 'PR',
            'document_id' => $pr->id,
            'document_number' => $pr->pr_number,
            'user_id' => $userId,
            'action' => 'CLOSED_ITEM',
            'tier' => 1,
            'from_status' => $pr->status ?? 'Approved',
            'to_status' => $pr->status ?? 'Approved',
            'note' => "Closed PR line item: {$itemName} ({$itemCode})",
            'metadata' => [
                'actor_name' => $user?->name ?? '—',
                'actor_role' => $user?->role ?? null,
                'item_id' => $prItem->id,
                'item_code' => $itemCode,
                'item_name' => $itemName,
            ],
        ]);

        AuditLogger::logWorkflow(
            documentType: 'PR',
            documentNumber: $pr->pr_number,
            action: 'ITEM_CLOSED',
            fromStatus: $pr->status,
            toStatus: $pr->status,
            userId: $userId,
            extra: ['item_id' => $prItem->id, 'item_name' => $itemName, 'item_code' => $itemCode]
        );

        return response()->json([
            'status' => 'success',
            'message' => "PR item '{$itemName}' marked as Closed.",
            'data' => [
                'pr_id' => $pr->id,
                'pr_number' => $pr->pr_number,
                'item_id' => $prItem->id,
                'is_closed' => true,
                'status' => 'Closing',
                'closing_status' => 'Closing',
                'closed_at' => $prItem->closed_at?->format('d-M-Y H:i'),
                'closed_by' => $user?->name ?? '—',
            ],
        ]);
    }

    /**
     * BE-05: Reactivate (Unclose) specific PR item.
     * POST /api/procurement/purchase-requisitions/{id}/items/{itemId}/unclose
     */
    public function uncloseItem(Request $request, $id, $itemId)
    {
        [$pr, $prItem] = $this->resolvePrAndItem($request, $id, $itemId);
        $userId = $this->requireActorId($request);
        $user = \App\Models\System\Auth\User::find($userId);

        $prItem->unclose();

        // If PR status was Closing, restore status back to Approved
        if ($pr->status === 'Closing') {
            $pr->update(['status' => 'Approved']);
        }

        $itemName = $prItem->item?->name ?? 'PR Item';
        $itemCode = $prItem->item?->code ?? '-';

        ApprovalHistory::create([
            'document_type' => 'PR',
            'document_id' => $pr->id,
            'document_number' => $pr->pr_number,
            'user_id' => $userId,
            'action' => 'UNCLOSED_ITEM',
            'tier' => 1,
            'from_status' => $pr->status ?? 'Approved',
            'to_status' => $pr->status ?? 'Approved',
            'note' => "Unclosed (reactivated) PR line item: {$itemName} ({$itemCode})",
            'metadata' => [
                'actor_name' => $user?->name ?? '—',
                'actor_role' => $user?->role ?? null,
                'item_id' => $prItem->id,
                'item_code' => $itemCode,
                'item_name' => $itemName,
            ],
        ]);

        AuditLogger::logWorkflow(
            documentType: 'PR',
            documentNumber: $pr->pr_number,
            action: 'ITEM_UNCLOSED',
            fromStatus: $pr->status,
            toStatus: $pr->status,
            userId: $userId,
            extra: ['item_id' => $prItem->id, 'item_name' => $itemName, 'item_code' => $itemCode]
        );

        return response()->json([
            'status' => 'success',
            'message' => "PR item '{$itemName}' reactivated (unclosed).",
            'data' => [
                'pr_id' => $pr->id,
                'pr_number' => $pr->pr_number,
                'item_id' => $prItem->id,
                'is_closed' => false,
                'status' => 'Open',
                'closing_status' => 'Open',
            ],
        ]);
    }

    /**
     * BE-05: Toggle PR item closing status.
     * POST /api/procurement/purchase-requisitions/{id}/items/{itemId}/toggle-close
     */
    public function toggleCloseItem(Request $request, $id, $itemId)
    {
        [$pr, $prItem] = $this->resolvePrAndItem($request, $id, $itemId);

        if ($request->has('is_closed')) {
            $shouldClose = (bool) $request->boolean('is_closed');
        } else {
            $shouldClose = ! $prItem->is_closed;
        }

        if ($shouldClose) {
            return $this->closeItem($request, $id, $itemId);
        }

        return $this->uncloseItem($request, $id, $itemId);
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

    /**
     * Safely normalize input date to YYYY-MM-DD for database persistence.
     */
    private function safeToDatabaseDate($dateVal, ?string $default = null): ?string
    {
        if (empty($dateVal)) {
            return $default;
        }

        try {
            if (is_numeric($dateVal) && (int) $dateVal > 20000 && (int) $dateVal < 70000) {
                return Carbon::createFromTimestampUTC(((int) $dateVal - 25569) * 86400)->format('Y-m-d');
            }

            return Carbon::parse($dateVal)->format('Y-m-d');
        } catch (\Throwable $e) {
            return $default ?? now()->format('Y-m-d');
        }
    }
}
