<?php

namespace App\Models\Warehouse\RequestMaterial;

use App\Models\System\Auth\User;
use App\Models\Master\Organization\Department;
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
        'name',
        'departments_id',
        'description',
        'requires_job_number',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'requires_job_number' => 'boolean',
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

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'departments_id');
    }

    public function materialRequests(): HasMany
    {
        return $this->hasMany(RequestMaterial::class, 'type_of_request_id');
    }
}
