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
        $query = TypeOfRequest::with(['createdByUser', 'updatedByUser'])
            ->withCount('materialRequests')
            ->orderBy('name');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('department', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->query('status') !== '' && $request->query('status') !== 'all') {
            $st = strtolower((string) $request->query('status'));
            $query->where('status', ($st === 'active' || $st === '1') ? 1 : 0);
        }

        $rows = $query->get()->map(fn (TypeOfRequest $row) => $this->transform($row));

        return response()->json([
            'status' => 'success',
            'data' => $rows,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45',
            'name' => 'required|string|max:120',
            'department' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:255',
            'requires_job_number' => 'nullable|boolean',
            'requires_approval_2' => 'nullable|boolean',
            'status' => 'nullable|boolean',
        ]);

        $code = ! empty($validated['code'])
            ? $validated['code']
            : 'TOR-' . str_pad((string) (TypeOfRequest::withTrashed()->count() + 1), 2, '0', STR_PAD_LEFT);

        $record = TypeOfRequest::create([
            'code' => $code,
            'name' => $validated['name'],
            'department' => $validated['department'] ?? null,
            'description' => $validated['description'] ?? null,
            'requires_job_number' => (bool) ($validated['requires_job_number'] ?? false),
            'requires_approval_2' => (bool) ($validated['requires_approval_2'] ?? false),
            'status' => array_key_exists('status', $validated) ? (int) (bool) $validated['status'] : 1,
            'created_by' => $actorId,
            'updated_by' => $actorId,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Type of Request created.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser'])),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = TypeOfRequest::withCount('materialRequests')
            ->with(['createdByUser', 'updatedByUser'])
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
            'code' => 'nullable|string|max:45',
            'name' => 'sometimes|required|string|max:120',
            'department' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:255',
            'requires_job_number' => 'nullable|boolean',
            'requires_approval_2' => 'nullable|boolean',
            'status' => 'nullable|boolean',
        ]);

        $record->fill(collect($validated)->except(['status'])->toArray());
        if (array_key_exists('status', $validated)) {
            $record->status = (int) (bool) $validated['status'];
        }
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Type of Request updated.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser'])),
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = TypeOfRequest::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Type of Request status updated.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = TypeOfRequest::findOrFail($id);
        $record->delete();

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
            'code' => $row->code ?: ('TOR-' . str_pad((string) $row->id, 2, '0', STR_PAD_LEFT)),
            'name' => $row->name,
            'department' => $row->department ?? '',
            'description' => $row->description ?? '',
            'requiresJobNumber' => (bool) $row->requires_job_number,
            'requiresApproval2' => (bool) $row->requires_approval_2,
            'usageCount' => (int) ($row->material_requests_count ?? 0),
            'status' => (int) $row->status === 1 ? 'Active' : 'Inactive',
            'statusCode' => (int) $row->status,
            'createdBy' => $row->createdByUser?->name ?? '',
            'updatedBy' => $row->updatedByUser?->name ?? '',
        ];
    }
}

