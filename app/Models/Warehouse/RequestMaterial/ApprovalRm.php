<?php

namespace App\Models\Warehouse\RequestMaterial;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalRm extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'approval_rm';

    public $incrementing = false;
    protected $primaryKey = ['request_material_id', 'users_id'];

    protected $fillable = [
        'request_material_id',
        'users_id',
        'approval_ke',
        'status',
        'note',
    ];

    public function requestMaterial(): BelongsTo
    {
        return $this->belongsTo(RequestMaterial::class, 'request_material_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'users_id');
    }
}
