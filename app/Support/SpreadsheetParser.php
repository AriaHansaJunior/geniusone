<?php

namespace App\Support;

use RuntimeException;
use ZipArchive;

class SpreadsheetParser
{
    /**
     * Parse a CSV or TXT file into associative rows keyed by header row.
     *
     * @return array<int, array<string, string>>
     */
    public static function parseCsv(string $filePath, bool $lowercaseHeaders = false): array
    {
        $rows = [];
        if (! file_exists($filePath) || ! is_readable($filePath)) {
            return $rows;
        }

        if (($handle = fopen($filePath, 'r')) !== false) {
            $headers = null;
            while (($data = fgetcsv($handle, 4096, ',')) !== false) {
                if ($headers === null) {
                    $headers = array_map(function ($h) use ($lowercaseHeaders) {
                        $trimmed = trim((string) preg_replace('/^\xEF\xBB\xBF/', '', (string) $h));

                        return $lowercaseHeaders ? strtolower($trimmed) : $trimmed;
                    }, $data);

                    continue;
                }

                if (count($data) >= 1 && ! empty(array_filter($data, fn ($v) => $v !== null && trim((string) $v) !== ''))) {
                    $assoc = [];
                    foreach ($headers as $i => $header) {
                        if ($header !== '') {
                            $assoc[$header] = $data[$i] ?? '';
                        }
                    }
                    if (! empty($assoc)) {
                        $rows[] = $assoc;
                    }
                }
            }
            fclose($handle);
        }

        return $rows;
    }

    /**
     * Parse an XLSX file into coordinate-aligned associative rows keyed by header row.
     * Uses ZipArchive when available or pure-PHP zlib fallback via SimpleXlsxZip.
     *
     * @return array<int, array<string, string>>
     */
    public static function parseXlsx(string $filePath, bool $lowercaseHeaders = false): array
    {
        $sharedStringsXml = null;
        $sheetXml = null;

        if (class_exists(ZipArchive::class)) {
            $zip = new ZipArchive;
            if ($zip->open($filePath) !== true) {
                return [];
            }
            $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml') ?: null;
            $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml') ?: null;
            $zip->close();
        } else {
            if (! function_exists('gzinflate')) {
                throw new RuntimeException('XLSX parsing requires ext-zip or PHP zlib extension.');
            }
            $entries = SimpleXlsxZip::extractEntries($filePath);
            $sharedStringsXml = $entries['xl/sharedStrings.xml'] ?? null;
            $sheetXml = $entries['xl/worksheets/sheet1.xml'] ?? null;
        }

        $sharedStrings = [];
        if ($sharedStringsXml) {
            $xml = @simplexml_load_string($sharedStringsXml);
            if ($xml && isset($xml->si)) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $run) {
                            $text .= (string) ($run->t ?? '');
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        if (! $sheetXml) {
            return [];
        }

        $xml = @simplexml_load_string($sheetXml);
        if (! $xml || ! isset($xml->sheetData->row)) {
            return [];
        }

        $rawRows = [];
        foreach ($xml->sheetData->row as $row) {
            $cells = [];
            $fallbackIdx = 0;
            foreach ($row->c as $c) {
                $ref = (string) $c['r'];
                $colIdx = $ref !== '' ? self::columnLettersToIndex($ref) : $fallbackIdx;
                $fallbackIdx = $colIdx + 1;

                $cellType = (string) $c['t'];
                if ($cellType === 'inlineStr' && isset($c->is)) {
                    $val = (string) ($c->is->t ?? '');
                } else {
                    $val = (string) ($c->v ?? '');
                    if ($cellType === 's' && $val !== '' && isset($sharedStrings[(int) $val])) {
                        $val = $sharedStrings[(int) $val];
                    }
                }
                $cells[$colIdx] = $val;
            }
            if (! empty($cells)) {
                ksort($cells);
                $rawRows[] = $cells;
            }
        }

        $rows = [];
        if (count($rawRows) > 1) {
            $headerMap = [];
            foreach ($rawRows[0] as $colIdx => $headerName) {
                $trimmed = trim((string) $headerName);
                $headerMap[$colIdx] = $lowercaseHeaders ? strtolower($trimmed) : $trimmed;
            }

            for ($i = 1; $i < count($rawRows); $i++) {
                $assoc = [];
                foreach ($headerMap as $colIdx => $header) {
                    if ($header !== '') {
                        $assoc[$header] = $rawRows[$i][$colIdx] ?? '';
                    }
                }
                if (! empty(array_filter($assoc, fn ($v) => $v !== null && trim((string) $v) !== ''))) {
                    $rows[] = $assoc;
                }
            }
        }

        return $rows;
    }

    private static function columnLettersToIndex(string $cellRef): int
    {
        if (! preg_match('/^([A-Z]+)/i', $cellRef, $m)) {
            return 0;
        }
        $letters = strtoupper($m[1]);
        $idx = 0;
        for ($i = 0; $i < strlen($letters); $i++) {
            $idx = ($idx * 26) + (ord($letters[$i]) - ord('A') + 1);
        }

        return max(0, $idx - 1);
    }
}
