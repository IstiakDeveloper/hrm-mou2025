<?php

namespace App\Services;

use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanInstallment;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanMigrationItem;
use App\Models\LoanPolicy;
use App\Models\PayslipLine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Rebuild legacy-import loan schedules from migration snapshots.
 *
 * Restores original installment calendars, keeps post-cutoff payroll/collection
 * payments (salary deductions), and applies legacy pre-payments before the cutoff.
 */
class LegacyLoanRebuildService
{
    private const LEGACY_PAID_CUTOFF = '2026-06-01';

    /** @var list<string> */
    private const RESTORE_COLLECTION_TYPES = [
        EmployeeLoanTransaction::TYPE_INSTALLMENT,
        ...EmployeeLoanTransaction::COLLECTION_TYPES,
    ];

    public function __construct(
        protected EmployeeLoanService $loanService,
        protected LoanCalculationService $calculator,
    ) {}

    /**
     * @return array{
     *     loans_rebuilt: int,
     *     june_collections_restored: int,
     *     payroll_collections_restored: int,
     *     dry_run: bool,
     * }
     */
    public function rebuildAll(bool $dryRun = false): array
    {
        $loanIds = LoanMigrationItem::query()
            ->whereNotNull('employee_loan_id')
            ->pluck('employee_loan_id')
            ->all();

        return $this->rebuildLoanIds($loanIds, $dryRun);
    }

    /**
     * @param  list<int>  $loanIds
     * @return array{
     *     loans_rebuilt: int,
     *     june_collections_restored: int,
     *     payroll_collections_restored: int,
     *     dry_run: bool,
     * }
     */
    public function rebuildLoanIds(array $loanIds, bool $dryRun = false): array
    {
        $loansRebuilt = 0;
        $payrollCollectionsRestored = 0;

        foreach ($loanIds as $loanId) {
            $item = LoanMigrationItem::query()
                ->with(['employeeLoan.policy', 'migration', 'policy'])
                ->where('employee_loan_id', $loanId)
                ->first();

            if (! $item?->employeeLoan) {
                continue;
            }

            $payrollCollections = $this->capturePostLegacyCollections($item->employeeLoan);

            if ($dryRun) {
                $loansRebuilt++;
                $payrollCollectionsRestored += count($payrollCollections);

                continue;
            }

            DB::transaction(function () use ($item, $payrollCollections, &$loansRebuilt, &$payrollCollectionsRestored) {
                $this->rebuildLoan($item, $payrollCollections);
                $loansRebuilt++;
                $payrollCollectionsRestored += count($payrollCollections);
            });
        }

        return [
            'loans_rebuilt' => $loansRebuilt,
            'june_collections_restored' => $payrollCollectionsRestored,
            'payroll_collections_restored' => $payrollCollectionsRestored,
            'dry_run' => $dryRun,
        ];
    }

