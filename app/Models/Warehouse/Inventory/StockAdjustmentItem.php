<?php

namespace App\Models\Warehouse\Inventory;

use App\Models\Master\Material\Item;
use App\Models\Warehouse\Facility\Warehouse;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAdjustmentItem extends Model
{
    protected $table = 'stock_adjustment_items';

    protected $fillable = [
        'stock_adjustment_id',
        'items_id',
        'warehouses_id',
        'adjustment_type',
        'quantity',
        'balance_before',
        'balance_after',
        'coordinate_name',
        'lot_number',
        'remark',
    ];

    protected $casts = [
        'quantity' => 'float',
        'balance_before' => 'float',
        'balance_after' => 'float',
    ];

    public function adjustment(): BelongsTo
    {
        return $this->belongsTo(StockAdjustment::class, 'stock_adjustment_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouses_id');
    }
}
