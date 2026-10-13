<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class PurchaseRequisition extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

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
}
