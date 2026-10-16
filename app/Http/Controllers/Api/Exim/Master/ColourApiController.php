<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Colour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ColourApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Colour::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('grade', 'like', "%{$search}%");
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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:colours,name',
            'grade' => 'nullable|string|max:45',
            'status' => 'nullable|integer',
        ]);

        if (empty($validated['grade'])) {
            $validated['grade'] = 'Grade A';
        }

        $record = Colour::create($validated);

        return response()->json([
            'message' => 'Colour created successfully',
            'data' => $record,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Colour::findOrFail($id);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = Colour::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:45|unique:colours,name,' . $id,
            'grade' => 'nullable|string|max:45',
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Colour updated successfully',
            'data' => $record,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Colour::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Colour deleted successfully']);
    }
}
