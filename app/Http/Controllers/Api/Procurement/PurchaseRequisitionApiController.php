<?php

namespace App\Http\Controllers\Api\Procurement;

use App\Http\Controllers\Controller;
use App\Models\Master\Customs\Facility;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\Section;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Models\System\Governance\ApprovalHistory;
use App\Services\AuditLogger;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\GeniusOneBackend;
use Carbon\Carbon;
use Illuminate\Http\Request;

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
            $creatorName = $pr->creatorUser?->name ?? 'System';
            $createdTime = $pr->created_at ? $pr->created_at->format('d-m-Y H:i') : ($pr->date ?? '-');
            $status = $pr->status ?? 'Draft';
            $allClosed = $pr->items->isNotEmpty() && $pr->items->every(fn ($it) => (bool) $it->is_closed);
            $hasClosed = $pr->items->isNotEmpty() && $pr->items->contains(fn ($it) => (bool) $it->is_closed);

            $appr2 = $pr->approvals->where('approval_ke', '2')->first();
            $appr1 = $pr->approvals->where('approval_ke', '1')->first();
            $isApproved2 = ($status === 'Approved') || ($appr2 && (int) $appr2->status === 1);
            $isApproved1 = $isApproved2 || ($status === 'Waiting for Approve 2') || ($appr1 && (int) $appr1->status === 1);
            $baseApprovalStatus = $status;

            // Calculate Outstanding status: Approved PR with some items in PO but some remaining unclosed items not yet ordered
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

            $isOutstanding = $isApproved2 && $itemsWithPo->isNotEmpty() && ($itemsFullyOrdered->count() < $totalUnclosed);

            if ($allClosed) {
                $status = 'Closing';
            } elseif ($isOutstanding) {
                $status = 'Outstanding';
            } elseif ($hasClosed && in_array($status, ['Approved', 'Approved 1', 'Approved 2'])) {
                $status = 'Partial Closing';
            }

            $lineItems = $pr->items->map(function ($it, $itIdx) use ($pr) {
                $isClosed = (bool) ($it->is_closed ?? false);
                $rawFac = $it->item?->facility?->name ?? 'FASILITAS';
                $facilityName = stripos((string) $rawFac, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS';
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
                    'item' => $it->item?->name ?? 'Material Item',
                    'itemName' => $it->item?->name ?? 'Material Item',
                    'itemCode' => $it->item?->code ?? '-',
                    'itemAlias' => '—',
                    'quantity' => number_format((float) $it->quantity, 4).' '.($it->item?->unitOfMeasurement?->name ?? 'PCE'),
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
                    'unit' => $it->item?->unitOfMeasurement?->name ?? 'PCE',
                    'remark' => $it->remark ?? $it->note ?? 'PP Sby Kebutuhan Operasional',
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

            $prRemark = $firstItem?->note ?? $firstItem?->remark ?? 'PP Sby Pengadaan Material';

            $poNumbers = $pr->items->flatMap(function ($it) {
                return $it->orderItems ? $it->orderItems->map(fn ($oi) => $oi->purchaseOrder?->po_number) : collect();
            })->filter()->unique()->values();
            $poNumberStr = $poNumbers->isNotEmpty() ? $poNumbers->join(', ') : '—';

            return [
                'id' => $pr->id,
                '_id' => "pr-{$pr->id}",
                '_type' => 'pr',
                '_rawNumber' => $pr->pr_number,
                '_rawStatus' => $status,
                '_rawDate' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
                '_rawDueDate' => $this->safeFormatDate($pr->due_date),
                '_rawDept' => $pr->department?->name ?? 'General',
                '_rawRemark' => $prRemark,
                '_rawCreatedBy' => "{$creatorName} {$createdTime}",
                '_rawLastUpdated' => "{$creatorName} {$createdTime}",
                '_rawPr' => $pr->pr_number,
                '_rawPo' => $poNumberStr,
                'poNumber' => $poNumberStr,
                'po_number' => $poNumberStr,
                'poNumbers' => $poNumbers->toArray(),
                '_totalQty' => number_format((float) $pr->items->sum('quantity'), 4).' '.($firstItem?->item?->unitOfMeasurement?->name ?? 'PCE'),
                'items' => $lineItems,
                '_items' => $lineItems,
                'no' => $idx + 1,
                'prNumber' => $pr->pr_number,
                'date' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
                'dueDate' => $this->safeFormatDate($pr->due_date),
                'jobNumber' => '—',
                'deptRequest' => $pr->department?->name ?? 'General',
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
                    'user' => $a->user?->name ?? 'System',
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

        $creatorName = $pr->creatorUser?->name ?? 'System';
        $createdTime = $pr->created_at ? $pr->created_at->format('d-m-Y H:i') : ($pr->date ?? '-');
        $firstItem = $pr->items->first();

        $lineItems = $pr->items->map(function ($it, $itIdx) use ($pr) {
            $isClosed = (bool) ($it->is_closed ?? false);
            $rawFac = $it->item?->facility?->name ?? 'FASILITAS';
            $facilityName = stripos((string) $rawFac, 'non') !== false ? 'NON FASILITAS' : 'FASILITAS';
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
                'item' => $it->item?->name ?? 'Material Item',
                'itemName' => $it->item?->name ?? 'Material Item',
                'itemCode' => $it->item?->code ?? '-',
                'itemAlias' => '—',
                'quantity' => number_format((float) $it->quantity, 4).' '.($it->item?->unitOfMeasurement?->name ?? 'PCE'),
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
                'unit' => $it->item?->unitOfMeasurement?->name ?? 'PCE',
                'remark' => $it->remark ?? $it->note ?? 'PP Sby Kebutuhan Operasional',
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

        // Calculate Outstanding status: Approved PR with some items in PO but some remaining unclosed items not yet ordered
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

        $isOutstanding = $isApproved2 && $itemsWithPo->isNotEmpty() && ($itemsFullyOrdered->count() < $totalUnclosed);

        if ($allClosed) {
            $detailStatus = 'Closing';
        } elseif ($isOutstanding) {
            $detailStatus = 'Outstanding';
        } elseif ($hasClosed && in_array($detailStatus, ['Approved', 'Approved 1', 'Approved 2'])) {
            $detailStatus = 'Partial Closing';
        }

        $poNumbers = $pr->items->flatMap(function ($it) {
            return $it->orderItems ? $it->orderItems->map(fn ($oi) => $oi->purchaseOrder?->po_number) : collect();
        })->filter()->unique()->values();
        $poNumberStr = $poNumbers->isNotEmpty() ? $poNumbers->join(', ') : '—';

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
            'deptRequest' => $pr->department?->name ?? 'General',
            '_rawDept' => $pr->department?->name ?? 'General',
            'section' => $pr->section?->name ?? 'General',
            'remark' => $firstItem?->note ?? $firstItem?->remark ?? 'PP Sby Pengadaan Material',
            '_rawRemark' => $firstItem?->note ?? $firstItem?->remark ?? 'PP Sby Pengadaan Material',
            'note' => $firstItem?->note ?? $firstItem?->remark ?? '',
            'attachment_file' => $pr->attachment_file ? basename($pr->attachment_file) : null,
            'attachment_url' => $pr->attachment_file ? (str_starts_with($pr->attachment_file, 'http') ? $pr->attachment_file : url('storage/'.$pr->attachment_file)) : null,
            'createdBy' => "{$creatorName} {$createdTime}",
            '_rawCreatedBy' => "{$creatorName} {$createdTime}",
            '_rawLastUpdated' => "{$creatorName} {$createdTime}",
            '_rawPr' => $pr->pr_number,
            'totalQuantity' => number_format((float) $pr->items->sum('quantity'), 4).' '.($firstItem?->item?->unitOfMeasurement?->name ?? 'PCE'),
            '_totalQty' => number_format((float) $pr->items->sum('quantity'), 4).' '.($firstItem?->item?->unitOfMeasurement?->name ?? 'PCE'),
            'items' => $lineItems,
            '_items' => $lineItems,
            'approvals' => $pr->approvals->map(fn ($a) => [
                'tier' => (int) $a->approval_ke,
                'status' => $a->status === 1 ? 'Approved' : 'Pending',
                'user' => $a->user?->name ?? 'System',
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
                $userName = $h->user?->name ?? ($meta['actor_name'] ?? 'System');
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
            ['user' => $creatorName, 'activity' => 'Transaction Created', 'logTime' => "{$createdTime} pm", 'badgeTone' => 'green'],
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
        $userId = $request->user()?->id ?? 1;

        // Resolve Department ID
        $deptInput = $request->input('departments_id') ?? $request->input('department') ?? $request->input('deptRequest');
        $deptId = null;
        if (is_numeric($deptInput) && Department::where('id', $deptInput)->exists()) {
            $deptId = (int) $deptInput;
        } elseif (! empty($deptInput)) {
            $dept = Department::where('name', $deptInput)
                ->orWhere('name', 'like', "%{$deptInput}%")
                ->first();
            if (! $dept) {
                $dept = Department::firstOrCreate(['name' => trim($deptInput)], ['status' => 1]);
            }
            $deptId = $dept?->id;
        }
        if (! $deptId) {
            $deptId = Department::first()?->id ?? 1;
        }

        // Resolve Section ID
        $secInput = $request->input('sections_id') ?? $request->input('section');
        $secId = null;
        if (is_numeric($secInput) && Section::where('id', $secInput)->exists()) {
            $secId = (int) $secInput;
        } elseif (! empty($secInput)) {
            $sec = Section::where('name', $secInput)
                ->orWhere('name', 'like', "%{$secInput}%")
                ->first();
            if (! $sec) {
                $sec = Section::firstOrCreate(['name' => trim($secInput)], ['status' => 1]);
            }
            $secId = $sec?->id;
        }
        if (! $secId) {
            $secId = Section::first()?->id ?? 1;
        }

        // Resolve Line Items
        $rawItems = $request->input('items', []);
        if (empty($rawItems)) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => ['items' => ['At least one item is required.']],
            ], 422);
        }

        $firstDbItem = Item::first();
        $fallbackItemId = $firstDbItem?->id ?? 1;

        // Resolve Document Dates & Number
        $prNumber = $request->input('pr_number') ?? DocumentNumberGenerator::generatePrNumber();
        $date = $this->safeToDatabaseDate($request->input('date'), now()->format('Y-m-d'));
        $dueDate = $this->safeToDatabaseDate($request->input('due_date'), now()->addDays(14)->format('Y-m-d'));

        // Handle Attachment File Upload or Path
        $attachmentPath = null;
        if ($request->hasFile('attachment_file') || $request->hasFile('attachment')) {
            $file = $request->file('attachment_file') ?? $request->file('attachment');
            $filename = time().'_'.preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
            $attachmentPath = $file->storeAs('attachments/pr', $filename, 'public');
        } elseif ($request->filled('attachment_file') && is_string($request->input('attachment_file'))) {
            $attachmentPath = $request->input('attachment_file');
        }

        $prGeneralNote = $request->input('note') ?? $request->input('purpose') ?? '';

        $processedItems = [];
        foreach ($rawItems as $idx => $it) {
            $itemId = null;
            if (! empty($it['items_id']) && is_numeric($it['items_id']) && Item::where('id', $it['items_id'])->exists()) {
                $itemId = (int) $it['items_id'];
            } elseif (! empty($it['itemCode']) || ! empty($it['code']) || ! empty($it['item_code'])) {
                $code = $it['itemCode'] ?? $it['code'] ?? $it['item_code'];
                $found = Item::where('code', $code)->first();
                $itemId = $found?->id;
            } elseif (! empty($it['itemName']) || ! empty($it['name']) || ! empty($it['item_name'])) {
                $name = $it['itemName'] ?? $it['name'] ?? $it['item_name'];
                $found = Item::where('name', $name)->orWhere('name', 'like', "%{$name}%")->first();
                $itemId = $found?->id;
            }

            // Resolve requested unit & facility dynamically
            $reqUnit = $it['unit'] ?? null;
            $unitId = null;
            if (! empty($reqUnit)) {
                $uom = UnitOfMeasurement::where('name', $reqUnit)->first();
                if (! $uom) {
                    $uom = UnitOfMeasurement::firstOrCreate(['name' => trim($reqUnit)], ['status' => 1]);
                }
                $unitId = $uom?->id;
            }

            $reqFac = $it['facility'] ?? null;
            $facId = null;
            if (! empty($reqFac)) {
                $facUpper = strtoupper(trim($reqFac));
                $targetName = str_contains($facUpper, 'NON') ? 'NON FASILITAS' : 'FASILITAS';
                $fac = Facility::firstOrCreate(['name' => $targetName], ['status' => 1]);
                $facId = $fac->id;
            }

            if (! $itemId && (! empty($it['itemName']) || ! empty($it['name']) || ! empty($it['itemCode']))) {
                $name = $it['itemName'] ?? $it['name'] ?? ('Item '.($it['itemCode'] ?? ''));
                $code = $it['itemCode'] ?? $it['code'] ?? ('ITM-'.strtoupper(\Illuminate\Support\Str::random(6)));
                $newItem = Item::firstOrCreate(
                    ['code' => $code],
                    [
                        'name' => $name,
                        'classifications_id' => $firstDbItem?->classifications_id ?? 1,
                        'facilities_id' => $facId ?? $firstDbItem?->facilities_id ?? 1,
                        'item_types_id' => $firstDbItem?->item_types_id ?? 1,
                        'categories_id' => $firstDbItem?->categories_id ?? 1,
                        'units_of_measurements_id' => $unitId ?? $firstDbItem?->units_of_measurements_id ?? 1,
                        'status' => 1,
                        'stock' => 100,
                    ]
                );
                $itemId = $newItem->id;
            } elseif ($itemId) {
                $itemModel = Item::find($itemId);
                if ($itemModel) {
                    $itemUpdates = [];
                    if ($unitId && $itemModel->units_of_measurements_id !== $unitId) {
                        $itemUpdates['units_of_measurements_id'] = $unitId;
                    }
                    if ($facId && $itemModel->facilities_id !== $facId) {
                        $itemUpdates['facilities_id'] = $facId;
                    }
                    if (! empty($itemUpdates)) {
                        $itemModel->update($itemUpdates);
                    }
                }
            }

            if (! $itemId) {
                $itemId = $fallbackItemId;
            }

            $itemRemark = $it['remark'] ?? $prGeneralNote ?? 'Purchase Requisition Item';
            $processedItems[] = [
                'items_id' => $itemId,
                'quantity' => (float) ($it['quantity'] ?? 1),
                'due_date' => $this->safeToDatabaseDate($it['dueDate'] ?? $it['due_date'] ?? null, $dueDate),
                'remark' => $itemRemark,
                'note' => $prGeneralNote ?: $itemRemark,
            ];
        }

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

        return response()->json([
            'status' => 'success',
            'message' => 'Purchase Requisition created successfully',
            'data' => $pr->load(['department', 'section', 'items.item']),
        ], 201);
    }

    /**
     * Approve Purchase Requisition.
     */
    public function approve(Request $request, $id)
    {
        $userId = $request->user()?->id ?? 1;
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
        $userId = $request->user()?->id ?? 1;
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
        $userId = $request->user()?->id ?? (int) ($request->header('X-User-Id') ?? 1);
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
                'actor_name' => $user?->name ?? 'User',
                'actor_role' => $user?->role ?? 'Procurement',
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
                'closed_by' => $user?->name ?? 'User',
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
        $userId = $request->user()?->id ?? (int) ($request->header('X-User-Id') ?? 1);
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
                'actor_name' => $user?->name ?? 'User',
                'actor_role' => $user?->role ?? 'Procurement',
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
