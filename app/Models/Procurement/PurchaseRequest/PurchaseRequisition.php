<?php

namespace App\Models\Procurement\PurchaseRequest;

use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\Section;
use App\Models\System\Auth\User;
use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseRequisition extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'purchase_requisitions';

    protected $fillable = [
        'pr_number',
        'departments_id',
        'creator',
        'date',
        'due_date',
        'sections_id',
        'attachment_file',
        'status',
        'updated_by',
        'revision',
        'rejection_note',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'departments_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'sections_id');
    }

    public function creatorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseRequisitionItem::class, 'purchase_requisitions_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ApprovalPr::class, 'purchase_requisitions_id');
    }

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
}
