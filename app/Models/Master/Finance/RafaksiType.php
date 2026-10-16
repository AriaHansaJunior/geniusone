<?php

namespace App\Models\Master\Finance;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RafaksiType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'rafaksi_types';

    protected $fillable = [
        'name',
        'status',
    ];
}
