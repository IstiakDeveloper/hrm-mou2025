<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeSecurityFundAccount as Account;
use App\Models\EmployeeSecurityFundTransaction as Transaction;
use App\Models\User;
use App\Support\BangladeshDate;
use App\Support\SecurityFundMoney as Money;
use App\Support\SecurityFundXlsxReader;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Throwable;

class SecurityFundExcelImportService
{
    public function __construct(private EmployeeSecurityFundService $fund, private SecurityFundXlsxReader $reader) {}

    public function import(string $path, string $filename, User $user): array
    {
        try {
            $workbook = $this->reader->read($path);
        } catch (\RuntimeException $exception) {
            throw ValidationException::withMessages(['file' => $exception->getMessage()]);
        }
        $sheet = $workbook['rows'];
        $header = null;
        $dataRows = [];
        foreach ($sheet as $row) {
            if (count(array_filter($row['cells'], fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }
            if ($header === null) {
                $header = $this->headers($row['cells']);

                continue;
            }
            $dataRows[] = $row;
        }
        if ($header === null || $dataRows === []) {
            throw ValidationException::withMessages(['file' => 'No deposit rows found. Use the template: PIN, Name, Deposit Date, Amount.']);
        }
        if (count($dataRows) > SecurityFundXlsxReader::MAX_ROWS) {
            throw ValidationException::withMessages(['file' => 'Upload at most 2,000 deposit rows at a time.']);
        }
        $employees = Employee::query();
        OrganogramAccessService::constrainVisibleEmployees($employees, $user);
        // Match only employee PIN; names, employee IDs and device IDs are never used as a substitute.
        $byPin = $employees->get()->groupBy(fn (Employee $employee) => $this->pinKey((string) $employee->pin));
        $results = [];
        $pending = [];
        foreach ($dataRows as $row) {
            $values = [];
            foreach ($header as $field => $column) {
                $values[$field] = trim((string) ($row['cells'][$column] ?? ''));
            }
            $result = ['row' => $row['row']] + $values + ['status' => 'failed', 'message' => '', 'employee_name' => null, 'account_id' => null];
            try {
                if ($row['formula']) {
                    throw new InvalidArgumentException('Formula cells are not supported. Copy and paste values before importing.');
                }
                if ($values['pin'] === '' || $values['name'] === '') {
                    throw new InvalidArgumentException('PIN and Name are required.');
                }
                if (mb_strlen($values['pin']) > 100 || mb_strlen($values['name']) > 255) {
                    throw new InvalidArgumentException('PIN or Name is too long.');
                }
                $matches = $byPin->get($this->pinKey($values['pin']), collect());
                if ($matches->isEmpty()) {
                    throw new InvalidArgumentException('No accessible employee matches this PIN. Preserve leading zeros by storing PIN as Excel Text.');
                }
                if ($matches->count() !== 1) {
                    throw new InvalidArgumentException('Multiple employees have this PIN. Resolve the duplicate PIN before importing.');
                }
                $employee = $matches->first();
                $date = $this->depositDate($values['deposit_date'], $workbook['date1904']);
                $amount = $this->amount($values['amount']);
                $result['deposit_date'] = $date;
                $result['amount'] = $amount;
                $result['employee_name'] = $employee->name_en ?: $employee->name_bn;
                $pending[] = ['employee' => $employee, 'result' => $result];
            } catch (InvalidArgumentException $exception) {
                $result['message'] = $exception->getMessage();
                $results[] = $result;
            }
        }
        // Multiple deposits for one employee may arrive in any Excel order.
        usort($pending, fn ($a, $b) => [$a['employee']->id, $a['result']['deposit_date'], $a['result']['row']]
            <=> [$b['employee']->id, $b['result']['deposit_date'], $b['result']['row']]);
        foreach ($pending as $item) {
            $row = $item['result'];
            try {
                $row = DB::transaction(fn () => $this->postRow($item['employee'], $row, $filename, $user));
            } catch (ValidationException $exception) {
                $row['message'] = collect($exception->errors())->flatten()->implode(' ');
            } catch (InvalidArgumentException $exception) {
                $row['message'] = $exception->getMessage();
            } catch (Throwable $exception) {
                report($exception);
                $row['message'] = 'This row could not be imported. Review the ledger and retry; other successful rows are retained.';
            }
            $results[] = $row;
        }
        usort($results, fn ($a, $b) => $a['row'] <=> $b['row']);

        return [
            'filename' => $filename, 'created_at' => BangladeshDate::now()->toIso8601String(),
            'total' => count($results), 'imported' => count(array_filter($results, fn ($row) => $row['status'] === 'imported')),
            'failed' => count(array_filter($results, fn ($row) => $row['status'] === 'failed')),
            'skipped' => count(array_filter($results, fn ($row) => $row['status'] === 'skipped')), 'rows' => $results,
        ];
    }

    private function postRow(Employee $employee, array $row, string $filename, User $user): array
    {
        $employee = Employee::query()->whereKey($employee->id)->lockForUpdate()->firstOrFail();
        if ($this->pinKey((string) $employee->pin) !== $this->pinKey($row['pin'])) {
            throw new InvalidArgumentException('The employee PIN changed during import. Review this row and upload it again.');
        }
        $visible = Employee::whereKey($employee->id);
        OrganogramAccessService::constrainVisibleEmployees($visible, $user);
        if (! $visible->exists()) {
            throw new InvalidArgumentException('This employee is no longer accessible to your account.');
        }
        $row['employee_name'] = $employee->name_en ?: $employee->name_bn;
        $key = 'sf-xlsx-'.hash('sha256', $employee->id.'|'.$row['deposit_date'].'|'.$row['amount']);
        $account = Account::where('employee_id', $employee->id)->lockForUpdate()->first();
        if ($account) {
            $row['account_id'] = $account->id;
            $reversed = Transaction::where('account_id', $account->id)->whereNotNull('reversal_of_id')->select('reversal_of_id');
            $duplicate = $account->transactions()->where(function ($query) use ($key, $row, $reversed) {
                $query->where('idempotency_key', $key)->orWhere(fn ($q) => $q->where('type', 'deposit')
                    ->whereDate('transaction_date', $row['deposit_date'])->where('principal_credit', $row['amount'])->whereNotIn('id', $reversed));
            })->exists();
            if ($duplicate) {
                return array_replace($row, ['status' => 'skipped', 'message' => 'This employee already has this deposit date and amount. No money was added again.']);
            }
            if (! $user->hasPermission('staff-fund.edit')) {
                throw new InvalidArgumentException('Adding a deposit to an existing account requires Staff Fund edit permission.');
            }
        } elseif (! $user->hasPermission('staff-fund.create')) {
            throw new InvalidArgumentException('Creating a new fund account requires Staff Fund create permission.');
        }
        $data = [
            'amount' => $row['amount'], 'transaction_date' => $row['deposit_date'], 'idempotency_key' => $key,
            'reference_no' => 'XLSX-'.substr(hash('sha256', $key), 0, 16),
            'notes' => 'Excel import: '.mb_substr($filename, 0, 150).'; row '.$row['row'].'; supplied name: '.$row['name'].'. Matched by employee PIN.',
        ];
        if ($account) {
            $this->fund->deposit($account, $data, $user->id, legacy: true);
        } else {
            $account = $this->fund->create($employee, $data, $user->id, legacy: true);
        }
        $snapshot = $this->fund->accountSnapshot($account, BangladeshDate::todayString());
        $message = 'Deposit linked to the employee matched by PIN.';
        if (! empty($snapshot['review_required'])) {
            $message .= ' '.$snapshot['review_required'];
        } elseif ($employee->final_payment_date) {
            $message .= ' The legacy final-payment date did not block this separate Security Fund deposit.';
        }

        return array_replace($row, ['account_id' => $account->id, 'status' => 'imported', 'message' => $message]);
    }

    private function headers(array $cells): array
    {
        $map = [];
        foreach ($cells as $column => $cell) {
            $normalized = preg_replace('/[^a-z]/', '', strtolower(trim((string) $cell)));
            $field = match ($normalized) {
                'pin' => 'pin', 'name' => 'name', 'depositdate' => 'deposit_date', 'amount' => 'amount', default => null
            };
            if ($field !== null) {
                if (isset($map[$field])) {
                    throw ValidationException::withMessages(['file' => 'Duplicate column: '.$cell]);
                }
                $map[$field] = $column;
            }
        }
        if (count($map) !== 4) {
            $labels = ['pin' => 'PIN', 'name' => 'Name', 'deposit_date' => 'Deposit Date', 'amount' => 'Amount'];
            $missing = array_values(array_diff_key($labels, $map));
            $found = mb_substr(implode(', ', array_map(fn ($cell) => trim((string) $cell), $cells)), 0, 250);
            throw ValidationException::withMessages(['file' => 'Missing columns: '.implode(', ', $missing).'. Found: '.($found ?: '(empty header)').'. Required: PIN, Name, Deposit Date, Amount. Download and use the template.']);
        }

        return $map;
    }

    private function pinKey(string $pin): string
    {
        return mb_strtolower(trim($pin));
    }

    private function amount(string $raw): string
    {
        if (preg_match('/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/D', $raw)
            || preg_match('/^\d{1,2}(?:,\d{2})*,\d{3}(?:\.\d{1,2})?$/D', $raw)) {
            $raw = str_replace(',', '', $raw);
        }
        try {
            $paisa = Money::paisa($raw);
        } catch (InvalidArgumentException) {
            throw new InvalidArgumentException('Amount must be a positive number with at most two decimal places.');
        }
        if ($paisa <= 0 || $paisa > Money::paisa(config('security_fund.maximum_principal'))) {
            throw new InvalidArgumentException('Amount must be positive and no greater than '.config('security_fund.maximum_principal').'.');
        }

        return Money::decimal($paisa);
    }

    private function depositDate(string $raw, bool $date1904): string
    {
        if (preg_match('/^\d+(?:\.\d+)?$/D', $raw)) {
            $serial = (float) $raw;
            if ($serial < 1 || $serial > 200000) {
                throw new InvalidArgumentException('Deposit Date is not a valid Excel date.');
            }
            $base = $date1904 ? '1904-01-01' : '1899-12-30';
            $date = BangladeshDate::parseStartOfDay($base)->addDays((int) floor($serial))->toDateString();
        } elseif (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D', $raw, $parts)) {
            if (! checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1])) {
                throw new InvalidArgumentException('Deposit Date is invalid. Use YYYY-MM-DD or DD/MM/YYYY.');
            }
            $date = $raw;
        } elseif (preg_match('/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/D', $raw, $parts) && checkdate((int) $parts[2], (int) $parts[1], (int) $parts[3])) {
            $date = sprintf('%04d-%02d-%02d', $parts[3], $parts[2], $parts[1]);
        } else {
            throw new InvalidArgumentException('Deposit Date is invalid. Use YYYY-MM-DD, DD/MM/YYYY or a native Excel date.');
        }
        if ($date < '1900-01-01' || $date > BangladeshDate::todayString()) {
            throw new InvalidArgumentException('Deposit Date must be between 1900 and today.');
        }

        return $date;
    }
}
