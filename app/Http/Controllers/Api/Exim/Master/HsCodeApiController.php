<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Customs\HsCode;
use App\Models\Master\Customs\TypeRateBm;
use App\Models\Master\Customs\TypeRateCukai;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HsCodeApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = HsCode::with(['typeRateBm', 'typeRateCukai']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
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
            'name' => 'required|string|max:45|unique:hs_code,name',
            'description' => 'nullable|string|max:255',
            'rates_bm' => 'nullable|numeric',
            'rates_cukai' => 'nullable|numeric',
            'rates_ppn' => 'nullable|numeric',
            'rates_pph' => 'nullable|numeric',
            'rates_ppnbm' => 'nullable|numeric',
            'types_rates_bm_id' => 'nullable|exists:types_rates_bm,id',
            'types_rates_cukai_id' => 'nullable|exists:types_rates_cukai,id',
        ]);

        if (empty($validated['types_rates_bm_id'])) {
            $bm = TypeRateBm::firstOrCreate(['name' => 'ADVOLORUM']);
            $validated['types_rates_bm_id'] = $bm->id;
        }

        if (empty($validated['types_rates_cukai_id'])) {
            $cukai = TypeRateCukai::firstOrCreate(['name' => 'ADVOLORUM']);
            $validated['types_rates_cukai_id'] = $cukai->id;
        }

        $record = HsCode::create($validated);

        return response()->json([
            'message' => 'HS Code created successfully',
            'data' => $record->load(['typeRateBm', 'typeRateCukai']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = HsCode::with(['typeRateBm', 'typeRateCukai'])->findOrFail($id);
        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $record = HsCode::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:45|unique:hs_code,name,' . $id,
            'description' => 'nullable|string|max:255',
            'rates_bm' => 'nullable|numeric',
            'rates_cukai' => 'nullable|numeric',
            'rates_ppn' => 'nullable|numeric',
            'rates_pph' => 'nullable|numeric',
            'rates_ppnbm' => 'nullable|numeric',
            'types_rates_bm_id' => 'nullable|exists:types_rates_bm,id',
            'types_rates_cukai_id' => 'nullable|exists:types_rates_cukai,id',
        ]);

        $record->update($validated);

        return response()->json([
            'message' => 'HS Code updated successfully',
            'data' => $record->load(['typeRateBm', 'typeRateCukai']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = HsCode::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'HS Code deleted successfully']);
    }
}
