<?php

namespace App\Models\Master\Partner;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Origin extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'origins';

    protected $fillable = [
        'name',
        'status',
    ];
}
