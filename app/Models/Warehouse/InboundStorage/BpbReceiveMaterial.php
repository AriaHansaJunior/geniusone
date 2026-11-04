<?php

namespace App\Models\Warehouse\InboundStorage;

use App\Models\System\Auth\User;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class BpbReceiveMaterial extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'bpb_receive_material';

    protected $fillable = [
        'bpb_number',
        'status',
        'note',
        'rejection_note',
        'receive_date',
        'creator_id',
        'updated_by',
    ];

    public function getStatusAttribute(): string
    {
        $rawAttr = $this->attributes['status'] ?? '';

        if (in_array($rawAttr, ['Approved', 'Approved 2'], true)) {
            return 'Approved';
        }
        if ($rawAttr === 'Rejected') {
            return 'Rejected';
        }

        $appr2 = $this->approvals->where('approval_ke', '2')->first();
        if ($appr2 && (int) $appr2->status === 1) {
            return 'Approved';
        }
        if ($appr2 && (int) $appr2->status === 2) {
            return 'Rejected';
        }

        if (in_array($rawAttr, ['Waiting for Approve 2', 'Approved 1'], true)) {
            return 'Waiting for Approve 2';
        }

        $appr1 = $this->approvals->where('approval_ke', '1')->first();
        if ($appr1 && (int) $appr1->status === 1) {
            return 'Waiting for Approve 2';
        }
        if ($appr1 && (int) $appr1->status === 2) {
            return 'Rejected';
        }

        if (! empty($rawAttr)) {
            return $rawAttr;
        }

        return 'Waiting for Approve 1';
    }

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
