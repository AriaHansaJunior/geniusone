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
        'is_kawasan_berikat',
        'status',
        'delivery_terms_id',
        'latest_delivery',
        'remark',
        'revision',
        'updated_by',
        'rejection_note',
    ];

    protected $casts = [
        'is_kawasan_berikat' => 'boolean',
    ];

    public function isKawasanBerikat(): bool
    {
        if (strtoupper((string) $this->facility_status) === 'FASILITAS') {
            return true;
        }

        if ($this->is_kawasan_berikat !== null) {
            return (bool) $this->is_kawasan_berikat;
        }

        return $this->items->contains(fn ($it) => (bool) $it->ditangguhkan_kawasan_berikat);
    }

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
        return (float) $this->items->sum(function ($it) {
            $sub = (float) $it->subtotal;
            if ($sub <= 0 && (float) $it->price > 0) {
                return round((float) $it->price * ((float) $it->order > 0 ? (float) $it->order : 1.0), 2);
            }
            return $sub;
        });
    }

    public function getDiscountAttribute(): float
    {
        return (float) $this->items->sum('discount');
    }

    public function getDppAttribute(): float
    {
        return (float) $this->items->sum(function ($it) {
            $dpp = (float) $it->dpp;
            if ($dpp <= 0 && (float) $it->price > 0) {
                $sub = (float) $it->subtotal > 0 ? (float) $it->subtotal : round((float) $it->price * ((float) $it->order > 0 ? (float) $it->order : 1.0), 2);
                $disc = (float) $it->discount_val;
                return max(0.0, round($sub - $disc, 2));
            }
            return $dpp;
        });
    }

    public function getPpnAttribute(): float
    {
        return (float) $this->items->sum(function ($it) {
            if ($it->ditangguhkan_kawasan_berikat || $this->isKawasanBerikat()) {
                return 0.0;
            }
            $rate = $it->ppn?->value ?? 11.0;
            $dpp = (float) $it->dpp > 0 ? (float) $it->dpp : round((float) $it->price * ((float) $it->order > 0 ? (float) $it->order : 1.0), 2);
            return round(($dpp * $rate) / 100, 2);
        });
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
        $dpp = $this->getDppAttribute();
        $ppn = $this->getPpnAttribute();
        $pph = $this->getPphAttribute();
        $additional = $this->getAdditionalCostsTotalAttribute();

        return round($dpp + $ppn + $additional - $pph, 2);
    }

    public function getStatusAttribute(): string
    {
        $rawAttr = $this->attributes['status'] ?? '';

        if (in_array($rawAttr, ['Approved', 'Approved 2'], true)) {
            return 'Approved';
        }
        if ($rawAttr === 'Rejected') {
            return 'Rejected';
        }

        $appr2 = $this->approvals->where('approval_ke', '2')->first();
        if ($appr2 && (int) $appr2->status === 1) {
            return 'Approved';
        }
        if ($appr2 && (int) $appr2->status === 2) {
            return 'Rejected';
        }

        if (in_array($rawAttr, ['Waiting for Approve 2', 'Approved 1'], true)) {
            return 'Waiting for Approve 2';
        }

        $appr1 = $this->approvals->where('approval_ke', '1')->first();
        if ($appr1 && (int) $appr1->status === 1) {
            return 'Waiting for Approve 2';
        }
        if ($appr1 && (int) $appr1->status === 2) {
            return 'Rejected';
        }

        if (! empty($rawAttr)) {
            return $rawAttr;
        }

        return 'Waiting for Approve 1';
    }
}
