<?php

namespace App\Http\Controllers\Api\Warehouse\Master;

use App\Http\Controllers\Controller;
use App\Models\Warehouse\RequestMaterial\DestinationLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DestinationLocationApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DestinationLocation::with(['createdByUser', 'updatedByUser'])
            ->withCount('materialRequests')
            ->orderBy('name');

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('location_type', 'like', "%{$search}%")
                    ->orWhere('pic', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->query('status') !== '' && $request->query('status') !== 'all') {
            $st = strtolower((string) $request->query('status'));
            $query->where('status', ($st === 'active' || $st === '1') ? 1 : 0);
        }

        if ($locType = $request->query('location_type')) {
            if (strtolower($locType) !== 'all') {
                $query->where('location_type', $locType);
            }
        }

        $rows = $query->get()->map(fn (DestinationLocation $row) => $this->transform($row));

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
            'location_type' => 'nullable|string|max:60',
            'pic' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:255',
            'status' => 'nullable|boolean',
        ]);

        $code = ! empty($validated['code'])
            ? $validated['code']
            : 'LOC-' . str_pad((string) (DestinationLocation::withTrashed()->count() + 1), 3, '0', STR_PAD_LEFT);

        $record = DestinationLocation::create([
            'code' => $code,
            'name' => $validated['name'],
            'location_type' => $validated['location_type'] ?? 'Production Area',
            'pic' => $validated['pic'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => array_key_exists('status', $validated) ? (int) (bool) $validated['status'] : 1,
            'created_by' => $actorId,
            'updated_by' => $actorId,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Destination Location created.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser'])),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = DestinationLocation::withCount('materialRequests')
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
        $record = DestinationLocation::findOrFail($id);

        $validated = $request->validate([
            'code' => 'nullable|string|max:45',
            'name' => 'sometimes|required|string|max:120',
            'location_type' => 'nullable|string|max:60',
            'pic' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:255',
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
            'message' => 'Destination Location updated.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser'])),
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = DestinationLocation::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Destination Location status updated.',
            'data' => $this->transform($record->loadCount('materialRequests')->load(['createdByUser', 'updatedByUser'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = DestinationLocation::findOrFail($id);
        $record->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Destination Location deleted.',
        ]);
    }

    private function transform(DestinationLocation $row): array
    {
        return [
            'id' => (string) $row->id,
            'rawId' => $row->id,
            'code' => $row->code ?: ('LOC-' . str_pad((string) $row->id, 3, '0', STR_PAD_LEFT)),
            'name' => $row->name,
            'locationType' => $row->location_type ?? 'Production Area',
            'pic' => $row->pic ?? '',
            'description' => $row->description ?? '',
            'usageCount' => (int) ($row->material_requests_count ?? 0),
            'status' => (int) $row->status === 1 ? 'Active' : 'Inactive',
            'statusCode' => (int) $row->status,
            'createdBy' => $row->createdByUser?->name ?? '',
            'updatedBy' => $row->updatedByUser?->name ?? '',
        ];
    }
}

