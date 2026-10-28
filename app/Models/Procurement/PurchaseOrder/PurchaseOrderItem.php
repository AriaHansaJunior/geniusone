<?php

namespace App\Models\Procurement\PurchaseOrder;

use App\Models\Master\Finance\Pph;
use App\Models\Master\Finance\Ppn;
use App\Models\Master\Material\Item;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrderItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'purchase_order_has_purchase_requisitions';

    protected $fillable = [
        'purchase_order_id',
        'pr_has_items_id',
        'item_alias',
        'price',
        'purchased',
        'order',
        'discount_types_id',
        'discount_val',
        'subtotal',
        'lme',
        'optional_rate',
        'percentage_lme',
        'pph_id',
        'subtotal_pph',
        'total',
        'discount',
        'dpp',
        'ppn_id',
        'ditangguhkan_kawasan_berikat',
        'total_addional_cost',
        'total_pph',
        'grand_total',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function discountType(): BelongsTo
    {
        return $this->belongsTo(DiscountType::class, 'discount_types_id');
    }

    public function pph(): BelongsTo
    {
        return $this->belongsTo(Pph::class, 'pph_id');
    }

    public function ppn(): BelongsTo
    {
        return $this->belongsTo(Ppn::class, 'ppn_id');
    }

    public function requisitionItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisitionItem::class, 'pr_has_items_id');
    }

    public function prItem(): BelongsTo
    {
        return $this->requisitionItem();
    }

    public function getItemAttribute(): ?Item
    {
        return $this->requisitionItem?->item;
    }

    public function getItemsIdAttribute(): ?int
    {
        return $this->requisitionItem?->items_id;
    }

    public function getQuantityAttribute(): float
    {
        return (float) $this->order;
    }
}
