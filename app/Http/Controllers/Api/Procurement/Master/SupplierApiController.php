<?php

namespace App\Http\Controllers\Api\Procurement\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\RafaksiType;
use App\Models\Master\Partner\Country;
use App\Models\Master\Partner\Port;
use App\Models\Master\Partner\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::with([
            'country',
            'paymentTerm',
            'paymentMethod',
            'currency',
            'port',
            'rafaksiType',
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

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $this->normalizeSupplierInputs($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100|unique:supliers,code',
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
            'status' => 'nullable|integer',
        ]);

        $fkDefaults = [
            'countries_id' => Country::class,
            'payment_terms_id' => PaymentTerm::class,
            'payment_methods_id' => PaymentMethod::class,
            'rafaksi_types_id' => RafaksiType::class,
            'currencies_id' => Currency::class,
            'ports_id' => Port::class,
        ];

        foreach ($fkDefaults as $field => $modelClass) {
            if (empty($validated[$field])) {
                $defaultId = $modelClass::query()->orderBy('id')->value('id');
                if (! $defaultId) {
                    return response()->json([
                        'message' => "Reference master for {$field} is empty. Seed master tables first.",
                    ], 422);
                }
                $validated[$field] = $defaultId;
            }
        }

        if (empty($validated['code'])) {
            $nextId = (Supplier::max('id') ?? 0) + 1;
            $validated['code'] = 'SUP.'.str_pad((string) $nextId, 4, '0', STR_PAD_LEFT);
        }

        $validated['created_by'] = $actorId;

        $supplier = Supplier::create($validated);

        return response()->json([
            'message' => 'Supplier created successfully',
            'data' => $supplier->load(['country', 'paymentTerm', 'paymentMethod', 'currency', 'port', 'rafaksiType', 'createdByUser']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $supplier = Supplier::with([
            'country',
            'paymentTerm',
            'paymentMethod',
            'currency',
            'port',
            'rafaksiType',
            'createdByUser',
        ])->findOrFail($id);

        return response()->json(['data' => $supplier]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $supplier = Supplier::findOrFail($id);
        $this->normalizeSupplierInputs($request);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:100|unique:supliers,code,'.$id,
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
            'status' => 'nullable|integer',
        ]);

        $supplier->update($validated);

        return response()->json([
            'message' => 'Supplier updated successfully',
            'data' => $supplier->load(['country', 'paymentTerm', 'paymentMethod', 'currency', 'port', 'rafaksiType', 'createdByUser']),
        ]);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $supplier = Supplier::findOrFail($id);
        $supplier->status = (int) $supplier->status === 1 ? 0 : 1;
        $supplier->save();

        return response()->json([
            'message' => 'Supplier status updated successfully',
            'data' => $supplier->load(['country', 'paymentTerm', 'paymentMethod', 'currency', 'port', 'rafaksiType', 'createdByUser']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();

        return response()->json(['message' => 'Supplier deleted successfully']);
    }

    private function normalizeSupplierInputs(Request $request): void
    {
        $aliases = [
            'supplierName' => 'name',
            'supplierCode' => 'code',
            'contactPerson' => 'contact_person',
            'telephoneNumber' => 'telephone_number',
            'wechatId' => 'wechat_id',
        ];
        foreach ($aliases as $from => $to) {
            if ($request->has($from) && ! $request->has($to)) {
                $request->merge([$to => $request->input($from)]);
            }
        }

        $lookups = [
            ['keys' => ['country'], 'fk' => 'countries_id', 'model' => Country::class, 'cols' => ['name', 'code']],
            ['keys' => ['payment_term', 'paymentTerm'], 'fk' => 'payment_terms_id', 'model' => PaymentTerm::class, 'cols' => ['name']],
            ['keys' => ['payment_method', 'paymentMethod'], 'fk' => 'payment_methods_id', 'model' => PaymentMethod::class, 'cols' => ['name']],
            ['keys' => ['rafaksi_type', 'rafaksiType'], 'fk' => 'rafaksi_types_id', 'model' => RafaksiType::class, 'cols' => ['name', 'code']],
            ['keys' => ['currency'], 'fk' => 'currencies_id', 'model' => Currency::class, 'cols' => ['name']],
            ['keys' => ['port'], 'fk' => 'ports_id', 'model' => Port::class, 'cols' => ['name']],
        ];

        foreach ($lookups as $lookup) {
            if ($request->filled($lookup['fk'])) {
                continue;
            }
            foreach ($lookup['keys'] as $key) {
                if (! $request->filled($key)) {
                    continue;
                }
                $val = trim((string) $request->input($key));
                if ($val === '' || $val === '-' || $val === '—' || in_array(strtolower($val), ['none', 'n/a', 'null'], true)) {
                    continue;
                }
                if (is_numeric($val)) {
                    $request->merge([$lookup['fk'] => (int) $val]);
                } else {
                    $model = $lookup['model'];
                    $lower = strtolower($val);
                    $normalized = str_replace('_', ' ', $lower);
                    $found = $model::query()->where(function ($q) use ($lookup, $lower, $normalized) {
                        foreach ($lookup['cols'] as $col) {
                            $q->orWhereRaw("LOWER({$col}) = ?", [$lower])
                                ->orWhereRaw("LOWER({$col}) = ?", [$normalized]);
                        }
                    })->first();
                    if (! $found) {
                        $found = $model::query()->where(function ($q) use ($lookup, $normalized) {
                            foreach ($lookup['cols'] as $col) {
                                $q->orWhereRaw("LOWER({$col}) LIKE ?", ["%{$normalized}%"]);
                            }
                        })->first();
                    }
                    if (! $found) {
                        abort(response()->json([
                            'message' => "Referenced master '{$val}' was not found for {$lookup['fk']}.",
                        ], 422));
                    }
                    $request->merge([$lookup['fk'] => $found->id]);
                }
                break;
            }
        }
    }
}
