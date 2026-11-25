<?php

namespace App\Models\Procurement\PurchaseOrder;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PoServiceClosure extends Model
{
    use SoftDeletes;

    protected $table = 'po_service_closures';

    protected $fillable = [
        'purchase_order_id',
        'berita_acara_number',
        'berita_acara_date',
        'completion_percentage',
        'service_description',
        'verified_by_name',
        'attachment_path',
        'notes',
        'status',
        'closed_by',
    ];

    protected $casts = [
        'berita_acara_date' => 'date',
        'completion_percentage' => 'float',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
