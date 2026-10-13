<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TypeRateCukai extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'types_rates_cukai';

    protected $fillable = [
        'name',
        'status',
    ];
}
