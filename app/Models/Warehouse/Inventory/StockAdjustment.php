<?php

namespace App\Models\Warehouse\Inventory;

use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockAdjustment extends Model
{
    use LogsActivity;

    protected $table = 'stock_adjustments';

    protected $fillable = [
        'adjustment_number',
        'warehouses_id',
        'adjustment_date',
        'source_type',
        'reference_code',
        'note',
        'status',
        'creator_id',
        'updated_by',
    ];

    protected $casts = [
        'adjustment_date' => 'date:Y-m-d',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouses_id');
    }

    public function creatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockAdjustmentItem::class, 'stock_adjustment_id');
    }
}
