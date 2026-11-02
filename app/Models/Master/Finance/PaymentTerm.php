<?php

namespace App\Models\Master\Finance;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PaymentTerm extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'payment_terms';

    protected $fillable = [
        'name',
        'status',
    ];
}
