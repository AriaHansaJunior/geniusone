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
    /**
     * List all warehouses with their coordinates.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Warehouse::with(['type', 'coordinates']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
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
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:warehouses,name',
            'warehouse_types_id' => 'nullable|exists:warehouse_types,id',
            'type_name' => 'nullable|string|max:45',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        if (empty($validated['warehouse_types_id'])) {
            $typeName = $validated['type_name'] ?? 'Raw Material';
            $type = WarehouseType::firstOrCreate(['name' => $typeName]);
            $validated['warehouse_types_id'] = $type->id;
        }

        unset($validated['type_name']);

        $record = Warehouse::create($validated);

        return response()->json([
            'message' => 'Warehouse created successfully',
            'data' => $record->load(['type', 'coordinates']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Warehouse::with(['type', 'coordinates'])->findOrFail($id);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = Warehouse::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:45|unique:warehouses,name,' . $id,
            'warehouse_types_id' => 'nullable|exists:warehouse_types,id',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Warehouse updated successfully',
            'data' => $record->load(['type', 'coordinates']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Warehouse::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Warehouse deleted successfully']);
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

    public function destroyCoordinate(int $coordinateId): JsonResponse
    {
        $coordinate = WarehouseCoordinate::findOrFail($coordinateId);
        $coordinate->delete();

        return response()->json(['message' => 'Warehouse coordinate deleted successfully']);
    }
}
