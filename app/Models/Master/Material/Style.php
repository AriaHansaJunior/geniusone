<?php

namespace App\Models\Master\Material;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Style extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'styles';

    protected $fillable = [
        'code',
        'name',
        'description',
        'status',
    ];
}
