<?php

namespace App\Models\Warehouse\GateReceiving;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalRnReturn extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'approval_rn_returns';

    protected $fillable = [
        'receive_note_return_id',
        'users_id',
        'approval_ke',
        'status',
        'note',
    ];

    protected $casts = [
        'status' => 'integer',
    ];

    public function returnDocument(): BelongsTo
    {
        return $this->belongsTo(ReceiveNoteReturn::class, 'receive_note_return_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'users_id');
    }
}
