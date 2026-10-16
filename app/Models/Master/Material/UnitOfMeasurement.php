<?php

namespace App\Models\Master\Material;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class UnitOfMeasurement extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'units_of_measurements';

    protected $fillable = [
        'name',
        'status',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'units_of_measurements_id');
    }
}