    public function calendarPassedCap(LoanPolicy $policy, string $disbursementDate): int
    {
        $graceMonths = (int) ($policy->grace_months ?? 0);
        $firstInstallment = $this->loanService->resolveFirstInstallmentDate($disbursementDate, $graceMonths);
        $intervalMonths = max(1, (int) ($policy->interval_months ?? 1));
        $totalInstallments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        if ($totalInstallments < 1) {
            $totalInstallments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        $cutoff = Carbon::parse(self::LEGACY_PAID_CUTOFF);
        $firstDue = $firstInstallment->copy()->startOfMonth();
        $cap = 0;

        for ($i = 1; $i <= $totalInstallments; $i++) {
            $due = $firstDue->copy()->addMonths(($i - 1) * $intervalMonths)->endOfMonth();
            if ($due->lt($cutoff)) {
                $cap++;
            } else {
                break;
            }
        }

        return $cap;
    }

    /**
     * @return list<array{
     *     installment_no: int|null,
     *     due_date: string|null,
     *     payroll_year: int|null,
     *     payroll_month: int|null,
     *     credit_amount: float,
     *     transaction_type: string,
     *     transaction_date: string,
     *     loan_collection_batch_id: int|null,
     *     payslip_id: int|null,
     *     payroll_run_id: int|null,
     *     reference_no: string|null,
     *     notes: string|null,
     *     created_by: int|null,
     * }>
     */
    protected function capturePostLegacyCollections(EmployeeLoan $loan): array
    {
        $cutoff = Carbon::parse(self::LEGACY_PAID_CUTOFF)->startOfDay();
        $collections = [];

        EmployeeLoanTransaction::query()
            ->where('employee_loan_id', $loan->id)
            ->whereIn('transaction_type', self::RESTORE_COLLECTION_TYPES)
            // Avoid restoring "paid" installments from broken zero-credit transactions.
            ->where('credit_amount', '>', 0)
            ->where('transaction_date', '>=', $cutoff)
            ->with('installment')
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get()
            ->each(function (EmployeeLoanTransaction $tx) use (&$collections) {
                $collections[] = [
                    'installment_no' => $tx->installment ? (int) $tx->installment->installment_no : null,
                    'due_date' => $tx->installment?->due_date?->toDateString(),
                    'payroll_year' => $tx->payroll_year ? (int) $tx->payroll_year : null,
                    'payroll_month' => $tx->payroll_month ? (int) $tx->payroll_month : null,
                    'credit_amount' => (float) $tx->credit_amount,
                    'transaction_type' => $tx->transaction_type,
                    'transaction_date' => $tx->transaction_date->toDateString(),
                    'loan_collection_batch_id' => $tx->loan_collection_batch_id,
                    'payslip_id' => $tx->payslip_id,
                    'payroll_run_id' => $tx->payroll_run_id,
                    'reference_no' => $tx->reference_no,
                    'notes' => $tx->notes,
                    'created_by' => $tx->created_by,
                ];
            });

        $loan->installments()
            ->where('status', 'paid')
            ->where('due_date', '>=', $cutoff)
            ->where(function ($query) {
                $query->whereNotNull('payslip_id')
                    ->orWhereNotNull('paid_at');
            })
            ->with(['payslip.payrollRun'])
            ->orderBy('due_date')
            ->orderBy('installment_no')
            ->get()
            ->each(function (EmployeeLoanInstallment $installment) use (&$collections) {
                $run = $installment->payslip?->payrollRun;
                $paidAt = $installment->paid_at ?? $installment->due_date;
                $paidAmount = (float) ($installment->paid_amount ?? 0);
                $creditAmount = $paidAmount > 0 ? $paidAmount : (float) $installment->total_amount;

                $collections[] = [
                    'installment_no' => (int) $installment->installment_no,
                    'due_date' => $installment->due_date?->toDateString(),
                    'payroll_year' => $run?->year ? (int) $run->year : ($paidAt ? $paidAt->year : null),
                    'payroll_month' => $run?->month ? (int) $run->month : ($paidAt ? $paidAt->month : null),
                    // If paid_amount is broken/zero but installment total is correct,
                    // use total as the restore credit amount.
                    'credit_amount' => $creditAmount,
                    'transaction_type' => EmployeeLoanTransaction::TYPE_INSTALLMENT,
                    'transaction_date' => ($paidAt ?? $installment->due_date)?->toDateString()
                        ?? Carbon::parse(self::LEGACY_PAID_CUTOFF)->endOfMonth()->toDateString(),
                    'loan_collection_batch_id' => null,
                    'payslip_id' => $installment->payslip_id,
                    'payroll_run_id' => $run?->id,
                    'reference_no' => null,
                    'notes' => sprintf(
                        'Salary post — installment %d/%d',
                        $installment->installment_no,
                        $installment->loan?->installment_count ?? 0
                    ),
                    'created_by' => null,
                ];
            });

        $this->capturePostLegacyCollectionsFromPayslips($loan, $cutoff, $collections);

        return $this->dedupeCapturedCollections($collections);
    }

    /**
     * @param  list<array<string, mixed>>  $collections
     */
    protected function capturePostLegacyCollectionsFromPayslips(
        EmployeeLoan $loan,
        Carbon $cutoff,
        array &$collections,
    ): void {
        $loan->loadMissing('employee');
        $employeeId = $loan->employee_id;
        $loanNumber = $loan->loan_number;

        if (! $employeeId || ! $loanNumber) {
            return;
        }

        PayslipLine::query()
            ->where('type', 'deduction')
            ->where('computed_amount', '>', 0)
            ->where('head_name', 'like', '%'.$loanNumber.'%')
            ->whereHas('payslip', function ($query) use ($employeeId, $cutoff) {
                $query->where('employee_id', $employeeId)
                    ->whereHas('payrollRun', function ($runQuery) use ($cutoff) {
                        $runQuery->whereRaw(
                            "STR_TO_DATE(CONCAT(year, '-', month, '-01'), '%Y-%m-%d') >= ?",
                            [$cutoff->toDateString()]
                        );
                    });
            })
            ->with(['payslip.payrollRun'])
            ->orderBy('id')
            ->get()
            ->each(function (PayslipLine $line) use (&$collections, $loanNumber) {
                $run = $line->payslip?->payrollRun;
                if (! $run) {
                    return;
                }

                $collections[] = [
                    'installment_no' => null,
                    'due_date' => Carbon::create((int) $run->year, (int) $run->month, 1)->endOfMonth()->toDateString(),
                    'payroll_year' => (int) $run->year,
                    'payroll_month' => (int) $run->month,
                    'credit_amount' => (float) $line->computed_amount,
                    'transaction_type' => EmployeeLoanTransaction::TYPE_INSTALLMENT,
                    'transaction_date' => Carbon::create((int) $run->year, (int) $run->month, 1)->endOfMonth()->toDateString(),
                    'loan_collection_batch_id' => null,
                    'payslip_id' => $line->payslip_id,
                    'payroll_run_id' => $run->id,
                    'reference_no' => null,
                    'notes' => sprintf('Salary post — %s', $line->head_name ?: $loanNumber),
                    'created_by' => null,
                ];
            });
    }

    /**
     * @param  list<array<string, mixed>>  $collections
     * @return list<array<string, mixed>>
     */
    protected function dedupeCapturedCollections(array $collections): array
    {
        $seen = [];
        $unique = [];

        foreach ($collections as $collection) {
            $key = implode('|', [
                (string) ($collection['payroll_year'] ?? ''),
                (string) ($collection['payroll_month'] ?? ''),
                (string) ($collection['due_date'] ?? ''),
                (string) SalaryStructureCalculator::roundTaka((float) ($collection['credit_amount'] ?? 0)),
                (string) ($collection['payslip_id'] ?? ''),
            ]);

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $unique[] = $collection;
        }

        return $unique;
    }

    /**
     * @param  array{
     *   loan_policy_id: int,
     *   disbursement_date: string,
     *   disburse_amount: float,
     *   installment_amount: float,
     *   passed_months: int,
     *   use_manual_terms?: bool,
     *   service_charge_amount?: float|null,
     *   outstanding_total: float,
     *   total_installments?: int|null,
     * }  $snapshot
     */
    public function rebuildLoanFromLedgerSnapshot(EmployeeLoan $loan, array $snapshot): void
    {
        $payrollCollections = $this->capturePostLegacyCollections($loan);

        DB::transaction(function () use ($loan, $snapshot, $payrollCollections) {
            $lockedLoan = EmployeeLoan::query()->whereKey($loan->id)->lockForUpdate()->firstOrFail();
            $this->rebuildLoanFromSnapshot($lockedLoan, $snapshot, $payrollCollections);
        });
    }

    /**
     * @param  list<array<string, mixed>>  $payrollCollections
     */
    protected function rebuildLoan(LoanMigrationItem $item, array $payrollCollections): void
    {
        $loan = EmployeeLoan::query()->whereKey($item->employee_loan_id)->lockForUpdate()->firstOrFail();
        $this->rebuildLoanFromSnapshot($loan, $this->snapshotFromMigrationItem($item), $payrollCollections);
    }

    /**
     * @return array{
     *   loan_policy_id: int,
     *   disbursement_date: string,
     *   disburse_amount: float,
     *   installment_amount: float,
     *   passed_months: int,
     *   use_manual_terms: bool,
     *   service_charge_amount: float|null,
     *   outstanding_total: float,
     *   total_installments: int|null,
     * }
     */
    protected function snapshotFromMigrationItem(LoanMigrationItem $item): array
    {
        return [
            'loan_policy_id' => (int) $item->loan_policy_id,
            'disbursement_date' => $item->disbursement_date->toDateString(),
            'disburse_amount' => (float) $item->disburse_amount,
            'installment_amount' => (float) $item->installment_amount,
            'passed_months' => (int) $item->passed_months,
            'use_manual_terms' => (bool) $item->use_manual_terms,
            'service_charge_amount' => $item->service_charge_amount !== null
                ? (float) $item->service_charge_amount
                : null,
            'outstanding_total' => (float) $item->outstanding_total,
            'total_installments' => $item->total_installments !== null
                ? (int) $item->total_installments
                : null,
        ];
    }

    /**
     * @param  array{
     *   loan_policy_id: int,
     *   disbursement_date: string,
     *   disburse_amount: float,
     *   installment_amount: float,
     *   passed_months: int,
     *   use_manual_terms?: bool,
     *   service_charge_amount?: float|null,
     *   outstanding_total: float,
     *   total_installments?: int|null,
     * }  $snapshot
     * @param  list<array<string, mixed>>  $payrollCollections
     */
    protected function rebuildLoanFromSnapshot(EmployeeLoan $loan, array $snapshot, array $payrollCollections): void
    {
        $policy = LoanPolicy::query()->findOrFail((int) $snapshot['loan_policy_id']);

        $disburseAmount = SalaryStructureCalculator::roundTaka((float) $snapshot['disburse_amount']);
        $installAmount = SalaryStructureCalculator::roundTaka((float) $snapshot['installment_amount']);
        $passedMonths = max(0, (int) $snapshot['passed_months']);
        $outTotal = SalaryStructureCalculator::roundTaka((float) $snapshot['outstanding_total']);
        $useManual = (bool) ($snapshot['use_manual_terms'] ?? false);
        $disbursementDate = Carbon::parse($snapshot['disbursement_date'])->toDateString();

        $policyInstallments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        if ($policyInstallments < 1) {
            $policyInstallments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        $overrideInstallments = isset($snapshot['total_installments']) && $snapshot['total_installments'] !== null && $snapshot['total_installments'] !== ''
            ? (int) $snapshot['total_installments']
            : null;

        if ($overrideInstallments !== null && $overrideInstallments >= 1) {
            $totalInstallments = max($overrideInstallments, $passedMonths + ($outTotal > 0 ? 1 : 0));
        } else {
            $totalInstallments = $policy->loan_type === 'pf_loan' || $useManual
                ? $policyInstallments
                : max($policyInstallments, $passedMonths + max(1, (int) ceil($outTotal / max($installAmount, 1))));
        }

        if ($useManual) {
            $serviceCharge = SalaryStructureCalculator::roundTaka((float) ($snapshot['service_charge_amount'] ?? 0));
            $totalPayable = SalaryStructureCalculator::roundTaka($disburseAmount + $serviceCharge);
        } else {
            $totalPayable = SalaryStructureCalculator::roundTaka(($passedMonths * $installAmount) + $outTotal);
        }
        $firstInstallmentDate = $this->resolveMigrationFirstInstallmentDate($policy, $disbursementDate);

        $loan->installments()->delete();
        $loan->transactions()->delete();

        $loan->update([
            'loan_policy_id' => $policy->id,
            'loan_type' => $policy->loan_type,
            'principal_amount' => $disburseAmount,
            'interest_rate' => (float) $policy->default_interest_rate,
            'disbursement_date' => $disbursementDate,
            'installment_count' => $totalInstallments,
            'installment_amount' => $installAmount,
            'total_payable' => $totalPayable,
            'first_installment_date' => $firstInstallmentDate->toDateString(),
            'outstanding_balance' => 0,
            'status' => 'active',
            'legacy_paid_installments' => null,
        ]);

        $this->loanService->generateInstallmentSchedule($loan->fresh());

        $this->loanService->postCollectionTransaction($loan, [
            'transaction_type' => EmployeeLoanTransaction::TYPE_DISBURSEMENT,
            'debit_amount' => $totalPayable,
            'credit_amount' => 0,
            'transaction_date' => $disbursementDate,
            'notes' => 'Legacy loan migration — original disbursement',
            'reference_no' => $loan->reference_no,
            'created_by' => $loan->created_by,
        ]);

        $legacyPaidCount = $this->applyLegacyPrePaidThroughMay($loan, $passedMonths, $loan->created_by);
        $loan->update([
            'legacy_paid_installments' => $legacyPaidCount > 0 ? $legacyPaidCount : null,
            'outstanding_balance' => $outTotal,
        ]);

        foreach ($payrollCollections as $collection) {
            $this->restorePostLegacyCollection($loan, $collection);
        }

        $this->loanService->refreshLoanStatusPublic($loan->fresh());
    }

    protected function resolveMigrationFirstInstallmentDate(LoanPolicy $policy, string $disbursementDate): Carbon
    {
        $graceMonths = $policy->loan_type === 'motorcycle_loan'
            ? 0
            : (int) ($policy->grace_months ?? 0);

        return $this->loanService->resolveFirstInstallmentDate($disbursementDate, $graceMonths);
    }

    protected function applyLegacyPrePaidThroughMay(EmployeeLoan $loan, int $passedMonths, ?int $createdBy): int
    {
        if ($passedMonths <= 0) {
            return 0;
        }

        $cutoff = Carbon::parse(self::LEGACY_PAID_CUTOFF);
        $toMark = $loan->installments()
            ->orderBy('installment_no')
            ->limit($passedMonths)
            ->get()
            ->filter(fn (EmployeeLoanInstallment $row) => $row->due_date && $row->due_date->lt($cutoff));

        foreach ($toMark as $installment) {
            $amount = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);
            $paidDate = $installment->due_date ?? Carbon::parse($loan->disbursement_date);

            $this->loanService->postCollectionTransaction($loan, [
                'transaction_type' => EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT,
                'employee_loan_installment_id' => $installment->id,
                'credit_amount' => $amount,
                'debit_amount' => 0,
                'transaction_date' => $paidDate,
                'payroll_year' => $paidDate->year,
                'payroll_month' => $paidDate->month,
                'notes' => sprintf(
                    'Pre-system payment — installment %d/%d (paid through %s)',
                    $installment->installment_no,
                    $loan->installment_count,
                    $paidDate->format('M Y')
                ),
                'created_by' => $createdBy,
            ]);

            $installment->update([
                'status' => 'paid',
                'paid_at' => $paidDate,
                'paid_amount' => $amount,
            ]);
        }

        return $toMark->count();
    }

    /**
     * @param  array<string, mixed>  $collection
     */
    protected function restorePostLegacyCollection(EmployeeLoan $loan, array $collection): void
    {
        $installment = $this->resolveCollectionInstallment($loan, $collection);
        $amount = SalaryStructureCalculator::roundTaka((float) $collection['credit_amount']);

        if (! $installment) {
            return;
        }

        // If installment already marked paid but paid_amount is broken (0),
        // allow fixing it with a non-zero amount.
        if ($installment->status === 'paid') {
            $currentPaidAmount = SalaryStructureCalculator::roundTaka((float) ($installment->paid_amount ?? 0));
            if ($currentPaidAmount > 0 || $amount <= 0) {
                return;
            }
        }
        $collectionDate = Carbon::parse($collection['transaction_date']);

        $this->loanService->postCollectionTransaction($loan, [
            'transaction_type' => $collection['transaction_type'],
            'employee_loan_installment_id' => $installment->id,
            'credit_amount' => $amount,
            'debit_amount' => 0,
            'transaction_date' => $collectionDate,
            'notes' => $collection['notes'] ?? 'Loan collection',
            'reference_no' => $collection['reference_no'] ?? null,
            'loan_collection_batch_id' => $collection['loan_collection_batch_id'] ?? null,
            'payslip_id' => $collection['payslip_id'] ?? null,
            'payroll_run_id' => $collection['payroll_run_id'] ?? null,
            'payroll_year' => $collection['payroll_year'] ?? null,
            'payroll_month' => $collection['payroll_month'] ?? null,
            'created_by' => $collection['created_by'] ?? null,
        ]);

        $installment->update([
            'status' => 'paid',
            'paid_at' => $collectionDate,
            'paid_amount' => $amount,
            'payslip_id' => $collection['payslip_id'] ?? $installment->payslip_id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $collection
     */
    protected function resolveCollectionInstallment(EmployeeLoan $loan, array $collection): ?EmployeeLoanInstallment
    {
        if (! empty($collection['payroll_year']) && ! empty($collection['payroll_month'])) {
            $match = $loan->installments()
                ->whereYear('due_date', (int) $collection['payroll_year'])
                ->whereMonth('due_date', (int) $collection['payroll_month'])
                ->orderBy('installment_no')
                ->first();

            if ($match) {
                return $match;
            }
        }

        if (! empty($collection['due_date'])) {
            $due = Carbon::parse($collection['due_date']);
            $match = $loan->installments()
                ->whereYear('due_date', $due->year)
                ->whereMonth('due_date', $due->month)
                ->orderBy('installment_no')
                ->first();

            if ($match) {
                return $match;
            }
        }

        if (! empty($collection['installment_no'])) {
            return $loan->installments()
                ->where('installment_no', (int) $collection['installment_no'])
                ->first();
        }

        return null;
    }
}
