<?php

namespace App\Models\System\Setting;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $table = 'system_settings';

    protected $fillable = [
        'key',
        'value',
        'group',
        'label',
    ];

    /**
     * Retrieve a map of all key => value settings cleanly.
     */
    public static function mapAll(): array
    {
        return static::query()
            ->pluck('value', 'key')
            ->toArray();
    }
}

