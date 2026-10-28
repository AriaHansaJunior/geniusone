<?php

namespace App\Services\Procurement;

class ProcurementCalculationService
{
    /**
     * Calculate financial breakdown for a single PO item.
     *
     * @param  float  $price  Unit price
     * @param  float  $order  Quantity ordered
     * @param  float  $discountVal  Discount rate (%) or nominal value
     * @param  string  $discountType  'percentage' or 'nominal'
     * @param  float  $ppnRate  PPN rate (%) e.g. 11 or 12
     * @param  bool  $isKawasanBerikat  Whether PPN is suspended under customs facility
     * @param  float  $pphRate  PPh rate (%) e.g. 0.25, 0.5, 2.0
     * @param  bool  $isPphDeduction  Whether PPh deducts from payment
     * @param  float  $lme  LME price (USD)
     * @param  float  $optionalRate  Optional FX rate for LME
     * @param  float  $percentageLme  LME percentage (e.g. 40.0)
     */
    public static function calculateItemFinancials(
        float $price,
        float $order,
        float $discountVal = 0.0,
        string $discountType = 'percentage',
        float $ppnRate = 11.0,
        bool $isKawasanBerikat = false,
        float $pphRate = 0.0,
        bool $isPphDeduction = false,
        float $lme = 0.0,
        float $optionalRate = 0.0,
        float $percentageLme = 0.0
    ): array {
        $subtotal = round($price * $order, 2);

        // Calculate discount
        if ($discountType === 'percentage') {
            $discount = round(($subtotal * $discountVal) / 100, 2);
        } else {
            $discount = min($discountVal, $subtotal);
        }

        // DPP (Dasar Pengenaan Pajak)
        $dpp = max(0.0, round($subtotal - $discount, 2));

        // PPN (Pajak Pertambahan Nilai)
        $ppnAmount = 0.0;
        if (! $isKawasanBerikat && $ppnRate > 0) {
            $ppnAmount = round(($dpp * $ppnRate) / 100, 2);
        }

        // PPh (Pajak Penghasilan)
        $pphAmount = 0.0;
        if ($pphRate > 0) {
            $pphAmount = round(($dpp * $pphRate) / 100, 2);
        }

        // Total item before additional costs
        $total = $dpp;

        // Grand total computation
        $grandTotal = $dpp + $ppnAmount;
        if ($isPphDeduction) {
            $grandTotal -= $pphAmount;
        }

        return [
            'price' => $price,
            'order' => $order,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'dpp' => $dpp,
            'ppn_rate' => $ppnRate,
            'ppn_amount' => $ppnAmount,
            'is_kawasan_berikat' => $isKawasanBerikat,
            'pph_rate' => $pphRate,
            'pph_amount' => $pphAmount,
            'is_pph_deduction' => $isPphDeduction,
            'lme' => $lme,
            'optional_rate' => $optionalRate,
            'percentage_lme' => $percentageLme,
            'total' => $total,
            'grand_total' => round($grandTotal, 2),
        ];
    }

    /**
     * Compute entire Purchase Order order total including items & additional costs.
     *
     * @param  array  $items  Array of calculated item financials
     * @param  array  $additionalCosts  Array of additional cost items ['value' => 50000]
     */
    public static function calculateOrderGrandTotals(array $items, array $additionalCosts = []): array
    {
        $sumSubtotal = 0.0;
        $sumDiscount = 0.0;
        $sumDpp = 0.0;
        $sumPpn = 0.0;
        $sumPph = 0.0;
        $sumAdditionalCosts = 0.0;

        foreach ($items as $item) {
            $sumSubtotal += $item['subtotal'] ?? 0;
            $sumDiscount += $item['discount'] ?? 0;
            $sumDpp += $item['dpp'] ?? 0;
            $sumPpn += $item['ppn_amount'] ?? 0;
            $sumPph += $item['pph_amount'] ?? 0;
        }

        foreach ($additionalCosts as $cost) {
            $sumAdditionalCosts += (float) ($cost['value'] ?? 0);
        }

        $orderGrandTotal = round($sumDpp + $sumPpn + $sumAdditionalCosts, 2);

        return [
            'subtotal' => round($sumSubtotal, 2),
            'discount' => round($sumDiscount, 2),
            'dpp' => round($sumDpp, 2),
            'total_ppn' => round($sumPpn, 2),
            'total_pph' => round($sumPph, 2),
            'total_additional_cost' => round($sumAdditionalCosts, 2),
            'grand_total' => $orderGrandTotal,
            'item_count' => count($items),
        ];
    }
}
