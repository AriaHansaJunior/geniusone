<?php

namespace App\Kurs;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller for Kurs API endpoints.
 * Resides completely within app/Kurs and can be removed cleanly.
 */
class KursApiController extends Controller
{
    protected FrankfurterKursService $service;

    public function __construct(FrankfurterKursService $service)
    {
        $this->service = $service;
    }

    /**
     * Get exchange rate records for dashboard table and trend chart.
     */
    public function index(Request $request): JsonResponse
    {
        $startDate = (string) $request->query('startDate', date('Y-m-01'));
        $endDate = (string) $request->query('endDate', date('Y-m-t'));
        $currency = (string) $request->query('currency', 'All Currencies');
        $rateType = (string) $request->query('rateType', 'All Rate Types');

        $records = $this->service->getExchangeRates($startDate, $endDate, $currency, $rateType);

        return response()->json([
            'status' => 'success',
            'data' => $records,
            'meta' => [
                'total' => count($records),
                'source' => 'Frankfurter API (European Central Bank Reference Feed) & World Currencies',
                'start_date' => $startDate,
                'end_date' => $endDate,
                'currency' => $currency,
                'rate_type' => $rateType,
            ],
        ]);
    }

    /**
     * Get latest USD to IDR rate specifically.
     */
    public function latestUsd(): JsonResponse
    {
        $data = $this->service->getLatestUsdToIdr();

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Get list of all supported world currencies.
     */
    public function currencies(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->service->getSupportedCurrencies(),
        ]);
    }
}
