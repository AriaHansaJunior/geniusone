<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Finance\Account;
use App\Models\Master\Material\Classification;
use App\Models\Master\Organization\ReportingType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassificationApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Classification::with(['reportingType', 'account']);

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
        $validated = $request->validate([
            'code' => 'required|string|max:45|unique:classifications,code',
            'name' => 'required|string|max:45',
            'description' => 'nullable|string|max:255',
            'reporting_types_id' => 'nullable|exists:reporting_types,id',
            'accounts_id' => 'nullable|exists:accounts,id',
            'status' => 'nullable|integer',
        ]);

        if (empty($validated['reporting_types_id'])) {
            $repType = ReportingType::firstOrCreate(['name' => 'General Reporting']);
            $validated['reporting_types_id'] = $repType->id;
        }

        if (empty($validated['accounts_id'])) {
            $account = Account::firstOrCreate(['code' => '1000'], ['name' => 'General Account']);
            $validated['accounts_id'] = $account->id;
        }

        $record = Classification::create($validated);

        return response()->json([
            'message' => 'Classification created successfully',
            'data' => $record->load(['reportingType', 'account']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Classification::with(['reportingType', 'account'])->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = Classification::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|required|string|max:45|unique:classifications,code,'.$id,
            'name' => 'sometimes|required|string|max:45',
            'description' => 'nullable|string|max:255',
            'reporting_types_id' => 'nullable|exists:reporting_types,id',
            'accounts_id' => 'nullable|exists:accounts,id',
            'status' => 'nullable|integer',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'Classification updated successfully',
            'data' => $record->load(['reportingType', 'account']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Classification::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Classification deleted successfully']);
    }
}
