<?php

namespace App\Http\Controllers\Api\Procurement;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\Section;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
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

            $lineItems = $pr->items->map(function ($it, $itIdx) use ($pr) {
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
                    'unit' => $it->item?->unitOfMeasurement?->name ?? 'PCE',
                    'remark' => $it->remark ?? $it->note ?? 'PP Sby Kebutuhan Operasional',
                    'dueDate' => $this->safeFormatDate($it->due_date),
                ];
            })->toArray();

            return [
                'id' => $pr->id,
                '_id' => "pr-{$pr->id}",
                '_type' => 'pr',
                '_rawNumber' => $pr->pr_number,
                '_rawStatus' => $status,
                '_rawDate' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
                '_rawDueDate' => $this->safeFormatDate($pr->due_date),
                '_rawDept' => $pr->department?->name ?? 'General',
                '_rawRemark' => $firstItem?->remark ?? 'PP Sby Pengadaan Material',
                '_rawCreatedBy' => "{$creatorName} {$createdTime}",
                '_rawLastUpdated' => "{$creatorName} {$createdTime}",
                '_rawPr' => $pr->pr_number,
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
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $code);

        $pr = PurchaseRequisition::with([
            'department',
            'section',
            'creatorUser',
            'items.item.unitOfMeasurement',
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
                'unit' => $it->item?->unitOfMeasurement?->name ?? 'PCE',
                'remark' => $it->remark ?? $it->note ?? 'PP Sby Kebutuhan Operasional',
                'dueDate' => $this->safeFormatDate($it->due_date),
            ];
        })->toArray();

        $detailRow = [
            'id' => $pr->id,
            '_id' => "pr-{$pr->id}",
            '_type' => 'pr',
            'prNumber' => $pr->pr_number,
            '_rawNumber' => $pr->pr_number,
            'status' => $pr->status ?? 'Waiting for Approve 1',
            '_rawStatus' => $pr->status ?? 'Waiting for Approve 1',
            'date' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
            '_rawDate' => $this->safeFormatDate($pr->date, 'd-M-Y', $pr->created_at?->format('d-M-Y') ?? '-'),
            'dueDate' => $this->safeFormatDate($pr->due_date),
            '_rawDueDate' => $this->safeFormatDate($pr->due_date),
            'deptRequest' => $pr->department?->name ?? 'General',
            '_rawDept' => $pr->department?->name ?? 'General',
            'section' => $pr->section?->name ?? 'General',
            'remark' => $firstItem?->remark ?? 'PP Sby Pengadaan Material',
            '_rawRemark' => $firstItem?->remark ?? 'PP Sby Pengadaan Material',
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

            if (! $itemId && (! empty($it['itemName']) || ! empty($it['name']) || ! empty($it['itemCode']))) {
                $name = $it['itemName'] ?? $it['name'] ?? ('Item '.($it['itemCode'] ?? ''));
                $code = $it['itemCode'] ?? $it['code'] ?? ('ITM-'.strtoupper(\Illuminate\Support\Str::random(6)));
                $newItem = Item::firstOrCreate(
                    ['code' => $code],
                    [
                        'name' => $name,
                        'classifications_id' => $firstDbItem?->classifications_id ?? 1,
                        'facilities_id' => $firstDbItem?->facilities_id ?? 1,
                        'item_types_id' => $firstDbItem?->item_types_id ?? 1,
                        'categories_id' => $firstDbItem?->categories_id ?? 1,
                        'units_of_measurements_id' => $firstDbItem?->units_of_measurements_id ?? 1,
                        'status' => 1,
                        'stock' => 100,
                    ]
                );
                $itemId = $newItem->id;
            }

            if (! $itemId) {
                $itemId = $fallbackItemId;
            }

            $processedItems[] = [
                'items_id' => $itemId,
                'quantity' => (float) ($it['quantity'] ?? 1),
                'due_date' => $this->safeToDatabaseDate($it['dueDate'] ?? $it['due_date'] ?? null, $dueDate),
                'remark' => $it['remark'] ?? $it['note'] ?? 'Purchase Requisition Item',
            ];
        }

        $pr = GeniusOneBackend::pr()->createPr(
            [
                'pr_number' => $prNumber,
                'departments_id' => $deptId,
                'sections_id' => $secId,
                'date' => $date,
                'due_date' => $dueDate,
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
