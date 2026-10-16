<?php

namespace App\Http\Controllers\Api\Procurement\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Partner\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierApiController extends Controller
{
    /**
     * Display a listing of suppliers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::with([
            'country',
            'paymentTerm',
            'paymentMethod',
            'currency',
            'port',
            'createdByUser',
        ]);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('npwp', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        $suppliers = $query->latest('id')->paginate($perPage);

        return response()->json([
            'data' => $suppliers->items(),
            'meta' => [
                'current_page' => $suppliers->currentPage(),
                'last_page' => $suppliers->lastPage(),
                'per_page' => $suppliers->perPage(),
                'total' => $suppliers->total(),
            ],
        ]);
    }

    /**
     * Store a newly created supplier.
     */
    public function store(Request $request): JsonResponse
    {
        // Normalize camelCase fields from frontend
        if ($request->has('supplierName') && !$request->has('name')) {
            $request->merge(['name' => $request->input('supplierName')]);
        }
        if ($request->has('supplierCode') && !$request->has('code')) {
            $request->merge(['code' => $request->input('supplierCode')]);
        }
        if ($request->has('contactPerson') && !$request->has('contact_person')) {
            $request->merge(['contact_person' => $request->input('contactPerson')]);
        }
        if ($request->has('telephoneNumber') && !$request->has('telephone_number')) {
            $request->merge(['telephone_number' => $request->input('telephoneNumber')]);
        }
        if ($request->has('wechatId') && !$request->has('wechat_id')) {
            $request->merge(['wechat_id' => $request->input('wechatId')]);
        }
        if ($request->has('country') && !$request->has('countries_id')) {
            $countryVal = $request->input('country');
            if (is_numeric($countryVal)) {
                $request->merge(['countries_id' => (int) $countryVal]);
            } elseif (!empty($countryVal)) {
                $country = \App\Models\Master\Partner\Country::firstOrCreate(['name' => trim($countryVal)]);
                $request->merge(['countries_id' => $country->id]);
            }
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'contact_person' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'countries_id' => 'nullable|exists:countries,id',
            'zipcode' => 'nullable|string|max:45',
            'email' => 'nullable|email|max:100',
            'telephone_number' => 'nullable|string|max:45',
            'payment_terms_id' => 'nullable|exists:payment_terms,id',
            'payment_methods_id' => 'nullable|exists:payment_methods,id',
            'rafaksi_types_id' => 'nullable|exists:rafaksi_types,id',
            'currencies_id' => 'nullable|exists:currencies,id',
            'ports_id' => 'nullable|exists:ports,id',
            'npwp' => 'nullable|string|max:45',
            'nitku' => 'nullable|string|max:45',
            'whatsapp' => 'nullable|string|max:45',
            'wechat_id' => 'nullable|string|max:45',
        ]);

        // Auto-generate code if empty
        if (empty($validated['code'])) {
            $nextId = (Supplier::max('id') ?? 0) + 1;
            $validated['code'] = 'SUP.' . str_pad((string) $nextId, 4, '0', STR_PAD_LEFT);
        }

        $validated['created_by'] = $request->user()?->id ?? 1;

        $supplier = Supplier::create($validated);

        return response()->json([
            'message' => 'Supplier created successfully',
            'data' => $supplier->load(['country', 'paymentTerm', 'paymentMethod', 'currency', 'port']),
        ], 201);
    }

    /**
     * Display the specified supplier.
     */
    public function show(int $id): JsonResponse
    {
        $supplier = Supplier::with([
            'country',
            'paymentTerm',
            'paymentMethod',
            'currency',
            'port',
            'createdByUser',
        ])->findOrFail($id);

        return response()->json(['data' => $supplier]);
    }

    /**
     * Update the specified supplier.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:500',
            'contact_person' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'countries_id' => 'nullable|exists:countries,id',
            'zipcode' => 'nullable|string|max:45',
            'email' => 'nullable|email|max:100',
            'telephone_number' => 'nullable|string|max:45',
            'payment_terms_id' => 'nullable|exists:payment_terms,id',
            'payment_methods_id' => 'nullable|exists:payment_methods,id',
            'rafaksi_types_id' => 'nullable|exists:rafaksi_types,id',
            'currencies_id' => 'nullable|exists:currencies,id',
            'ports_id' => 'nullable|exists:ports,id',
            'npwp' => 'nullable|string|max:45',
            'nitku' => 'nullable|string|max:45',
            'whatsapp' => 'nullable|string|max:45',
            'wechat_id' => 'nullable|string|max:45',
        ]);

        $supplier->update($validated);

        return response()->json([
            'message' => 'Supplier updated successfully',
            'data' => $supplier->load(['country', 'paymentTerm', 'paymentMethod', 'currency', 'port']),
        ]);
    }

    /**
     * Remove the specified supplier.
     */
    public function destroy(int $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();

        return response()->json(['message' => 'Supplier deleted successfully']);
    }
}
