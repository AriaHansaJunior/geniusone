<?php

namespace App\Models\Master\Customs;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HsCode extends Model
{
    use HasFactory;

    protected $table = 'hs_code';

    public $timestamps = false;

    protected $fillable = [
        'name',
        'description',
        'rates_bm',
        'rates_cukai',
        'rates_ppn',
        'rates_pph',
        'rates_ppnbm',
        'hs_codecol',
        'types_rates_bm_id',
        'types_rates_cukai_id',
    ];

    public function typeRateBm(): BelongsTo
    {
        return $this->belongsTo(TypeRateBm::class, 'types_rates_bm_id');
    }

    public function typeRateCukai(): BelongsTo
    {
        return $this->belongsTo(TypeRateCukai::class, 'types_rates_cukai_id');
    }
}
