<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemApiController extends Controller
{
    /**
     * List master items with rich relations for the Item table & picker modal.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Item::with([
            'classification',
            'category',
            'facility',
            'unitOfMeasurement',
            'smallestUnit',
            'greatestUnit',
            'createdByUser',
        ]);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('external_code', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $status = $request->query('status');
            if ($status === 'Active' || $status === '1') {
                $query->where('status', 1);
            } elseif ($status === 'Inactive' || $status === '0') {
                $query->where('status', 0);
            }
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

    /**
     * Store new master item.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:45|unique:items,code',
            'external_code' => 'nullable|string|max:45',
            'categories_id' => 'nullable|exists:categories,id',
            'classifications_id' => 'required|exists:classifications,id',
            'facilities_id' => 'required|exists:facilities,id',
            'item_types_id' => 'nullable|exists:item_types,id',
            'units_of_measurements_id' => 'required|exists:units_of_measurements,id',
            'smallest_unit_id' => 'nullable|exists:units_of_measurements,id',
            'greatest_unit_id' => 'nullable|exists:units_of_measurements,id',
            'unit_conversion' => 'nullable|numeric',
            'netto' => 'nullable|numeric',
            'colours_id' => 'nullable|exists:colours,id',
            'brands_id' => 'nullable|exists:brands,id',
            'styles_id' => 'nullable|exists:styles,id',
            'customs_reports_id' => 'nullable|exists:customs_reports,id',
            'hs_code_id' => 'nullable|exists:hs_code,id',
            'job_number_id' => 'nullable|exists:job_number,id',
            'trace_by_lot' => 'nullable|integer',
            'status' => 'nullable|integer',
            'stock' => 'nullable|numeric',
        ]);

        if (empty($validated['code'])) {
            $nextId = (Item::max('id') ?? 0) + 1;
            $validated['code'] = 'ITM.' . str_pad((string) $nextId, 5, '0', STR_PAD_LEFT);
        }

        if (empty($validated['item_types_id'])) {
            $firstType = \App\Models\Master\Material\ItemType::first();
            $validated['item_types_id'] = $firstType?->id ?? 1;
        }

        $validated['created_by'] = $request->user()?->id ?? 1;

        $item = Item::create($validated);

        return response()->json([
            'message' => 'Item created successfully',
            'data' => $item->load(['classification', 'category', 'facility', 'unitOfMeasurement']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $item = Item::with([
            'classification',
            'category',
            'facility',
            'unitOfMeasurement',
            'smallestUnit',
            'greatestUnit',
            'createdByUser',
            'jobNumber',
        ])->findOrFail($id);

        return response()->json(['data' => $item]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = Item::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:45|unique:items,code,' . $id,
            'external_code' => 'nullable|string|max:45',
            'categories_id' => 'nullable|exists:categories,id',
            'classifications_id' => 'nullable|exists:classifications,id',
            'facilities_id' => 'nullable|exists:facilities,id',
            'item_types_id' => 'nullable|exists:item_types,id',
            'units_of_measurements_id' => 'nullable|exists:units_of_measurements,id',
            'smallest_unit_id' => 'nullable|exists:units_of_measurements,id',
            'greatest_unit_id' => 'nullable|exists:units_of_measurements,id',
            'unit_conversion' => 'nullable|numeric',
            'netto' => 'nullable|numeric',
            'colours_id' => 'nullable|exists:colours,id',
            'brands_id' => 'nullable|exists:brands,id',
            'styles_id' => 'nullable|exists:styles,id',
            'customs_reports_id' => 'nullable|exists:customs_reports,id',
            'hs_code_id' => 'nullable|exists:hs_code,id',
            'job_number_id' => 'nullable|exists:job_number,id',
            'trace_by_lot' => 'nullable|integer',
            'status' => 'nullable|integer',
            'stock' => 'nullable|numeric',
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Item updated successfully',
            'data' => $item->load(['classification', 'category', 'facility', 'unitOfMeasurement']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $item = Item::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Item deleted successfully']);
    }
}
