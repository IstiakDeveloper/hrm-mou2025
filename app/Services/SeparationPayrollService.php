<?php

namespace App\Services;

use App\Models\Employee;
use Carbon\Carbon;

class SeparationPayrollService
{
    /**
     * Resolve payable calendar days for a salary month (joining + separation).
     *
     * Joining: payable from the joining date through the salary month's last day (not process/today).
     * Separation effective date is the first day the employee is no longer on staff.
     * Example: joined 15 Jun → payable 15–30 Jun; effective 15 Jun → last working day is 14 Jun.
     *
     * @return array{
     *     payable_days: int,
     *     days_in_month: int,
     *     factor: float,
     *     is_partial: bool,
     *     eligible: bool,
     *     note: string|null,
     *     payroll_remark: string|null,
     *     last_working_date: string|null,
     *     separation_date: string|null,
     *     joining_date: string|null
     * }
     */
    public function resolveForPayrollMonth(Employee $employee, int $year, int $month): array
    {
        $monthStart = Carbon::create($year, $month, 1)->startOfDay();
        $monthEnd = $monthStart->copy()->endOfMonth()->startOfDay();
        $daysInMonth = $monthStart->daysInMonth;

        $periodStart = $monthStart->copy();
        $periodEnd = $monthEnd->copy();
        $joiningDateLabel = null;
        $lastWorkingDateLabel = null;
        $separationDateLabel = null;
        $joiningAdjusted = false;
        $separationAdjusted = false;

        if ($employee->joining_date) {
            $joiningDate = Carbon::parse($employee->joining_date)->startOfDay();
            $joiningDateLabel = $joiningDate->toDateString();

            if ($joiningDate->gt($monthEnd)) {
                return $this->result(0, $daysInMonth, false, null, null, null, null, $joiningDateLabel);
            }

            if ($joiningDate->gt($monthStart)) {
                $periodStart = $joiningDate->copy();
                $joiningAdjusted = true;
            }
        }

        if ($employee->dropout_date) {
            $separationDate = Carbon::parse($employee->dropout_date)->startOfDay();
            $separationDateLabel = $separationDate->toDateString();

            if ($separationDate->lte($monthStart)) {
                return $this->result(0, $daysInMonth, false, null, null, null, $separationDateLabel, $joiningDateLabel);
            }

            if ($separationDate->lte($monthEnd)) {
                $lastWorkingDay = $separationDate->copy()->subDay();

                if ($lastWorkingDay->lt($periodStart)) {
                    return $this->result(0, $daysInMonth, false, null, null, null, $separationDateLabel, $joiningDateLabel);
                }

                $periodEnd = $lastWorkingDay;
                $lastWorkingDateLabel = $lastWorkingDay->toDateString();
                $separationAdjusted = true;
            }
        }

        if ($periodStart->gt($periodEnd)) {
            return $this->result(0, $daysInMonth, false, null, null, null, $separationDateLabel, $joiningDateLabel);
        }

        $payableDays = (int) $periodStart->diffInDays($periodEnd) + 1;
        $isPartial = $payableDays < $daysInMonth;
        $payrollRemark = null;
        $note = null;

        if ($isPartial) {
            $context = [];

            if ($joiningAdjusted && $joiningDateLabel) {
                $context[] = sprintf(
                    'joined %s through %s',
                    Carbon::parse($joiningDateLabel)->format('d M Y'),
                    $monthEnd->format('d M Y'),
                );
            }

            if ($separationAdjusted && $lastWorkingDateLabel && $separationDateLabel) {
                $context[] = sprintf(
                    'last working day %s (effective %s)',
                    Carbon::parse($lastWorkingDateLabel)->format('d M Y'),
                    Carbon::parse($separationDateLabel)->format('d M Y'),
                );
            }

            $payrollRemark = sprintf(
                'Partial month salary: paying for %d of %d day(s) this month%s.',
                $payableDays,
                $daysInMonth,
                $context !== [] ? ' ('.implode('; ', $context).')' : '',
            );
            $note = $payrollRemark;
        }

        return $this->result(
            $payableDays,
            $daysInMonth,
            $isPartial,
            $note,
            $payrollRemark,
            $lastWorkingDateLabel,
            $separationDateLabel,
            $joiningDateLabel,
        );
    }

    /**
     * @return array{
     *     payable_days: int,
     *     days_in_month: int,
     *     factor: float,
     *     is_partial: bool,
     *     eligible: bool,
     *     note: string|null,
     *     payroll_remark: string|null,
     *     last_working_date: string|null,
     *     separation_date: string|null,
     *     joining_date: string|null
     * }
     */
    private function result(
        int $payableDays,
        int $daysInMonth,
        bool $isPartial,
        ?string $note,
        ?string $payrollRemark,
        ?string $lastWorkingDate,
        ?string $separationDate,
        ?string $joiningDate = null,
    ): array {
        $factor = $daysInMonth > 0 ? min(1.0, max(0.0, $payableDays / $daysInMonth)) : 0.0;

        return [
            'payable_days' => $payableDays,
            'days_in_month' => $daysInMonth,
            'factor' => $factor,
            'is_partial' => $isPartial,
            'eligible' => $payableDays > 0,
            'note' => $note,
            'payroll_remark' => $payrollRemark,
            'last_working_date' => $lastWorkingDate,
            'separation_date' => $separationDate,
            'joining_date' => $joiningDate,
        ];
    }
}
