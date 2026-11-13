<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class InertiaShellCache
{
    public const TTL_SECONDS = 20;

    /**
     * @param  callable(): array<string, mixed>  $build
     * @return array<string, mixed>
     */
    public static function remember(User $user, callable $build): array
    {
        if (app()->runningUnitTests()) {
            return $build();
        }

        return Cache::remember(self::key($user->id), self::TTL_SECONDS, $build);
    }

    public static function forget(?int $userId): void
    {
        if ($userId) {
            Cache::forget(self::key($userId));
        }
    }

    public static function forgetForEmployee(?int $employeeId): void
    {
        if (! $employeeId) {
            return;
        }

        $userId = User::query()->where('employee_id', $employeeId)->value('id');
        self::forget($userId ? (int) $userId : null);
    }

    private static function key(int $userId): string
    {
        return 'inertia:shell:v1:'.$userId;
    }
}
