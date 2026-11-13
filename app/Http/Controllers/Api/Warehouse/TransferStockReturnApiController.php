<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\System\Governance\ApprovalHistory;
use App\Models\Warehouse\Inventory\TransferStockReturn;
use App\Models\Warehouse\Inventory\TransferStockReturnItem;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Services\AuditLogger;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\Inventory\InventoryService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransferStockReturnApiController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = TransferStockReturn::with([
            'warehouse',
            'requestMaterial.destinationLocation',
            'requestMaterial.department',
            'jobNumberModel',
            'creatorUser',
            'updatedByUser',
            'items.item.unit',
        ])->orderByDesc('id');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('return_number', 'like', "%{$search}%")
                    ->orWhere('production_code', 'like', "%{$search}%")
                    ->orWhere('job_number', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%")
                    ->orWhereHas('warehouse', fn ($wq) => $wq->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('requestMaterial', fn ($rmq) => $rmq->where('request_number', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->query('status')) {
            if (strtolower($status) !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($warehouseId = $request->query('warehouse_id')) {
            if (is_numeric($warehouseId)) {
                $query->where('warehouses_id', (int) $warehouseId);
            }
        }

        if ($from = $request->query('date_from')) {
            $query->whereDate('return_date', '>=', $from);
        }

        if ($to = $request->query('date_to')) {
            $query->whereDate('return_date', '<=', $to);
        }

        $rows = $query->get()->map(fn (TransferStockReturn $row) => $this->transform($row));

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'warehouses_id' => 'required|integer|exists:warehouses,id',
            'request_material_id' => 'nullable|integer|exists:request_material,id',
            'production_code' => 'nullable|string|max:100',
            'job_number_id' => 'nullable|integer|exists:job_number,id',
            'job_number' => 'nullable|string|max:100',
            'return_date' => 'nullable|date',
            'note' => 'nullable|string',
            'status' => 'nullable|string|max:45',
            'items' => 'required|array|min:1',
            'items.*.items_id' => 'required|integer|exists:items,id',
            'items.*.quantity' => 'required|numeric|gt:0',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.source_location' => 'nullable|string|max:150',
            'items.*.destination_location' => 'nullable|string|max:150',
            'items.*.remark' => 'nullable|string|max:255',
        ]);

        $record = DB::transaction(function () use ($validated, $actorId) {
            $returnDate = ! empty($validated['return_date'])
                ? Carbon::parse($validated['return_date'])
                : now();

            $returnNumber = DocumentNumberGenerator::generateTransferReturnNumber($returnDate);

            $rm = ! empty($validated['request_material_id'])
                ? RequestMaterial::find($validated['request_material_id'])
                : null;

            $tsr = TransferStockReturn::create([
                'return_number' => $returnNumber,
                'production_code' => $validated['production_code'] ?? $rm?->request_number,
                'request_material_id' => $validated['request_material_id'] ?? null,
                'warehouses_id' => (int) $validated['warehouses_id'],
                'job_number_id' => $validated['job_number_id'] ?? $rm?->job_number_id,
                'job_number' => $validated['job_number'] ?? $rm?->job_number,
                'return_date' => $returnDate->format('Y-m-d'),
                'note' => $validated['note'] ?? null,
                'status' => $validated['status'] ?? 'Waiting for Approve 1',
                'creator_id' => $actorId,
                'updated_by' => $actorId,
            ]);

            foreach ($validated['items'] as $itemData) {
                $item = Item::with('unit')->find($itemData['items_id']);
                TransferStockReturnItem::create([
                    'transfer_stock_return_id' => $tsr->id,
                    'items_id' => (int) $itemData['items_id'],
                    'quantity' => (float) $itemData['quantity'],
                    'unit' => $itemData['unit'] ?? $item?->unit?->name ?? 'PCE',
                    'source_location' => $itemData['source_location'] ?? ($rm?->destinationLocation?->name ?? 'Production Floor'),
                    'destination_location' => $itemData['destination_location'] ?? $tsr->warehouse?->name,
                    'remark' => $itemData['remark'] ?? null,
                ]);
            }

            AuditLogger::logAction(
                action: 'CREATED_TRANSFER_STOCK_RETURN',
                modelName: 'TransferStockReturn',
                modelId: $tsr->id,
                before: null,
                after: ['return_number' => $tsr->return_number, 'items_count' => count($validated['items'])],
                userId: $actorId,
                notes: "Created Transfer Stock Return {$tsr->return_number}"
            );

            return $tsr->load([
                'warehouse',
                'requestMaterial.destinationLocation',
                'jobNumberModel',
                'creatorUser',
                'updatedByUser',
                'items.item.unit',
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Transfer Stock Return created successfully.',
            'data' => $this->transform($record),
        ], 201);
    }

    public function show(string $code): JsonResponse
    {
        $record = $this->findByCodeOrId($code);

        return response()->json([
            'status' => 'success',
            'data' => $this->transform($record),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $tsr = TransferStockReturn::findOrFail($id);

        if ($tsr->status === 'Approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'Approved Transfer Stock Return cannot be edited.',
            ], 422);
        }

        $validated = $request->validate([
            'warehouses_id' => 'sometimes|integer|exists:warehouses,id',
            'request_material_id' => 'nullable|integer|exists:request_material,id',
            'production_code' => 'nullable|string|max:100',
            'job_number_id' => 'nullable|integer|exists:job_number,id',
            'job_number' => 'nullable|string|max:100',
            'return_date' => 'nullable|date',
            'note' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.items_id' => 'required_with:items|integer|exists:items,id',
            'items.*.quantity' => 'required_with:items|numeric|gt:0',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.source_location' => 'nullable|string|max:150',
            'items.*.destination_location' => 'nullable|string|max:150',
            'items.*.remark' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($tsr, $validated, $actorId) {
            $tsr->update([
                'warehouses_id' => $validated['warehouses_id'] ?? $tsr->warehouses_id,
                'request_material_id' => array_key_exists('request_material_id', $validated) ? $validated['request_material_id'] : $tsr->request_material_id,
                'production_code' => array_key_exists('production_code', $validated) ? $validated['production_code'] : $tsr->production_code,
                'job_number_id' => array_key_exists('job_number_id', $validated) ? $validated['job_number_id'] : $tsr->job_number_id,
                'job_number' => array_key_exists('job_number', $validated) ? $validated['job_number'] : $tsr->job_number,
                'return_date' => ! empty($validated['return_date']) ? Carbon::parse($validated['return_date'])->format('Y-m-d') : $tsr->return_date,
                'note' => array_key_exists('note', $validated) ? $validated['note'] : $tsr->note,
                'updated_by' => $actorId,
            ]);

            if (! empty($validated['items'])) {
                $tsr->items()->delete();
                foreach ($validated['items'] as $itemData) {
                    $item = Item::with('unit')->find($itemData['items_id']);
                    TransferStockReturnItem::create([
                        'transfer_stock_return_id' => $tsr->id,
                        'items_id' => (int) $itemData['items_id'],
                        'quantity' => (float) $itemData['quantity'],
                        'unit' => $itemData['unit'] ?? $item?->unit?->name ?? 'PCE',
                        'source_location' => $itemData['source_location'] ?? 'Production Floor',
                        'destination_location' => $itemData['destination_location'] ?? $tsr->warehouse?->name,
                        'remark' => $itemData['remark'] ?? null,
                    ]);
                }
            }
        });

        $tsr = $this->findByCodeOrId((string) $tsr->id);

        return response()->json([
            'status' => 'success',
            'message' => 'Transfer Stock Return updated successfully.',
            'data' => $this->transform($tsr),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $tsr = TransferStockReturn::findOrFail($id);

        if ($tsr->status === 'Approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'Approved Transfer Stock Return cannot be deleted.',
            ], 422);
        }

        DB::transaction(function () use ($tsr, $actorId) {
            $num = $tsr->return_number;
            $tsr->items()->delete();
            $tsr->delete();
            AuditLogger::logAction(
                action: 'DELETED_TRANSFER_STOCK_RETURN',
                modelName: 'TransferStockReturn',
                modelId: $tsr->id,
                before: ['return_number' => $num],
                after: null,
                userId: $actorId,
                notes: "Deleted Transfer Stock Return {$num}"
            );
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Transfer Stock Return deleted successfully.',
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $tsr = TransferStockReturn::with(['items.item', 'warehouse'])->findOrFail($id);

        $tier = (int) $request->input('tier', 0);
        $note = $request->input('note');

        if ($tsr->status === 'Approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'Transfer Stock Return is already Approved.',
            ], 422);
        }

        DB::transaction(function () use ($tsr, $actorId, $tier, $note) {
            $previousStatus = $tsr->status;

            if ($previousStatus === 'Waiting for Approve 1' && $tier === 1) {
                $newStatus = 'Waiting for Approve 2';
            } else {
                $newStatus = 'Approved';
            }

            $tsr->update([
                'status' => $newStatus,
                'updated_by' => $actorId,
            ]);

            if ($newStatus === 'Approved') {
                foreach ($tsr->items as $line) {
                    if ($line->item) {
                        $this->inventoryService->recordStockMovement(
                            item: $line->item,
                            warehouseId: $tsr->warehouses_id,
                            movementType: 'IN',
                            quantity: (float) $line->quantity,
                            referenceType: 'TRANSFER_STOCK_RETURN',
                            referenceNumber: $tsr->return_number,
                            userId: $actorId,
                            notes: "Transfer Stock Return Receipt ({$tsr->return_number})"
                        );
                    }
                }
            }

            ApprovalHistory::create([
                'document_type' => 'TRANSFER_STOCK_RETURN',
                'document_id' => $tsr->id,
                'document_number' => $tsr->return_number,
                'action' => $newStatus === 'Approved' ? 'APPROVE_2' : 'APPROVE_1',
                'tier' => $newStatus === 'Approved' ? 2 : 1,
                'user_id' => $actorId,
                'note' => $note,
                'from_status' => $previousStatus,
                'to_status' => $newStatus,
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => "Transfer Stock Return {$tsr->return_number} updated to '{$tsr->status}'.",
            'data' => $this->transform($this->findByCodeOrId((string) $tsr->id)),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $tsr = TransferStockReturn::findOrFail($id);
        $note = (string) $request->input('note', '');

        if ($tsr->status === 'Approved') {
            return response()->json([
                'status' => 'error',
                'message' => 'Approved Transfer Stock Return cannot be rejected.',
            ], 422);
        }

        $previous = $tsr->status;
        $tsr->update([
            'status' => 'Rejected',
            'note' => $note ?: $tsr->note,
            'updated_by' => $actorId,
        ]);

        ApprovalHistory::create([
            'document_type' => 'TRANSFER_STOCK_RETURN',
            'document_id' => $tsr->id,
            'document_number' => $tsr->return_number,
            'action' => 'REJECT',
            'tier' => 1,
            'user_id' => $actorId,
            'note' => $note,
            'from_status' => $previous,
            'to_status' => 'Rejected',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Transfer Stock Return {$tsr->return_number} rejected.",
            'data' => $this->transform($this->findByCodeOrId((string) $tsr->id)),
        ]);
    }

    /**
     * Source items available for return from Approved Request Materials.
     * GET /api/warehouse/transfer-stock-returns/available-sources
     */
    public function availableSourceItems(Request $request): JsonResponse
    {
        $rmList = RequestMaterial::with(['items.item.unit', 'warehouse', 'destinationLocation', 'department', 'jobNumberModel'])
            ->where('status', 'Approved')
            ->orderByDesc('id')
            ->get();

        $alreadyReturned = DB::table('transfer_stock_return_items as tsri')
            ->join('transfer_stock_returns as tsr', 'tsri.transfer_stock_return_id', '=', 'tsr.id')
            ->where('tsr.status', '!=', 'Rejected')
            ->select('tsr.request_material_id', 'tsri.items_id', DB::raw('SUM(tsri.quantity) as total_ret'))
            ->groupBy('tsr.request_material_id', 'tsri.items_id')
            ->get()
            ->keyBy(fn ($r) => "{$r->request_material_id}_{$r->items_id}");

        $sources = $rmList->map(function (RequestMaterial $rm) use ($alreadyReturned) {
            $items = $rm->items->map(function ($line) use ($rm, $alreadyReturned) {
                $key = "{$rm->id}_{$line->items_id}";
                $returnedQty = (float) ($alreadyReturned[$key]->total_ret ?? 0);
                $issuedQty = (float) $line->request;
                $remaining = max(0.0, $issuedQty - $returnedQty);

                return [
                    'items_id' => $line->items_id,
                    'itemCode' => $line->item?->code ?? '',
                    'itemName' => $line->item?->name ?? '',
                    'unit' => $line->item?->unit?->name ?? 'PCE',
                    'issuedQty' => $issuedQty,
                    'returnedQty' => $returnedQty,
                    'remainingReturnableQty' => $remaining,
                    'sourceLocation' => $rm->destinationLocation?->name ?? 'Production Floor',
                    'remark' => $line->remark ?? '',
                ];
            })->filter(fn ($i) => $i['remainingReturnableQty'] > 0)->values();

            return [
                'id' => $rm->id,
                'requestNumber' => $rm->request_number,
                'requestDate' => $rm->request_date,
                'warehouses_id' => $rm->warehouses_id,
                'warehouseName' => $rm->warehouse?->name ?? '',
                'department' => $rm->department?->name ?? '',
                'destinationLocation' => $rm->destinationLocation?->name ?? '',
                'job_number_id' => $rm->job_number_id,
                'jobNumber' => $rm->jobNumberModel?->name ?? $rm->job_number ?? '',
                'items' => $items,
            ];
        })->filter(fn ($s) => $s['items']->isNotEmpty())->values();

        return response()->json([
            'status' => 'success',
            'data' => $sources,
        ]);
    }

    private function findByCodeOrId(string $code): TransferStockReturn
    {
        $relations = [
            'warehouse',
            'requestMaterial.destinationLocation',
            'requestMaterial.department',
            'jobNumberModel',
            'creatorUser',
            'updatedByUser',
            'items.item.unit',
        ];

        if (is_numeric($code)) {
            return TransferStockReturn::with($relations)->findOrFail((int) $code);
        }

        $clean = preg_replace('/[^A-Za-z0-9]/', '', $code);

        return TransferStockReturn::with($relations)
            ->where('return_number', $code)
            ->orWhereRaw("REPLACE(REPLACE(return_number, '/', ''), '-', '') = ?", [$clean])
            ->firstOrFail();
    }

    private function transform(TransferStockReturn $row): array
    {
        $totalQty = $row->items->sum('quantity');

        return [
            'id' => $row->return_number,
            'rawId' => $row->id,
            'returnNumber' => $row->return_number,
            'productionCode' => $row->production_code ?: ($row->requestMaterial?->request_number ?? ''),
            'requestMaterialId' => $row->request_material_id,
            'requestMaterialNumber' => $row->requestMaterial?->request_number ?? '',
            'warehouseId' => $row->warehouses_id,
            'warehouse' => $row->warehouse?->name ?? '',
            'jobNumberId' => $row->job_number_id,
            'jobNumber' => $row->jobNumberModel?->name ?? $row->job_number ?? '',
            'returnDate' => $row->return_date?->format('Y-m-d') ?? '',
            'returnDateFormatted' => $row->return_date?->format('d M Y') ?? '',
            'note' => $row->note ?? '',
            'status' => $row->status ?? 'Waiting for Approve 1',
            'createdBy' => $row->creatorUser?->name ?? '',
            'updatedBy' => $row->updatedByUser?->name ?? '',
            'totalQty' => (float) $totalQty,
            'itemCount' => $row->items->count(),
            'createdAt' => $row->created_at?->format('Y-m-d H:i:s'),
            'updatedAt' => $row->updated_at?->format('Y-m-d H:i:s'),
            'items' => $row->items->map(fn (TransferStockReturnItem $line, int $idx) => [
                'id' => (string) $line->id,
                'no' => $idx + 1,
                'items_id' => $line->items_id,
                'itemCode' => $line->item?->code ?? '',
                'itemName' => $line->item?->name ?? '',
                'quantity' => (float) $line->quantity,
                'unit' => $line->unit ?: ($line->item?->unit?->name ?? 'PCE'),
                'sourceLocation' => $line->source_location ?: ($row->requestMaterial?->destinationLocation?->name ?? ''),
                'destinationLocation' => $line->destination_location ?: ($row->warehouse?->name ?? ''),
                'remark' => $line->remark ?? '',
            ])->values()->all(),
        ];
    }
}

