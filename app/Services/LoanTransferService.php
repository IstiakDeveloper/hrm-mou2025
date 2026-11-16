<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanTransfer;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LoanTransferService
{
    public function __construct(
        protected EmployeeLoanService $loanService,
    ) {}

    public function nextTransferNumber(): string
    {
        $prefix = 'LT-'.date('Ym').'-';
        $last = LoanTransfer::query()
            ->where('transfer_number', 'like', $prefix.'%')
            ->orderByDesc('transfer_number')
            ->value('transfer_number');

        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @param  array{
     *   employee_loan_id: int,
     *   to_employee_id: int,
     *   transfer_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     * }  $data
     */
    public function transfer(array $data, ?int $createdBy = null): LoanTransfer
    {
        $loan = EmployeeLoan::query()->with(['employee', 'policy'])->findOrFail($data['employee_loan_id']);
        $toEmployee = Employee::query()->findOrFail($data['to_employee_id']);
        $transferDate = Carbon::parse($data['transfer_date']);

        $this->assertTransferable($loan, $toEmployee);

        $fromEmployeeId = (int) $loan->employee_id;
        $toEmployeeId = (int) $toEmployee->id;
        $outstanding = SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance);
        $pendingCount = $loan->installments()->where('status', 'pending')->count();
        $transferNumber = $this->nextTransferNumber();

        return DB::transaction(function () use (
            $loan,
            $toEmployee,
            $transferDate,
            $data,
            $createdBy,
            $fromEmployeeId,
            $toEmployeeId,
            $outstanding,
            $pendingCount,
            $transferNumber
        ) {
            $locked = EmployeeLoan::query()
                ->whereKey($loan->id)
                ->lockForUpdate()
                ->with('employee')
                ->firstOrFail();

            $this->assertTransferable($locked, $toEmployee);

            $fromLabel = $this->employeeLabel($locked->employee);
            $toLabel = $this->employeeLabel($toEmployee);

            $transfer = LoanTransfer::query()->create([
                'transfer_number' => $transferNumber,
                'employee_loan_id' => $locked->id,
                'from_employee_id' => $fromEmployeeId,
                'to_employee_id' => $toEmployeeId,
                'transfer_date' => $transferDate->toDateString(),
                'outstanding_at_transfer' => $outstanding,
                'pending_installments_at_transfer' => $pendingCount,
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $this->loanService->postCollectionTransaction($locked, [
                'transaction_type' => EmployeeLoanTransaction::TYPE_TRANSFER,
                'debit_amount' => 0,
                'credit_amount' => 0,
                'transaction_date' => $transferDate,
                'notes' => sprintf(
                    'Loan transferred — %s → %s (%s)',
                    $fromLabel,
                    $toLabel,
                    $transferNumber
                ),
                'reference_no' => $data['reference_no'] ?? $transferNumber,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $locked->update([
                'employee_id' => $toEmployeeId,
                'notes' => trim(implode("\n", array_filter([
                    $locked->notes,
                    sprintf(
                        '[%s] Transferred from %s to %s — %s',
                        $transferDate->format('d-M-Y'),
                        $fromLabel,
                        $toLabel,
                        $transferNumber
                    ),
                ]))),
            ]);

            EmployeeLoanTransaction::query()
                ->where('employee_loan_id', $locked->id)
                ->update(['employee_id' => $toEmployeeId]);

            return $transfer->fresh([
                'loan.policy',
                'fromEmployee:id,pin,name_en,current_branch_id',
                'fromEmployee.branch:id,name',
                'toEmployee:id,pin,name_en,current_branch_id',
                'toEmployee.branch:id,name',
                'creator:id,name',
            ]);
        });
    }

    protected function assertTransferable(EmployeeLoan $loan, Employee $toEmployee): void
    {
        if ($loan->status !== 'active') {
            throw new InvalidArgumentException('Only active loans can be transferred.');
        }

        if ((int) $loan->employee_id === (int) $toEmployee->id) {
            throw new InvalidArgumentException('Transfer target must be a different employee.');
        }

        if ($toEmployee->status !== 'active') {
            throw new InvalidArgumentException('Transfer target employee must be active.');
        }

        if ($loan->installments()->where('status', 'scheduled')->exists()) {
            throw new InvalidArgumentException(
                'This loan has installments scheduled on payroll. Complete or rollback salary process before transferring.'
            );
        }
    }

    protected function employeeLabel(?Employee $employee): string
    {
        if (! $employee) {
            return 'Unknown';
        }

        return trim(($employee->pin ?? '').' — '.($employee->name_en ?? ''));
    }
}
