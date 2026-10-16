<?php

namespace App\Models\Procurement\PurchaseOrder;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdditionalCostType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'additional_cost_types';

    protected $fillable = [
        'code',
        'name',
        'status',
    ];

    public function additionalCosts(): HasMany
    {
        return $this->hasMany(AdditionalCost::class, 'additional_cost_types_id');
    }
}
