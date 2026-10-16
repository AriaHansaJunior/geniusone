<?php

namespace App\Models\Master\Finance;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Valuta extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'valutas';

    protected $fillable = [
        'code',
        'name',
        'status',
    ];
}
