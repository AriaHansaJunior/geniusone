<?php

namespace App\Http\Controllers\Api\Procurement\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Partner\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CountryApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Country::with(['createdByUser', 'updatedByUser']);

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
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'code' => 'nullable|string|max:20|unique:countries,code',
            'name' => 'required|string|max:45|unique:countries,name',
            'status' => 'nullable|integer',
        ]);

        $validated['created_by'] = $actorId;
        $validated['updated_by'] = $actorId;

        $record = Country::create($validated);

        return response()->json([
            'message' => 'Country created successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Country::with(['createdByUser', 'updatedByUser'])->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Country::findOrFail($id);

        $validated = $request->validate([
            'code' => 'nullable|string|max:20|unique:countries,code,'.$id,
            'name' => 'sometimes|required|string|max:45|unique:countries,name,'.$id,
            'status' => 'nullable|integer',
        ]);

        $validated['updated_by'] = $actorId;

        $record->update($validated);

        return response()->json([
            'message' => 'Country updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Country::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Country deleted successfully']);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Country::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'message' => 'Country status updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }
}
