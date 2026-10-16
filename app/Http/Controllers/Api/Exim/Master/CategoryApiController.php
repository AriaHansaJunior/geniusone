<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Category::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
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
            'code' => 'required|string|max:45|unique:categories,code',
            'name' => 'required|string|max:45',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $record = Category::create($validated);

        return response()->json([
            'message' => 'Category created successfully',
            'data' => $record,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Category::findOrFail($id);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = Category::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|required|string|max:45|unique:categories,code,' . $id,
            'name' => 'sometimes|required|string|max:45',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Category updated successfully',
            'data' => $record,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Category::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Category deleted successfully']);
    }
}
