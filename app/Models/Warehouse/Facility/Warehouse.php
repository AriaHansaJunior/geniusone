<?php

namespace App\Models\Warehouse\Facility;

use App\Models\System\Auth\User;
use App\Models\Warehouse\InboundStorage\PoRnToBpb;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Warehouse extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'warehouses';

    protected $fillable = [
        'code',
        'name',
        'warehouse_types_id',
        'description',
        'status',
        'created_by',
        'updated_by',
    ];

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(WarehouseType::class, 'warehouse_types_id');
    }

    public function mappings(): HasMany
    {
        return $this->hasMany(PoRnToBpb::class, 'warehouses_id');
    }

    public function coordinates(): HasMany
    {
        return $this->hasMany(WarehouseCoordinate::class, 'warehouses_id');
    }
}
