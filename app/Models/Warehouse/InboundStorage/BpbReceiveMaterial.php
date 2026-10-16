<?php

namespace App\Models\Warehouse\InboundStorage;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;
use App\Models\System\Auth\User;

class BpbReceiveMaterial extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $table = 'bpb_receive_material';

    protected $fillable = [
        'bpb_number',
        'note',
        'receive_date',
        'creator_id',
        'updated_by',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalBpb::class, 'bpb_receive_material_id');
    }

    public function mappings(): HasMany
    {
        return $this->hasMany(PoRnToBpb::class, 'bpb_receive_material_id');
    }
}
