<?php

namespace App\Services\DocumentNumber;

use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DocumentNumberGenerator
{
    /**
     * Map month integer (1-12) to Roman numeral.
     */
    public static function getRomanMonth(int $month): string
    {
        $map = [
            1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV',
            5 => 'V', 6 => 'VI', 7 => 'VII', 8 => 'VIII',
            9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
        ];

        return $map[$month] ?? 'I';
    }

    /**
     * Generate Purchase Requisition Number:
     * Format: {SEQ}/PR-IMLI/{ROMAN_MONTH}/{YEAR}
     * Example: 0026/PR-IMLI/X/2026
     */
    public static function generatePrNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $year = $date->year;
        $month = $date->month;
        $roman = self::getRomanMonth($month);

        $count = DB::table('purchase_requisitions')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->count();

        $sequence = str_pad($count + 1, 4, '0', STR_PAD_LEFT);

        return "{$sequence}/PR-IMLI/{$roman}/{$year}";
    }

    /**
     * Generate Purchase Order Number:
     * Format: POL-{MMYY}-{SEQ}
     * Example: POL-1026-0040
     */
    public static function generatePoNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $mmyy = $date->format('my'); // e.g., 1026 for Oct 2026

        $count = DB::table('purchase_order')
            ->whereYear('created_at', $date->year)
            ->whereMonth('created_at', $date->month)
            ->count();

        $sequence = str_pad($count + 1, 4, '0', STR_PAD_LEFT);

        return "POL-{$mmyy}-{$sequence}";
    }

    /**
     * Generate Receive Note (RN) Number:
     * Format: {SEQ}/RN-IMLI/{ROMAN_MONTH}/{YEAR}
     * Example: 0131/RN-IMLI/X/2026
     */
    public static function generateRnNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $year = $date->year;
        $month = $date->month;
        $roman = self::getRomanMonth($month);

        $count = DB::table('receive_note')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->count();

        $sequence = str_pad($count + 1, 4, '0', STR_PAD_LEFT);

        return "{$sequence}/RN-IMLI/{$roman}/{$year}";
    }

    /**
     * Generate Warehouse BPB Number:
     * Format: {SEQ}/WHIN-IMLI/G/{ROMAN_MONTH}/{YEAR}
     * Example: 0138/WHIN-IMLI/G/X/2026
     */
    public static function generateBpbNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $year = $date->year;
        $month = $date->month;
        $roman = self::getRomanMonth($month);

        $count = DB::table('bpb_receive_material')
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->count();

        $sequence = str_pad($count + 1, 4, '0', STR_PAD_LEFT);

        return "{$sequence}/WHIN-IMLI/G/{$roman}/{$year}";
    }
}
