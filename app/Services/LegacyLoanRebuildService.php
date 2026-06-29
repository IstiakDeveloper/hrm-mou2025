<?php

namespace App\Services;

use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanInstallment;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanMigrationItem;
use App\Models\LoanPolicy;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Rebuild legacy-import loan schedules from migration snapshots.
 *
 * Restores original installment calendars, keeps June 2026 manual collections,
 * and ensures legacy pre-payments stop before June 2026.
 */
class LegacyLoanRebuildService
{
    private const LEGACY_PAID_CUTOFF = '2026-06-01';

    public function __construct(
        protected EmployeeLoanService $loanService,
        protected LoanCalculationService $calculator,
    ) {}

    /**
     * @return array{
     *     loans_rebuilt: int,
     *     june_collections_restored: int,
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
     *     dry_run: bool,
     * }
     */
    public function rebuildLoanIds(array $loanIds, bool $dryRun = false): array
    {
        $loansRebuilt = 0;
        $juneCollectionsRestored = 0;

        foreach ($loanIds as $loanId) {
            $item = LoanMigrationItem::query()
                ->with(['employeeLoan.policy', 'migration', 'policy'])
                ->where('employee_loan_id', $loanId)
                ->first();

            if (! $item?->employeeLoan) {
                continue;
            }

            $juneCollections = $this->captureJuneCollections($item->employeeLoan);

            if ($dryRun) {
                $loansRebuilt++;
                $juneCollectionsRestored += count($juneCollections);

                continue;
            }

            DB::transaction(function () use ($item, $juneCollections, &$loansRebuilt, &$juneCollectionsRestored) {
                $this->rebuildLoan($item, $juneCollections);
                $loansRebuilt++;
                $juneCollectionsRestored += count($juneCollections);
            });
        }

        return [
            'loans_rebuilt' => $loansRebuilt,
            'june_collections_restored' => $juneCollectionsRestored,
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
     *     installment_no: int,
     *     credit_amount: float,
     *     transaction_type: string,
     *     transaction_date: string,
     *     loan_collection_batch_id: int|null,
     *     reference_no: string|null,
     *     notes: string|null,
     *     created_by: int|null,
     * }>
     */
    protected function captureJuneCollections(EmployeeLoan $loan): array
    {
        return EmployeeLoanTransaction::query()
            ->where('employee_loan_id', $loan->id)
            ->whereIn('transaction_type', EmployeeLoanTransaction::COLLECTION_TYPES)
            ->whereYear('transaction_date', 2026)
            ->whereMonth('transaction_date', 6)
            ->with('installment')
            ->orderBy('id')
            ->get()
            ->filter(fn (EmployeeLoanTransaction $tx) => $tx->installment !== null)
            ->map(fn (EmployeeLoanTransaction $tx) => [
                'installment_no' => (int) $tx->installment->installment_no,
                'credit_amount' => (float) $tx->credit_amount,
                'transaction_type' => $tx->transaction_type,
                'transaction_date' => $tx->transaction_date->toDateString(),
                'loan_collection_batch_id' => $tx->loan_collection_batch_id,
                'reference_no' => $tx->reference_no,
                'notes' => $tx->notes,
                'created_by' => $tx->created_by,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $juneCollections
     */
    protected function rebuildLoan(LoanMigrationItem $item, array $juneCollections): void
    {
        $loan = EmployeeLoan::query()->whereKey($item->employee_loan_id)->lockForUpdate()->firstOrFail();
        $policy = $item->policy ?? LoanPolicy::query()->findOrFail($item->loan_policy_id);

        $disburseAmount = SalaryStructureCalculator::roundTaka((float) $item->disburse_amount);
        $installAmount = SalaryStructureCalculator::roundTaka((float) $item->installment_amount);
        $passedMonths = max(0, (int) $item->passed_months);
        $outTotal = SalaryStructureCalculator::roundTaka((float) $item->outstanding_total);
        $useManual = (bool) $item->use_manual_terms;

        $policyInstallments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        if ($policyInstallments < 1) {
            $policyInstallments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        $totalInstallments = $policy->loan_type === 'pf_loan' || $useManual
            ? $policyInstallments
            : max($policyInstallments, $passedMonths + max(1, (int) ceil($outTotal / max($installAmount, 1))));

        if ($useManual) {
            $serviceCharge = SalaryStructureCalculator::roundTaka((float) $item->service_charge_amount);
            $totalPayable = SalaryStructureCalculator::roundTaka($disburseAmount + $serviceCharge);
        } else {
            $totalPayable = SalaryStructureCalculator::roundTaka(($passedMonths * $installAmount) + $outTotal);
        }
        $firstInstallmentDate = $this->resolveMigrationFirstInstallmentDate($policy, $item->disbursement_date->toDateString());

        $loan->installments()->delete();
        $loan->transactions()->delete();

        $loan->update([
            'loan_policy_id' => $policy->id,
            'loan_type' => $policy->loan_type,
            'principal_amount' => $disburseAmount,
            'interest_rate' => (float) $policy->default_interest_rate,
            'disbursement_date' => $item->disbursement_date->toDateString(),
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
            'transaction_date' => $item->disbursement_date->toDateString(),
            'notes' => 'Legacy loan migration — original disbursement',
            'reference_no' => $loan->reference_no,
            'created_by' => $loan->created_by,
        ]);

        $legacyPaidCount = $this->applyLegacyPrePaidThroughMay($loan, $passedMonths, $loan->created_by);
        $loan->update([
            'legacy_paid_installments' => $legacyPaidCount > 0 ? $legacyPaidCount : null,
            'outstanding_balance' => $outTotal,
        ]);

        foreach ($juneCollections as $collection) {
            $this->restoreJuneCollection($loan, $collection);
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
    protected function restoreJuneCollection(EmployeeLoan $loan, array $collection): void
    {
        $installment = $loan->installments()
            ->where('installment_no', $collection['installment_no'])
            ->first();

        if (! $installment || $installment->status === 'paid') {
            return;
        }

        $amount = SalaryStructureCalculator::roundTaka((float) $collection['credit_amount']);
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
            'created_by' => $collection['created_by'] ?? null,
        ]);

        $installment->update([
            'status' => 'paid',
            'paid_at' => $collectionDate,
            'paid_amount' => $amount,
        ]);
    }
}
