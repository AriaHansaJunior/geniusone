<?php

namespace App\Models\Warehouse\InboundStorage;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalBpb extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'approval_bpb';

    protected $fillable = [
        'bpb_receive_material_id',
        'users_id',
        'status',
        'approval_ke',
        'note',
    ];

    public function bpbReceiveMaterial(): BelongsTo
    {
        return $this->belongsTo(BpbReceiveMaterial::class, 'bpb_receive_material_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'users_id');
    }
}
