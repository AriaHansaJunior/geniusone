<?php

namespace App\Models\Warehouse\Inventory;

use App\Models\Master\Material\Item;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarehouseStockTransferItem extends Model
{
    protected $table = 'warehouse_stock_transfer_items';

    protected $fillable = [
        'warehouse_stock_transfer_id',
        'items_id',
        'quantity',
        'unit',
        'lot_number',
        'remark',
    ];

    protected $casts = [
        'quantity' => 'float',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(WarehouseStockTransfer::class, 'warehouse_stock_transfer_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }
}
