<?php

namespace App\Models\Master\Partner;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Country extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'countries';

    protected $fillable = [
        'name',
        'status',
    ];
}
