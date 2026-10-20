<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Style;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class StyleImportApiController extends Controller
{
    /**
     * Import Master Styles from uploaded Excel/CSV file or parsed JSON dataset.
     */
    public function import(Request $request): JsonResponse
    {
        $rows = [];

        // Scenario A: Client sends pre-parsed rows directly as JSON array
        if ($request->has('rows') && is_array($request->input('rows'))) {
            $rows = $request->input('rows');
        } elseif ($request->hasFile('file')) {
            // Scenario B: Uploaded file (.csv, .xlsx, .txt)
            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());

            if ($extension === 'csv' || $extension === 'txt') {
                $rows = $this->parseCsv($file->getRealPath());
            } elseif ($extension === 'xlsx') {
                $rows = $this->parseXlsx($file->getRealPath());
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => "Unsupported file extension '.{$extension}'. Please provide .xlsx or .csv.",
                ], 422);
            }
        } else {
            return response()->json([
                'status' => 'error',
                'message' => 'No file or rows data provided for import.',
            ], 422);
        }

        if (empty($rows)) {
            return response()->json([
                'status' => 'error',
                'message' => 'The provided file is empty or does not contain valid style data rows.',
            ], 422);
        }

        $imported = 0;
        $updated = 0;
        $failed = 0;
        $results = [];

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                $code = trim($row['code'] ?? $row['style_code'] ?? $row['Code'] ?? $row[0] ?? '');
                $name = trim($row['name'] ?? $row['style_name'] ?? $row['Name'] ?? $row[1] ?? '');
                $desc = trim($row['description'] ?? $row['Description'] ?? $row[2] ?? '');
                $status = isset($row['status']) ? (int) $row['status'] : 1;

                if (empty($code) && empty($name)) {
                    continue; // Skip blank rows
                }

                if (empty($name)) {
                    $name = $code;
                }

                $existing = Style::where('code', $code)->first();

                if ($existing) {
                    $existing->update([
                        'name' => $name,
                        'description' => $desc ?: $existing->description,
                        'status' => $status,
                    ]);
                    $updated++;
                    $results[] = $existing->fresh();
                } else {
                    $style = Style::create([
                        'code' => $code,
                        'name' => $name,
                        'description' => $desc,
                        'status' => $status,
                    ]);
                    $imported++;
                    $results[] = $style;
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Import completed: {$imported} new styles added, {$updated} updated.",
                'data' => [
                    'imported_count' => $imported,
                    'updated_count' => $updated,
                    'failed_count' => $failed,
                    'total_processed' => $imported + $updated,
                    'styles' => $results,
                ],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to import styles: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download sample CSV template for Master Styles import.
     */
    public function template(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="style_import_template.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['code', 'name', 'description', 'status']);
            fputcsv($handle, ['STY-2026-001', 'Cotton Slim Shirt', '100% Combed Cotton', '1']);
            fputcsv($handle, ['STY-2026-002', 'Denim Straight Pants', 'Indigo washed stretch denim', '1']);
            fputcsv($handle, ['STY-2026-003', 'Polyester Windbreaker Jacket', 'Water-resistant coated shell', '1']);
            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Parse CSV file into keyed associative arrays.
     */
    private function parseCsv(string $filePath): array
    {
        $rows = [];
        if (!file_exists($filePath) || !is_readable($filePath)) {
            return $rows;
        }

        if (($handle = fopen($filePath, 'r')) !== false) {
            $headers = null;
            while (($data = fgetcsv($handle, 2000, ',')) !== false) {
                if ($headers === null) {
                    $headers = array_map('trim', $data);
                    continue;
                }
                if (count($data) >= 1 && !empty(array_filter($data))) {
                    $row = [];
                    foreach ($headers as $i => $header) {
                        $row[$header] = $data[$i] ?? '';
                    }
                    $rows[] = $row;
                }
            }
            fclose($handle);
        }

        return $rows;
    }

    /**
     * Parse XLSX file natively using ZipArchive and XML sheet parser.
     */
    private function parseXlsx(string $filePath): array
    {
        $rows = [];
        $zip = new ZipArchive();

        if ($zip->open($filePath) !== true) {
            return $rows;
        }

        // 1. Read shared strings if available
        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml) {
            $xml = simplexml_load_string($sharedStringsXml);
            if ($xml) {
                foreach ($xml->si as $si) {
                    $sharedStrings[] = (string) ($si->t ?? '');
                }
            }
        }

        // 2. Read sheet1.xml
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml) {
            $xml = simplexml_load_string($sheetXml);
            if ($xml && isset($xml->sheetData->row)) {
                $rawRows = [];
                foreach ($xml->sheetData->row as $row) {
                    $cells = [];
                    foreach ($row->c as $c) {
                        $cellType = (string) $c['t'];
                        $val = (string) $c->v;
                        if ($cellType === 's' && isset($sharedStrings[(int) $val])) {
                            $val = $sharedStrings[(int) $val];
                        }
                        $cells[] = $val;
                    }
                    $rawRows[] = $cells;
                }

                if (count($rawRows) > 1) {
                    $headers = array_map('strtolower', array_map('trim', $rawRows[0]));
                    for ($i = 1; $i < count($rawRows); $i++) {
                        $rowCells = $rawRows[$i];
                        $assoc = [];
                        foreach ($headers as $colIdx => $header) {
                            $assoc[$header] = $rowCells[$colIdx] ?? '';
                        }
                        $rows[] = $assoc;
                    }
                }
            }
        }

        $zip->close();
        return $rows;
    }
}
