<?php

namespace App\Models\Master\Organization;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobNumber extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'job_number';

    protected $fillable = [
        'name',
        'status',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'job_number_id');
    }
}
