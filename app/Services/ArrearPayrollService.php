<?php

namespace App\Services;

use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\SalaryHead;
use App\Models\SalaryIncrement;
use App\Models\SalaryIncrementLine;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ArrearPayrollService
{
    public function __construct(
        protected PayslipTotalsService $payslipTotals,
    ) {}

    /**
     * Employees already on this salary run, with any unpaid increment arrear they can take.
     *
     * @param  Collection<int, Payslip>  $payslips
     * @return list<array<string, mixed>>
     */
    public function rowsForPayslips(Collection $payslips): array
    {
        if ($payslips->isEmpty()) {
            return [];
        }

        $payslipIds = $payslips->pluck('id')->map(fn ($id) => (int) $id)->all();
        $employeeIds = $payslips->pluck('employee_id')->filter()->map(fn ($id) => (int) $id)->unique()->values()->all();

        $incrementLines = SalaryIncrementLine::query()
            ->with('salaryIncrement:id,order_no,arrear_months,status')
            ->whereIn('employee_id', $employeeIds)
            ->where('action', SalaryIncrementLine::ACTION_GRANT)
            ->where('status', SalaryIncrementLine::STATUS_APPLIED)
            ->where('arrear_amount', '>', 0)
            ->where(function ($query) use ($payslipIds) {
                $query->whereNull('arrear_payslip_id')
                    ->orWhereIn('arrear_payslip_id', $payslipIds);
            })
            ->whereHas('salaryIncrement', fn ($query) => $query->where('status', SalaryIncrement::STATUS_APPLIED))
            ->get()
            ->groupBy('employee_id');

        $rows = [];

        foreach ($payslips as $payslip) {
            $lines = $incrementLines
                ->get($payslip->employee_id, collect())
                ->filter(fn (SalaryIncrementLine $line) => $line->arrear_payslip_id === null
                    || (int) $line->arrear_payslip_id === (int) $payslip->id)
                ->values();

            $arrearLine = $payslip->lines->first(fn (PayslipLine $line) => $this->isArrearLine($line));
            $orders = $lines
                ->map(fn (SalaryIncrementLine $line) => $line->salaryIncrement?->order_no)
                ->filter()
                ->unique()
                ->values()
                ->all();
            $employee = $payslip->employee;

            $rows[] = [
                'payslip_id' => (int) $payslip->id,
                'payroll_run_id' => (int) $payslip->payroll_run_id,
                'name' => (string) ($payslip->displayName() ?: 'Employee'),
                'pin' => (string) ($employee?->pin ?: ''),
                'branch_id' => $payslip->branch_id ? (int) $payslip->branch_id : null,
                'branch' => (string) ($payslip->branch_name ?: '—'),
                'department' => (string) ($employee?->department?->name ?: '—'),
                'department_id' => $employee?->department_id ? (int) $employee->department_id : null,
                'project' => (string) ($employee?->project?->name ?: '—'),
                'project_id' => $employee?->project_id ? (int) $employee->project_id : null,
                'suggested' => SalaryStructureCalculator::roundTaka((float) $lines->sum('arrear_amount')),
                'amount' => SalaryStructureCalculator::roundTaka((float) ($arrearLine?->computed_amount ?? 0)),
                'note' => (string) ($payslip->arrear_note ?? ''),
                'orders' => $orders,
                'line_ids' => $lines->map(fn (SalaryIncrementLine $line) => (int) $line->id)->values()->all(),
                'linked' => $lines->contains(fn (SalaryIncrementLine $line) => (int) $line->arrear_payslip_id === (int) $payslip->id),
                'withheld' => (bool) $payslip->is_withheld,
            ];
        }

        return $rows;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  list<int>  $clearPayslipIds
     */
    public function apply(PayrollRun $run, array $rows, array $clearPayslipIds): string
    {
        $this->assertOpenSalaryRun($run);

        if ($rows === [] && $clearPayslipIds === []) {
            throw ValidationException::withMessages([
                'rows' => 'Select employees and enter an arrear amount.',
            ]);
        }

        DB::transaction(function () use ($run, $rows, $clearPayslipIds) {
            $payslips = Payslip::query()
                ->where('payroll_run_id', $run->id)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $head = $this->arrearHead();

            foreach ($clearPayslipIds as $payslipId) {
                $payslip = $payslips->get((int) $payslipId);
                if ($payslip) {
                    $this->clear($payslip);
                }
            }

            foreach ($rows as $row) {
                $payslip = $payslips->get((int) ($row['payslip_id'] ?? 0));
                if (! $payslip) {
                    throw ValidationException::withMessages([
                        'rows' => 'One employee is not in this payroll.',
                    ]);
                }

                if ($payslip->is_withheld) {
                    throw ValidationException::withMessages([
                        'rows' => 'Arrear cannot be added while that salary is on hold.',
                    ]);
                }

                $amount = SalaryStructureCalculator::roundTaka((float) ($row['amount'] ?? 0));
                if ($amount <= 0) {
                    $this->clear($payslip);

                    continue;
                }

                $this->upsert($payslip, $head, $amount, $row['note'] ?? null, $row['line_ids'] ?? []);
            }

            $this->payslipTotals->syncPayrollRunTotals($run->fresh());
        });

        return 'Arrear updated. Finalize the payroll to lock it.';
    }

    /**
     * Save arrear for many branches of the same unposted salary in one step.
     *
     * @param  list<array<string, mixed>>  $rows
     * @param  list<int>  $clearPayslipIds
     */
    public function applyMany(array $rows, array $clearPayslipIds): string
    {
        $ids = collect($rows)->pluck('payslip_id')
            ->merge($clearPayslipIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            throw ValidationException::withMessages([
                'rows' => 'Choose a department or project, then apply arrear to that group.',
            ]);
        }

        $payslips = Payslip::query()
            ->with('payrollRun')
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $grouped = [];

        foreach ($rows as $row) {
            $payslip = $payslips->get((int) ($row['payslip_id'] ?? 0));
            $run = $this->openRunForPayslip($payslip);
            $grouped[$run->id]['run'] = $run;
            $grouped[$run->id]['rows'][] = $row;
        }

        foreach ($clearPayslipIds as $payslipId) {
            $payslip = $payslips->get((int) $payslipId);
            $run = $this->openRunForPayslip($payslip);
            $grouped[$run->id]['run'] = $run;
            $grouped[$run->id]['clear'][] = (int) $payslipId;
        }

        $saved = 0;

        foreach ($grouped as $bundle) {
            $saved += count($bundle['rows'] ?? []);
            $this->apply($bundle['run'], $bundle['rows'] ?? [], $bundle['clear'] ?? []);
        }

        return "Arrear saved for {$saved} employee(s). Finalize salary to lock it.";
    }

    private function openRunForPayslip(?Payslip $payslip): PayrollRun
    {
        $run = $payslip?->payrollRun;

        if (! $run || $run->salary_type !== 'salary' || $run->status !== 'processed') {
            throw ValidationException::withMessages([
                'rows' => 'Arrear can only be added while that salary is still unposted.',
            ]);
        }

        return $run;
    }

    /**
     * @return array{amount: float, note: ?string}|null
     */
    public function capture(Payslip $payslip): ?array
    {
        $line = PayslipLine::query()
            ->with('head')
            ->where('payslip_id', $payslip->id)
            ->get()
            ->first(fn (PayslipLine $row) => $this->isArrearLine($row));

        if (! $line || (float) $line->computed_amount <= 0) {
            return null;
        }

        return [
            'amount' => (float) $line->computed_amount,
            'note' => $payslip->arrear_note,
        ];
    }

    /**
     * @param  array{amount: float, note: ?string}  $saved
     */
    public function restore(Payslip $payslip, array $saved): void
    {
        $amount = SalaryStructureCalculator::roundTaka((float) ($saved['amount'] ?? 0));
        if ($amount <= 0) {
            return;
        }

        $this->writeLine($payslip, $this->arrearHead(), $amount, $saved['note'] ?? null);
    }

    public function releaseLink(Payslip $payslip): void
    {
        SalaryIncrementLine::query()
            ->where('arrear_payslip_id', $payslip->id)
            ->update(['arrear_payslip_id' => null]);

        if ($payslip->arrear_note !== null) {
            $payslip->update(['arrear_note' => null]);
        }
    }

    public function clear(Payslip $payslip): void
    {
        $this->releaseLink($payslip);
        $this->deleteArrearLines($payslip);
        $this->payslipTotals->syncPayslipFromLines($payslip->fresh(['lines']));
    }

    public function isArrearLine(PayslipLine $line): bool
    {
        return (bool) ($line->head?->is_arrear_head) || $line->head_name === 'Arrear';
    }

    /**
     * @param  list<int>  $lineIds
     */
    private function upsert(Payslip $payslip, SalaryHead $head, float $amount, ?string $note, array $lineIds): void
    {
        $lineIds = collect($lineIds)->map(fn ($id) => (int) $id)->filter()->unique()->values()->all();
        $this->writeLine($payslip, $head, $amount, $note);
        $this->relink($payslip, $lineIds);
    }

    private function writeLine(Payslip $payslip, SalaryHead $head, float $amount, ?string $note): void
    {
        $this->deleteArrearLines($payslip);

        $sort = (int) PayslipLine::query()->where('payslip_id', $payslip->id)->max('sort_order');

        PayslipLine::query()->create([
            'payslip_id' => $payslip->id,
            'salary_head_id' => $head->id,
            'head_name' => 'Arrear',
            'type' => 'earning',
            'amount_type' => 'fixed',
            'input_value' => $amount,
            'computed_amount' => $amount,
            'sort_order' => $sort + 1,
        ]);

        $payslip->update([
            'arrear_note' => trim((string) $note) !== '' ? trim((string) $note) : null,
        ]);

        $this->payslipTotals->syncPayslipFromLines($payslip->fresh(['lines']));
    }

    /**
     * @param  list<int>  $lineIds
     */
    private function relink(Payslip $payslip, array $lineIds): void
    {
        SalaryIncrementLine::query()
            ->where('arrear_payslip_id', $payslip->id)
            ->when($lineIds !== [], fn ($query) => $query->whereNotIn('id', $lineIds))
            ->update(['arrear_payslip_id' => null]);

        if ($lineIds === []) {
            return;
        }

        $lines = SalaryIncrementLine::query()
            ->with('salaryIncrement:id,status')
            ->whereIn('id', $lineIds)
            ->lockForUpdate()
            ->get();

        if ($lines->count() !== count($lineIds)) {
            throw ValidationException::withMessages([
                'rows' => 'An increment arrear could not be found.',
            ]);
        }

        foreach ($lines as $line) {
            $linkedHere = (int) $line->arrear_payslip_id === (int) $payslip->id;
            $available = $line->action === SalaryIncrementLine::ACTION_GRANT
                && $line->status === SalaryIncrementLine::STATUS_APPLIED
                && (float) $line->arrear_amount > 0
                && $line->salaryIncrement?->status === SalaryIncrement::STATUS_APPLIED
                && (int) $line->employee_id === (int) $payslip->employee_id
                && ($line->arrear_payslip_id === null || $linkedHere);

            if (! $available) {
                throw ValidationException::withMessages([
                    'rows' => 'An increment arrear is no longer available.',
                ]);
            }
        }

        SalaryIncrementLine::query()
            ->whereIn('id', $lineIds)
            ->update(['arrear_payslip_id' => $payslip->id]);
    }

    private function deleteArrearLines(Payslip $payslip): void
    {
        $payslip->loadMissing('lines.head');

        $ids = $payslip->lines
            ->filter(fn (PayslipLine $line) => $this->isArrearLine($line))
            ->pluck('id');

        if ($ids->isNotEmpty()) {
            PayslipLine::query()->whereIn('id', $ids)->delete();
            $payslip->unsetRelation('lines');
        }
    }

    private function assertOpenSalaryRun(PayrollRun $run): void
    {
        if ($run->salary_type !== 'salary' || $run->status !== 'processed') {
            throw ValidationException::withMessages([
                'run' => 'Arrear can only be adjusted on processed salary, before finalize.',
            ]);
        }
    }

    private function arrearHead(): SalaryHead
    {
        $head = SalaryHead::query()->firstOrCreate(
            ['code' => 'ARREAR'],
            [
                'name' => 'Arrear',
                'short_name' => 'Arrear',
                'type' => 'earning',
                'salary_type' => 'bank',
                'default_amount_type' => 'fixed',
                'default_amount' => 0,
                'sort_order' => 90,
                'is_active' => true,
                'is_arrear_head' => true,
                'is_gross_pay_head' => false,
            ]
        );

        if (! $head->is_arrear_head || ! $head->is_active || $head->type !== 'earning') {
            $head->update([
                'is_arrear_head' => true,
                'is_active' => true,
                'type' => 'earning',
            ]);
        }

        return $head;
    }
}
