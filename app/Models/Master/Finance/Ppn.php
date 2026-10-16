<?php

namespace App\Models\Master\Finance;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ppn extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'ppn';

    protected $fillable = [
        'name',
        'value',
        'status',
    ];
}
