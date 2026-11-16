<?php

namespace App\Models\Master\Organization;

use App\Models\Master\Material\Item;
use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobNumber extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'job_number';

    protected $fillable = [
        'code',
        'name',
        'departments_id',
        'status',
        'created_by',
        'updated_by',
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

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'job_number_id');
    }
}
