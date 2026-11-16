<?php

namespace App\Services;

use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanInstallment;
use App\Models\LoanApplication;
use App\Models\LoanCollectionBatch;
use App\Models\LoanPolicy;
use App\Support\SafeSchema;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EmployeeLoanDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function stats(): array
    {
        if (! SafeSchema::hasTable('employee_loans')) {
            return $this->emptyStats();
        }

        $monthStart = Carbon::today()->startOfMonth()->toDateString();
        $monthEnd = Carbon::today()->endOfMonth()->toDateString();

        $activeQuery = EmployeeLoan::query()->where('status', 'active');

        $activeLoans = (clone $activeQuery)->count();
        $completedLoans = EmployeeLoan::query()->where('status', 'completed')->count();
        $cancelledLoans = EmployeeLoan::query()->where('status', 'cancelled')->count();

        $totalOutstanding = (float) ((clone $activeQuery)->sum('outstanding_balance') ?? 0);
        $totalPrincipalActive = (float) ((clone $activeQuery)->sum('principal_amount') ?? 0);
        $totalDisbursedAll = (float) (EmployeeLoan::query()->sum('principal_amount') ?? 0);
        $totalPayableActive = (float) ((clone $activeQuery)->sum('total_payable') ?? 0);
        $totalRecoveredActive = $totalPayableActive - $totalOutstanding;

        $employeesWithActiveLoan = (clone $activeQuery)->distinct()->count('employee_id');

        $pendingApplications = SafeSchema::hasTable('loan_applications')
            ? LoanApplication::query()->where('status', 'pending')->count()
            : 0;

        $approvedAwaitingDisburse = SafeSchema::hasTable('loan_applications')
            ? LoanApplication::query()->where('status', 'approved')->count()
            : 0;

        $pendingInstallments = SafeSchema::hasTable('employee_loan_installments')
            ? EmployeeLoanInstallment::query()
                ->where('status', 'pending')
                ->whereHas('loan', fn ($q) => $q->where('status', 'active'))
                ->count()
            : 0;

        $scheduledInstallments = SafeSchema::hasTable('employee_loan_installments')
            ? EmployeeLoanInstallment::query()
                ->where('status', 'scheduled')
                ->whereHas('loan', fn ($q) => $q->where('status', 'active'))
                ->count()
            : 0;

        $collectionsThisMonth = SafeSchema::hasTable('loan_collection_batches')
            ? (float) (LoanCollectionBatch::query()
                ->whereNull('rolled_back_at')
                ->whereBetween('collection_date', [$monthStart, $monthEnd])
                ->sum('total_amount') ?? 0)
            : 0;

        $collectionBatchesThisMonth = SafeSchema::hasTable('loan_collection_batches')
            ? LoanCollectionBatch::query()
                ->whereNull('rolled_back_at')
                ->whereBetween('collection_date', [$monthStart, $monthEnd])
                ->count()
            : 0;

        $activeLoanPolicies = SafeSchema::hasTable('loan_policies')
            ? LoanPolicy::query()->where('is_active', true)->count()
            : 0;

        $byLoanType = (clone $activeQuery)
            ->select(
                'loan_type',
                DB::raw('COUNT(*) as loan_count'),
                DB::raw('COALESCE(SUM(outstanding_balance), 0) as outstanding'),
                DB::raw('COALESCE(SUM(principal_amount), 0) as principal'),
            )
            ->groupBy('loan_type')
            ->orderBy('loan_type')
            ->get()
            ->map(fn ($row) => [
                'loan_type' => $row->loan_type,
                'label' => config("employee_loans.loan_types.{$row->loan_type}.label", $row->loan_type),
                'loan_count' => (int) $row->loan_count,
                'outstanding' => (int) round((float) $row->outstanding),
                'principal' => (int) round((float) $row->principal),
            ])
            ->values()
            ->all();

        return [
            'activeLoans' => $activeLoans,
            'completedLoans' => $completedLoans,
            'cancelledLoans' => $cancelledLoans,
            'totalLoans' => $activeLoans + $completedLoans + $cancelledLoans,
            'employeesWithActiveLoan' => $employeesWithActiveLoan,
            'totalOutstanding' => (int) round($totalOutstanding),
            'totalPrincipalActive' => (int) round($totalPrincipalActive),
            'totalDisbursedAll' => (int) round($totalDisbursedAll),
            'totalRecoveredActive' => (int) round($totalRecoveredActive),
            'pendingApplications' => $pendingApplications,
            'approvedAwaitingDisburse' => $approvedAwaitingDisburse,
            'pendingInstallments' => $pendingInstallments,
            'scheduledInstallments' => $scheduledInstallments,
            'collectionsThisMonth' => (int) round($collectionsThisMonth),
            'collectionBatchesThisMonth' => $collectionBatchesThisMonth,
            'activeLoanPolicies' => $activeLoanPolicies,
            'byLoanType' => $byLoanType,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyStats(): array
    {
        return [
            'activeLoans' => 0,
            'completedLoans' => 0,
            'cancelledLoans' => 0,
            'totalLoans' => 0,
            'employeesWithActiveLoan' => 0,
            'totalOutstanding' => 0.0,
            'totalPrincipalActive' => 0.0,
            'totalDisbursedAll' => 0.0,
            'totalRecoveredActive' => 0.0,
            'pendingApplications' => 0,
            'approvedAwaitingDisburse' => 0,
            'pendingInstallments' => 0,
            'scheduledInstallments' => 0,
            'collectionsThisMonth' => 0.0,
            'collectionBatchesThisMonth' => 0,
            'activeLoanPolicies' => 0,
            'byLoanType' => [],
        ];
    }
}
