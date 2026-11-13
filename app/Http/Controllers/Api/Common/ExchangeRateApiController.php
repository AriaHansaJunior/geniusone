<?php

namespace App\Http\Controllers\Api\Common;

use App\Http\Controllers\Controller;
use App\Models\Common\ExchangeRate;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\Valuta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExchangeRateApiController extends Controller
{
    /**
     * Query DB-stored exchange rate history from exchange_rates table.
     */
    public function index(Request $request): JsonResponse
    {
        $startDate = $request->query('startDate');
        $endDate = $request->query('endDate');
        $currencyCode = trim((string) $request->query('currency', 'All Currencies'));
        $rateType = trim((string) $request->query('rateType', 'All Rate Types'));

        $valutaNames = Valuta::pluck('name', 'code')->toArray();

        $query = ExchangeRate::with('currency')
            ->orderByDesc('rate_date')
            ->orderBy('currencies_id');

        if (! empty($startDate)) {
            $query->whereDate('rate_date', '>=', $startDate);
        }
        if (! empty($endDate)) {
            $query->whereDate('rate_date', '<=', $endDate);
        }
        if (! empty($currencyCode) && strcasecmp($currencyCode, 'All Currencies') !== 0 && strtolower($currencyCode) !== 'all') {
            $code = strtoupper($currencyCode);
            $query->whereHas('currency', fn ($cq) => $cq->where('name', $code));
        }

        if (! empty($rateType) && strcasecmp($rateType, 'All Rate Types') !== 0 && strtolower($rateType) !== 'all') {
            $normalized = strtoupper($rateType);
            if (str_contains($normalized, 'BI') || str_contains($normalized, 'TENGAH') || str_contains($normalized, 'BANK INDONESIA')) {
                $query->where(fn ($q) => $q->where('rate_type', 'KURS TENGAH BI')->orWhere('rate_type', 'like', '%BI%'));
            } elseif (str_contains($normalized, 'KMK') || str_contains($normalized, 'PAJAK')) {
                $query->where(fn ($q) => $q->where('rate_type', 'KURS PAJAK')->orWhere('rate_type', 'like', '%KMK%')->orWhere('rate_type', 'like', '%PAJAK%'));
            } elseif (str_contains($normalized, 'COMMERCIAL') || str_contains($normalized, 'KOMERSIAL')) {
                $query->where(fn ($q) => $q->where('rate_type', 'like', '%Commercial%')->orWhere('rate_type', 'like', '%Komersial%'));
            } else {
                $query->where('rate_type', $rateType);
            }
        }

        $rows = $query->get()->map(fn (ExchangeRate $er) => $this->transformRow($er, $valutaNames));

        return response()->json([
            'status' => 'success',
            'data' => $rows,
            'meta' => [
                'total' => $rows->count(),
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    /**
     * Get latest DB rate per currency.
     * GET /api/dashboard/exchange-rates/latest
     */
    public function latest(Request $request): JsonResponse
    {
        $valutaNames = Valuta::pluck('name', 'code')->toArray();
        $currencies = Currency::where('status', 1)->orderBy('name')->get();

        $rates = $currencies->map(function (Currency $c) use ($valutaNames) {
            $latest = ExchangeRate::with('currency')
                ->where('currencies_id', $c->id)
                ->orderByDesc('rate_date')
                ->orderByDesc('id')
                ->first();

            $code = strtoupper(trim((string) $c->name));

            return [
                'currencies_id' => $c->id,
                'currency_code' => $code,
                'currency_name' => $valutaNames[$code] ?? $code,
                'middle_rate' => $latest ? (float) $latest->middle_rate : ($code === 'IDR' ? 1.0 : 0.0),
                'buy_rate' => $latest ? (float) $latest->buy_rate : ($code === 'IDR' ? 1.0 : 0.0),
                'sell_rate' => $latest ? (float) $latest->sell_rate : ($code === 'IDR' ? 1.0 : 0.0),
                'rate_type' => $latest?->rate_type ?? 'KURS TENGAH BI',
                'rate_date' => $latest?->rate_date?->format('Y-m-d'),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $rates,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $actorId = $this->requireActorId($request);

        $validated = $request->validate([
            'currencies_id' => 'nullable|integer|exists:currencies,id',
            'currency_code' => 'required_without:currencies_id|string|max:20',
            'rate_date' => 'required|date',
            'rate_type' => 'required|string|max:60',
            'buy_rate' => 'nullable|numeric|min:0',
            'sell_rate' => 'nullable|numeric|min:0',
            'middle_rate' => 'required|numeric|gt:0',
            'source' => 'nullable|string|max:100',
        ]);

        $currencyId = $validated['currencies_id'] ?? null;
        if (! $currencyId && ! empty($validated['currency_code'])) {
            $currency = Currency::firstOrCreate(
                ['name' => strtoupper(trim($validated['currency_code']))],
                ['status' => 1]
            );
            $currencyId = $currency->id;
        }

        $record = ExchangeRate::create([
            'currencies_id' => $currencyId,
            'rate_date' => $validated['rate_date'],
            'rate_type' => $validated['rate_type'],
            'buy_rate' => (float) ($validated['buy_rate'] ?? $validated['middle_rate']),
            'sell_rate' => (float) ($validated['sell_rate'] ?? $validated['middle_rate']),
            'middle_rate' => (float) $validated['middle_rate'],
            'source' => $validated['source'] ?? 'Manual Entry',
            'created_by' => $actorId,
        ]);

        $valutaNames = Valuta::pluck('name', 'code')->toArray();

        return response()->json([
            'status' => 'success',
            'message' => 'Exchange rate recorded.',
            'data' => $this->transformRow($record->load('currency'), $valutaNames),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = ExchangeRate::findOrFail($id);

        $validated = $request->validate([
            'rate_date' => 'sometimes|date',
            'rate_type' => 'sometimes|string|max:60',
            'buy_rate' => 'nullable|numeric|min:0',
            'sell_rate' => 'nullable|numeric|min:0',
            'middle_rate' => 'sometimes|numeric|gt:0',
            'source' => 'nullable|string|max:100',
        ]);

        $record->fill($validated);
        $record->save();

        $valutaNames = Valuta::pluck('name', 'code')->toArray();

        return response()->json([
            'status' => 'success',
            'message' => 'Exchange rate updated.',
            'data' => $this->transformRow($record->load('currency'), $valutaNames),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->requireActorId($request);
        $record = ExchangeRate::findOrFail($id);
        $record->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Exchange rate deleted.',
        ]);
    }

    private function transformRow(ExchangeRate $er, array $valutaNames): array
    {
        $code = strtoupper(trim((string) ($er->currency?->name ?? '')));
        $rateType = (string) $er->rate_type;
        $flag = str_contains(strtoupper($rateType), 'PAJAK') || str_contains(strtoupper($rateType), 'KMK')
            ? 'KMK Valuation'
            : (str_contains(strtoupper($rateType), 'COMMERCIAL') ? 'Commercial Counter' : 'BI Reference');

        return [
            'id' => (string) $er->id,
            'rawId' => $er->id,
            'currencies_id' => $er->currencies_id,
            'rate_date' => $er->rate_date?->format('Y-m-d') ?? '',
            'currency_code' => $code,
            'currency_name' => $valutaNames[$code] ?? $code,
            'rate_type' => $rateType,
            'rate' => (float) $er->middle_rate,
            'middle_rate' => (float) $er->middle_rate,
            'tax_rate' => (float) $er->middle_rate,
            'buy_rate' => (float) $er->buy_rate,
            'buying_rate' => (float) $er->buy_rate,
            'sell_rate' => (float) $er->sell_rate,
            'selling_rate' => (float) $er->sell_rate,
            'flag' => $flag,
            'source' => $er->source ?? 'Database',
            'availability' => 'Available',
            'note' => $er->source ? "Source: {$er->source} ({$code})" : "Rate for {$code}",
        ];
    }
}
