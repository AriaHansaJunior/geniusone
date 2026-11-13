<?php

namespace App\Http\Controllers\Api\Procurement\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Finance\RafaksiType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RafaksiTypeApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RafaksiType::with(['createdByUser', 'updatedByUser']);

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

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45|unique:rafaksi_types,code',
            'name' => 'required|string|max:45|unique:rafaksi_types,name',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $validated['created_by'] = $actorId;
        $validated['updated_by'] = $actorId;

        $record = RafaksiType::create($validated);

        return response()->json([
            'message' => 'Rafaksi type created successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = RafaksiType::with(['createdByUser', 'updatedByUser'])->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = RafaksiType::findOrFail($id);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45|unique:rafaksi_types,code,'.$id,
            'name' => 'sometimes|required|string|max:45|unique:rafaksi_types,name,'.$id,
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|integer',
        ]);

        $validated['updated_by'] = $actorId;

        $record->update($validated);

        return response()->json([
            'message' => 'Rafaksi type updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = RafaksiType::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Rafaksi type deleted successfully']);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = RafaksiType::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'message' => 'Rafaksi type status updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }
}
