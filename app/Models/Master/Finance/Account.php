<?php

namespace App\Models\Master\Finance;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'accounts';

    protected $fillable = [
        'code',
        'name',
        'status',
    ];
}
