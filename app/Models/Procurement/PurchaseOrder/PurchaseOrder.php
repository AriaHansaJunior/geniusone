<?php

namespace App\Models\Procurement\PurchaseOrder;

use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Partner\Supplier;
use App\Models\System\Auth\User;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrder extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'purchase_order';

    protected $fillable = [
        'po_number',
        'creator_id',
        'po_types_id',
        'date',
        'due_date',
        'valutas_id',
        'rate',
        'supliers_id',
        'address',
        'payment_terms_id',
        'payment_methods_id',
        'service_subkon',
        'facility_status',
        'delivery_terms_id',
        'latest_delivery',
        'remark',
        'revision',
        'updated_by',
        'rejection_note',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supliers_id');
    }

    public function poType(): BelongsTo
    {
        return $this->belongsTo(PoType::class, 'po_types_id');
    }

    public function valuta(): BelongsTo
    {
        return $this->belongsTo(Valuta::class, 'valutas_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Valuta::class, 'valutas_id');
    }

    public function paymentTerm(): BelongsTo
    {
        return $this->belongsTo(PaymentTerm::class, 'payment_terms_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_methods_id');
    }

    public function deliveryTerm(): BelongsTo
    {
        return $this->belongsTo(DeliveryTerm::class, 'delivery_terms_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'purchase_order_id');
    }

    public function additionalCosts(): HasMany
    {
        return $this->hasMany(AdditionalCost::class, 'purchase_order_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalPo::class, 'purchase_order_id');
    }

    public function receiveNotes(): HasMany
    {
        return $this->hasMany(PurchaseOrderReceiveNote::class, 'purchase_order_id');
    }

    public function requisitionMappings(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class, 'purchase_order_id');
    }

    public function getSubtotalAttribute(): float
    {
        return (float) $this->items->sum('subtotal');
    }

    public function getDiscountAttribute(): float
    {
        return (float) $this->items->sum('discount');
    }

    public function getDppAttribute(): float
    {
        return (float) $this->items->sum('dpp');
    }

    public function getPpnAttribute(): float
    {
        return (float) $this->items->sum('subtotal_ppn');
    }

    public function getPphAttribute(): float
    {
        return (float) $this->items->sum('subtotal_pph');
    }

    public function getAdditionalCostsTotalAttribute(): float
    {
        return (float) $this->additionalCosts->sum('value');
    }

    public function getGrandTotalAttribute(): float
    {
        return (float) $this->items->sum('grand_total') + $this->getAdditionalCostsTotalAttribute();
    }

    public function getStatusAttribute(): string
    {
        $appr2 = $this->approvals->where('approval_ke', '2')->first();
        if ($appr2 && $appr2->status === 1) {
            return 'Approved 2';
        }
        if ($appr2 && $appr2->status === 2) {
            return 'Rejected';
        }

        $appr1 = $this->approvals->where('approval_ke', '1')->first();
        if ($appr1 && $appr1->status === 1) {
            return 'Approved 1';
        }
        if ($appr1 && $appr1->status === 2) {
            return 'Rejected';
        }

        return 'Draft';
    }
}
