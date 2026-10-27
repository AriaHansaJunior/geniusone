<?php

namespace App\Models\Master\Material;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Classification extends Model
{
    use HasFactory;

    protected $table = 'classifications';
    public $timestamps = false;

    protected $fillable = [
        'reporting_types_id',
        'accounts_id',
        'code',
        'name',
        'description',
        'status',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'classifications_id');
    }

    public function reportingType(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\Master\Organization\ReportingType::class, 'reporting_types_id');
    }

    public function account(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\Master\Finance\Account::class, 'accounts_id');
    }
}
