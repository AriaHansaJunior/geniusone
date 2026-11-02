<?php

namespace App\Models\Master\Material;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Colour extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'colours';

    protected $fillable = [
        'grade',
        'name',
        'status',
    ];
}
