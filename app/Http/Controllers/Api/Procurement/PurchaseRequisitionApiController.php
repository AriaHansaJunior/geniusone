<?php

namespace App\Http\Controllers\Api\Procurement;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\ViewModels\PurchaseRequisitionViewModel;
use App\Services\GeniusOneBackend;
use Carbon\Carbon;

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
            'approvals.user',
        ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('pr_number', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
                  ->orWhereHas('department', fn($dq) => $dq->where('name', 'like', "%{$s}%"));
            });
        }

        $records = $query->orderBy('id', 'desc')->get();

        // Calculate Summary Cards
        $totalCount = $records->count();
        $approvedCount = $records->filter(fn($r) => in_array($r->status, ['Approved 1', 'Approved 2', 'Completed']))->count();
        $draftCount = $records->filter(fn($r) => in_array($r->status, ['Draft', 'Ready']))->count();
        $totalItems = $records->sum(fn($r) => $r->items->count());
        $totalQuantity = $records->sum(fn($r) => $r->items->sum('quantity'));

        $stats = [
            ["Total PR Documents", (string) $totalCount, "Generated this month"],
            ["Approved PRs", (string) $approvedCount, "Ready for PO conversion"],
            ["Pending Approval", (string) ($totalCount - $approvedCount), "Draft & Pending"],
            ["Total Items Requested", number_format($totalQuantity, 2) . " Units", "Across {$totalItems} line items"],
        ];

        // Format rows for Frontend Table
        $rows = $records->values()->map(function ($pr, $idx) {
            $firstItem = $pr->items->first();
            $creatorName = $pr->creatorUser?->name ?? 'System';
            $createdTime = $pr->created_at ? $pr->created_at->format('d-m-Y H:i') : ($pr->date ?? '-');
            $status = $pr->status ?? 'Draft';

            $lineItems = $pr->items->map(function ($it, $itIdx) use ($pr) {
                return [
                    'no' => $itIdx + 1,
                    'prNumber' => $pr->pr_number,
                    'item' => $it->item?->name ?? 'Material Item',
                    'itemCode' => $it->item?->code ?? '-',
                    'itemAlias' => '—',
                    'quantity' => number_format((float) $it->quantity, 4) . ' ' . ($it->item?->unitOfMeasurement?->name ?? 'PCE'),
                    'unit' => $it->item?->unitOfMeasurement?->name ?? 'PCE',
                    'remark' => $it->remark ?? $it->note ?? 'PP Sby Kebutuhan Operasional',
                    'dueDate' => $it->due_date ? Carbon::parse($it->due_date)->format('d-M-Y') : '-',
                ];
            })->toArray();

            return [
                '_id' => "pr-{$pr->id}",
                '_type' => 'pr',
                '_rawNumber' => $pr->pr_number,
                '_rawStatus' => $status,
                '_rawDate' => $pr->date ? Carbon::parse($pr->date)->format('d-M-Y') : ($pr->created_at?->format('d-M-Y') ?? '-'),
                '_rawDueDate' => $pr->due_date ? Carbon::parse($pr->due_date)->format('d-M-Y') : '-',
                '_rawDept' => $pr->department?->name ?? 'General',
                '_rawRemark' => $firstItem?->remark ?? 'PP Sby Pengadaan Material',
                '_rawCreatedBy' => "{$creatorName} {$createdTime}",
                '_rawLastUpdated' => "{$creatorName} {$createdTime}",
                '_rawPr' => $pr->pr_number,
                '_totalQty' => number_format((float) $pr->items->sum('quantity'), 4) . ' ' . ($firstItem?->item?->unitOfMeasurement?->name ?? 'PCE'),
                '_items' => $lineItems,
                'no' => $idx + 1,
                'prNumber' => $pr->pr_number,
                'date' => $pr->date ? Carbon::parse($pr->date)->format('d-M-Y') : ($pr->created_at?->format('d-M-Y') ?? '-'),
                'dueDate' => $pr->due_date ? Carbon::parse($pr->due_date)->format('d-M-Y') : '-',
                'jobNumber' => '—',
                'deptRequest' => $pr->department?->name ?? 'General',
                'totalItem' => $pr->items->count(),
                'totalQuantity' => number_format((float) $pr->items->sum('quantity'), 4),
                'remark' => $firstItem?->remark ?? 'PP Sby Pengadaan Material',
                'status' => $status,
                'createdBy' => $creatorName,
                'lastUpdated' => $createdTime,
                'actions' => '',
                '_search' => "{$pr->pr_number} {$pr->department?->name} {$creatorName} {$status}",
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
        $pr = PurchaseRequisition::with([
            'department',
            'section',
            'creatorUser',
            'items.item.unitOfMeasurement',
            'approvals.user',
        ])
        ->where('pr_number', $rawCode)
        ->orWhere('pr_number', $code)
        ->orWhere('id', is_numeric($code) ? $code : null)
        ->first();

        if (!$pr) {
            $pr = PurchaseRequisition::with([
                'department',
                'section',
                'creatorUser',
                'items.item.unitOfMeasurement',
                'approvals.user',
            ])->first();
        }

        if (!$pr) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['error' => 'Purchase Requisition not found'], 404);
            }
            return redirect('/pr')->withErrors(['error' => 'Purchase Requisition not found']);
        }

        $creatorName = $pr->creatorUser?->name ?? 'System';
        $createdTime = $pr->created_at ? $pr->created_at->format('d-m-Y H:i') : ($pr->date ?? '-');
        $firstItem = $pr->items->first();

        $lineItems = $pr->items->map(function ($it, $itIdx) use ($pr) {
            return [
                'no' => $itIdx + 1,
                'prNumber' => $pr->pr_number,
                'item' => $it->item?->name ?? 'Material Item',
                'itemCode' => $it->item?->code ?? '-',
                'itemAlias' => '—',
                'quantity' => number_format((float) $it->quantity, 4) . ' ' . ($it->item?->unitOfMeasurement?->name ?? 'PCE'),
                'unit' => $it->item?->unitOfMeasurement?->name ?? 'PCE',
                'remark' => $it->remark ?? $it->note ?? 'PP Sby Kebutuhan Operasional',
                'dueDate' => $it->due_date ? Carbon::parse($it->due_date)->format('d-M-Y') : '-',
            ];
        })->toArray();

        $detailRow = [
            '_id' => "pr-{$pr->id}",
            '_type' => 'pr',
            '_rawNumber' => $pr->pr_number,
            '_rawStatus' => $pr->status ?? 'Draft',
            '_rawDate' => $pr->date ? Carbon::parse($pr->date)->format('d-M-Y') : ($pr->created_at?->format('d-M-Y') ?? '-'),
            '_rawDueDate' => $pr->due_date ? Carbon::parse($pr->due_date)->format('d-M-Y') : '-',
            '_rawDept' => $pr->department?->name ?? 'General',
            '_rawRemark' => $firstItem?->remark ?? 'PP Sby Pengadaan Material',
            '_rawCreatedBy' => "{$creatorName} {$createdTime}",
            '_rawLastUpdated' => "{$creatorName} {$createdTime}",
            '_rawPr' => $pr->pr_number,
            '_totalQty' => number_format((float) $pr->items->sum('quantity'), 4) . ' ' . ($firstItem?->item?->unitOfMeasurement?->name ?? 'PCE'),
            '_items' => $lineItems,
            'approvals' => $pr->approvals->map(fn($a) => [
                'tier' => (int) $a->approval_ke,
                'status' => $a->status === 1 ? 'Approved' : 'Pending',
                'user' => $a->user?->name ?? 'System',
                'date' => $a->updated_at?->format('d-M-Y H:i') ?? '-',
            ])->toArray(),
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
     * Store newly created Purchase Requisition.
     */
    public function store(Request $request)
    {
        $userId = $request->user()?->id ?? 1;

        // Resolve Department ID
        $deptInput = $request->input('departments_id') ?? $request->input('department') ?? $request->input('deptRequest');
        $deptId = null;
        if (is_numeric($deptInput) && \App\Models\Master\Organization\Department::where('id', $deptInput)->exists()) {
            $deptId = (int) $deptInput;
        } elseif (!empty($deptInput)) {
            $dept = \App\Models\Master\Organization\Department::where('name', 'like', "%{$deptInput}%")->first();
            $deptId = $dept?->id;
        }
        if (!$deptId) {
            $deptId = \App\Models\Master\Organization\Department::first()?->id ?? 1;
        }

        // Resolve Section ID
        $secInput = $request->input('sections_id') ?? $request->input('section');
        $secId = null;
        if (is_numeric($secInput) && \App\Models\Master\Organization\Section::where('id', $secInput)->exists()) {
            $secId = (int) $secInput;
        } elseif (!empty($secInput)) {
            $sec = \App\Models\Master\Organization\Section::where('name', 'like', "%{$secInput}%")->first();
            $secId = $sec?->id;
        }
        if (!$secId) {
            $secId = \App\Models\Master\Organization\Section::first()?->id ?? 1;
        }

        // Resolve Line Items
        $rawItems = $request->input('items', []);
        if (empty($rawItems)) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => ['items' => ['At least one item is required.']]
            ], 422);
        }

        $firstDbItem = \App\Models\Master\Material\Item::first();
        $fallbackItemId = $firstDbItem?->id ?? 1;

        $processedItems = [];
        foreach ($rawItems as $idx => $it) {
            $itemId = null;
            if (!empty($it['items_id']) && is_numeric($it['items_id']) && \App\Models\Master\Material\Item::where('id', $it['items_id'])->exists()) {
                $itemId = (int) $it['items_id'];
            } elseif (!empty($it['itemCode']) || !empty($it['code']) || !empty($it['item_code'])) {
                $code = $it['itemCode'] ?? $it['code'] ?? $it['item_code'];
                $found = \App\Models\Master\Material\Item::where('code', $code)->first();
                $itemId = $found?->id;
            } elseif (!empty($it['itemName']) || !empty($it['name']) || !empty($it['item_name'])) {
                $name = $it['itemName'] ?? $it['name'] ?? $it['item_name'];
                $found = \App\Models\Master\Material\Item::where('name', 'like', "%{$name}%")->first();
                $itemId = $found?->id;
            }

            if (!$itemId) {
                $itemId = $fallbackItemId;
            }

            $processedItems[] = [
                'items_id' => $itemId,
                'quantity' => (float) ($it['quantity'] ?? 1),
                'due_date' => $it['dueDate'] ?? $it['due_date'] ?? $request->input('due_date', now()->addDays(14)->format('Y-m-d')),
                'remark' => $it['remark'] ?? $it['note'] ?? 'Purchase Requisition Item',
            ];
        }

        $prNumber = $request->input('pr_number') ?? \App\Services\DocumentNumber\DocumentNumberGenerator::generatePrNumber();
        $date = $request->input('date') ?? now()->format('Y-m-d');
        $dueDate = $request->input('due_date') ?? now()->addDays(14)->format('Y-m-d');

        $pr = GeniusOneBackend::pr()->createPr(
            [
                'pr_number' => $prNumber,
                'departments_id' => $deptId,
                'sections_id' => $secId,
                'date' => $date,
                'due_date' => $dueDate,
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
    public function approve(Request $request, int $id)
    {
        $userId = $request->user()?->id ?? 1;
        $tier = (int) $request->input('tier', 1);
        $note = $request->input('note');

        $pr = GeniusOneBackend::procurement()->approvePr($id, $userId, $tier, $note);

        return response()->json([
            'message' => "Purchase Requisition Tier {$tier} approved successfully",
            'data' => $pr,
        ]);
    }

    /**
     * Reject Purchase Requisition.
     */
    public function reject(Request $request, int $id)
    {
        $userId = $request->user()?->id ?? 1;
        $tier = (int) $request->input('tier', 1);
        $reason = $request->input('reason', 'Rejected by approver');

        $pr = GeniusOneBackend::procurement()->rejectPr($id, $userId, $tier, $reason);

        return response()->json([
            'message' => "Purchase Requisition rejected successfully",
            'data' => $pr,
        ]);
    }
}
