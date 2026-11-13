<?php

namespace App\Models\Common;

use App\Models\Master\Finance\Currency;
use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExchangeRate extends Model
{
    use SoftDeletes;

    protected $table = 'exchange_rates';

    protected $fillable = [
        'currencies_id',
        'rate_date',
        'rate_type',
        'buy_rate',
        'sell_rate',
        'middle_rate',
        'source',
        'created_by',
    ];

    protected $casts = [
        'rate_date' => 'date:Y-m-d',
        'buy_rate' => 'float',
        'sell_rate' => 'float',
        'middle_rate' => 'float',
    ];

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currencies_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

