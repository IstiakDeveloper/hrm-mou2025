<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Services\EmployeeProvidentFundService;
use App\Services\PfSideEqualizationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class EqualizePfSidesCommand extends Command
{
    protected $signature = 'pf:equalize-sides {--apply : Write the reviewed equalization entries to the database} {--expected-total= : Required with --apply; confirm the current PF total in whole taka}';

    protected $description = 'Equalize each employee PF own and employer balance with an auditable ledger adjustment.';

    public function handle(PfSideEqualizationService $equalizer, EmployeeProvidentFundService $pfService): int
    {
        $plan = $equalizer->plan();
        $this->displayPlan($plan);

        if ($plan['rows'] === []) {
            $this->info('All employee PF sides are already equal. No changes made.');

            return self::SUCCESS;
        }

        if (! $this->option('apply')) {
            $this->warn('Dry run only. Re-run with --apply to write these entries.');

            return self::SUCCESS;
        }

        $expectedTotalOption = $this->option('expected-total');
        if (! is_string($expectedTotalOption) || ! ctype_digit($expectedTotalOption)) {
            $this->error('Apply requires --expected-total=<current PF total shown above>, in whole taka.');

            return self::FAILURE;
        }

        if ((int) $expectedTotalOption !== $plan['before_total']) {
            $this->error(sprintf(
                'Expected PF total %s does not match the connected database total %s. No changes made.',
                number_format((int) $expectedTotalOption),
                number_format($plan['before_total'])
            ));

            return self::FAILURE;
        }

        $fingerprint = hash('sha256', serialize($plan));

        try {
            DB::transaction(function () use ($equalizer, $pfService, $fingerprint) {
                $employeeIds = EmployeePfTransaction::query()
                    ->distinct()
                    ->orderBy('employee_id')
                    ->pluck('employee_id');

                $employees = Employee::query()
                    ->whereIn('id', $employeeIds)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $plan = $equalizer->plan();
                if (hash('sha256', serialize($plan)) !== $fingerprint) {
                    throw new RuntimeException('PF ledger changed during review. Run the command again to review the new plan.');
                }

                $latestTransactionDate = EmployeePfTransaction::query()->max('transaction_date');
                $transactionDate = $latestTransactionDate
                    ? Carbon::parse($latestTransactionDate)
                    : Carbon::today();

                foreach ($plan['rows'] as $row) {
                    $employee = $employees->get($row['employee_id']);
                    if (! $employee) {
                        throw new RuntimeException('Employee '.$row['employee_id'].' was not found during PF equalization.');
                    }

                    $this->line(sprintf(
                        'Applying PIN %s: Own %+d, Org %+d',
                        $row['pin'],
                        $row['employee_delta'],
                        $row['employer_delta']
                    ));

                    $pfService->recordSideReconciliation(
                        $employee,
                        $row['employee_delta'],
                        $row['employer_delta'],
                        $transactionDate,
                        sprintf(
                            'PF side equalization; Own %+d, Org %+d',
                            $row['employee_delta'],
                            $row['employer_delta']
                        ),
                        sprintf('PF-EQUALIZE-%s-%d', $transactionDate->format('Ymd'), $row['employee_id']),
                    );
                }

                $after = $equalizer->plan();
                if ($after['rows'] !== [] || $after['before_total'] !== $plan['after_total']) {
                    throw new RuntimeException('PF equalization verification failed; all changes were rolled back.');
                }
            });
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            'PF sides equalized for %d employees. Total PF changed by %+d taka.',
            count($plan['rows']),
            $plan['total_change']
        ));

        return self::SUCCESS;
    }

    /** @param array<string, mixed> $plan */
    private function displayPlan(array $plan): void
    {
        $this->table(
            ['PIN', 'Employee', 'Own', 'Org', 'Target each', 'Own change', 'Org change', 'Total change'],
            array_map(fn (array $row) => [
                $row['pin'],
                $row['name'],
                number_format($row['own_balance']),
                number_format($row['employer_balance']),
                number_format($row['target_balance']),
                $this->signedAmount($row['employee_delta']),
                $this->signedAmount($row['employer_delta']),
                $this->signedAmount($row['total_delta']),
            ], $plan['rows'])
        );

        $this->line(sprintf(
            'Affected employees: %d | PF total: %s -> %s | Net change: %+d taka',
            count($plan['rows']),
            number_format($plan['before_total']),
            number_format($plan['after_total']),
            $plan['total_change']
        ));
    }

    private function signedAmount(int $amount): string
    {
        return ($amount > 0 ? '+' : '').number_format($amount);
    }
}
