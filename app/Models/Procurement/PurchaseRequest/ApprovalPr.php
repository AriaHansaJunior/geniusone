<?php

namespace App\Models\Procurement\PurchaseRequest;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalPr extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'approval_pr';

    protected $fillable = [
        'purchase_requisitions_id',
        'users_id',
        'status',
        'approval_ke',
        'note',
    ];

    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisitions_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'users_id');
    }
}
