<?php

namespace App\Models\Master\Partner;

use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\System\Auth\User;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'supliers';

    protected $fillable = [
        'code',
        'name',
        'address',
        'contact_person',
        'city',
        'state',
        'countries_id',
        'zipcode',
        'email',
        'telephone_number',
        'payment_terms_id',
        'payment_methods_id',
        'rafaksi_types_id',
        'currencies_id',
        'ports_id',
        'npwp',
        'nitku',
        'whatsapp',
        'wechat_id',
        'created_by',
    ];

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'countries_id');
    }

    public function paymentTerm(): BelongsTo
    {
        return $this->belongsTo(PaymentTerm::class, 'payment_terms_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class, 'payment_methods_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currencies_id');
    }

    public function port(): BelongsTo
    {
        return $this->belongsTo(Port::class, 'ports_id');
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class, 'supliers_id');
    }

    public function receiveNotes(): HasMany
    {
        return $this->hasMany(ReceiveNote::class, 'supliers_id');
    }
}
