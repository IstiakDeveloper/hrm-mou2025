<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuardShiftSetting extends Model
{
    private static ?self $cached = null;

    private static bool $resolved = false;

    protected $fillable = [
        'is_enabled',
        'designation_ids',
        'day_start',
        'day_end',
        'night_start',
        'night_end',
        'grace_minutes',
        'work_on_weekend',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'work_on_weekend' => 'boolean',
        'designation_ids' => 'array',
        'grace_minutes' => 'integer',
    ];

    public static function current(): self
    {
        if (self::$resolved && self::$cached) {
            return self::$cached;
        }

        self::$resolved = true;
        self::$cached = static::query()->orderBy('id')->first() ?? static::defaults();

        return self::$cached;
    }

    public static function forgetCurrent(): void
    {
        self::$cached = null;
        self::$resolved = false;
    }

    public static function defaults(): self
    {
        return new static([
            'is_enabled' => true,
            'designation_ids' => null,
            'day_start' => '09:00:00',
            'day_end' => '19:00:00',
            'night_start' => '19:00:00',
            'night_end' => '09:00:00',
            'grace_minutes' => 60,
            'work_on_weekend' => true,
        ]);
    }

    /**
     * Stored punch status for a day/night guard shift.
     * Null means office weekend rules still apply.
     */
    public static function punchedShiftStatus(mixed $shiftType, bool $hasCheckIn, ?string $status): ?string
    {
        if (! in_array($shiftType, ['day', 'night'], true) || ! $hasCheckIn) {
            return null;
        }

        if (! in_array($status, ['present', 'late', 'half_day'], true)) {
            return null;
        }

        return $status;
    }

    /**
     * @return list<int>
     */
    public function designationIds(): array
    {
        $raw = $this->designation_ids;

        if (! is_array($raw)) {
            return [];
        }

        return array_values(array_unique(array_map('intval', $raw)));
    }

    /**
     * @return array<string, mixed>
     */
    public function present(): array
    {
        $savedIds = $this->designationIds();

        return [
            'is_enabled' => (bool) ($this->is_enabled ?? true),
            'work_on_weekend' => (bool) ($this->work_on_weekend ?? true),
            'grace_minutes' => (int) ($this->grace_minutes ?? 60),
            'day_start' => $this->formatHi($this->day_start, '09:00'),
            'day_end' => $this->formatHi($this->day_end, '19:00'),
            'night_start' => $this->formatHi($this->night_start, '19:00'),
            'night_end' => $this->formatHi($this->night_end, '09:00'),
            'designation_ids' => $savedIds !== [] ? $savedIds : $this->nameMatchedDesignationIds(),
            'uses_name_match' => $savedIds === [],
        ];
    }

    /**
     * @return list<int>
     */
    private function nameMatchedDesignationIds(): array
    {
        return Designation::query()
            ->get(['id', 'name'])
            ->filter(fn (Designation $designation) => self::nameIsSecurityGuard($designation->name))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public static function nameIsSecurityGuard(?string $name): bool
    {
        if (! is_string($name) || trim($name) === '') {
            return false;
        }

        $normalized = preg_replace('/\s+/', ' ', strtolower(trim($name))) ?? '';

        return str_contains($normalized, 'security guard');
    }

    private function formatHi(mixed $value, string $fallback): string
    {
        if (! is_string($value) || $value === '') {
            return $fallback;
        }

        $parts = explode(':', $value);
        if (count($parts) < 2) {
            return $fallback;
        }

        return str_pad((string) (int) $parts[0], 2, '0', STR_PAD_LEFT)
            .':'.str_pad((string) (int) $parts[1], 2, '0', STR_PAD_LEFT);
    }
}
