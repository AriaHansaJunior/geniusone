<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReportingType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'reporting_types';

    protected $fillable = [
        'name',
        'status',
    ];
}
