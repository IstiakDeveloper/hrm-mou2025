<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Remembers table and column existence so page loads do not hit information_schema.
 */
class CachedSchema
{
    private static ?int $migrationId = null;

    /** @var array<string, true>|null */
    private static ?array $tables = null;

    /** @var array<string, array<string, true>> */
    private static array $columns = [];

    public static function hasTable(string $table): bool
    {
        if (self::uncached()) {
            return Schema::hasTable($table);
        }

        return isset(self::tables()[strtolower($table)]);
    }

    public static function hasColumn(string $table, string $column): bool
    {
        if (self::uncached()) {
            return Schema::hasTable($table) && Schema::hasColumn($table, $column);
        }

        if (! self::hasTable($table)) {
            return false;
        }

        if (! isset(self::$columns[$table])) {
            $listed = Cache::remember(self::key('columns:'.$table), now()->addMinutes(30), function () use ($table) {
                return Schema::getColumnListing($table);
            });

            self::$columns[$table] = array_fill_keys(array_map(strtolower(...), $listed), true);
        }

        return isset(self::$columns[$table][strtolower($column)]);
    }

    /**
     * @return array<string, true>
     */
    private static function tables(): array
    {
        if (self::$tables !== null) {
            return self::$tables;
        }

        $names = Cache::remember(self::key('tables'), now()->addMinutes(30), function () {
            $tables = [];

            foreach (Schema::getTables() as $table) {
                $name = (string) ($table['name'] ?? '');
                if ($name !== '') {
                    $tables[] = $name;
                }
            }

            return $tables;
        });

        self::$tables = array_fill_keys(array_map(strtolower(...), $names), true);

        return self::$tables;
    }

    private static function key(string $suffix): string
    {
        return 'schema:v1:'.self::migrationId().':'.$suffix;
    }

    private static function migrationId(): int
    {
        if (self::$migrationId !== null) {
            return self::$migrationId;
        }

        try {
            self::$migrationId = (int) Cache::remember('schema:migration-id', 60, function () {
                return (int) DB::table('migrations')->max('id');
            });
        } catch (\Throwable) {
            self::$migrationId = 0;
        }

        return self::$migrationId;
    }

    private static function uncached(): bool
    {
        return app()->runningUnitTests();
    }
}
