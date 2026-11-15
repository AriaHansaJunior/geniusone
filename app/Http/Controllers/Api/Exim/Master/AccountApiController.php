<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Finance\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Account::with(['createdByUser', 'updatedByUser']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
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

    private function normalizeStatus(mixed $status): string
    {
        if (is_bool($status)) {
            return $status ? 'active' : 'inactive';
        }
        $normalized = strtolower(trim((string) $status));
        if (in_array($normalized, ['0', 'false', 'inactive', 'non-active', 'no'], true)) {
            return 'inactive';
        }

        return 'active';
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        if ($request->has('status') && $request->input('status') !== null) {
            $request->merge(['status' => $this->normalizeStatus($request->input('status'))]);
        }

        $validated = $request->validate([
            'code' => 'required|string|max:45|unique:accounts,code',
            'name' => 'required|string|max:45',
            'category' => 'nullable|string|max:80',
            'status' => 'nullable|string|max:45',
        ]);

        if (empty($validated['status'])) {
            $validated['status'] = 'active';
        }
        if (! isset($validated['category'])) {
            $validated['category'] = '';
        }
        $validated['created_by'] = $actorId;
        $validated['updated_by'] = $actorId;

        $record = Account::create($validated);

        return response()->json([
            'message' => 'Account created successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Account::with(['createdByUser', 'updatedByUser'])->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Account::findOrFail($id);

        if ($request->has('status') && $request->input('status') !== null) {
            $request->merge(['status' => $this->normalizeStatus($request->input('status'))]);
        }

        $validated = $request->validate([
            'code' => 'sometimes|required|string|max:45|unique:accounts,code,'.$id,
            'name' => 'sometimes|required|string|max:45',
            'category' => 'nullable|string|max:80',
            'status' => 'nullable|string|max:45',
        ]);

        $validated['updated_by'] = $actorId;

        $record->update($validated);

        return response()->json([
            'message' => 'Account updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = Account::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Account deleted successfully']);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Account::findOrFail($id);
        $isActive = strtolower((string) $record->status) === 'active' || (string) $record->status === '1';
        $record->status = $isActive ? 'inactive' : 'active';
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'message' => 'Account status updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }
}
