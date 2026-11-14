<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Inventory\StockNotification;
use App\Models\Master\Material\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockNotificationApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StockNotification::with(['item.classification', 'item.unit', 'createdByUser', 'updatedByUser'])
            ->orderByDesc('id');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('item_code', 'like', "%{$search}%")
                    ->orWhere('item_name', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->query('status') !== '' && $request->query('status') !== 'all') {
            $st = strtolower((string) $request->query('status'));
            $query->where('status', ($st === 'active' || $st === '1') ? 1 : 0);
        }

        if ($level = $request->query('notification_level')) {
            if (strtolower($level) !== 'all') {
                $query->where('notification_level', $level);
            }
        }

        $stockByItem = DB::table('warehouse_stocks')
            ->select('items_id', DB::raw('SUM(quantity) as total_qty'))
            ->groupBy('items_id')
            ->pluck('total_qty', 'items_id');

        $rows = $query->get()->map(fn (StockNotification $row) => $this->transformRow($row, $stockByItem));

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'items_id' => 'nullable|integer|exists:items,id',
            'item_code' => 'required_without:items_id|string|max:100',
            'item_name' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:45',
            'buffer_quantity' => 'required|numeric|min:0',
            'trigger_condition' => 'nullable|string|max:45',
            'notification_level' => 'nullable|string|max:45',
            'status' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $item = null;
        if (! empty($validated['items_id'])) {
            $item = Item::with(['classification', 'unit'])->find($validated['items_id']);
        } elseif (! empty($validated['item_code'])) {
            $item = Item::with(['classification', 'unit'])->where('code', $validated['item_code'])->first();
        }

        $record = StockNotification::create([
            'items_id' => $item?->id ?? ($validated['items_id'] ?? null),
            'item_code' => $validated['item_code'] ?? $item?->code ?? '',
            'item_name' => $validated['item_name'] ?? $item?->name ?? '',
            'category' => $validated['category'] ?? $item?->classification?->name ?? 'General',
            'unit' => $validated['unit'] ?? $item?->unit?->name ?? 'PCE',
            'buffer_quantity' => (float) $validated['buffer_quantity'],
            'trigger_condition' => $validated['trigger_condition'] ?? 'Stock <= Buffer',
            'notification_level' => $validated['notification_level'] ?? 'Warning',
            'status' => array_key_exists('status', $validated) ? (int) (bool) $validated['status'] : 1,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $actorId,
            'updated_by' => $actorId,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Stock notification rule created.',
            'data' => $this->transformRow($record->load(['item', 'createdByUser', 'updatedByUser'])),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = StockNotification::with(['item.classification', 'item.unit', 'createdByUser', 'updatedByUser'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $this->transformRow($record),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = StockNotification::findOrFail($id);

        $validated = $request->validate([
            'items_id' => 'nullable|integer|exists:items,id',
            'item_code' => 'sometimes|string|max:100',
            'item_name' => 'sometimes|string|max:255',
            'category' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:45',
            'buffer_quantity' => 'sometimes|numeric|min:0',
            'trigger_condition' => 'nullable|string|max:45',
            'notification_level' => 'nullable|string|max:45',
            'status' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        if (! empty($validated['items_id'])) {
            $item = Item::with(['classification', 'unit'])->find($validated['items_id']);
            if ($item) {
                $record->items_id = $item->id;
                $record->item_code = $validated['item_code'] ?? $item->code;
                $record->item_name = $validated['item_name'] ?? $item->name;
                $record->category = $validated['category'] ?? ($item->classification?->name ?? $record->category);
                $record->unit = $validated['unit'] ?? ($item->unit?->name ?? $record->unit);
            }
        }

        $record->fill(collect($validated)->except(['items_id', 'status'])->toArray());
        if (array_key_exists('status', $validated)) {
            $record->status = (int) (bool) $validated['status'];
        }
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Stock notification rule updated.',
            'data' => $this->transformRow($record->load(['item', 'createdByUser', 'updatedByUser'])),
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = StockNotification::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Stock notification status toggled.',
            'data' => $this->transformRow($record->load(['item', 'createdByUser', 'updatedByUser'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = StockNotification::findOrFail($id);
        $record->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Stock notification rule deleted.',
        ]);
    }

    /**
     * Evaluate live DB buffer stock alerts against warehouse_stocks and items.
     * GET /api/dashboard/stock-alerts
     */
    public function alerts(Request $request): JsonResponse
    {
        $stockRows = DB::table('warehouse_stocks as ws')
            ->join('warehouses as w', 'ws.warehouses_id', '=', 'w.id')
            ->select('ws.items_id', 'w.name as warehouse_name', 'ws.coordinate_name', 'ws.quantity')
            ->get();

        $stockByItem = [];
        $locationByItem = [];
        foreach ($stockRows as $sr) {
            $stockByItem[$sr->items_id] = ($stockByItem[$sr->items_id] ?? 0.0) + (float) $sr->quantity;
            if ((float) $sr->quantity > 0 || empty($locationByItem[$sr->items_id])) {
                $loc = $sr->warehouse_name . ($sr->coordinate_name ? " ({$sr->coordinate_name})" : '');
                $locationByItem[$sr->items_id][] = $loc;
            }
        }

        $rules = StockNotification::with(['item.classification', 'item.unit'])
            ->where('status', 1)
            ->orderBy('item_code')
            ->get();

        $alerts = [];
        $criticalCount = 0;
        $warningCount = 0;

        foreach ($rules as $rule) {
            $currentQty = $rule->items_id !== null
                ? (float) ($stockByItem[$rule->items_id] ?? $rule->item?->stock ?? 0)
                : 0.0;
            $buffer = (float) $rule->buffer_quantity;
            $cond = (string) $rule->trigger_condition;

            $isTriggered = match ($cond) {
                'Stock < Buffer' => $currentQty < $buffer,
                'Stock == 0' => $currentQty <= 0,
                default => $currentQty <= $buffer,
            };

            if (! $request->boolean('all') && ! $isTriggered) {
                continue;
            }

            $severity = $currentQty <= 0 ? 'Critical' : $rule->notification_level;
            if ($isTriggered) {
                if (strtolower($severity) === 'critical') {
                    $criticalCount++;
                } else {
                    $warningCount++;
                }
            }

            $locs = ! empty($locationByItem[$rule->items_id])
                ? implode(', ', array_unique($locationByItem[$rule->items_id]))
                : 'Unassigned Warehouse';

            $alerts[] = [
                'id' => $rule->id,
                'itemId' => $rule->items_id,
                'itemCode' => $rule->item_code,
                'itemName' => $rule->item_name,
                'category' => $rule->category ?? $rule->item?->classification?->name ?? 'General',
                'unit' => $rule->unit ?? $rule->item?->unit?->name ?? 'PCE',
                'currentStock' => round($currentQty, 4),
                'minBuffer' => round($buffer, 4),
                'deficit' => round(max(0, $buffer - $currentQty), 4),
                'triggerCondition' => $cond,
                'severity' => $severity,
                'isTriggered' => $isTriggered,
                'warehouseLocation' => $locs,
                'lastTriggeredAt' => $rule->last_triggered_at?->format('Y-m-d H:i:s'),
                'notes' => $rule->notes,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $alerts,
            'meta' => [
                'total_rules' => $rules->count(),
                'triggered_count' => $criticalCount + $warningCount,
                'critical_count' => $criticalCount,
                'warning_count' => $warningCount,
            ],
        ]);
    }

    private function transformRow(StockNotification $row, $stockByItem = null): array
    {
        $resolvedStock = null;
        if ($row->items_id !== null) {
            $resolvedStock = $stockByItem !== null
                ? ($stockByItem[$row->items_id] ?? null)
                : DB::table('warehouse_stocks')
                    ->where('items_id', $row->items_id)
                    ->selectRaw('SUM(quantity) as total_qty')
                    ->value('total_qty');
        }

        $currentStock = (float) ($resolvedStock ?? $row->item?->stock ?? 0);

        return [
            'id' => (string) $row->id,
            'rawId' => $row->id,
            'items_id' => $row->items_id,
            'itemCode' => $row->item_code,
            'itemName' => $row->item_name,
            'category' => $row->category ?? $row->item?->classification?->name ?? 'General',
            'unit' => $row->unit ?? $row->item?->unit?->name ?? 'PCE',
            'bufferQuantity' => (float) $row->buffer_quantity,
            'currentStock' => round($currentStock, 4),
            'triggerCondition' => $row->trigger_condition ?? 'Stock <= Buffer',
            'notificationLevel' => $row->notification_level ?? 'Warning',
            'status' => (int) $row->status === 1 ? 'Active' : 'Inactive',
            'statusCode' => (int) $row->status,
            'lastTriggeredAt' => $row->last_triggered_at?->format('d M Y, H:i'),
            'notes' => $row->notes ?? '',
            'createdBy' => $row->createdByUser?->name ?? '',
            'updatedBy' => $row->updatedByUser?->name ?? '',
            'createdAt' => $row->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}

