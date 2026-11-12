<?php

namespace App\Models\Warehouse\GateReceiving;

use App\Models\Master\Finance\Currency;
use App\Models\Master\Partner\Supplier;
use App\Models\System\Auth\User;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReceiveNote extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'receive_note';

    protected $fillable = [
        'rn_number',
        'supliers_id',
        'currencies_id',
        'rate',
        'arrival_date',
        'invoice_number',
        'invoice_date',
        'tax_invoice',
        'tax_invoice_date',
        'license_plate',
        'vehicle_type',
        'aju_number',
        'no_daftar',
        'tanggal_daftar',
        'note',
        'remark',
        'sj_number',
        'sj_date',
        'pl_number',
        'pl_date',
        'dn_status',
        'service_subkon',
        'status',
        'rejection_note',
        'updated_by',
    ];

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

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supliers_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currencies_id');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrderReceiveNote::class, 'receive_note_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderReceiveNote::class, 'receive_note_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalRn::class, 'receive_note_id');
    }
}
