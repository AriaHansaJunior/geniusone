<?php

namespace App\Models\Warehouse\Facility;

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
        'name',
        'warehouse_types_id',
        'description',
        'status',
    ];

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
