<?php

namespace App\Console\Commands;

use App\Models\Movement;
use App\Models\MovementPenalty;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;

class CheckOverdueMovements extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'movements:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check active movements that were not closed by midnight and assign daily penalty';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $today = Carbon::today();
        
        // Find all active movements created before today (i.e. start date < today)
        $overdueMovements = Movement::where('status', 'active')
            ->where('from_datetime', '<', $today)
            ->get();

        $count = 0;

        foreach ($overdueMovements as $movement) {
            $startDate = $movement->from_datetime->copy()->startOfDay();
            $overdueDays = max(1, (int) $startDate->diffInDays($today));
            $finePerDay = 20.00;
            $totalFine = $overdueDays * $finePerDay;

            // Find associated user account
            $user = User::where('employee_id', $movement->employee_id)->first();

            // Check if there is already an approved penalty for this movement
            $existingPenalty = MovementPenalty::where('movement_id', $movement->id)->first();
            if ($existingPenalty && $existingPenalty->status === 'approved') {
                // If already approved, skip re-penalizing
                continue;
            }

            MovementPenalty::updateOrCreate(
                ['movement_id' => $movement->id],
                [
                    'employee_id' => $movement->employee_id,
                    'user_id' => $user?->id,
                    'overdue_days' => $overdueDays,
                    'fine_per_day' => $finePerDay,
                    'total_fine' => $totalFine,
                    'status' => $existingPenalty ? $existingPenalty->status : 'unpaid',
                ]
            );

            $count++;
        }

        $this->info("Successfully processed {$count} overdue movements for fine calculation.");

        return Command::SUCCESS;
    }
}
