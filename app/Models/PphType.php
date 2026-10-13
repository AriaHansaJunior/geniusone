<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PphType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pph_type';

    protected $fillable = [
        'nama',
    ];

    public function pphs(): HasMany
    {
        return $this->hasMany(Pph::class, 'pph_type_id');
    }
}
