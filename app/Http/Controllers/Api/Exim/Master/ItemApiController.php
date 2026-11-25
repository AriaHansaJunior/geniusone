<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Warehouse\Facility\Warehouse;
use App\Services\AuditLogger;
use App\Services\Inventory\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ItemApiController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}
    /**
     * Authorize user action on master item based on role and permissions (BE-03).
     */
    protected function authorizeItemAction(Request $request, string $action = 'create'): void
    {
        $user = $this->requireActor($request);

        $hasPerm = $user->hasPermission("master_item.{$action}")
            || $user->hasPermission('master_item.*')
            || $user->isSuperAdmin()
            || $user->isAdmin()
            || in_array($user->role, ['superadmin', 'admin', 'procurement', 'accounting', 'master_item_manager'], true);

        if (! $hasPerm) {
            abort(403, "Forbidden: Your role does not possess 'master_item.{$action}' permission.");
        }
    }
    private function itemRelations(): array
    {
        return [
            'classification',
            'category',
            'facility',
            'unitOfMeasurement',
            'smallestUnit',
            'greatestUnit',
            'itemType',
            'origin',
            'brand',
            'colour',
            'style',
            'hsCode',
            'customsReport',
            'groupScrapItem',
            'specification',
            'jobNumber',
            'createdByUser',
            'updatedByUser',
        ];
    }

    private function itemValidationRules(?int $id = null): array
    {
        $isUpdate = $id !== null;
        $req = $isUpdate ? 'nullable' : 'required';

        return [
            'name' => ($isUpdate ? 'sometimes|required' : 'required').'|string|max:255',
            'code' => 'nullable|string|max:45|unique:items,code'.($id ? ','.$id : ''),
            'external_code' => 'nullable|string|max:45',
            'categories_id' => 'nullable|exists:categories,id',
            'classifications_id' => $req.'|exists:classifications,id',
            'facilities_id' => $req.'|exists:facilities,id',
            'origins_id' => 'nullable|exists:origins,id',
            'item_types_id' => 'nullable|exists:item_types,id',
            'units_of_measurements_id' => $req.'|exists:units_of_measurements,id',
            'smallest_unit_id' => 'nullable|exists:units_of_measurements,id',
            'greatest_unit_id' => 'nullable|exists:units_of_measurements,id',
            'unit_conversion' => 'nullable|numeric',
            'netto' => 'nullable|numeric',
            'size' => 'nullable|string|max:100',
            'dimension_p' => 'nullable|numeric',
            'dimension_l' => 'nullable|numeric',
            'dimension_t' => 'nullable|numeric',
            'colours_id' => 'nullable|exists:colours,id',
            'brands_id' => 'nullable|exists:brands,id',
            'styles_id' => 'nullable|exists:styles,id',
            'customs_reports_id' => 'nullable|exists:customs_reports,id',
            'group_scrap_items_id' => 'nullable|exists:group_scrap_items,id',
            'specifications_id' => 'nullable|exists:specifications,id',
            'hs_code_id' => 'nullable|exists:hs_code,id',
            'job_number_id' => 'nullable|exists:job_number,id',
            'trace_by_lot' => 'nullable|integer',
            'status' => 'nullable|integer',
            'stock' => 'nullable|numeric',
        ];
    }

    /**
     * List master items with rich relations for the Item table & picker modal.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Item::with($this->itemRelations());

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('external_code', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $status = $request->query('status');
            if ($status === 'Active' || $status === '1') {
                $query->where('status', 1);
            } elseif ($status === 'Inactive' || $status === '0') {
                $query->where('status', 0);
            }
        }

        $perPage = (int) $request->query('per_page', 10);
        $records = $query->latest('id')->paginate($perPage);

        $itemIds = collect($records->items())->pluck('id')->all();
        $warehouseTotals = (! empty($itemIds) && Schema::hasTable('item_warehouse'))
            ? DB::table('item_warehouse')
                ->whereIn('items_id', $itemIds)
                ->groupBy('items_id')
                ->selectRaw('items_id, SUM(quantity) as total_qty')
                ->pluck('total_qty', 'items_id')
            : collect();

        foreach ($records->items() as $item) {
            if ($warehouseTotals->has($item->id)) {
                $item->stock = (float) $warehouseTotals->get($item->id);
            }
        }

        return response()->json([
            'data' => $records->items(),
            'meta' => [
                'current_page' => $records->currentPage(),
                'last_page' => $records->lastPage(),
                'per_page' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    /**
     * Store new master item.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeItemAction($request, 'create');

        $validated = $request->validate(array_merge($this->itemValidationRules(), [
            'warehouses_id' => 'nullable|integer|exists:warehouses,id',
        ]));

        if (empty($validated['code'])) {
            $nextId = (Item::max('id') ?? 0) + 1;
            $validated['code'] = 'ITM.'.str_pad((string) $nextId, 5, '0', STR_PAD_LEFT);
        }

        if (empty($validated['item_types_id'])) {
            $firstType = ItemType::orderBy('id')->first();
            if (! $firstType) {
                return response()->json(['message' => 'Reference table item_types has no records. Run database seeders first.'], 422);
            }
            $validated['item_types_id'] = $firstType->id;
        }

        $actorId = $this->requireActorId($request);
        $validated['created_by'] = $actorId;
        $validated['updated_by'] = $actorId;

        $initialStock = (float) ($validated['stock'] ?? 0);
        $warehouseId = $validated['warehouses_id'] ?? Warehouse::query()->orderBy('id')->value('id');
        unset($validated['warehouses_id']);
        $validated['stock'] = 0;

        $item = Item::create($validated);

        if ($initialStock > 0 && $warehouseId) {
            $this->inventoryService->recordStockMovement(
                item: $item,
                warehouseId: (int) $warehouseId,
                movementType: 'IN',
                quantity: $initialStock,
                referenceType: 'INITIAL_STOCK',
                referenceNumber: $item->code,
                userId: $actorId,
                notes: "Initial stock created with Master Item {$item->code}"
            );
            $item->refresh();
        }

        return response()->json([
            'message' => 'Item created successfully',
            'data' => $item->load($this->itemRelations()),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $item = Item::with($this->itemRelations())->findOrFail($id);

        if (Schema::hasTable('item_warehouse')) {
            $hasPivot = DB::table('item_warehouse')->where('items_id', $item->id)->exists();
            if ($hasPivot) {
                $item->stock = (float) DB::table('item_warehouse')->where('items_id', $item->id)->sum('quantity');
            }
        }

        return response()->json(['data' => $item]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorizeItemAction($request, 'update');

        $item = Item::findOrFail($id);

        $validated = $request->validate($this->itemValidationRules($id));

        $actorId = $this->requireActorId($request);
        $validated['updated_by'] = $actorId;
        // Prevent raw form edits from desynchronizing stock from warehouse_stocks / item_warehouse
        unset($validated['stock']);

        $item->update($validated);

        if (Schema::hasTable('item_warehouse') && DB::table('item_warehouse')->where('items_id', $item->id)->exists()) {
            $item->stock = (float) DB::table('item_warehouse')->where('items_id', $item->id)->sum('quantity');
            $item->save();
        }

        return response()->json([
            'message' => 'Item updated successfully',
            'data' => $item->load($this->itemRelations()),
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $this->authorizeItemAction($request, 'update');
        $actorId = $this->requireActorId($request);

        $item = Item::findOrFail($id);
        $item->status = (int) $item->status === 1 ? 0 : 1;
        $item->updated_by = $actorId;
        $item->save();

        return response()->json([
            'message' => 'Item status updated successfully',
            'data' => $item->load($this->itemRelations()),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorizeItemAction($request, 'delete');
        $actorId = $this->requireActorId($request);

        $item = Item::findOrFail($id);
        $item->delete();

        AuditLogger::log(
            type: 'ITEM_DELETED',
            old: ['id' => $id, 'code' => $item->code, 'name' => $item->name],
            new: null,
            userId: $actorId
        );

        return response()->json(['message' => 'Item deleted successfully']);
    }
}
