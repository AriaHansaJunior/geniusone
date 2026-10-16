<?php

namespace App\Models\Master\Customs;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DocumentHistory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'document_histories';

    protected $fillable = [
        'invoice_number',
        'invoice_alias',
        'invoice_date',
        'transaction_number',
        'mutation_type',
        'customer_supplier',
        'customer',
        'destination',
        'bl_number',
        'currency',
        'customs_document',
        'amount',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'invoice_date' => 'datetime',
        'amount' => 'float',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(DocumentHistoryItem::class, 'document_history_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
