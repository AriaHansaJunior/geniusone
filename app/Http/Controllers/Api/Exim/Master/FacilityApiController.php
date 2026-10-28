<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Customs\Facility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacilityApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Facility::query();

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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:45|unique:facilities,name',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $record = Facility::create($validated);

        return response()->json([
            'message' => 'Facility created successfully',
            'data' => $record,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Facility::findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = Facility::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:45|unique:facilities,name,'.$id,
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Facility updated successfully',
            'data' => $record,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Facility::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Facility deleted successfully']);
    }
}
