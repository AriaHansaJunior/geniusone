<?php

namespace App\Http\Controllers\Api\Exim\Master;

use App\Http\Controllers\Controller;
use App\Models\Master\Material\Style;
use App\Support\SpreadsheetParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StyleImportApiController extends Controller
{
    /**
     * Import Master Styles from uploaded Excel/CSV file or parsed JSON dataset.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'nullable|file|max:5120|mimes:csv,txt,xlsx',
            'rows' => 'nullable|array',
        ]);

        $rows = [];

        // Scenario A: Client sends pre-parsed rows directly as JSON array
        if ($request->has('rows') && is_array($request->input('rows'))) {
            $rows = $request->input('rows');
        } elseif ($request->hasFile('file')) {
            // Scenario B: Uploaded file (.csv, .xlsx, .txt)
            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());

            if ($extension === 'csv' || $extension === 'txt') {
                $rows = SpreadsheetParser::parseCsv($file->getRealPath(), true);
            } elseif ($extension === 'xlsx') {
                try {
                    $rows = SpreadsheetParser::parseXlsx($file->getRealPath(), true);
                } catch (RuntimeException $e) {
                    return response()->json([
                        'status' => 'error',
                        'message' => $e->getMessage(),
                    ], 503);
                }
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
                $rawStatus = strtolower(trim((string) ($row['status'] ?? 'active')));
                $status = in_array($rawStatus, ['0', 'inactive', 'disabled', 'false'], true) ? 'inactive' : 'active';

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
            Log::error('Style import failed.', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to import styles due to an unexpected server error.',
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
            Style::query()->orderBy('id')->limit(5)->get()->each(function (Style $style) use ($handle) {
                fputcsv($handle, [
                    $style->code,
                    $style->name,
                    $style->description ?? '',
                    $style->status ?? 'active',
                ]);
            });
            fclose($handle);
        }, 200, $headers);
    }
}
