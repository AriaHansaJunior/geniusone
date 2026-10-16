<?php

namespace App\Models\Warehouse\GateReceiving;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Warehouse\InboundStorage\PoRnToBpb;

class PurchaseOrderReceiveNote extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'purchase_order_has_receive_note';

    protected $fillable = [
        'purchase_order_id',
        'receive_note_id',
        'dn_number',
        'job_number_id',
        'item_name',
        'quantity',
        'rafaksi',
        'price',
        'additional_price',
        'discount',
        'ppn',
        'grand_total',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function receiveNote(): BelongsTo
    {
        return $this->belongsTo(ReceiveNote::class, 'receive_note_id');
    }

    public function jobNumber(): BelongsTo
    {
        return $this->belongsTo(JobNumber::class, 'job_number_id');
    }

    public function bpbMappings(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PoRnToBpb::class, 'po_has_rn_id');
    }
}
