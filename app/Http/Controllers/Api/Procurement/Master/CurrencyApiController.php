<?php

namespace App\Http\Controllers\Api\Procurement\Master;

use App\Http\Controllers\Controller;
use App\Models\Common\ExchangeRate;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\Valuta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrencyApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Valuta::with(['createdByUser', 'updatedByUser']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('symbol', 'like', "%{$search}%");
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
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:45|unique:valutas,code',
            'name' => 'required|string|max:45|unique:valutas,name',
            'symbol' => 'nullable|string|max:15',
            'sync_status' => 'nullable|string|max:30',
            'status' => 'nullable|integer',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));
        $validated['created_by'] = $actorId;
        $validated['updated_by'] = $actorId;

        $record = Valuta::create($validated);

        Currency::firstOrCreate(
            ['name' => $validated['code']],
            ['status' => $validated['status'] ?? 1]
        );

        return response()->json([
            'message' => 'Currency created successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $record = Valuta::with(['createdByUser', 'updatedByUser'])->findOrFail($id);

        return response()->json(['data' => $record]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Valuta::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|required|string|max:45|unique:valutas,code,'.$id,
            'name' => 'sometimes|required|string|max:45|unique:valutas,name,'.$id,
            'symbol' => 'nullable|string|max:15',
            'sync_status' => 'nullable|string|max:30',
            'status' => 'nullable|integer',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }
        $validated['updated_by'] = $actorId;

        $record->update($validated);

        return response()->json([
            'message' => 'Currency updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $record = Valuta::findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Currency deleted successfully']);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Valuta::findOrFail($id);
        $record->status = (int) $record->status === 1 ? 0 : 1;
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'message' => 'Currency status updated successfully',
            'data' => $record->load(['createdByUser', 'updatedByUser']),
        ]);
    }

    /**
     * Synchronize valuta record with latest ExchangeRate stored in database.
     */
    public function sync(Request $request, int $id): JsonResponse
    {
        $actorId = $this->requireActorId($request);
        $record = Valuta::findOrFail($id);

        $code = strtoupper(trim((string) $record->code));
        $currency = Currency::where('name', $code)->first();

        $latestRate = $currency
            ? ExchangeRate::where('currencies_id', $currency->id)
                ->orderByDesc('rate_date')
                ->orderByDesc('id')
                ->first()
            : null;

        if ($request->filled('middle_rate') && $currency) {
            $middle = (float) $request->input('middle_rate');
            if ($middle > 0) {
                $latestRate = ExchangeRate::create([
                    'currencies_id' => $currency->id,
                    'rate_date' => $request->input('rate_date', now()->toDateString()),
                    'rate_type' => $request->input('rate_type', 'KURS TENGAH BI'),
                    'buy_rate' => (float) ($request->input('buy_rate', $middle)),
                    'sell_rate' => (float) ($request->input('sell_rate', $middle)),
                    'middle_rate' => $middle,
                    'source' => $request->input('source', 'Master Currency Sync'),
                    'created_by' => $actorId,
                ]);
            }
        }

        $record->sync_status = ($latestRate || $code === 'IDR') ? 'Synced' : 'No Rate Found';
        $record->last_synced_at = now();
        $record->updated_by = $actorId;
        $record->save();

        return response()->json([
            'status' => 'success',
            'message' => $latestRate
                ? "Currency {$code} synchronized with DB rate ({$latestRate->middle_rate})."
                : ($code === 'IDR' ? 'Base currency IDR synchronized.' : "No exchange rate found in DB for {$code}."),
            'data' => $record->load(['createdByUser', 'updatedByUser']),
            'latest_rate' => $latestRate,
        ]);
    }
}
