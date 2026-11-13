<?php

namespace App\Models\Warehouse\RequestMaterial;

use App\Models\System\Auth\User;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TypeOfRequest extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'type_of_request';

    protected $fillable = [
        'code',
        'name',
        'department',
        'description',
        'requires_job_number',
        'requires_approval_2',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'requires_job_number' => 'boolean',
        'requires_approval_2' => 'boolean',
        'status' => 'integer',
    ];

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function materialRequests(): HasMany
    {
        return $this->hasMany(RequestMaterial::class, 'type_of_request_id');
    }
}
