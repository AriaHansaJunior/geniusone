<?php

namespace App\Traits;

use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    /**
     * Disable logging flag for batch operations.
     */
    protected static bool $loggingDisabled = false;

    /**
     * Boot the trait and hook into Eloquent model events.
     */
    public static function bootLogsActivity(): void
    {
        static::created(function (Model $model) {
            if (static::$loggingDisabled) return;

            $modelName = class_basename($model);
            $primaryKey = $model->getKey();
            $identifier = $model->getActivityIdentifier();

            $attributes = $model->filterLoggedAttributes($model->getAttributes());

            AuditLogger::log(
                type: strtoupper("CREATED_{$modelName}"),
                old: null,
                new: array_merge([
                    'model' => $modelName,
                    'id' => $primaryKey,
                    'identifier' => $identifier,
                    'attributes' => $attributes,
                ]),
                userId: $model->resolveAuditUserId()
            );
        });

        static::updated(function (Model $model) {
            if (static::$loggingDisabled) return;

            $dirty = $model->getDirty();

            // Ignore if only updated_at timestamp changed without real data changes
            unset($dirty['updated_at']);
            if (empty($dirty)) {
                return;
            }

            $modelName = class_basename($model);
            $primaryKey = $model->getKey();
            $identifier = $model->getActivityIdentifier();

            $oldValues = [];
            $newValues = [];

            foreach ($dirty as $key => $newValue) {
                if (in_array($key, $model->getHiddenFromAudit())) {
                    continue;
                }
                $oldValues[$key] = $model->getOriginal($key);
                $newValues[$key] = $newValue;
            }

            if (empty($newValues)) {
                return;
            }

            AuditLogger::log(
                type: strtoupper("UPDATED_{$modelName}"),
                old: array_merge([
                    'model' => $modelName,
                    'id' => $primaryKey,
                    'identifier' => $identifier,
                    'changes' => $oldValues,
                ]),
                new: array_merge([
                    'model' => $modelName,
                    'id' => $primaryKey,
                    'identifier' => $identifier,
                    'changes' => $newValues,
                ]),
                userId: $model->resolveAuditUserId()
            );
        });

        static::deleted(function (Model $model) {
            if (static::$loggingDisabled) return;

            $modelName = class_basename($model);
            $primaryKey = $model->getKey();
            $identifier = $model->getActivityIdentifier();

            $attributes = $model->filterLoggedAttributes($model->getAttributes());

            AuditLogger::log(
                type: strtoupper("DELETED_{$modelName}"),
                old: array_merge([
                    'model' => $modelName,
                    'id' => $primaryKey,
                    'identifier' => $identifier,
                    'attributes' => $attributes,
                ]),
                new: [
                    'model' => $modelName,
                    'id' => $primaryKey,
                    'identifier' => $identifier,
                    'deleted_at' => now()->toIso8601String(),
                ],
                userId: $model->resolveAuditUserId()
            );
        });

        if (method_exists(static::class, 'restored')) {
            static::restored(function (Model $model) {
                if (static::$loggingDisabled) return;

                $modelName = class_basename($model);
                $primaryKey = $model->getKey();
                $identifier = $model->getActivityIdentifier();

                AuditLogger::log(
                    type: strtoupper("RESTORED_{$modelName}"),
                    old: ['deleted_at' => $model->getOriginal('deleted_at')],
                    new: [
                        'model' => $modelName,
                        'id' => $primaryKey,
                        'identifier' => $identifier,
                        'restored_at' => now()->toIso8601String(),
                    ],
                    userId: $model->resolveAuditUserId()
                );
            });
        }
    }

    /**
     * Resolve the user responsible for this action.
     */
    protected function resolveAuditUserId(): ?int
    {
        return Auth::id()
            ?? ($this->updated_by ?? null)
            ?? ($this->creator_id ?? null)
            ?? ($this->creator ?? null)
            ?? null;
    }

    /**
     * Get a human-readable identifier for the model (e.g. PR number, PO number, code, name).
     */
    public function getActivityIdentifier(): string
    {
        return (string) (
            $this->pr_number
            ?? $this->po_number
            ?? $this->rn_number
            ?? $this->bpb_number
            ?? $this->code
            ?? $this->name
            ?? $this->getKey()
        );
    }

    /**
     * Sensitive attributes that should never appear in audit logs.
     */
    protected function getHiddenFromAudit(): array
    {
        return [
            'password',
            'remember_token',
            'two_factor_secret',
            'two_factor_recovery_codes',
        ];
    }

    /**
     * Filter out sensitive attributes.
     */
    protected function filterLoggedAttributes(array $attributes): array
    {
        $hidden = $this->getHiddenFromAudit();
        return array_diff_key($attributes, array_flip($hidden));
    }

    /**
     * Temporarily disable logging during bulk operations.
     */
    public static function withoutLogging(callable $callback): mixed
    {
        static::$loggingDisabled = true;
        try {
            return $callback();
        } finally {
            static::$loggingDisabled = false;
        }
    }
}
