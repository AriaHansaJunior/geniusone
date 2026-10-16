<?php

namespace App\Models\Procurement\PurchaseRequest;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Master\Material\Item;

class PurchaseRequisitionItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'purchase_requisitions_has_items';

    protected $fillable = [
        'purchase_requisitions_id',
        'items_id',
        'quantity',
        'remark',
        'due_date',
        'note',
    ];

    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisitions_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }
}
