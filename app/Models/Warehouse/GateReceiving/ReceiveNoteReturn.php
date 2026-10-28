<?php

namespace App\Models\Warehouse\GateReceiving;

use App\Models\System\Auth\User;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReceiveNoteReturn extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'receive_note_returns';

    protected $fillable = [
        'rn_number',
        'rn_date',
        'delivery_order',
        'do_date',
        'customer',
        'facility',
        'bc_code',
        'aju_number',
        'no_daftar',
        'amount',
        'type_of_return',
        'sales_delivery_number',
        'vehicle_type',
        'license_plate',
        'notes',
        'approval_status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'rn_date' => 'datetime',
        'do_date' => 'datetime',
        'amount' => 'float',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(ReceiveNoteReturnItem::class, 'receive_note_return_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
