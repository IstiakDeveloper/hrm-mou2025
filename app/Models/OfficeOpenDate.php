<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class OfficeOpenDate extends Model
{
    protected $fillable = [
        'date',
        'note',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    /** @var array<string, true>|null */
    private static ?array $openDates = null;

    public static function forgetCache(): void
    {
        self::$openDates = null;
    }

    public static function isOpen(Carbon|string $date): bool
    {
        $ymd = $date instanceof Carbon ? $date->toDateString() : Carbon::parse($date)->toDateString();

        return isset(self::openDateSet()[$ymd]);
    }

    /**
     * @return list<string>
     */
    public static function dateStrings(): array
    {
        return array_keys(self::openDateSet());
    }

    /**
     * @return array<string, true>
     */
    private static function openDateSet(): array
    {
        if (self::$openDates !== null) {
            return self::$openDates;
        }

        if (! Schema::hasTable('office_open_dates')) {
            return self::$openDates = [];
        }

        $set = [];
        foreach (static::query()->orderBy('date')->pluck('date') as $date) {
            $ymd = $date instanceof Carbon
                ? $date->toDateString()
                : Carbon::parse((string) $date)->toDateString();
            $set[$ymd] = true;
        }

        return self::$openDates = $set;
    }
}
