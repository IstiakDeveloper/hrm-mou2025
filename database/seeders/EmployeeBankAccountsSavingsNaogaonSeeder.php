<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * One-shot data fix: all employee bank accounts use savings type and Naogaon Sadar branch.
 * Safe to run multiple times (idempotent values). **migrate:fresh is not required.**
 *
 * Run: php artisan db:seed --class=EmployeeBankAccountsSavingsNaogaonSeeder
 */
class EmployeeBankAccountsSavingsNaogaonSeeder extends Seeder
{
    private const BRANCH = 'Naogaon Sadar';

    private const ACCOUNT_TYPE = 'savings';

    public function run(): void
    {
        $bankCount = DB::table('employee_bank_accounts')->count();
        if ($bankCount === 0) {
            $this->command?->info('No rows in employee_bank_accounts; nothing to update.');

            return;
        }

        DB::table('employee_bank_accounts')->update([
            'account_type' => self::ACCOUNT_TYPE,
            'branch_name' => self::BRANCH,
            'updated_at' => now(),
        ]);

        $this->command?->info("Updated {$bankCount} employee_bank_accounts: account_type=savings, branch_name=Naogaon Sadar.");

        $employeeIds = DB::table('employee_bank_accounts')->distinct()->pluck('employee_id');
        $synced = 0;
        foreach ($employeeIds as $eid) {
            $row = DB::table('employee_bank_accounts')
                ->where('employee_id', $eid)
                ->where('is_primary', true)
                ->first()
                ?? DB::table('employee_bank_accounts')->where('employee_id', $eid)->orderBy('id')->first();

            if ($row === null) {
                continue;
            }

            $details = [
                'bank_name' => (string) ($row->bank_name ?? ''),
                'branch_name' => (string) ($row->branch_name ?? self::BRANCH),
                'account_no' => $row->account_no !== null ? (string) $row->account_no : null,
                'account_type' => (string) ($row->account_type ?? self::ACCOUNT_TYPE),
            ];

            DB::table('employees')->where('id', $eid)->update([
                'bank_account_details' => json_encode($details),
                'updated_at' => now(),
            ]);
            $synced++;
        }

        $this->command?->info("Synced bank_account_details JSON for {$synced} employees from bank rows.");

        $jsonOnly = DB::table('employees')
            ->whereNotNull('bank_account_details')
            ->where('bank_account_details', '!=', 'null')
            ->where('bank_account_details', '!=', '{}')
            ->whereNotIn('id', $employeeIds->toArray())
            ->get(['id', 'bank_account_details']);

        $jsonPatched = 0;
        foreach ($jsonOnly as $emp) {
            $raw = $emp->bank_account_details;
            $decoded = is_string($raw) ? json_decode($raw, true) : null;
            if (! is_array($decoded)) {
                continue;
            }
            if (($decoded['bank_name'] ?? '') === '' && ($decoded['account_no'] ?? '') === '') {
                continue;
            }
            $decoded['branch_name'] = self::BRANCH;
            $decoded['account_type'] = self::ACCOUNT_TYPE;
            DB::table('employees')->where('id', $emp->id)->update([
                'bank_account_details' => json_encode($decoded),
                'updated_at' => now(),
            ]);
            $jsonPatched++;
        }

        if ($jsonPatched > 0) {
            $this->command?->info("Patched bank_account_details only (no bank row) for {$jsonPatched} employees.");
        }
    }
}
