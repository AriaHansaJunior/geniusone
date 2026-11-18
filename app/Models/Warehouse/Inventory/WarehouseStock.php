<?php

namespace App\Models\Warehouse\Inventory;

use App\Models\Master\Material\Item;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class WarehouseStock extends Model
{
    protected $table = 'warehouse_stocks';

    protected static function booted(): void
    {
        static::saved(fn (self $stock) => $stock->syncWarehouseBalance());
        static::deleted(fn (self $stock) => $stock->syncWarehouseBalance());
    }

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

    public function syncWarehouseBalance(): void
    {
        if (! Schema::hasTable('item_warehouse')) {
            return;
        }

        $quantity = static::query()
            ->where('items_id', $this->items_id)
            ->where('warehouses_id', $this->warehouses_id)
            ->sum('quantity');

        DB::table('item_warehouse')->updateOrInsert(
            ['items_id' => $this->items_id, 'warehouses_id' => $this->warehouses_id],
            ['quantity' => $quantity, 'updated_at' => now(), 'created_at' => $this->created_at ?? now()]
        );

        if (Schema::hasTable('items')) {
            $totalStock = (float) DB::table('item_warehouse')
                ->where('items_id', $this->items_id)
                ->sum('quantity');

            DB::table('items')
                ->where('id', $this->items_id)
                ->update(['stock' => $totalStock, 'updated_at' => now()]);
        }
    }
}

