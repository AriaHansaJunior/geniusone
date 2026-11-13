<?php

namespace App\Http\Controllers\Api\Warehouse\Master;

use App\Http\Controllers\Controller;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\Facility\WarehouseType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WarehouseMasterApiController extends Controller
{
    public function warehouseTypes(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => WarehouseType::query()->orderBy('id')->get(),
        ]);
    }

    /**
     * List all warehouses with their coordinates.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Warehouse::with(['type', 'coordinates', 'createdByUser', 'updatedByUser']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        $records = $query->latest('id')->paginate($perPage);

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
     * Store new master warehouse.
     */
    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45|unique:warehouses,code',
            'name' => 'required|string|max:45|unique:warehouses,name',
            'warehouse_types_id' => 'nullable|exists:warehouse_types,id',
            'type_name' => 'nullable|string|max:45',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        if (empty($validated['warehouse_types_id'])) {
            $type = ! empty($validated['type_name'])
                ? WarehouseType::whereRaw('LOWER(name) = ?', [strtolower(trim($validated['type_name']))])->first()
                : null;

            if (! $type) {
                return response()->json([
                    'message' => 'A valid warehouse type from master warehouse_types is required.',
                ], 422);
            }

            $validated['warehouse_types_id'] = $type->id;
        }

        unset($validated['type_name']);
        $validated['created_by'] = $actorId;
        $validated['updated_by'] = $actorId;

        $record = Warehouse::create($validated);

        return response()->json([
            'message' => 'Warehouse created successfully',
            'data' => $record->load(['type', 'coordinates', 'createdByUser', 'updatedByUser']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Warehouse::with(['type', 'coordinates', 'createdByUser', 'updatedByUser'])->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Warehouse::findOrFail($id);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45|unique:warehouses,code,'.$id,
            'name' => 'sometimes|required|string|max:45|unique:warehouses,name,'.$id,
            'warehouse_types_id' => 'nullable|exists:warehouse_types,id',
            'type_name' => 'nullable|string|max:45',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        if (empty($validated['warehouse_types_id']) && ! empty($validated['type_name'])) {
            $type = WarehouseType::whereRaw('LOWER(name) = ?', [strtolower(trim($validated['type_name']))])->first();
            if (! $type) {
                return response()->json(['message' => 'Invalid warehouse type selected.'], 422);
            }
            $validated['warehouse_types_id'] = $type->id;
        }

        unset($validated['type_name']);
        $validated['updated_by'] = $actorId;

        $record->update($validated);

        return response()->json([
            'message' => 'Warehouse updated successfully',
            'data' => $record->load(['type', 'coordinates', 'createdByUser', 'updatedByUser']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Warehouse::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Warehouse deleted successfully']);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Warehouse::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'message' => 'Warehouse status updated successfully',
            'data' => $record->load(['type', 'coordinates', 'createdByUser', 'updatedByUser']),
        ]);
    }

    // =========================================================================
    // COORDINATES CRUD
    // =========================================================================

    public function listCoordinates(int $warehouseId): JsonResponse
    {
        $coordinates = WarehouseCoordinate::where('warehouses_id', $warehouseId)->get();

        return response()->json(['data' => $coordinates]);
    }

    public function storeCoordinate(Request $request, int $warehouseId): JsonResponse
    {
        $warehouse = Warehouse::findOrFail($warehouseId);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45',
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $validated['warehouses_id'] = $warehouse->id;

        $coordinate = WarehouseCoordinate::create($validated);

        return response()->json([
            'message' => 'Warehouse coordinate created successfully',
            'data' => $coordinate,
        ], 201);
    }

    public function updateCoordinate(Request $request, int $coordinateId): JsonResponse
    {
        $coordinate = WarehouseCoordinate::findOrFail($coordinateId);

        $validated = $request->validate([
            'warehouses_id' => 'nullable|exists:warehouses,id',
            'code' => 'nullable|string|max:45',
            'name' => 'sometimes|required|string|max:100',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $coordinate->update($validated);

        return response()->json([
            'message' => 'Warehouse coordinate updated successfully',
            'data' => $coordinate->fresh(),
        ]);
    }

    public function destroyCoordinate(int $coordinateId): JsonResponse
    {
        $coordinate = WarehouseCoordinate::findOrFail($coordinateId);
        $coordinate->delete();

        return response()->json(['message' => 'Warehouse coordinate deleted successfully']);
    }
}
