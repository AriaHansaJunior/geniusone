<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomsReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'customs_reports';

    protected $fillable = [
        'name',
        'status',
    ];
}
