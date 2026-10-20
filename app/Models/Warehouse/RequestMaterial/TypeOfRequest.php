<?php

namespace App\Models\Warehouse\RequestMaterial;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TypeOfRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'type_of_request';

    protected $fillable = [
        'name',
        'status',
    ];

    public function materialRequests(): HasMany
    {
        return $this->hasMany(RequestMaterial::class, 'type_of_request_id');
    }
}
