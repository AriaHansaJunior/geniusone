<?php

namespace App\Http\Controllers\Api\Procurement\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Finance\Pph;
use App\Models\Master\Finance\PphType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PphApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Pph::with('type');

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
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
            'name' => 'required|string|max:45|unique:pph,name',
            'value' => 'required|numeric',
            'deduction' => 'nullable|in:yes,no,-',
            'status' => 'nullable|string|max:45',
            'pph_type_id' => 'nullable|exists:pph_type,id',
        ]);

        if (empty($validated['pph_type_id'])) {
            $defaultType = PphType::firstOrCreate(['nama' => 'PPH Umum']);
            $validated['pph_type_id'] = $defaultType->id;
        }

        if (($validated['deduction'] ?? '') === '-') {
            $validated['deduction'] = 'no';
        }

        $record = Pph::create($validated);

        return response()->json([
            'message' => 'PPh tax rate created successfully',
            'data' => $record->load('type'),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Pph::with('type')->findOrFail($id);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = Pph::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:45|unique:pph,name,' . $id,
            'value' => 'sometimes|required|numeric',
            'deduction' => 'nullable|in:yes,no,-',
            'status' => 'nullable|string|max:45',
            'pph_type_id' => 'nullable|exists:pph_type,id',
        ]);

        if (isset($validated['deduction']) && $validated['deduction'] === '-') {
            $validated['deduction'] = 'no';
        }

        $record->update($validated);

        return response()->json([
            'message' => 'PPh tax rate updated successfully',
            'data' => $record->load('type'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Pph::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'PPh tax rate deleted successfully']);
    }
}
