<?php

namespace App\Models\Master\Partner;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Port extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'ports';

    protected $fillable = [
        'name',
        'status',
    ];
}
