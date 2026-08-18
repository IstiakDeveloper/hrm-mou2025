<?php

namespace App\Services;

use App\Models\Movement;
use App\Models\MovementPenalty;
use App\Models\User;
use App\Support\BangladeshDate;
use Carbon\Carbon;

class MovementPenaltySyncService
{
    public const FINE_PER_DAY = 20.00;

    /**
     * Recalculate unpaid overdue movement penalties for Bangladesh "today".
     */
    public function sync(): int
    {
        $today = BangladeshDate::now()->startOfDay();

        $overdueMovements = Movement::where('status', 'active')
            ->where('from_datetime', '<', $today)
            ->get();

        $count = 0;

        foreach ($overdueMovements as $movement) {
            $fromDatetime = $movement->from_datetime instanceof Carbon
                ? $movement->from_datetime
                : Carbon::parse($movement->from_datetime);

            $startDate = $fromDatetime->copy()->startOfDay();
            $totalOverdueDays = max(1, (int) $startDate->diffInDays($today));

            $approvedOverdueDays = (int) MovementPenalty::where('movement_id', $movement->id)
                ->where('status', 'approved')
                ->sum('overdue_days');

            $unpaidOverdueDays = max(0, $totalOverdueDays - $approvedOverdueDays);

            if ($unpaidOverdueDays <= 0) {
                continue;
            }

            $totalFine = $unpaidOverdueDays * self::FINE_PER_DAY;
            $user = User::where('employee_id', $movement->employee_id)->first();

            $activePenalty = MovementPenalty::where('movement_id', $movement->id)
                ->whereIn('status', ['unpaid', 'pending_verification', 'rejected'])
                ->first();

            if ($activePenalty) {
                $activePenalty->update([
                    'overdue_days' => $unpaidOverdueDays,
                    'fine_per_day' => self::FINE_PER_DAY,
                    'total_fine' => $totalFine,
                ]);
            } else {
                MovementPenalty::create([
                    'movement_id' => $movement->id,
                    'employee_id' => $movement->employee_id,
                    'user_id' => $user?->id,
                    'overdue_days' => $unpaidOverdueDays,
                    'fine_per_day' => self::FINE_PER_DAY,
                    'total_fine' => $totalFine,
                    'status' => 'unpaid',
                ]);
            }

            $count++;
        }

        return $count;
    }
}
