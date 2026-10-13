<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WarehouseType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'warehouse_types';

    protected $fillable = [
        'name',
        'status',
    ];

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class, 'warehouse_types_id');
    }
}
