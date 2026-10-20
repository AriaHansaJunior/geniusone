<?php

namespace App\Models\Warehouse\RequestMaterial;

use App\Models\Master\Material\Item;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class RequestMaterialItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'request_material_item';

    public $incrementing = false;
    protected $primaryKey = ['items_id', 'request_material_id'];

    protected $fillable = [
        'items_id',
        'request_material_id',
        'request',
        'remark',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }

    public function requestMaterial(): BelongsTo
    {
        return $this->belongsTo(RequestMaterial::class, 'request_material_id');
    }
}
