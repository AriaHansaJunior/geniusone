<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Models\Warehouse\Inventory\WarehouseStockTransfer;
use App\Services\Warehouse\WarehouseStockTransferService;
use App\Support\DocumentCodeHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WarehouseStockTransferApiController extends Controller
{
    public function __construct(
        private readonly WarehouseStockTransferService $transferService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = WarehouseStockTransfer::with($this->transferService->defaultRelations())
            ->orderByDesc('id');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('transfer_number', 'like', "%{$search}%")
                    ->orWhere('reference_code', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%");
            });
        }

        if ($status = trim((string) $request->query('status', ''))) {
            if (strtolower($status) !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($srcId = $request->query('source_warehouse_id')) {
            $query->where('source_warehouse_id', (int) $srcId);
        }

        if ($dstId = $request->query('destination_warehouse_id')) {
            $query->where('destination_warehouse_id', (int) $dstId);
        }

        $perPage = min(max((int) $request->query('per_page', 50), 1), 200);
        $paginated = $query->paginate($perPage);

        $rows = $paginated->getCollection()->map(fn (WarehouseStockTransfer $row) => $this->transform($row))->values();

        return response()->json([
            'status' => 'success',
            'rows' => $rows,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'source_warehouse_id' => 'required|integer|exists:warehouses,id',
            'destination_warehouse_id' => 'required|integer|exists:warehouses,id',
            'source_coordinate_id' => 'nullable|integer|exists:warehouse_coordinates,id',
            'destination_coordinate_id' => 'nullable|integer|exists:warehouse_coordinates,id',
            'transfer_date' => 'nullable|date',
            'reference_code' => 'nullable|string|max:100',
            'idempotency_key' => 'nullable|string|max:100',
            'note' => 'nullable|string',
            'auto_post' => 'nullable|boolean',
            'items_id' => 'nullable|integer|exists:items,id',
            'quantity' => 'nullable|numeric|gt:0',
            'unit' => 'nullable|string|max:45',
            'lot_number' => 'nullable|string|max:100',
            'remark' => 'nullable|string|max:255',
            'items' => 'nullable|array|min:1',
            'items.*.items_id' => 'required_with:items|integer|exists:items,id',
            'items.*.quantity' => 'required_with:items|numeric|gt:0',
            'items.*.unit' => 'nullable|string|max:45',
            'items.*.lot_number' => 'nullable|string|max:100',
            'items.*.remark' => 'nullable|string|max:255',
        ]);

        $autoPost = array_key_exists('auto_post', $validated) ? (bool) $validated['auto_post'] : true;
        $result = $this->transferService->createTransfer($validated, $actorId, $autoPost);
        $transfer = $result['transfer'];
        $isReplay = $result['idempotent_replay'];

        return response()->json([
            'status' => 'success',
            'message' => $isReplay
                ? "Existing transfer '{$transfer->transfer_number}' returned via idempotency key."
                : ($transfer->status === 'Posted'
                    ? "Stock transfer '{$transfer->transfer_number}' completed and posted atomically."
                    : "Stock transfer draft '{$transfer->transfer_number}' created."),
            'idempotent_replay' => $isReplay,
            'data' => $this->transform($transfer),
        ], $isReplay ? 200 : 201);
    }

    public function show(string $code): JsonResponse
    {
        $rawCode = DocumentCodeHelper::hyphenToSlash($code);
        $cleanCode = preg_replace('/[^A-Za-z0-9]/', '', $code);

        $transfer = WarehouseStockTransfer::with($this->transferService->defaultRelations())
            ->where('transfer_number', $rawCode)
            ->orWhere('transfer_number', $code)
            ->orWhere('id', is_numeric($code) ? (int) $code : null)
            ->orWhereRaw("REPLACE(REPLACE(transfer_number, '/', ''), '-', '') = ?", [$cleanCode])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $this->transform($transfer),
        ]);
    }

    public function post(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $transfer = $this->transferService->postTransfer($id, $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "Stock transfer '{$transfer->transfer_number}' posted successfully.",
            'data' => $this->transform($transfer),
        ]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $transfer = $this->transferService->cancelTransfer($id, $actorId, $validated['reason'] ?? null);

        return response()->json([
            'status' => 'success',
            'message' => "Stock transfer '{$transfer->transfer_number}' cancelled.",
            'data' => $this->transform($transfer),
        ]);
    }

    private function transform(WarehouseStockTransfer $transfer): array
    {
        return [
            'id' => $transfer->id,
            'transfer_number' => $transfer->transfer_number,
            'source_warehouse_id' => $transfer->source_warehouse_id,
            'source_warehouse_name' => $transfer->sourceWarehouse?->name,
            'source_warehouse_code' => $transfer->sourceWarehouse?->code,
            'destination_warehouse_id' => $transfer->destination_warehouse_id,
            'destination_warehouse_name' => $transfer->destinationWarehouse?->name,
            'destination_warehouse_code' => $transfer->destinationWarehouse?->code,
            'source_coordinate_id' => $transfer->source_coordinate_id,
            'source_coordinate_name' => $transfer->sourceCoordinate?->name,
            'destination_coordinate_id' => $transfer->destination_coordinate_id,
            'destination_coordinate_name' => $transfer->destinationCoordinate?->name,
            'transfer_date' => $transfer->transfer_date?->format('Y-m-d'),
            'reference_code' => $transfer->reference_code,
            'idempotency_key' => $transfer->idempotency_key,
            'status' => $transfer->status,
            'note' => $transfer->note,
            'creator_id' => $transfer->creator_id,
            'creator_name' => $transfer->creator?->name,
            'posted_by' => $transfer->posted_by,
            'posted_by_name' => $transfer->postedByUser?->name,
            'posted_at' => $transfer->posted_at?->toIso8601String(),
            'created_at' => $transfer->created_at?->toIso8601String(),
            'items' => $transfer->items->map(fn ($line) => [
                'id' => $line->id,
                'items_id' => $line->items_id,
                'item_code' => $line->item?->code,
                'item_name' => $line->item?->name,
                'quantity' => (float) $line->quantity,
                'unit' => $line->unit ?? $line->item?->unitOfMeasurement?->code ?? $line->item?->unitOfMeasurement?->name ?? 'PCE',
                'lot_number' => $line->lot_number,
                'remark' => $line->remark,
            ])->values()->all(),
        ];
    }
}
