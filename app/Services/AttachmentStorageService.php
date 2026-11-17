<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Shared attachment storage & path resolution helper for PR/PO documents.
 */
class AttachmentStorageService
{
    /**
     * Store an uploaded attachment on the public disk and return its relative path.
     */
    public static function storeUploadedFile(UploadedFile $file, string $directory = 'attachments/pr'): string
    {
        $safeOriginal = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName()) ?: 'attachment';
        $filename = time().'_'.$safeOriginal;

        return (string) $file->storeAs($directory, $filename, 'public');
    }

    /**
     * Resolve an existing file path on disk from any supported stored path format.
     */
    public static function resolveExistingPath(?string $storedPath): ?string
    {
        if (! $storedPath || str_starts_with($storedPath, 'http://') || str_starts_with($storedPath, 'https://')) {
            return null;
        }

        $trimmed = ltrim(str_replace('\\', '/', trim($storedPath)), '/');
        if ($trimmed === '' || str_contains($trimmed, '..')) {
            return null;
        }

        $withoutStoragePrefix = ltrim((string) preg_replace('#^storage/#', '', $trimmed), '/');

        $candidates = array_filter([
            Storage::disk('public')->exists($withoutStoragePrefix)
                ? Storage::disk('public')->path($withoutStoragePrefix)
                : null,
            storage_path('app/public/'.$withoutStoragePrefix),
            storage_path('app/private/'.$withoutStoragePrefix),
            storage_path('app/'.$withoutStoragePrefix),
            public_path($trimmed),
            public_path('storage/'.$withoutStoragePrefix),
        ]);

        foreach ($candidates as $candidate) {
            if (is_file($candidate) && is_readable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Derive a clean human-friendly download filename from the stored path.
     */
    public static function displayFilename(?string $storedPath): string
    {
        if (! $storedPath) {
            return 'attachment';
        }

        $base = basename(str_replace('\\', '/', $storedPath));
        $stripped = preg_replace('/^\d{9,13}_/', '', $base);

        return $stripped !== null && $stripped !== '' ? $stripped : $base;
    }
}
