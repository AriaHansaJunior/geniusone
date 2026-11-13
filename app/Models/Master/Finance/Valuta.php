<?php

namespace App\Models\Master\Finance;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Valuta extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'valutas';

    protected $fillable = [
        'code',
        'name',
        'symbol',
        'sync_status',
        'last_synced_at',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'last_synced_at' => 'datetime',
    ];

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
