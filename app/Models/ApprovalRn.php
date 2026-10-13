<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalRn extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'approval_rn';

    protected $fillable = [
        'users_id',
        'receive_note_id',
        'approval_ke',
        'status',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'users_id');
    }

    public function receiveNote(): BelongsTo
    {
        return $this->belongsTo(ReceiveNote::class, 'receive_note_id');
    }
}
