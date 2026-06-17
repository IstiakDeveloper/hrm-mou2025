<?php

namespace App\Observers;

use App\Models\Holiday;
use App\Services\HolidayAttendanceSyncService;
use Illuminate\Support\Facades\Log;

class HolidayObserver
{
    public function __construct(
        private readonly HolidayAttendanceSyncService $holidayAttendanceSync,
    ) {}

    public function created(Holiday $holiday): void
    {
        $this->syncAttendance($holiday);
    }

    public function updated(Holiday $holiday): void
    {
        $this->syncAttendance($holiday);
    }

    private function syncAttendance(Holiday $holiday): void
    {
        $updated = $this->holidayAttendanceSync->syncForHoliday($holiday);

        Log::info('Holiday attendance sync', [
            'holiday_id' => $holiday->id,
            'date' => $holiday->date?->toDateString(),
            'is_recurring' => $holiday->is_recurring,
            'updated' => $updated,
        ]);
    }
}
