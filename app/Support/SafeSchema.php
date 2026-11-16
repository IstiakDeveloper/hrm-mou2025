<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class SafeSchema
{
    public static function hasTable(string $table): bool
    {
        try {
            return Schema::hasTable($table);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  (callable(Builder<Model>): void)|null  $constraint
     */
    public static function modelCount(string $modelClass, ?callable $constraint = null): int
    {
        $model = new $modelClass;
        if (! self::hasTable($model->getTable())) {
            return 0;
        }

        $query = $modelClass::query();
        if ($constraint !== null) {
            $constraint($query);
        }

        return (int) $query->count();
    }
}
