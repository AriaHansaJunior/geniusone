<?php

namespace App\Models\Procurement\PurchaseOrder;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalPo extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'approval_po';

    protected $fillable = [
        'purchase_order_id',
        'users_id',
        'status',
        'approval_ke',
        'note',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'users_id');
    }
}
