<?php

namespace App\Models\Warehouse\InboundStorage;

use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PoRnToBpb extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'po_rn_to_bpb';

    protected $fillable = [
        'po_has_rn_id',
        'bpb_receive_material_id',
        'warehouses_id',
    ];

    public function bpbReceiveMaterial(): BelongsTo
    {
        return $this->belongsTo(BpbReceiveMaterial::class, 'bpb_receive_material_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouses_id');
    }

    public function purchaseOrderReceiveNote(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrderReceiveNote::class, 'po_has_rn_id');
    }
}
