<?php

namespace App\Models\Master\Material;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Unit extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'units';

    protected $fillable = [
        'nama',
        'status',
    ];

    protected $appends = [
        'name',
    ];

    public function getNameAttribute(): ?string
    {
        return $this->nama;
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class, 'units_id');
    }
}
