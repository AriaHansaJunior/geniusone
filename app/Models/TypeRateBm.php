<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TypeRateBm extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'types_rates_bm';

    protected $fillable = [
        'name',
        'status',
    ];
}
