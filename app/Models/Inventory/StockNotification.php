<?php

namespace App\Models\Inventory;

use App\Models\Master\Material\Item;
use App\Models\System\Auth\User;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockNotification extends Model
{
    use LogsActivity, SoftDeletes;

    protected $table = 'stock_notifications';

    protected $fillable = [
        'items_id',
        'item_code',
        'item_name',
        'category',
        'unit',
        'buffer_quantity',
        'trigger_condition',
        'notification_level',
        'status',
        'last_triggered_at',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'buffer_quantity' => 'float',
        'status' => 'integer',
        'last_triggered_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

