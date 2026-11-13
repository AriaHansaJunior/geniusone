<?php

namespace App\Models\Warehouse\Inventory;

use App\Models\Master\Organization\JobNumber;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransferStockReturn extends Model
{
    use LogsActivity;

    protected $table = 'transfer_stock_returns';

    protected $fillable = [
        'return_number',
        'production_code',
        'request_material_id',
        'warehouses_id',
        'job_number_id',
        'job_number',
        'return_date',
        'note',
        'status',
        'creator_id',
        'updated_by',
    ];

    protected $casts = [
        'return_date' => 'date:Y-m-d',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouses_id');
    }

    public function requestMaterial(): BelongsTo
    {
        return $this->belongsTo(RequestMaterial::class, 'request_material_id');
    }

    public function jobNumberModel(): BelongsTo
    {
        return $this->belongsTo(JobNumber::class, 'job_number_id');
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
        return $this->hasMany(TransferStockReturnItem::class, 'transfer_stock_return_id');
    }
}

