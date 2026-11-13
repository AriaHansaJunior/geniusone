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
        $query = JobNumber::with(['createdByUser', 'updatedByUser']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%");
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
            'code' => 'nullable|string|max:60|unique:job_number,code',
            'name' => 'required|string|max:45',
            'department' => 'nullable|string|max:100',
            'status' => 'nullable|integer',
        ]);

        if (empty($validated['code'])) {
            $validated['code'] = $validated['name'];
        }
        $validated['created_by'] = $actorId;
        $validated['updated_by'] = $actorId;

        $record = JobNumber::create($validated);

        return response()->json([
            'message' => 'Job number created successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = JobNumber::with(['createdByUser', 'updatedByUser'])->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = JobNumber::findOrFail($id);

        $validated = $request->validate([
            'code' => 'nullable|string|max:60|unique:job_number,code,'.$id,
            'name' => 'sometimes|required|string|max:45',
            'department' => 'nullable|string|max:100',
            'status' => 'nullable|integer',
        ]);

        $validated['updated_by'] = $actorId;

        $record->update($validated);

        return response()->json([
            'message' => 'Job number updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = JobNumber::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Job number deleted successfully']);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = JobNumber::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'message' => 'Job number status updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }
}
