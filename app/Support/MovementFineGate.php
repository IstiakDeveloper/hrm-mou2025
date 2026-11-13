<?php

namespace App\Support;

use App\Models\MovementPenalty;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class MovementFineGate
{
    public static function blockingPenaltyId(User $user): ?int
    {
        if (app()->runningUnitTests()) {
            return self::lookup($user);
        }

        $id = Cache::remember(self::key($user->id), 20, fn () => self::lookup($user) ?? 0);

        return $id > 0 ? (int) $id : null;
    }

    public static function forget(?int $userId): void
    {
        if ($userId) {
            Cache::forget(self::key($userId));
        }
    }

    private static function key(int $userId): string
    {
        return 'movement-fine:user:'.$userId;
    }

    private static function lookup(User $user): ?int
    {
        $id = MovementPenalty::query()
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if ($user->employee_id) {
                    $query->orWhere('employee_id', $user->employee_id);
                }
            })
            ->whereIn('status', ['unpaid', 'pending_verification', 'rejected'])
            ->value('id');

        return $id !== null ? (int) $id : null;
    }
}
