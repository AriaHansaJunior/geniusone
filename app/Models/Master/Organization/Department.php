<?php

namespace App\Models\Master\Organization;

use App\Models\Master\Material\Unit;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'departments';

    protected $fillable = [
        'units_id',
        'name',
        'status',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'units_id');
    }

    public function purchaseRequisitions(): HasMany
    {
        return $this->hasMany(PurchaseRequisition::class, 'departments_id');
    }
}
