<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait HasCompositePrimaryKey
{
    public function getIncrementing(): bool
    {
        return false;
    }

    protected function setKeysForSaveQuery($query): Builder
    {
        foreach ((array) $this->getKeyName() as $key) {
            $query->where($key, '=', $this->getKeyForSaveQuery($key));
        }

        return $query;
    }

    protected function getKeyForSaveQuery($keyName = null)
    {
        if ($keyName === null) {
            return collect((array) $this->getKeyName())
                ->mapWithKeys(fn (string $key) => [$key => $this->getOriginal($key) ?? $this->getAttribute($key)])
                ->all();
        }

        return $this->getOriginal($keyName) ?? $this->getAttribute($keyName);
    }
}

