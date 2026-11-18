<?php

namespace App\Services;

use App\Models\BranchPayrollBank;
use App\Models\Employee;
use App\Models\PayrollBankAdvice;
use App\Models\PayrollBankAdviceSetting;
use App\Support\AmountInWords;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BankAdviceService
{
    public function __construct(protected PayrollReportService $reports) {}

    public function defaults(): array
    {
        $stored = PayrollBankAdviceSetting::query()->find(1)?->details;
        if ($stored !== null) {
            return $stored;
        }

        $bank = BranchPayrollBank::query()->where('is_active', true)
            ->whereHas('branch', fn ($q) => $q->where('is_head_office', true))->orderBy('id')->first();
        $employees = $this->employees();
        $finance = $employees->first(fn ($employee) => preg_match('/director/i', $employee->designation?->name ?? '')
            && preg_match('/finance|accounts/i', $employee->designation?->name ?? ''));
        $director = $employees->first(fn ($employee) => strtolower(trim($employee->designation?->name ?? '')) === 'executive director');

        return [
            'reference_prefix' => 'Mou/HRD/ED/Salary',
            'bank_name' => $bank?->bank_name ?? 'Prime Bank Ltd.',
            'bank_branch' => $bank?->bank_branch_name ?? 'Naogaon Branch',
            'bank_address' => 'Naogaon.',
            'account_no' => $bank?->account_no ?? '',
            'account_type' => $bank?->account_type === 'savings' ? 'Savings' : 'CD',
            'account_name' => config('payroll_reports.company_name', 'MOUSUMI'),
            'signatories' => array_map(fn ($employee) => [
                'employee_id' => $employee?->id ?? '',
                'name' => $employee?->name_en ?? '',
                'designation' => $employee?->designation?->name ?? '',
                'organization' => config('payroll_reports.company_name', 'MOUSUMI'),
            ], [$finance, $director, null]),
        ];
    }

    public function employees()
    {
        return Employee::query()->where('status', 'active')->with('designation:id,name')
            ->orderBy('name_en')->get(['id', 'name_en', 'pin', 'designation_id']);
    }

    public function nextReferenceNumber(string $year, string $prefix): string
    {
        $numbers = PayrollBankAdvice::query()->where('reference_year', $year)
            ->where('reference_prefix', $prefix)->pluck('reference_number')
            ->filter(fn ($value) => ctype_digit((string) $value))->map(fn ($value) => (int) $value);

        return (string) (($numbers->max() ?? 0) + 1);
    }

    public function generate(array $data, ?int $userId): PayrollBankAdvice
    {
        $filters = array_fill_keys(['branch_id', 'department_id', 'designation_id', 'organogram_level', 'program_id',
            'project_id', 'employee_id', 'salary_head_id', 'payscale_id', 'date_from', 'date_to'], null);
        $filters = array_merge($filters, array_intersect_key($data, array_flip(['year', 'month', 'branch_id', 'project_id'])));
        $payload = $this->reports->build('bank-advice', config('payroll_reports.reports.bank-advice'), $filters);
        $rows = $payload['rows'] ?? [];
        if ($rows === []) {
            throw ValidationException::withMessages(['month' => 'No payable posted salaries found for this salary month and selection.']);
        }

        $missing = array_filter($rows, fn ($row) => trim((string) ($row['account_no'] ?? '')) === '');
        if ($missing !== []) {
            $pins = implode(', ', array_map(fn ($row) => $row['pin'] ?: $row['name'], array_slice($missing, 0, 10)));
            throw ValidationException::withMessages(['month' => 'Bank account missing for: '.$pins.'. Update their bank accounts before generating.']);
        }

        $entries = [];
        foreach ($rows as $row) {
            $account = trim((string) $row['account_no']);
            $key = strtolower(trim((string) ($row['bank_name'] ?? ''))).'|'.$account;
            $entries[$key] ??= [
                'account_no' => $account, 'bank_name' => $row['bank_name'] ?? '',
                'bank_branch' => $row['bank_branch'] ?? '', 'pins' => [], 'names' => [], 'amount_cents' => 0,
            ];
            $entries[$key]['pins'][] = (string) ($row['pin'] ?? '');
            $entries[$key]['names'][] = (string) ($row['name'] ?? '');
            $entries[$key]['amount_cents'] += (int) round((float) $row['amount'] * 100);
        }
        $entries = array_values($entries);
        usort($entries, fn ($a, $b) => strnatcmp($a['account_no'], $b['account_no']) ?: strcasecmp($a['bank_name'], $b['bank_name']));
        $totalCents = array_sum(array_column($entries, 'amount_cents'));
        $entries = array_map(fn ($entry) => array_merge($entry, ['amount' => $entry['amount_cents'] / 100]), $entries);

        return DB::transaction(function () use ($data, $entries, $totalCents, $userId) {
            $advice = PayrollBankAdvice::create(array_merge($this->documentFields($data), [
                'year' => $data['year'], 'month' => $data['month'],
                'branch_id' => $data['branch_id'] ?? null, 'project_id' => $data['project_id'] ?? null,
                'entries' => $entries, 'total' => $totalCents / 100,
                'in_words' => $this->amountInWords($totalCents), 'created_by' => $userId,
            ]));
            if (! empty($data['save_defaults'])) {
                $this->saveDefaults($data);
            }

            return $advice;
        });
    }

    public function update(PayrollBankAdvice $advice, array $data): void
    {
        DB::transaction(function () use ($advice, $data) {
            $advice->update($this->documentFields($data));
            if (! empty($data['save_defaults'])) {
                $this->saveDefaults($data);
            }
        });
    }

    protected function documentFields(array $data): array
    {
        return [
            'reference_prefix' => rtrim($data['reference_prefix'], '/'),
            'reference_year' => $data['reference_year'], 'reference_number' => $data['reference_number'],
            'issue_date' => $data['issue_date'],
            'include_account_list' => (bool) ($data['include_account_list'] ?? false),
            'details' => array_intersect_key($data, array_flip(['bank_name', 'bank_branch', 'bank_address', 'account_no', 'account_type', 'account_name'])),
            'signatories' => array_values(array_filter($data['signatories'], fn ($signer) => trim($signer['name'] ?? '') !== '')),
        ];
    }

    public function saveDefaults(array $data): void
    {
        $details = array_merge(array_intersect_key($data, array_flip(['bank_name', 'bank_branch', 'bank_address', 'account_no', 'account_type', 'account_name'])), [
            'reference_prefix' => rtrim($data['reference_prefix'], '/'), 'signatories' => $data['signatories'],
        ]);
        PayrollBankAdviceSetting::query()->updateOrCreate(['id' => 1], ['details' => $details]);
    }

    protected function amountInWords(int $cents): string
    {
        $words = AmountInWords::taka(intdiv($cents, 100));
        if ($cents % 100 === 0) {
            return $words;
        }

        return str_replace(' Taka Only', ' Taka', $words).' and '
            .str_replace(' Taka Only', ' Paisa Only', AmountInWords::taka($cents % 100));
    }
}
