<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Unit;
use App\Models\Master\Material\UnitOfMeasurement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnitApiController extends Controller
{
    /**
     * List enterprise units (Unit pabrik/organisasi).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Unit::query();

        if ($search = $request->query('search')) {
            $query->where('nama', 'like', "%{$search}%");
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
     * Store new unit.
     */
    public function store(Request $request): JsonResponse
    {
        if ($request->has('name') && ! $request->has('nama')) {
            $request->merge(['nama' => $request->input('name')]);
        }

        $validated = $request->validate([
            'nama' => 'required|string|max:45|unique:units,nama',
            'status' => 'nullable|integer',
        ]);

        $record = Unit::create($validated);

        return response()->json([
            'message' => 'Unit created successfully',
            'data' => $record,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Unit::findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = Unit::findOrFail($id);

        if ($request->has('name') && ! $request->has('nama')) {
            $request->merge(['nama' => $request->input('name')]);
        }

        $validated = $request->validate([
            'nama' => 'sometimes|required|string|max:45|unique:units,nama,'.$id,
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Unit updated successfully',
            'data' => $record,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Unit::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Unit deleted successfully']);
    }

    public function toggleStatus(int $id): JsonResponse
    {
        $record = Unit::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->save();

        return response()->json([
            'message' => 'Unit status updated successfully',
            'data' => $record,
        ]);
    }

    /**
     * List Unit Reference (Satuan Ukur / units_of_measurements).
     */
    public function unitReferences(Request $request): JsonResponse
    {
        $query = UnitOfMeasurement::with('createdByUser');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 50);
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

    public function storeUnitReference(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45|unique:units_of_measurements,code',
            'name' => 'required|string|max:45|unique:units_of_measurements,name',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $validated['created_by'] = $actorId;

        $record = UnitOfMeasurement::create($validated);

        return response()->json([
            'message' => 'Unit reference created successfully',
            'data' => $record->load('createdByUser'),
        ], 201);
    }

    public function updateUnitReference(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = UnitOfMeasurement::findOrFail($id);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45|unique:units_of_measurements,code,'.$id,
            'name' => 'sometimes|required|string|max:45|unique:units_of_measurements,name,'.$id,
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Unit reference updated successfully',
            'data' => $record->load('createdByUser'),
        ]);
    }

    public function toggleUnitReferenceStatus(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = UnitOfMeasurement::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->save();

        return response()->json([
            'message' => 'Unit reference status updated successfully',
            'data' => $record->load('createdByUser'),
        ]);
    }

    public function destroyUnitReference(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = UnitOfMeasurement::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Unit reference deleted successfully']);
    }
}
