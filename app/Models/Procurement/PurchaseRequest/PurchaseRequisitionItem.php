<?php

namespace App\Models\Procurement\PurchaseRequest;

use App\Models\Master\Material\Item;
use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseRequisitionItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'purchase_requisitions_has_items';

    protected $fillable = [
        'purchase_requisitions_id',
        'items_id',
        'quantity',
        'remark',
        'due_date',
        'note',
        'is_closed',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'is_closed' => 'boolean',
        'closed_at' => 'datetime',
    ];

    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class, 'purchase_requisitions_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * BE-05: Mark PR line item as Closed.
     */
    public function close(int $userId): void
    {
        $this->update([
            'is_closed' => true,
            'closed_at' => now(),
            'closed_by' => $userId,
        ]);
    }

    /**
     * BE-05: Reactivate (Unclose) PR line item.
     */
    public function unclose(): void
    {
        $this->update([
            'is_closed' => false,
            'closed_at' => null,
            'closed_by' => null,
        ]);
    }
}
