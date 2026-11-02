<?php

namespace App\Models\Master\Material;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Brand extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'brands';

    protected $fillable = [
        'name',
        'code',
        'description',
        'status',
    ];
}
