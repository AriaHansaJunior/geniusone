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
        if ($request->has('name') && !$request->has('nama')) {
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

        if ($request->has('name') && !$request->has('nama')) {
            $request->merge(['nama' => $request->input('name')]);
        }

        $validated = $request->validate([
            'nama' => 'sometimes|required|string|max:45|unique:units,nama,' . $id,
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

    /**
     * List Unit Reference (Satuan Ukur / units_of_measurements).
     */
    public function unitReferences(Request $request): JsonResponse
    {
        $query = UnitOfMeasurement::query();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $perPage = (int) $request->query('per_page', 50);
        $records = $query->paginate($perPage);

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
}
