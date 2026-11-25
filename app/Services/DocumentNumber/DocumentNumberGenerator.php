<?php

namespace App\Services\DocumentNumber;

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
        $suffix = "/PR-IMLI/{$roman}/{$year}";

        return self::generateSequentialCode(
            table: 'purchase_requisitions',
            column: 'pr_number',
            year: $year,
            month: $month,
            likePattern: '%'.$suffix,
            formatter: fn (int $seq) => str_pad((string) $seq, 4, '0', STR_PAD_LEFT).$suffix,
            sequenceExtractor: fn (string $code) => preg_match('/^(\d+)\//', $code, $m) ? (int) $m[1] : 0,
        );
    }

    /**
     * Generate Purchase Order Number:
     * Format: POL-{MMYY}-{SEQ}
     * Example: POL-1026-0040
     */
    public static function generatePoNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $mmyy = $date->format('my');
        $prefix = "POL-{$mmyy}-";

        return self::generateSequentialCode(
            table: 'purchase_order',
            column: 'po_number',
            year: $date->year,
            month: $date->month,
            likePattern: $prefix.'%',
            formatter: fn (int $seq) => $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
            sequenceExtractor: fn (string $code) => preg_match('/-(\d+)$/', $code, $m) ? (int) $m[1] : 0,
        );
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
        $suffix = "/RN-IMLI/{$roman}/{$year}";

        return self::generateSequentialCode(
            table: 'receive_note',
            column: 'rn_number',
            year: $year,
            month: $month,
            likePattern: '%'.$suffix,
            formatter: fn (int $seq) => str_pad((string) $seq, 4, '0', STR_PAD_LEFT).$suffix,
            sequenceExtractor: fn (string $code) => preg_match('/^(\d+)\//', $code, $m) ? (int) $m[1] : 0,
        );
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
        $suffix = "/WHIN-IMLI/G/{$roman}/{$year}";

        return self::generateSequentialCode(
            table: 'bpb_receive_material',
            column: 'bpb_number',
            year: $year,
            month: $month,
            likePattern: '%'.$suffix,
            formatter: fn (int $seq) => str_pad((string) $seq, 4, '0', STR_PAD_LEFT).$suffix,
            sequenceExtractor: fn (string $code) => preg_match('/^(\d+)\//', $code, $m) ? (int) $m[1] : 0,
        );
    }

    /**
     * Generate Transfer Stock Return Number:
     * Format: {SEQ}/TSR-IMLI/{ROMAN_MONTH}/{YEAR}
     */
    public static function generateTransferReturnNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $year = $date->year;
        $month = $date->month;
        $roman = self::getRomanMonth($month);
        $suffix = "/TSR-IMLI/{$roman}/{$year}";

        return self::generateSequentialCode(
            table: 'transfer_stock_returns',
            column: 'return_number',
            year: $year,
            month: $month,
            likePattern: '%'.$suffix,
            formatter: fn (int $seq) => str_pad((string) $seq, 4, '0', STR_PAD_LEFT).$suffix,
            sequenceExtractor: fn (string $code) => preg_match('/^(\d+)\//', $code, $m) ? (int) $m[1] : 0,
        );
    }

    /**
     * Generate Receive Note Return Number:
     * Format: {SEQ}/RNR-IMLI/{ROMAN_MONTH}/{YEAR}
     */
    public static function generateReceiveNoteReturnNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $year = $date->year;
        $month = $date->month;
        $roman = self::getRomanMonth($month);
        $suffix = "/RNR-IMLI/{$roman}/{$year}";

        return self::generateSequentialCode(
            table: 'receive_note_returns',
            column: 'rn_number',
            year: $year,
            month: $month,
            likePattern: '%'.$suffix,
            formatter: fn (int $seq) => str_pad((string) $seq, 4, '0', STR_PAD_LEFT).$suffix,
            sequenceExtractor: fn (string $code) => preg_match('/^(\d+)\//', $code, $m) ? (int) $m[1] : 0,
        );
    }

    /**
     * Generate Stock Adjustment Number:
     * Format: {SEQ}/ADJ-IMLI/{ROMAN_MONTH}/{YEAR}
     */
    public static function generateStockAdjustmentNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $year = $date->year;
        $month = $date->month;
        $roman = self::getRomanMonth($month);
        $suffix = "/ADJ-IMLI/{$roman}/{$year}";

        return self::generateSequentialCode(
            table: 'stock_adjustments',
            column: 'adjustment_number',
            year: $year,
            month: $month,
            likePattern: '%'.$suffix,
            formatter: fn (int $seq) => str_pad((string) $seq, 4, '0', STR_PAD_LEFT).$suffix,
            sequenceExtractor: fn (string $code) => preg_match('/^(\d+)\//', $code, $m) ? (int) $m[1] : 0,
        );
    }

    /**
     * Generate Berita Acara Closure Number:
     * Format: {SEQ}/BA-IMLI/{ROMAN_MONTH}/{YEAR}
     */
    public static function generateBeritaAcaraNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $year = $date->year;
        $month = $date->month;
        $roman = self::getRomanMonth($month);
        $suffix = "/BA-IMLI/{$roman}/{$year}";

        return self::generateSequentialCode(
            table: 'po_service_closures',
            column: 'berita_acara_number',
            year: $year,
            month: $month,
            likePattern: '%'.$suffix,
            formatter: fn (int $seq) => str_pad((string) $seq, 4, '0', STR_PAD_LEFT).$suffix,
            sequenceExtractor: fn (string $code) => preg_match('/^(\d+)\//', $code, $m) ? (int) $m[1] : 0,
        );
    }

    /**
     * Generate Warehouse Stock Transfer Number:
     * Format: {SEQ}/WT-IMLI/{ROMAN_MONTH}/{YEAR}
     */
    public static function generateWarehouseTransferNumber(?Carbon $date = null): string
    {
        $date = $date ?? Carbon::now();
        $year = $date->year;
        $month = $date->month;
        $roman = self::getRomanMonth($month);
        $suffix = "/WT-IMLI/{$roman}/{$year}";

        return self::generateSequentialCode(
            table: 'warehouse_stock_transfers',
            column: 'transfer_number',
            year: $year,
            month: $month,
            likePattern: '%'.$suffix,
            formatter: fn (int $seq) => str_pad((string) $seq, 4, '0', STR_PAD_LEFT).$suffix,
            sequenceExtractor: fn (string $code) => preg_match('/^(\d+)\//', $code, $m) ? (int) $m[1] : 0,
        );
    }

    /**
     * Generate the next collision-free document sequence number.
     */
    private static function generateSequentialCode(
        string $table,
        string $column,
        int $year,
        int $month,
        string $likePattern,
        callable $formatter,
        callable $sequenceExtractor
    ): string {
        $existingQuery = DB::table($table)->where($column, 'like', $likePattern);
        if (DB::transactionLevel() > 0) {
            $existingQuery->lockForUpdate();
        }
        $existingCodes = $existingQuery->pluck($column);

        $maxSeq = 0;
        foreach ($existingCodes as $code) {
            $seq = (int) $sequenceExtractor((string) $code);
            if ($seq > $maxSeq) {
                $maxSeq = $seq;
            }
        }

        $monthCount = DB::table($table)
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->count();

        $next = max($maxSeq, $monthCount);

        do {
            $next++;
            $candidate = (string) $formatter($next);
        } while (DB::table($table)->where($column, $candidate)->exists());

        return $candidate;
    }
}
