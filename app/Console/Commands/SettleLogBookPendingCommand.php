<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\MovementLogBook;
use App\Models\MovementLogBookPayment;
use App\Services\LogBookPaymentWorkflowService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SettleLogBookPendingCommand extends Command
{
    protected $signature = 'movement:settle-log-book-pending
                            {--cutoff=2026-08-27 : Inclusive last date to mark paid (Y-m-d)}
                            {--auto-pay-ineligible : Mark unpaid entries below ABM/Accountant as paid}
                            {--restore-after-cutoff : Undo eligible paid-without-batch entries after the cutoff}
                            {--dry-run : Show counts only, do not write}
                            {--force : Skip confirmation}';

    protected $description = 'Settle log book payments through the cutoff; officers and staff below ABM/Accountant are auto-paid';

    public function handle(LogBookPaymentWorkflowService $workflow): int
    {
        $cutoff = Carbon::parse((string) $this->option('cutoff'))->startOfDay();
        $dryRun = (bool) $this->option('dry-run');
        $remarks = 'Settled by movement:settle-log-book-pending (through '.$cutoff->toDateString().').';

        if ($this->option('restore-after-cutoff')) {
            return $this->restoreAfterCutoff($cutoff, $dryRun, $workflow);
        }

        if ($this->option('auto-pay-ineligible')) {
            return $this->runAutoPayIneligible($workflow, $dryRun);
        }

        $historicalEntries = MovementLogBook::query()
            ->whereDate('date', '<=', $cutoff->toDateString())
            ->where('payment_status', '!=', 'paid')
            ->count();

        $openPayments = MovementLogBookPayment::query()
            ->whereIn('status', ['pending', 'recommended'])
            ->count();

        $this->info('Cutoff (inclusive): '.$cutoff->toDateString());
        $this->info('Unpaid/in-process log book entries on or before cutoff: '.$historicalEntries);
        $this->info('Pending/recommended payment batches: '.$openPayments);
        $this->line('Entries after '.$cutoff->toDateString().' will NOT be marked paid.');

        if ($dryRun) {
            $this->warn('Dry run — no changes written.');
            $this->line('After this command, unpaid entries from '.$cutoff->copy()->addDay()->toDateString().' onward stay unpaid.');
            $this->line('Processing September will include unpaid official KM from '.$cutoff->copy()->addDay()->toDateString().' through 30 Sep (carry-forward).');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Mark historical pending log books and payments as paid through '.$cutoff->toDateString().'?', true)) {
            $this->comment('Aborted.');

            return self::SUCCESS;
        }

        $approvedPayments = 0;
        $deletedEmptyPayments = 0;
        $skippedFuturePayments = 0;
        $historicalPaid = 0;
        $ineligiblePaid = 0;

        DB::transaction(function () use (
            $workflow,
            $cutoff,
            $remarks,
            &$approvedPayments,
            &$deletedEmptyPayments,
            &$skippedFuturePayments,
            &$historicalPaid,
            &$ineligiblePaid,
        ) {
            $payments = MovementLogBookPayment::query()
                ->with('logBooks')
                ->whereIn('status', ['pending', 'recommended'])
                ->orderBy('id')
                ->get();

            foreach ($payments as $payment) {
                $laterIds = $payment->logBooks
                    ->filter(fn (MovementLogBook $entry) => $entry->date === null || $entry->date->gt($cutoff))
                    ->pluck('id')
                    ->all();

                if ($laterIds !== []) {
                    MovementLogBook::query()
                        ->whereIn('id', $laterIds)
                        ->update(['log_book_payment_id' => null]);
                }

                $remaining = MovementLogBook::query()
                    ->where('log_book_payment_id', $payment->id)
                    ->whereDate('date', '<=', $cutoff->toDateString())
                    ->get();

                if ($remaining->isEmpty()) {
                    $periodEnd = Carbon::create((int) $payment->period_year, (int) $payment->period_month, 1)->endOfMonth();
                    if ($periodEnd->gt($cutoff) && $laterIds !== []) {
                        MovementLogBook::query()
                            ->whereIn('id', $laterIds)
                            ->update(['log_book_payment_id' => $payment->id]);
                        $skippedFuturePayments++;

                        continue;
                    }

                    $payment->delete();
                    $deletedEmptyPayments++;

                    continue;
                }

                $this->approvePayment($payment, $remaining, $workflow, $remarks);
                $approvedPayments++;
            }

            $historicalPaid = MovementLogBook::query()
                ->whereDate('date', '<=', $cutoff->toDateString())
                ->where('payment_status', '!=', 'paid')
                ->update(['payment_status' => 'paid']);

            $ineligiblePaid = $this->settleIneligibleUnpaid($workflow);
        });

        $this->info('Approved payment batches: '.$approvedPayments);
        $this->info('Deleted empty historical payment batches: '.$deletedEmptyPayments);
        $this->info('Left future payment batches untouched: '.$skippedFuturePayments);
        $this->info('Log book entries marked paid (on/before cutoff): '.$historicalPaid);
        $this->info('Officers / staff below ABM & Accountant auto-paid: '.$ineligiblePaid);
        $this->line('ABM / Accountant and above keep unpaid entries from '.$cutoff->copy()->addDay()->toDateString().' onward.');

        return self::SUCCESS;
    }

    private function runAutoPayIneligible(LogBookPaymentWorkflowService $workflow, bool $dryRun): int
    {
        $ids = $this->ineligibleUnpaidIds($workflow);
        $this->info('Unpaid officer / below-ABM-Accountant entries to auto-pay: '.count($ids));

        if ($dryRun) {
            $this->warn('Dry run — no changes written.');

            return self::SUCCESS;
        }

        if ($ids === []) {
            $this->comment('Nothing to auto-pay.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Mark these '.count($ids).' ineligible entries as paid?', true)) {
            $this->comment('Aborted.');

            return self::SUCCESS;
        }

        $paid = $this->settleIneligibleUnpaid($workflow);
        $this->info('Auto-paid: '.$paid);

        return self::SUCCESS;
    }

    private function restoreAfterCutoff(Carbon $cutoff, bool $dryRun, LogBookPaymentWorkflowService $workflow): int
    {
        $rows = MovementLogBook::query()
            ->with(['employee.designation', 'employee.branch.regionalOffice'])
            ->whereDate('date', '>', $cutoff->toDateString())
            ->where('payment_status', 'paid')
            ->whereNull('log_book_payment_id')
            ->get(['id', 'employee_id']);

        $eligibleIds = [];
        foreach ($rows as $row) {
            if (! $row->employee) {
                continue;
            }
            if ($workflow->resolveKmLimit($row->employee)['eligible']) {
                $eligibleIds[] = $row->id;
            }
        }

        $this->info('Cutoff: '.$cutoff->toDateString());
        $this->info('Eligible paid-without-batch entries after cutoff to restore as unpaid: '.count($eligibleIds));

        if ($dryRun) {
            $this->warn('Dry run — no changes written.');

            return self::SUCCESS;
        }

        if ($eligibleIds === []) {
            $this->comment('Nothing to restore. Officer / below-ABM entries stay auto-paid.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Restore these '.count($eligibleIds).' eligible entries after '.$cutoff->toDateString().' back to unpaid?', true)) {
            $this->comment('Aborted.');

            return self::SUCCESS;
        }

        $restored = MovementLogBook::query()
            ->whereIn('id', $eligibleIds)
            ->update(['payment_status' => 'unpaid']);
        $this->info('Restored to unpaid: '.$restored);

        return self::SUCCESS;
    }

    /**
     * Officers and anyone below Accountant / ABM never sit in unpaid payment queue.
     */
    private function settleIneligibleUnpaid(LogBookPaymentWorkflowService $workflow): int
    {
        $ineligibleIds = $this->ineligibleUnpaidIds($workflow);
        if ($ineligibleIds === []) {
            return 0;
        }

        $touchedPaymentIds = MovementLogBook::query()
            ->whereIn('id', $ineligibleIds)
            ->whereNotNull('log_book_payment_id')
            ->pluck('log_book_payment_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->all();

        MovementLogBook::query()
            ->whereIn('id', $ineligibleIds)
            ->update([
                'payment_status' => 'paid',
                'log_book_payment_id' => null,
            ]);

        foreach ($touchedPaymentIds as $paymentId) {
            $payment = MovementLogBookPayment::query()->find($paymentId);
            if (! $payment || ! in_array($payment->status, ['pending', 'recommended'], true)) {
                continue;
            }

            $remaining = MovementLogBook::query()
                ->where('log_book_payment_id', $payment->id)
                ->exists();

            if (! $remaining) {
                $payment->delete();
            }
        }

        return count($ineligibleIds);
    }

    /**
     * @return list<int>
     */
    private function ineligibleUnpaidIds(LogBookPaymentWorkflowService $workflow): array
    {
        $unpaid = MovementLogBook::query()
            ->where('payment_status', '!=', 'paid')
            ->get(['id', 'employee_id']);

        if ($unpaid->isEmpty()) {
            return [];
        }

        $eligibleByEmployee = [];
        $ineligibleIds = [];

        foreach ($unpaid->groupBy('employee_id') as $employeeId => $rows) {
            if (! array_key_exists($employeeId, $eligibleByEmployee)) {
                $employee = Employee::query()
                    ->with(['designation', 'branch.regionalOffice'])
                    ->find($employeeId);
                $eligibleByEmployee[$employeeId] = $employee
                    ? (bool) $workflow->resolveKmLimit($employee)['eligible']
                    : false;
            }

            if ($eligibleByEmployee[$employeeId]) {
                continue;
            }

            foreach ($rows as $row) {
                $ineligibleIds[] = (int) $row->id;
            }
        }

        return $ineligibleIds;
    }

    private function approvePayment(
        MovementLogBookPayment $payment,
        $entries,
        LogBookPaymentWorkflowService $workflow,
        string $remarks,
    ): void {
        $totalOfficialKm = round((float) $entries->sum('official_km'), 2);
        $kmLimit = $payment->km_limit !== null ? (float) $payment->km_limit : null;
        $billedKm = $workflow->calculateBilledKm($totalOfficialKm, $kmLimit);
        $rate = (float) $payment->rate_per_km;
        $voucherNo = $payment->voucher_no ?: $this->generateVoucherNo($payment);

        $payment->update([
            'total_official_km' => $totalOfficialKm,
            'billed_official_km' => $billedKm,
            'total_amount' => round($billedKm * $rate, 2),
            'entry_count' => $entries->count(),
            'status' => 'approved',
            'voucher_no' => $voucherNo,
            'approved_at' => now(),
            'approval_remarks' => $payment->approval_remarks
                ? trim((string) $payment->approval_remarks).' '.$remarks
                : $remarks,
        ]);

        MovementLogBook::query()
            ->where('log_book_payment_id', $payment->id)
            ->whereDate('date', '<=', Carbon::parse((string) $this->option('cutoff'))->toDateString())
            ->update(['payment_status' => 'paid']);
    }

    private function generateVoucherNo(MovementLogBookPayment $payment): string
    {
        $prefix = config('movement_log_book.voucher_prefix', 'LB');

        return sprintf(
            '%s-%04d-%02d-%05d',
            $prefix,
            $payment->period_year,
            $payment->period_month,
            $payment->id
        );
    }
}
