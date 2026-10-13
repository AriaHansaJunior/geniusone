<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiscountType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'discount_types';

    protected $fillable = [
        'name',
        'status',
    ];
}
