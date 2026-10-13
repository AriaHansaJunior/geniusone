<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdditionalCost extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'additional_costs';

    protected $fillable = [
        'purchase_order_id',
        'additional_cost_types_id',
        'value',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(AdditionalCostType::class, 'additional_cost_types_id');
    }
}
