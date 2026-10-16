<?php

namespace App\Models\Master\Material;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ItemType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'item_types';

    protected $fillable = [
        'name',
        'status',
    ];
}
