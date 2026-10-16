<?php

namespace App\Models\Warehouse\Facility;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WarehouseCoordinate extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'warehouse_coordinates';

    protected $fillable = [
        'warehouses_id',
        'name',
        'description',
        'status',
    ];

    protected $casts = [
        'status' => 'integer',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouses_id');
    }
}
