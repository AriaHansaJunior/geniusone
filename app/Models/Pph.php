<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pph extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pph';

    protected $fillable = [
        'name',
        'value',
        'deduction',
        'status',
        'pph_type_id',
    ];

    public function type(): BelongsTo
    {
        return $this->belongsTo(PphType::class, 'pph_type_id');
    }
}
