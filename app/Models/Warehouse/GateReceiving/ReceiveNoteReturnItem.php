<?php

namespace App\Models\Warehouse\GateReceiving;

use App\Models\Master\Material\Item;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReceiveNoteReturnItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'receive_note_return_items';

    protected $fillable = [
        'receive_note_return_id',
        'items_id',
        'item_code',
        'item_name',
        'do_number',
        'do_date',
        'sj_number',
        'quantity',
        'unit',
        'qty_package',
        'package_type',
        'price',
        'subtotal',
        'subtotal_idr',
        'delivery_qty',
        'retur_qty',
    ];

    protected $casts = [
        'do_date' => 'datetime',
        'quantity' => 'float',
        'qty_package' => 'float',
        'price' => 'float',
        'subtotal' => 'float',
        'subtotal_idr' => 'float',
        'delivery_qty' => 'float',
        'retur_qty' => 'float',
    ];

    public function returnHeader(): BelongsTo
    {
        return $this->belongsTo(ReceiveNoteReturn::class, 'receive_note_return_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }
}
