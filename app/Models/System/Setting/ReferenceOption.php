<?php

namespace App\Models\System\Setting;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReferenceOption extends Model
{
    use SoftDeletes;

    protected $table = 'reference_options';

    protected $fillable = [
        'category',
        'code',
        'name',
        'meta',
        'sort_order',
        'status',
    ];

    protected $casts = [
        'meta' => 'array',
        'sort_order' => 'integer',
        'status' => 'integer',
    ];
}

