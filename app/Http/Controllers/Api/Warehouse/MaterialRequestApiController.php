<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\JobNumber;
use App\Models\System\Governance\ApprovalHistory;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\RequestMaterial\ApprovalRm;
use App\Models\Warehouse\RequestMaterial\DestinationLocation;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Models\Warehouse\RequestMaterial\RequestMaterialItem;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use App\Services\AuditLogger;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MaterialRequestApiController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * List Request Materials exclusively from MySQL database.
     */
    public function index(Request $request): JsonResponse
    {
        $query = RequestMaterial::query()
            ->with([
                'department',
                'warehouse',
                'typeOfRequest',
                'destinationLocation',
                'jobNumberModel',
                'items.item.unit',
                'items.item.jobNumber',
                'approvals.user',
                'creatorUser',
                'updatedByUser',
            ])
            ->orderByDesc('id');

        $search = strtolower(trim((string) $request->query('search', '')));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%")
                    ->orWhere('customer', 'like', "%{$search}%")
                    ->orWhere('job_number', 'like', "%{$search}%")
                    ->orWhereHas('department', fn ($dq) => $dq->where('name', 'like', "%{$search}%"));
            });
        }

        $department = trim((string) $request->query('department', ''));
        if ($department !== '' && $department !== 'All Departments' && strtolower($department) !== 'all') {
            $query->whereHas('department', fn ($q) => $q->where('name', $department));
        }

        $approval = trim((string) $request->query('approval', $request->query('status', '')));
        if ($approval !== '' && strtolower($approval) !== 'all') {
            $query->where('status', $approval);
        }

        $stockByItem = $this->getItemStockTotals();
        $records = $query->get();

        $formatted = $records->map(function (RequestMaterial $r, int $idx) use ($stockByItem) {
            return $this->formatDatabaseRecord($r, $idx + 1, $stockByItem);
        });

        return response()->json([
            'status' => 'success',
            'data' => $formatted,
            'meta' => [
                'total' => $formatted->count(),
            ],
        ]);
    }

    /**
     * Store a new Request Material in MySQL database.
     */
    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'requestDate' => 'nullable|string',
            'request_date' => 'nullable|string',
            'departments_id' => 'nullable|integer|exists:departments,id',
            'department' => 'nullable|string',
            'warehouses_id' => 'nullable|integer|exists:warehouses,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'warehouse' => 'nullable|string',
            'type_of_request_id' => 'nullable|integer|exists:type_of_request,id',
            'typeOfRequest' => 'nullable|string',
            'destination_location_id' => 'nullable|integer|exists:destination_location,id',
            'destinationLocation' => 'nullable|string',
            'job_number_id' => 'nullable|integer|exists:job_number,id',
            'jobNumber' => 'nullable|string',
            'job_number' => 'nullable|string',
            'customer' => 'nullable|string|max:255',
            'projectType' => 'nullable|string|max:100',
            'project_type' => 'nullable|string|max:100',
            'is_internal_warehouse' => 'nullable|boolean',
            'is_specific_station' => 'nullable|boolean',
            'requestNote' => 'nullable|string',
            'note' => 'nullable|string',
            'status' => 'nullable|string|max:45',
            'items' => 'required|array|min:1',
        ]);

        $dept = ! empty($validated['departments_id'])
            ? Department::find($validated['departments_id'])
            : (! empty($validated['department']) ? Department::where('name', $validated['department'])->first() : null);

        $type = ! empty($validated['type_of_request_id'])
            ? TypeOfRequest::find($validated['type_of_request_id'])
            : (! empty($validated['typeOfRequest']) ? TypeOfRequest::where('name', $validated['typeOfRequest'])->first() : null);

        $dest = ! empty($validated['destination_location_id'])
            ? DestinationLocation::find($validated['destination_location_id'])
            : (! empty($validated['destinationLocation']) ? DestinationLocation::where('name', $validated['destinationLocation'])->first() : null);

        $whId = $validated['warehouses_id'] ?? $validated['warehouse_id'] ?? null;
        $wh = $whId
            ? Warehouse::find($whId)
            : (! empty($validated['warehouse']) ? Warehouse::where('name', $validated['warehouse'])->first() : Warehouse::first());

        $jobNumberInput = $validated['jobNumber'] ?? $validated['job_number'] ?? null;
        $jobModel = ! empty($validated['job_number_id'])
            ? JobNumber::find($validated['job_number_id'])
            : (! empty($jobNumberInput) ? JobNumber::where('name', $jobNumberInput)->first() : null);

        if (! $dept || ! $type) {
            return response()->json([
                'status' => 'error',
                'message' => 'Department and Type of Request must reference valid master records.',
            ], 422);
        }

        $record = DB::transaction(function () use ($request, $validated, $actorId, $dept, $type, $dest, $wh, $jobModel, $jobNumberInput) {
            $seq = RequestMaterial::withTrashed()->count() + 1;
            do {
                $requestCode = 'REQ-WH-' . date('Y') . '-' . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
                $seq++;
            } while (RequestMaterial::withTrashed()->where('request_number', $requestCode)->exists());

            $requestDate = $validated['requestDate'] ?? $validated['request_date'] ?? date('Y-m-d H:i:s');
            $initialStatus = $validated['status'] ?? 'Waiting for Approve 1';

            $reqMaterial = RequestMaterial::create([
                'request_number' => $requestCode,
                'departments_id' => $dept->id,
                'warehouses_id' => $wh?->id,
                'type_of_request_id' => $type->id,
                'destination_location_id' => $dest?->id,
                'job_number_id' => $jobModel?->id,
                'job_number' => $jobModel?->name ?? $jobNumberInput,
                'customer' => $validated['customer'] ?? null,
                'project_type' => $validated['projectType'] ?? $validated['project_type'] ?? null,
                'is_internal_warehouse' => (bool) ($validated['is_internal_warehouse'] ?? false),
                'is_specific_station' => (bool) ($validated['is_specific_station'] ?? false),
                'creator' => $actorId,
                'updated_by' => $actorId,
                'request_date' => $requestDate,
                'note' => $validated['requestNote'] ?? $validated['note'] ?? '',
                'revision' => 0,
                'status' => $initialStatus,
            ]);

            foreach ($request->input('items', []) as $it) {
                $itemId = $it['items_id'] ?? $it['itemId'] ?? null;
                $itemCode = $it['itemCode'] ?? $it['item_code'] ?? '';

                $item = $itemId
                    ? Item::find($itemId)
                    : (! empty($itemCode) ? Item::where('code', $itemCode)->first() : null);

                if (! $item) {
                    throw new \InvalidArgumentException("Invalid or unknown item specified ('{$itemCode}').");
                }

                RequestMaterialItem::updateOrCreate(
                    [
                        'items_id' => $item->id,
                        'request_material_id' => $reqMaterial->id,
                    ],
                    [
                        'request' => (float) ($it['requestQty'] ?? $it['request_qty'] ?? $it['quantity'] ?? 1),
                        'remark' => $it['remark'] ?? '',
                    ]
                );
            }

            ApprovalRm::create([
                'request_material_id' => $reqMaterial->id,
                'users_id' => $actorId,
                'approval_ke' => '1',
                'status' => 0,
                'note' => 'Initial requisition submitted',
            ]);

            AuditLogger::logAction(
                action: 'CREATED_REQUEST_MATERIAL',
                modelName: 'RequestMaterial',
                modelId: $reqMaterial->id,
                before: null,
                after: ['request_number' => $reqMaterial->request_number],
                userId: $actorId,
                notes: "Created Material Request {$reqMaterial->request_number}"
            );

            return $reqMaterial;
        });

        $record = $this->findRecord((string) $record->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Material request created successfully.',
            'data' => $this->formatDatabaseRecord($record, 1, $this->getItemStockTotals()),
        ], 201);
    }

    /**
     * Show single Material Request details.
     */
    public function show(string $id): JsonResponse
    {
        $r = $this->findRecord($id);
        if (! $r) {
            return response()->json([
                'status' => 'error',
                'message' => "Material request with ID '{$id}' not found.",
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->formatDatabaseRecord($r, 1, $this->getItemStockTotals()),
        ]);
    }

    /**
     * Update non-approved Material Request in MySQL database.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $r = $this->findRecord($id);

        if (! $r) {
            return response()->json(['status' => 'error', 'message' => 'Material request not found.'], 404);
        }

        if (in_array($r->status, ['Approved', 'Approved 2'], true)) {
            return response()->json(['status' => 'error', 'message' => 'Approved material requests cannot be modified.'], 422);
        }

        DB::transaction(function () use ($request, $r, $actorId) {
            $dept = $request->filled('departments_id')
                ? Department::find($request->input('departments_id'))
                : ($request->filled('department') ? Department::where('name', $request->input('department'))->first() : null);

            $type = $request->filled('type_of_request_id')
                ? TypeOfRequest::find($request->input('type_of_request_id'))
                : ($request->filled('typeOfRequest') ? TypeOfRequest::where('name', $request->input('typeOfRequest'))->first() : null);

            $dest = $request->filled('destination_location_id')
                ? DestinationLocation::find($request->input('destination_location_id'))
                : ($request->filled('destinationLocation') ? DestinationLocation::where('name', $request->input('destinationLocation'))->first() : null);

            $wh = $request->filled('warehouses_id')
                ? Warehouse::find($request->input('warehouses_id'))
                : ($request->filled('warehouse') ? Warehouse::where('name', $request->input('warehouse'))->first() : null);

            $jobStr = $request->input('jobNumber', $request->input('job_number'));
            $jobModel = $request->filled('job_number_id')
                ? JobNumber::find($request->input('job_number_id'))
                : (! empty($jobStr) ? JobNumber::where('name', $jobStr)->first() : null);

            $r->update([
                'departments_id' => $dept?->id ?? $r->departments_id,
                'warehouses_id' => $wh?->id ?? $r->warehouses_id,
                'type_of_request_id' => $type?->id ?? $r->type_of_request_id,
                'destination_location_id' => $dest?->id ?? $r->destination_location_id,
                'job_number_id' => $jobModel?->id ?? $r->job_number_id,
                'job_number' => $jobModel?->name ?? $jobStr ?? $r->job_number,
                'customer' => $request->has('customer') ? $request->input('customer') : $r->customer,
                'project_type' => $request->input('projectType', $request->input('project_type', $r->project_type)),
                'is_internal_warehouse' => $request->has('is_internal_warehouse') ? (bool) $request->input('is_internal_warehouse') : $r->is_internal_warehouse,
                'is_specific_station' => $request->has('is_specific_station') ? (bool) $request->input('is_specific_station') : $r->is_specific_station,
                'request_date' => $request->input('requestDate', $request->input('request_date', $r->request_date)),
                'note' => $request->input('requestNote', $request->input('note', $r->note)),
                'updated_by' => $actorId,
            ]);

            if ($request->has('items') && is_array($request->input('items'))) {
                RequestMaterialItem::where('request_material_id', $r->id)->delete();
                foreach ($request->input('items') as $it) {
                    $itemId = $it['items_id'] ?? $it['itemId'] ?? null;
                    $itemCode = $it['itemCode'] ?? $it['item_code'] ?? '';
                    $item = $itemId
                        ? Item::find($itemId)
                        : (! empty($itemCode) ? Item::where('code', $itemCode)->first() : null);
                    if (! $item) {
                        throw new \InvalidArgumentException("Invalid or unknown item specified ('{$itemCode}').");
                    }
                    RequestMaterialItem::create([
                        'request_material_id' => $r->id,
                        'items_id' => $item->id,
                        'request' => (float) ($it['requestQty'] ?? $it['request_qty'] ?? $it['quantity'] ?? 1),
                        'remark' => $it['remark'] ?? '',
                    ]);
                }
            }
        });

        $updated = $this->findRecord((string) $r->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Material request updated successfully.',
            'data' => $this->formatDatabaseRecord($updated, 1, $this->getItemStockTotals()),
        ]);
    }

    /**
     * Delete non-approved Material Request.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $r = $this->findRecord($id);

        if (! $r) {
            return response()->json(['status' => 'error', 'message' => 'Material request not found.'], 404);
        }

        if (in_array($r->status, ['Approved', 'Approved 2'], true)) {
            return response()->json(['status' => 'error', 'message' => 'Approved material requests cannot be deleted.'], 422);
        }

        DB::transaction(function () use ($r, $actorId) {
            RequestMaterialItem::where('request_material_id', $r->id)->delete();
            ApprovalRm::where('request_material_id', $r->id)->delete();
            $reqNum = $r->request_number;
            $r->delete();

            AuditLogger::logAction(
                action: 'DELETED_REQUEST_MATERIAL',
                modelName: 'RequestMaterial',
                modelId: $r->id,
                before: ['request_number' => $reqNum],
                after: null,
                userId: $actorId,
                notes: "Deleted Material Request {$reqNum}"
            );
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Material request deleted successfully.',
        ]);
    }

    /**
     * Approve Material Request (Waiting for Approve 1 / Draft -> Waiting for Approve 2 -> Approved).
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $r = $this->findRecord($id);

        if (! $r) {
            return response()->json([
                'status' => 'error',
                'message' => 'Record not found to approve.',
            ], 404);
        }

        if (in_array($r->status, ['Approved', 'Approved 2'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Material request is already fully Approved.',
            ], 422);
        }

        DB::transaction(function () use ($r, $actorId, $request) {
            $previousStatus = $r->status;
            $tier = (int) $request->input('tier', 0);

            if (in_array($r->status, ['Draft', 'Waiting for Approve 1'], true) && $tier !== 2) {
                $newStatus = 'Waiting for Approve 2';
                $approvedTier = 1;
            } else {
                $newStatus = 'Approved';
                $approvedTier = 2;
            }

            $r->update([
                'status' => $newStatus,
                'updated_by' => $actorId,
            ]);

            ApprovalRm::updateOrCreate(
                ['request_material_id' => $r->id, 'users_id' => $actorId],
                ['approval_ke' => (string) $approvedTier, 'status' => 1, 'note' => $request->input('note')]
            );

            ApprovalHistory::create([
                'document_type' => 'RM',
                'document_id' => $r->id,
                'document_number' => $r->request_number,
                'action' => $approvedTier === 2 ? 'APPROVE_2' : 'APPROVE_1',
                'tier' => $approvedTier,
                'user_id' => $actorId,
                'note' => $request->input('note'),
                'from_status' => $previousStatus,
                'to_status' => $newStatus,
            ]);

            if ($newStatus === 'Approved') {
                foreach ($r->items as $rmItem) {
                    $qty = (float) ($rmItem->request ?? 0);
                    if ($qty > 0 && ($targetItem = $rmItem->item ?? Item::find($rmItem->items_id))) {
                        $this->inventoryService->recordStockMovement(
                            item: $targetItem,
                            warehouseId: $r->warehouses_id,
                            movementType: 'OUT',
                            quantity: $qty,
                            referenceType: 'RM',
                            referenceNumber: $r->request_number,
                            userId: $actorId,
                            notes: "Material Issued via RM Approval: {$r->request_number}"
                        );
                    }
                }
            }
        });

        $fresh = $this->findRecord((string) $r->id);

        return response()->json([
            'status' => 'success',
            'message' => "Material request approved to '{$fresh->status}'.",
            'data' => $this->formatDatabaseRecord($fresh, 1, $this->getItemStockTotals()),
        ]);
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $r = $this->findRecord($id);
        if (! $r) {
            return response()->json(['status' => 'error', 'message' => 'Record not found.'], 404);
        }

        if (in_array($r->status, ['Approved', 'Approved 2'], true)) {
            return response()->json(['status' => 'error', 'message' => 'Approved material requests cannot be rejected.'], 422);
        }

        $previousStatus = $r->status;
        $note = (string) $request->input('note', '');
        $r->update([
            'status' => 'Rejected',
            'rejection_note' => $note,
            'updated_by' => $actorId,
        ]);

        ApprovalHistory::create([
            'document_type' => 'RM',
            'document_id' => $r->id,
            'document_number' => $r->request_number,
            'action' => 'REJECT',
            'tier' => 1,
            'user_id' => $actorId,
            'note' => $note,
            'from_status' => $previousStatus,
            'to_status' => 'Rejected',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Material request rejected.',
            'data' => $this->formatDatabaseRecord($this->findRecord((string) $r->id), 1, $this->getItemStockTotals()),
        ]);
    }

    private function findRecord(string $id): ?RequestMaterial
    {
        $relations = [
            'department',
            'warehouse',
            'typeOfRequest',
            'destinationLocation',
            'jobNumberModel',
            'items.item.unit',
            'items.item.jobNumber',
            'approvals.user',
            'creatorUser',
            'updatedByUser',
        ];

        return RequestMaterial::with($relations)
            ->where('request_number', $id)
            ->orWhere('id', is_numeric($id) ? (int) $id : 0)
            ->first();
    }

    private function getItemStockTotals(): array
    {
        return DB::table('warehouse_stocks')
            ->select('items_id', DB::raw('SUM(quantity) as total_qty'))
            ->groupBy('items_id')
            ->pluck('total_qty', 'items_id')
            ->toArray();
    }

    private function formatDatabaseRecord(RequestMaterial $r, int $no, array $stockByItem): array
    {
        $requestCode = $r->request_number;
        $jobNum = $r->jobNumberModel?->name ?? $r->job_number ?? '';

        $items = $r->items->map(function ($it, $idx) use ($requestCode, $jobNum, $stockByItem) {
            $item = $it->item;
            $stockQty = $item ? (float) ($stockByItem[$item->id] ?? $item->stock ?? 0) : 0.0;

            return [
                'id' => "{$requestCode}-ITM-" . ($idx + 1),
                'items_id' => $it->items_id,
                'itemCode' => $item?->code ?? '',
                'externalCode' => $item?->external_code ?? '-',
                'itemName' => $item?->name ?? '',
                'unit' => $item?->unit?->name ?? '',
                'jobNumber' => $item?->jobNumber?->name ?? $jobNum ?: '-',
                'size' => $item?->size ?: '-',
                'stockQty' => $stockQty,
                'pendingQty' => 0.0,
                'requestQty' => (float) $it->request,
                'remark' => $it->remark ?: '',
            ];
        })->values()->toArray();

        $appr1 = $r->approvals->where('approval_ke', '1')->where('status', 1)->first();
        $appr2 = $r->approvals->where('approval_ke', '2')->where('status', 1)->first();

        return [
            'id' => $requestCode,
            'rawId' => $r->id,
            'no' => $no,
            'requestCode' => $requestCode,
            'requestDate' => substr((string) $r->request_date, 0, 10),
            'warehouseId' => $r->warehouses_id,
            'warehouseName' => $r->warehouse?->name ?? '',
            'destinationLocationId' => $r->destination_location_id,
            'destinationLocation' => $r->destinationLocation?->name ?? '',
            'departmentId' => $r->departments_id,
            'department' => $r->department?->name ?? '',
            'typeOfRequestId' => $r->type_of_request_id,
            'typeOfRequest' => $r->typeOfRequest?->name ?? '',
            'jobNumberId' => $r->job_number_id,
            'jobNumber' => $jobNum ?: '-',
            'customer' => $r->customer ?? '-',
            'projectType' => $r->project_type ?? '',
            'isInternalWarehouse' => (bool) $r->is_internal_warehouse,
            'isSpecificStation' => (bool) $r->is_specific_station,
            'requestNote' => $r->note ?: '',
            'rejectionNote' => $r->rejection_note ?? '',
            'totalItems' => count($items),
            'approval' => $r->status ?: 'Waiting for Approve 1',
            'approved1At' => $appr1?->updated_at?->format('Y-m-d H:i:s'),
            'approved1By' => $appr1?->user?->name,
            'approved2At' => $appr2?->updated_at?->format('Y-m-d H:i:s'),
            'approved2By' => $appr2?->user?->name,
            'createdDate' => $r->created_at?->toIso8601String() ?? '',
            'lastUpdatedDate' => $r->updated_at?->toIso8601String() ?? '',
            'createdBy' => $r->creatorUser?->name ?? '',
            'updatedBy' => $r->updatedByUser?->name ?? '',
            'items' => $items,
        ];
    }
}
