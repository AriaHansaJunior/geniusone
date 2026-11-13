<?php

namespace App\Models\Warehouse\Inventory;

use App\Models\Master\Material\Item;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarehouseStock extends Model
{
    protected $table = 'warehouse_stocks';

    protected $fillable = [
        'items_id',
        'warehouses_id',
        'warehouse_coordinates_id',
        'coordinate_name',
        'quantity',
        'allocated_quantity',
        'available_quantity',
        'lot_number',
        'location_type',
        'last_movement_date',
    ];

    protected $casts = [
        'quantity' => 'float',
        'allocated_quantity' => 'float',
        'available_quantity' => 'float',
        'last_movement_date' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouses_id');
    }

    public function coordinate(): BelongsTo
    {
        return $this->belongsTo(WarehouseCoordinate::class, 'warehouse_coordinates_id');
    }
}

