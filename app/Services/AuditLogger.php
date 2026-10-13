<?php

namespace App\Services;

use App\Models\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    /**
     * Record an audit log entry in the logs table.
     *
     * @param string $type
     * @param array|null $old
     * @param array|null $new
     * @param int|null $userId
     * @param array $metadata
     * @return Log
     */
    public static function log(
        string $type,
        ?array $old = null,
        ?array $new = null,
        ?int $userId = null,
        array $metadata = []
    ): Log {
        $resolvedUserId = $userId ?? Auth::id();

        // Enforce array format for new
        $newPayload = $new ?? [];

        // Attach request context metadata if available
        if (Request::hasSession() || Request::ip()) {
            $context = array_filter([
                'ip' => Request::ip(),
                'user_agent' => Request::header('User-Agent'),
                'url' => Request::fullUrl(),
                'method' => Request::method(),
            ]);

            if (!empty($metadata)) {
                $context = array_merge($context, $metadata);
            }

            if (!empty($context)) {
                $newPayload['_context'] = $context;
            }
        }

        return Log::create([
            'users_id' => $resolvedUserId,
            'tipe' => $type,
            'old' => $old,
            'new' => $newPayload,
        ]);
    }

    /**
     * Log domain model actions (e.g. stock adjustments, document creations).
     */
    public static function logAction(
        string $action,
        string $modelName,
        int|string|null $modelId = null,
        ?array $before = null,
        ?array $after = null,
        ?int $userId = null,
        ?string $notes = null,
        array $extra = []
    ): Log {
        return self::log(
            type: strtoupper("{$modelName}_{$action}"),
            old: $before,
            new: array_merge([
                'model' => $modelName,
                'id' => $modelId,
                'action' => $action,
                'notes' => $notes,
            ], $after ?? [], $extra),
            userId: $userId
        );
    }

    /**
     * Log user authentication events (login, logout, failed login).
     */
    public static function logAuth(string $event, ?int $userId = null, array $details = []): Log
    {
        return self::log(
            type: "AUTH_{$event}",
            old: null,
            new: array_merge(['event' => $event, 'timestamp' => now()->toIso8601String()], $details),
            userId: $userId
        );
    }

    /**
     * Log workflow and approval transitions (PR approved, PO released, etc.).
     */
    public static function logWorkflow(
        string $documentType,
        string $documentNumber,
        string $action,
        ?string $fromStatus,
        string $toStatus,
        ?int $userId = null,
        array $extra = []
    ): Log {
        return self::log(
            type: strtoupper("{$documentType}_{$action}"),
            old: ['status' => $fromStatus],
            new: array_merge([
                'document_type' => $documentType,
                'document_number' => $documentNumber,
                'action' => $action,
                'status' => $toStatus,
                'timestamp' => now()->toIso8601String(),
            ], $extra),
            userId: $userId
        );
    }
}
