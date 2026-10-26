<?php

namespace App\Console\Commands;

use App\Services\AutoAttendanceService;
use Illuminate\Console\Command;

class FillAutoAttendance extends Command
{
    protected $signature = 'attendance:auto';

    protected $description = 'Create today\'s attendance for employee PINs listed in AUTO_ATTENDANCE_EMPLOYEE_PIN';

    public function handle(AutoAttendanceService $autoAttendanceService): int
    {
        $created = $autoAttendanceService->fillToday();

        $this->info("Auto attendance created for {$created} employee(s).");

        return self::SUCCESS;
    }
}
