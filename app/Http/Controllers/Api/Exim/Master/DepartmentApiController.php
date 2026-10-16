<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Department::with('unit');

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:departments,name',
            'units_id' => 'nullable|exists:units,id',
            'status' => 'nullable|integer',
        ]);

        $record = Department::create($validated);

        return response()->json([
            'message' => 'Department created successfully',
            'data' => $record->load('unit'),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Department::with('unit')->findOrFail($id);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = Department::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:45|unique:departments,name,' . $id,
            'units_id' => 'nullable|exists:units,id',
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Department updated successfully',
            'data' => $record->load('unit'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Department::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Department deleted successfully']);
    }

    /**
     * List sections under departments.
     */
    public function sections(Request $request): JsonResponse
    {
        $query = Section::query();

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        $records = $query->latest('id')->get();

        return response()->json(['data' => $records]);
    }
}
