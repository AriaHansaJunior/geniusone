<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Classification extends Model
{
    use HasFactory;

    protected $table = 'classifications';
    public $timestamps = false;

    protected $fillable = [
        'reporting_types_id',
        'accounts_id',
        'code',
        'name',
        'description',
        'status',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'classifications_id');
    }
}
