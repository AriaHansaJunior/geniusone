<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class ReceiveNote extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

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
        'note',
        'sj_number',
        'sj_date',
        'pl_number',
        'pl_date',
        'dn_status',
        'service_subkon',
        'updated_by',
    ];

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

    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalRn::class, 'receive_note_id');
    }
}
