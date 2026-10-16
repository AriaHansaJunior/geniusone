<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Organization\JobNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobNumberApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = JobNumber::query();

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
            'name' => 'required|string|max:45',
            'status' => 'nullable|integer',
        ]);

        $record = JobNumber::create($validated);

        return response()->json([
            'message' => 'Job number created successfully',
            'data' => $record,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = JobNumber::findOrFail($id);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = JobNumber::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:45',
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Job number updated successfully',
            'data' => $record,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = JobNumber::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Job number deleted successfully']);
    }
}
