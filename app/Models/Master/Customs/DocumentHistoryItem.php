<?php

namespace App\Models\Master\Customs;

use App\Models\Master\Material\Item;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentHistoryItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'document_history_items';

    protected $fillable = [
        'document_history_id',
        'items_id',
        'so_number',
        'so_date',
        'pl_number',
        'pl_date',
        'item_code',
        'item_name',
        'nett_weight',
        'gross_weight',
        'pack',
        'pack_unit',
        'quantity',
        'unit',
        'unit_price',
        'subtotal',
        'nomor_aju',
        'nomor_aju_date',
        'nomor_daftar',
        'nomor_daftar_date',
        'jenis_dokumen',
        'seri_barang',
    ];

    protected $casts = [
        'so_date' => 'datetime',
        'pl_date' => 'datetime',
        'nomor_aju_date' => 'datetime',
        'nomor_daftar_date' => 'datetime',
        'nett_weight' => 'float',
        'gross_weight' => 'float',
        'pack' => 'float',
        'quantity' => 'float',
        'unit_price' => 'float',
        'subtotal' => 'float',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(DocumentHistory::class, 'document_history_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'items_id');
    }
}
