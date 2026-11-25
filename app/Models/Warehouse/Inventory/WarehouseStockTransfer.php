<?php

namespace App\Models\Warehouse\Inventory;

use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WarehouseStockTransfer extends Model
{
    use SoftDeletes;

    protected $table = 'warehouse_stock_transfers';

    protected $fillable = [
        'transfer_number',
        'source_warehouse_id',
        'destination_warehouse_id',
        'source_coordinate_id',
        'destination_coordinate_id',
        'transfer_date',
        'reference_code',
        'idempotency_key',
        'status',
        'note',
        'creator_id',
        'posted_by',
        'posted_at',
        'updated_by',
    ];

    protected $casts = [
        'transfer_date' => 'date',
        'posted_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(WarehouseStockTransferItem::class, 'warehouse_stock_transfer_id');
    }

    public function sourceWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'source_warehouse_id');
    }

    public function destinationWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'destination_warehouse_id');
    }

    public function sourceCoordinate(): BelongsTo
    {
        return $this->belongsTo(WarehouseCoordinate::class, 'source_coordinate_id');
    }

    public function destinationCoordinate(): BelongsTo
    {
        return $this->belongsTo(WarehouseCoordinate::class, 'destination_coordinate_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function postedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
