<?php

namespace App\Http\Controllers\Api\Warehouse\Master;

use App\Http\Controllers\Controller;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TypeOfRequestApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TypeOfRequest::with(['createdByUser', 'updatedByUser', 'department'])
            ->withCount('materialRequests')
            ->orderBy('name');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('department', fn ($departmentQuery) => $departmentQuery->where('name', 'like', "%{$search}%"))
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->query('status') !== '' && $request->query('status') !== 'all') {
            $st = strtolower((string) $request->query('status'));
            $query->where('status', ($st === 'active' || $st === '1') ? 1 : 0);
        }

        $perPage = min(max((int) $request->query('per_page', 100), 1), 500);
        $paginated = $query->paginate($perPage);
        $rows = $paginated->getCollection()->map(fn (TypeOfRequest $row) => $this->transform($row));

        return response()->json([
            'status' => 'success',
            'data' => $rows,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'departments_id' => 'required|integer|exists:departments,id',
            'description' => 'nullable|string|max:255',
            'requires_job_number' => 'nullable|boolean',
            'status' => 'nullable|boolean',
        ]);

        $record = TypeOfRequest::create([
            'name' => $validated['name'],
            'departments_id' => $validated['departments_id'],
            'description' => $validated['description'] ?? null,
            'requires_job_number' => (bool) ($validated['requires_job_number'] ?? false),
            'status' => array_key_exists('status', $validated) ? (int) (bool) $validated['status'] : 1,
            'created_by' => $actorId,
            'updated_by' => $actorId,
        ]);

        \App\Http\Controllers\Api\Common\SystemContextApiController::forgetLookupsCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Type of Request created.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser', 'department'])),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = TypeOfRequest::withCount('materialRequests')
            ->with(['createdByUser', 'updatedByUser', 'department'])
            ->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $this->transform($record),
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = TypeOfRequest::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:120',
            'departments_id' => 'sometimes|required|integer|exists:departments,id',
            'description' => 'nullable|string|max:255',
            'requires_job_number' => 'nullable|boolean',
            'status' => 'nullable|boolean',
        ]);

        $record->fill(collect($validated)->except(['status'])->toArray());
        if (array_key_exists('status', $validated)) {
            $record->status = (int) (bool) $validated['status'];
        }
        $record->updated_by = $actorId;
        $record->save();

        \App\Http\Controllers\Api\Common\SystemContextApiController::forgetLookupsCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Type of Request updated.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser', 'department'])),
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = TypeOfRequest::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        \App\Http\Controllers\Api\Common\SystemContextApiController::forgetLookupsCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Type of Request status updated.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser', 'department'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = TypeOfRequest::findOrFail($id);
        $record->delete();

        \App\Http\Controllers\Api\Common\SystemContextApiController::forgetLookupsCache();

        return response()->json([
            'status' => 'success',
            'message' => 'Type of Request deleted.',
        ]);
    }

    private function transform(TypeOfRequest $row): array
    {
        return [
            'id' => (string) $row->id,
            'rawId' => $row->id,
            'name' => $row->name,
            'departmentId' => (string) $row->departments_id,
            'department' => $row->department?->name ?? '',
            'description' => $row->description ?? '',
            'requiresJobNumber' => (bool) $row->requires_job_number,
            'usageCount' => (int) ($row->material_requests_count ?? 0),
            'status' => (int) $row->status === 1 ? 'Active' : 'Inactive',
            'statusCode' => (int) $row->status,
            'createdBy' => $row->createdByUser?->name ?? '',
            'updatedBy' => $row->updatedByUser?->name ?? '',
        ];
    }
}

