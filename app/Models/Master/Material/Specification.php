<?php

namespace App\Models\Master\Material;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Specification extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'specifications';

    protected $fillable = [
        'name',
        'status',
    ];
}
