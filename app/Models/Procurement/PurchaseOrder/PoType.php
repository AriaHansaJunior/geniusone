<?php

namespace App\Models\Procurement\PurchaseOrder;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PoType extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'po_types';

    protected $fillable = [
        'code',
        'name',
        'status',
    ];
}
