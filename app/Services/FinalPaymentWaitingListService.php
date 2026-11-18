<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\FinalClearance;
use App\Models\RegionalOffice;
use App\Models\SeparationFinalPayment;
use App\Models\Zone;
use App\Support\ServiceDuration;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class FinalPaymentWaitingListService
{
    /**
     * Build the report payload for the Final Payment Waiting List.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function build(array $filters): array
    {
        $asOfDate = Carbon::parse($filters['as_of_date'] ?? 'now')->startOfDay();
        $dateFrom = ! empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null;
        $dateTo = ! empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null;
        $paymentStatus = (string) ($filters['payment_status'] ?? 'waiting_pending');
        $clearanceStatus = (string) ($filters['clearance_status'] ?? 'all');
        $search = trim((string) ($filters['search'] ?? ''));

        $query = Employee::query()
            ->with([
                'designation:id,name',
                'lastDesignation:id,name',
                'currentBranch.regionalOffice.zone',
                'lastBranch.regionalOffice.zone',
                'latestFinalClearance.branch',
                'latestSeparation',
                'latestSeparationFinalPayment',
            ])
            ->where(function (Builder $q) {
                $q->where('status', 'inactive')
                    ->orWhereNotNull('dropout_date')
                    ->orWhereNotNull('resignation_date')
                    ->orWhereNotNull('final_payment_date')
                    ->orWhereHas('separations')
                    ->orWhereHas('finalClearances')
                    ->orWhereHas('separationFinalPayments');
            });

        // Search filter (PIN, name, mobile)
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('pin', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%")
                    ->orWhere('name_en', 'like', "%{$search}%")
                    ->orWhere('name_bn', 'like', "%{$search}%")
                    ->orWhere('mobile_personal', 'like', "%{$search}%");
            });
        }

        // Organogram filters (Branch, Region, Zone)
        if (! empty($filters['branch_id'])) {
            $branchId = (int) $filters['branch_id'];
            $query->where(function (Builder $q) use ($branchId) {
                $q->where('current_branch_id', $branchId)
                    ->orWhere('last_branch_id', $branchId)
                    ->orWhereHas('finalClearances', fn (Builder $fc) => $fc->where('branch_id', $branchId));
            });
        } elseif (! empty($filters['regional_office_id']) || ! empty($filters['zone_id'])) {
            $regId = ! empty($filters['regional_office_id']) ? (int) $filters['regional_office_id'] : null;
            $zoneId = ! empty($filters['zone_id']) ? (int) $filters['zone_id'] : null;

            $query->where(function (Builder $q) use ($regId, $zoneId) {
                $matchBranch = function (Builder $bq) use ($regId, $zoneId) {
                    if ($regId) {
                        $bq->where('regional_office_id', $regId);
                    }
                    if ($zoneId) {
                        $bq->whereHas('regionalOffice', fn (Builder $rq) => $rq->where('zone_id', $zoneId));
                    }
                };

                $q->whereHas('currentBranch', $matchBranch)
                    ->orWhereHas('lastBranch', $matchBranch)
                    ->orWhereHas('finalClearances.branch', $matchBranch);
            });
        }

        $employees = $query->get();

        $rows = [];
        $totalAmount = 0.0;
        $waitingCount = 0;
        $pendingCount = 0;
        $paidCount = 0;
        $clearanceApprovedCount = 0;
        $clearanceInProgressCount = 0;
        $clearanceNotSubmittedCount = 0;

        foreach ($employees as $employee) {
            // 1. Resolve Left Date
            $leftDate = $this->resolveLeftDate($employee);

            // Left Date Range filter
            if ($dateFrom && (! $leftDate || $leftDate->lt($dateFrom))) {
                continue;
            }
            if ($dateTo && (! $leftDate || $leftDate->gt($dateTo))) {
                continue;
            }

            // 2. Duration from Left Date
            $duration = $leftDate ? ServiceDuration::format($leftDate, $asOfDate) : '—';

            // 3. Resolve Left Reason
            $leftReason = $this->resolveLeftReason($employee);

            // 4. Resolve Left Branch
            $leftBranch = $this->resolveLeftBranch($employee);

            // 5. Resolve Clearance Status
            $clearance = $this->resolveClearanceStatus($employee->latestFinalClearance);

            // Clearance Status Filter
            if ($clearanceStatus !== 'all') {
                if ($clearanceStatus === 'in_progress') {
                    if ($clearance['code'] !== 'in_progress') {
                        continue;
                    }
                } elseif ($clearance['code'] !== $clearanceStatus) {
                    continue;
                }
            }

            // 6. Resolve Payment Status
            $payment = $this->resolvePaymentStatus($employee);

            // Payment Status Filter
            if ($paymentStatus === 'waiting_pending') {
                if ($payment['code'] === 'paid') {
                    continue;
                }
            } elseif ($paymentStatus !== 'all' && $payment['code'] !== $paymentStatus) {
                continue;
            }

            // 7. Resolve Payment Date & Amount
            $paymentDate = $this->resolvePaymentDate($employee);
            $paymentAmount = $this->resolvePaymentAmount($employee);

            if ($paymentAmount !== null) {
                $totalAmount += $paymentAmount;
            }

            if ($payment['code'] === 'waiting') {
                $waitingCount++;
            } elseif ($payment['code'] === 'pending') {
                $pendingCount++;
            } elseif ($payment['code'] === 'paid') {
                $paidCount++;
            }

            if ($clearance['code'] === 'approved') {
                $clearanceApprovedCount++;
            } elseif ($clearance['code'] === 'in_progress') {
                $clearanceInProgressCount++;
            } elseif ($clearance['code'] === 'not_submitted') {
                $clearanceNotSubmittedCount++;
            }

            $rows[] = [
                'employee_id' => $employee->id,
                'pin' => $employee->pin ?: $employee->employee_id,
                'name' => $employee->name_en ?: $employee->full_name_en ?: '—',
                'designation' => $employee->lastDesignation?->name ?: $employee->designation?->name ?: $employee->latestFinalClearance?->designation_name ?: '—',
                'left_date_raw' => $leftDate?->toDateString(),
                'left_date' => $leftDate ? $leftDate->format('d-m-Y') : '—',
                'duration' => $duration,
                'duration_from_left' => $duration,
                'left_reason' => $leftReason,
                'left_branch' => $leftBranch,
                'clearance_status' => $clearance['label'],
                'clearance_status_code' => $clearance['code'],
                'clearance_status_label' => $clearance['label'],
                'clearance_badge' => $clearance['badge'],
                'clearance_id' => $employee->latestFinalClearance?->id,
                'payment_status' => $payment['label'],
                'payment_status_code' => $payment['code'],
                'payment_status_label' => $payment['label'],
                'payment_badge' => $payment['badge'],
                'payment_date' => $paymentDate ? $paymentDate->format('d-m-Y') : '—',
                'payment_amount' => $paymentAmount,
                'security_principal' => $employee->latestSeparationFinalPayment?->breakdown['security_fund']['principal']
                    ?? $employee->latestFinalClearance?->security_fund_snapshot['principal'] ?? null,
                'security_interest' => $employee->latestSeparationFinalPayment?->breakdown['security_fund']['interest']
                    ?? $employee->latestFinalClearance?->security_fund_snapshot['interest'] ?? null,
                'payment_amount_formatted' => $paymentAmount !== null ? number_format($paymentAmount, 2) : '—',
            ];
        }

        // Sort: Most recent left date first, then PIN
        usort($rows, function ($a, $b) {
            $dateA = $a['left_date_raw'] ?? '1970-01-01';
            $dateB = $b['left_date_raw'] ?? '1970-01-01';
            $cmp = strcmp($dateB, $dateA);
            if ($cmp !== 0) {
                return $cmp;
            }

            return strcmp((string) $a['pin'], (string) $b['pin']);
        });

        // Assign continuous SL
        foreach ($rows as $idx => &$row) {
            $row['sl'] = $idx + 1;
        }
        unset($row);

        return [
            'report_title' => 'Final Payment Waiting List',
            'print_date' => Carbon::now()->format('d-m-Y h:i A'),
            'as_of_date' => $asOfDate->format('d-m-Y'),
            'rows' => $rows,
            'summary' => [
                'total_staff' => count($rows),
                'waiting_count' => $waitingCount,
                'pending_count' => $pendingCount,
                'paid_count' => $paidCount,
                'clearance_approved_count' => $clearanceApprovedCount,
                'clearance_in_progress_count' => $clearanceInProgressCount,
                'clearance_not_submitted_count' => $clearanceNotSubmittedCount,
                'total_amount' => $totalAmount,
                'total_amount_formatted' => number_format($totalAmount, 2),
            ],
            'filters' => [
                'as_of_date' => $asOfDate->toDateString(),
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
                'payment_status' => $paymentStatus,
                'clearance_status' => $clearanceStatus,
                'zone_id' => ! empty($filters['zone_id']) ? (int) $filters['zone_id'] : null,
                'regional_office_id' => ! empty($filters['regional_office_id']) ? (int) $filters['regional_office_id'] : null,
                'branch_id' => ! empty($filters['branch_id']) ? (int) $filters['branch_id'] : null,
                'search' => $search,
            ],
        ];
    }

    /**
     * Resolve filter options for the report.
     *
     * @return array<string, mixed>
     */
    public function filterOptions(): array
    {
        return [
            'branches' => Branch::query()->orderBy('name')->get(['id', 'name', 'branch_code', 'regional_office_id']),
            'regional_offices' => RegionalOffice::query()->orderBy('name')->get(['id', 'name', 'code', 'zone_id']),
            'zones' => Zone::query()->orderBy('name')->get(['id', 'name', 'code']),
            'payment_statuses' => [
                ['value' => 'waiting_pending', 'label' => 'Waiting & Pending (Unpaid)'],
                ['value' => 'waiting', 'label' => 'Waiting / Not Initiated'],
                ['value' => 'pending', 'label' => 'Pending Settlement'],
                ['value' => 'paid', 'label' => 'Paid'],
                ['value' => 'all', 'label' => 'All Records'],
            ],
            'clearance_statuses' => [
                ['value' => 'all', 'label' => 'All Clearance Statuses'],
                ['value' => 'approved', 'label' => 'Approved'],
                ['value' => 'in_progress', 'label' => 'In Progress (Submitted)'],
                ['value' => 'draft', 'label' => 'Draft'],
                ['value' => 'rejected', 'label' => 'Rejected'],
                ['value' => 'not_submitted', 'label' => 'Not Submitted'],
            ],
        ];
    }

    protected function resolveLeftDate(Employee $employee): ?Carbon
    {
        if ($employee->latestFinalClearance?->dropout_date) {
            return Carbon::parse($employee->latestFinalClearance->dropout_date)->startOfDay();
        }

        if ($employee->latestSeparation?->separation_date) {
            return Carbon::parse($employee->latestSeparation->separation_date)->startOfDay();
        }

        if ($employee->dropout_date) {
            return Carbon::parse($employee->dropout_date)->startOfDay();
        }

        if ($employee->resignation_date) {
            return Carbon::parse($employee->resignation_date)->startOfDay();
        }

        return null;
    }

    protected function resolveLeftReason(Employee $employee): string
    {
        $reason = $employee->latestSeparation?->cause_of_separation
            ?: $employee->latestSeparation?->reason
            ?: $employee->dropout_reason
            ?: $employee->cause_of_separation;

        if ($reason) {
            return ucfirst(trim((string) $reason));
        }

        return 'Resignation / Dropout';
    }

    protected function resolveLeftBranch(Employee $employee): string
    {
        $branch = $employee->latestFinalClearance?->branch
            ?: $employee->lastBranch
            ?: $employee->currentBranch;

        if ($branch) {
            return $branch->branch_code ? "{$branch->name} ({$branch->branch_code})" : $branch->name;
        }

        if ($employee->latestFinalClearance?->workplace) {
            return $employee->latestFinalClearance->workplace;
        }

        return '—';
    }

    /**
     * @return array{label: string, code: string, badge: string}
     */
    protected function resolveClearanceStatus(?FinalClearance $clearance): array
    {
        if (! $clearance) {
            return [
                'label' => 'Not Submitted',
                'code' => 'not_submitted',
                'badge' => 'outline',
            ];
        }

        return match ($clearance->status) {
            FinalClearance::STATUS_APPROVED => [
                'label' => 'Approved',
                'code' => 'approved',
                'badge' => 'success',
            ],
            FinalClearance::STATUS_ED => [
                'label' => 'Submitted to ED',
                'code' => 'in_progress',
                'badge' => 'warning',
            ],
            FinalClearance::STATUS_DIRECTOR_FA => [
                'label' => 'Submitted to Dir (F&A)',
                'code' => 'in_progress',
                'badge' => 'warning',
            ],
            FinalClearance::STATUS_ACCOUNTS => [
                'label' => 'Submitted to Accounts',
                'code' => 'in_progress',
                'badge' => 'info',
            ],
            FinalClearance::STATUS_HR => [
                'label' => 'Submitted to HR',
                'code' => 'in_progress',
                'badge' => 'info',
            ],
            FinalClearance::STATUS_DRAFT => [
                'label' => 'Draft',
                'code' => 'draft',
                'badge' => 'secondary',
            ],
            FinalClearance::STATUS_REJECTED => [
                'label' => 'Rejected',
                'code' => 'rejected',
                'badge' => 'destructive',
            ],
            default => [
                'label' => ucfirst(str_replace('_', ' ', (string) $clearance->status)),
                'code' => (string) $clearance->status,
                'badge' => 'secondary',
            ],
        };
    }

    /**
     * @return array{label: string, code: string, badge: string}
     */
    protected function resolvePaymentStatus(Employee $employee): array
    {
        $sfp = $employee->latestSeparationFinalPayment;

        if ($sfp?->status === SeparationFinalPayment::STATUS_PAID || $employee->final_payment_date !== null) {
            return [
                'label' => 'Paid',
                'code' => 'paid',
                'badge' => 'success',
            ];
        }

        if ($sfp?->status === SeparationFinalPayment::STATUS_PENDING) {
            return [
                'label' => 'Pending',
                'code' => 'pending',
                'badge' => 'warning',
            ];
        }

        return [
            'label' => 'Waiting',
            'code' => 'waiting',
            'badge' => 'danger',
        ];
    }

    protected function resolvePaymentDate(Employee $employee): ?Carbon
    {
        $sfp = $employee->latestSeparationFinalPayment;
        if ($sfp?->payment_date) {
            return Carbon::parse($sfp->payment_date)->startOfDay();
        }

        if ($employee->final_payment_date) {
            return Carbon::parse($employee->final_payment_date)->startOfDay();
        }

        if ($employee->latestSeparation?->final_payment_date) {
            return Carbon::parse($employee->latestSeparation->final_payment_date)->startOfDay();
        }

        return null;
    }

    protected function resolvePaymentAmount(Employee $employee): ?float
    {
        $sfp = $employee->latestSeparationFinalPayment;
        if ($sfp && $sfp->net_payable !== null) {
            return (float) $sfp->net_payable;
        }

        $fc = $employee->latestFinalClearance;
        if ($fc && $fc->net_payable !== null) {
            return (float) $fc->net_payable;
        }

        if ($employee->final_payment_amount !== null) {
            return (float) $employee->final_payment_amount;
        }

        return null;
    }
}
