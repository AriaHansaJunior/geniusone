<?php

namespace App\Models\Warehouse\Inventory;

use App\Models\Master\Material\Item;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferStockReturnItem extends Model
{
    protected $table = 'transfer_stock_return_items';

    protected $fillable = [
        'transfer_stock_return_id',
        'items_id',
        'quantity',
        'unit',
        'source_location',
        'destination_location',
        'remark',
    ];

    protected $casts = [
        'quantity' => 'float',
    ];

    public function transferReturn(): BelongsTo
    {
        return $this->belongsTo(TransferStockReturn::class, 'transfer_stock_return_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }
}

