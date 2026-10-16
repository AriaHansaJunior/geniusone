<?php

namespace App\Models\Master\Material;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GroupScrapItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'group_scrap_items';

    protected $fillable = [
        'code',
        'name',
        'status',
    ];
}
