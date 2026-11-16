<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\PfInterestRun;
use App\Services\EmployeeProvidentFundService;
use App\Services\PfInterestDistributionService;
use App\Services\PfReportService;
use App\Services\PfSideEqualizationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class ReconcilePfInterestSidesCommand extends Command
{
    protected $signature = 'pf:reconcile-interest-sides 
                            {--apply : Write the reconciliation and side equalization to the database}
                            {--run-id= : Target a specific PF interest run ID (defaults to latest)}';

    protected $description = 'Reconcile PF interest odd amounts to an even 50/50 split with remainder credited to Executive Director, and re-equalize PF sides.';

    public function handle(
        EmployeeProvidentFundService $pfService,
        PfInterestDistributionService $interestService,
        PfSideEqualizationService $equalizer,
        PfReportService $reportService
    ): int {
        $runId = $this->option('run-id');
        $run = $runId
            ? PfInterestRun::query()->find($runId)
            : PfInterestRun::query()->latest('id')->first();

        if (! $run) {
            $this->error('No PF interest run found to reconcile.');

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Targeting PF Interest Run #%d (Year: %s, Current Total: %s, Date: %s)',
            $run->id,
            $run->interest_year,
            number_format((float) $run->total_interest, 2),
            $run->transaction_date
        ));

        // Find active employees with PF balance > 0
        $activeEmployees = Employee::query()
            ->where('pf_balance', '>', 0)
            ->pluck('id')
            ->all();

        $txs = EmployeePfTransaction::query()
            ->where('pf_interest_run_id', $run->id)
            ->whereIn('employee_id', $activeEmployees)
            ->get();

        if ($txs->isEmpty()) {
            $this->warn('No active employee interest transactions found for this run.');

            return self::SUCCESS;
        }

        // Find Active Executive Director
        $eligibleEmployees = $interestService->eligibleEmployees();
        $ref = new \ReflectionMethod(PfInterestDistributionService::class, 'findExecutiveDirectorEmployee');
        $ref->setAccessible(true);
        /** @var Employee|null $executiveDirector */
        $executiveDirector = $ref->invoke($interestService, $eligibleEmployees);

        if (! $executiveDirector) {
            $this->error('Active Executive Director not found.');

            return self::FAILURE;
        }

        $edId = (int) $executiveDirector->id;
        $this->line(sprintf('Executive Director: ID %d | PIN %s | %s', $edId, $executiveDirector->pin, $executiveDirector->name_en));

        $oddCount = 0;
        $collected = 0;

        foreach ($txs as $tx) {
            if ((int) $tx->employee_id === $edId) {
                continue;
            }
            $cr = (int) round((float) $tx->credit_amount);
            if ($cr % 2 !== 0) {
                $oddCount++;
                $collected++;
            }
        }

        $edTx = $txs->firstWhere('employee_id', $edId);
        $edCurrentCr = $edTx ? (int) round((float) $edTx->credit_amount) : 0;
        $edNewCr = $edCurrentCr + $collected;
        if ($edNewCr % 2 !== 0) {
            $edNewCr -= 1;
        }

        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Active Interest Transactions', count($txs)],
                ['Odd Employee Interest Count (to reduce by 1)', $oddCount],
                ['Total Collected for Executive Director', number_format($collected).' taka'],
                ['ED Current Interest Credit', number_format($edCurrentCr).' taka'],
                ['ED Target Interest Credit (Even)', number_format($edNewCr).' taka'],
            ]
        );

        if (! $this->option('apply')) {
            $this->warn('Dry run mode. Run with --apply to execute these changes in the database.');

            return self::SUCCESS;
        }

        $this->line('Applying reconciliation in a database transaction...');

        try {
            DB::transaction(function () use ($run, $txs, $edId, $collected, $edNewCr, $activeEmployees, $pfService, $equalizer) {
                // 1. Adjust non-ED active employees
                foreach ($txs as $tx) {
                    if ((int) $tx->employee_id === $edId) {
                        continue;
                    }
                    $cr = (int) round((float) $tx->credit_amount);
                    if ($cr % 2 !== 0) {
                        $even = $cr - 1;
                        $tx->update([
                            'credit_amount' => $even,
                            'employee_contribution' => $even / 2,
                            'employer_contribution' => $even / 2,
                        ]);
                    } else {
                        $tx->update([
                            'employee_contribution' => $cr / 2,
                            'employer_contribution' => $cr / 2,
                        ]);
                    }
                }

                // 2. Adjust ED transaction
                $edTx = $txs->firstWhere('employee_id', $edId);
                if ($edTx) {
                    $edTx->update([
                        'credit_amount' => $edNewCr,
                        'employee_contribution' => $edNewCr / 2,
                        'employer_contribution' => $edNewCr / 2,
                    ]);
                }

                // 3. Update PfInterestRun total
                $newRunTotal = EmployeePfTransaction::query()
                    ->where('pf_interest_run_id', $run->id)
                    ->sum('credit_amount');
                $run->update(['total_interest' => $newRunTotal]);

                // 4. Remove old PF-EQUALIZE adjustments
                EmployeePfTransaction::query()
                    ->where('transaction_type', EmployeeProvidentFundService::TYPE_ADJUSTMENT)
                    ->where('reference_no', 'like', 'PF-EQUALIZE%')
                    ->delete();

                // 5. Recalculate employee balances
                foreach ($activeEmployees as $empId) {
                    $emp = Employee::query()->find($empId);
                    if ($emp) {
                        $pfService->recalculateEmployeeBalances($emp);
                    }
                }

                // 6. Run new side equalization
                $plan = $equalizer->plan();
                $latestTxDate = EmployeePfTransaction::query()->max('transaction_date');
                $txDate = $latestTxDate ? Carbon::parse($latestTxDate) : Carbon::today();

                foreach ($plan['rows'] as $row) {
                    $emp = Employee::query()->find($row['employee_id']);
                    if ($emp) {
                        $pfService->recordSideReconciliation(
                            $emp,
                            (int) $row['employee_delta'],
                            (int) $row['employer_delta'],
                            $txDate,
                            sprintf('PF side equalization; Own %+d, Org %+d', $row['employee_delta'], $row['employer_delta']),
                            sprintf('PF-EQUALIZE-%s-%d', $txDate->format('Ymd'), $row['employee_id'])
                        );
                    }
                }
            });
        } catch (Throwable $e) {
            $this->error('Reconciliation failed and was rolled back: '.$e->getMessage());

            return self::FAILURE;
        }

        $reportConfig = config('pf_reports.reports.pf-balance-by-branch');
        $report = $reportService->build('pf-balance-by-branch', $reportConfig ?? [], ['date_to' => '', 'branch_id' => '']);
        $totals = $report['totals'] ?? [];

        $this->info('Reconciliation completed successfully!');
        $this->table(
            ['Report Head', 'Own', 'Organization', 'Difference'],
            [
                ['Contribution', number_format((float) ($totals['own_contribution'] ?? 0)), number_format((float) ($totals['org_contribution'] ?? 0)), number_format((float) (($totals['org_contribution'] ?? 0) - ($totals['own_contribution'] ?? 0)))],
                ['Interest', number_format((float) ($totals['own_interest'] ?? 0)), number_format((float) ($totals['org_interest'] ?? 0)), number_format((float) (($totals['org_interest'] ?? 0) - ($totals['own_interest'] ?? 0)))],
                ['Total', number_format((float) ($totals['own_total'] ?? 0)), number_format((float) ($totals['org_total'] ?? 0)), number_format((float) (($totals['org_total'] ?? 0) - ($totals['own_total'] ?? 0)))],
            ]
        );

        return self::SUCCESS;
    }
}
