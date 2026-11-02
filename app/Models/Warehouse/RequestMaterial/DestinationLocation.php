<?php

namespace App\Models\Warehouse\RequestMaterial;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DestinationLocation extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'destination_location';

    protected $fillable = [
        'name',
        'status',
    ];

    public function materialRequests(): HasMany
    {
        return $this->hasMany(RequestMaterial::class, 'destination_location_id');
    }
}
