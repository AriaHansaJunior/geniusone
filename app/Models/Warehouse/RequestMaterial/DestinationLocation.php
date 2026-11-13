<?php

namespace App\Models\Warehouse\RequestMaterial;

use App\Models\System\Auth\User;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DestinationLocation extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'destination_location';

    protected $fillable = [
        'code',
        'name',
        'location_type',
        'pic',
        'description',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
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
        return $this->hasMany(RequestMaterial::class, 'destination_location_id');
    }
}
