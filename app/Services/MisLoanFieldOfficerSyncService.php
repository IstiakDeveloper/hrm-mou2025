<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\User;
use App\Support\BranchOrganogram;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MisLoanFieldOfficerSyncService
{
    /**
     * Officer + Probationary Staff designations sync to MisLoan as field_officer.
     */
    public function isSyncableDesignation(?string $designationName): bool
    {
        $tier = BranchOrganogram::resolveTier($designationName);
        $label = (string) ($tier['label'] ?? '');

        return in_array($label, ['Officer', 'Probationary Staff'], true);
    }

    public function isConfigured(): bool
    {
        $url = rtrim((string) config('services.misloan.url'), '/');
        $token = (string) config('services.misloan.token');

        return $url !== '' && $token !== '';
    }

    /**
     * Push one field officer (create/update/deactivate) to MisLoan.
     * No-op when MisLoan is not configured or designation is not syncable.
     */
    public function pushEmployee(Employee $employee): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        $employee->loadMissing(['designation', 'branch', 'user']);

        if (! $this->isSyncableDesignation($employee->designation?->name)) {
            return;
        }

        $payload = $this->buildOfficerPayload($employee);
        if ($payload === null) {
            return;
        }

        $baseUrl = rtrim((string) config('services.misloan.url'), '/');
        $token = (string) config('services.misloan.token');

        try {
            $response = Http::timeout(20)
                ->acceptJson()
                ->withToken($token)
                ->post("{$baseUrl}/hrm/sync/field-officer", $payload);

            if (! $response->successful()) {
                Log::warning('MisLoan field officer push failed', [
                    'employee_id' => $employee->id,
                    'pin' => $payload['pin'] ?? null,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('MisLoan field officer push exception', [
                'employee_id' => $employee->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Push branch transfer to MisLoan when employee posting changes.
     * Updates existing MisLoan user matched by PIN — does not create new users.
     */
    public function pushTransfer(Employee $employee): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        $employee->loadMissing(['branch', 'user']);

        $pin = trim((string) ($employee->getRawOriginal('pin') ?? $employee->getRawOriginal('employee_id') ?? ''));
        if ($pin === '') {
            return;
        }

        $branchCode = trim((string) ($employee->branch?->branch_code ?? ''));
        if ($branchCode === '') {
            return;
        }

        $user = $employee->user;
        if (! $user instanceof User) {
            $user = User::query()->where('employee_id', $employee->id)->first();
        }

        $payload = [
            'pin' => $pin,
            'username' => $user?->username,
            'branch_code' => $branchCode,
            'is_active' => ($employee->status ?: 'active') === 'active',
        ];

        $baseUrl = rtrim((string) config('services.misloan.url'), '/');
        $token = (string) config('services.misloan.token');

        try {
            $response = Http::timeout(20)
                ->acceptJson()
                ->withToken($token)
                ->post("{$baseUrl}/hrm/sync/transfer", $payload);

            if (! $response->successful()) {
                Log::warning('MisLoan transfer push failed', [
                    'employee_id' => $employee->id,
                    'pin' => $pin,
                    'branch_code' => $branchCode,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('MisLoan transfer push exception', [
                'employee_id' => $employee->id,
                'message' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listOfficerPayloads(): array
    {
        $employees = Employee::query()
            ->with(['designation', 'branch', 'user'])
            ->whereHas('designation')
            ->where(function ($query) {
                $query->whereNotNull('pin')->where('pin', '!=', '')
                    ->orWhere(function ($inner) {
                        $inner->whereNotNull('employee_id')->where('employee_id', '!=', '');
                    });
            })
            ->get()
            ->filter(fn (Employee $employee) => $this->isSyncableDesignation($employee->designation?->name));

        $payloads = [];
        foreach ($employees as $employee) {
            $payload = $this->buildOfficerPayload($employee);
            if ($payload !== null) {
                $payloads[] = $payload;
            }
        }

        return $payloads;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function buildOfficerPayload(Employee $employee): ?array
    {
        $pin = trim((string) ($employee->getRawOriginal('pin') ?? $employee->getRawOriginal('employee_id') ?? ''));
        if ($pin === '') {
            return null;
        }

        $user = $employee->user;
        if (! $user instanceof User) {
            $user = User::query()->where('employee_id', $employee->id)->first();
        }

        $username = $user?->username ?: $pin;
        $passwordHash = $user?->getRawOriginal('password');
        if (! is_string($passwordHash) || $passwordHash === '') {
            // Fallback: MisLoan will hash plain PIN if hash missing (new edge case)
            $passwordHash = null;
        }

        $name = trim((string) ($employee->getRawOriginal('name_en') ?? ''));
        if ($name === '') {
            $name = $user?->name ?: $pin;
        }

        $email = trim((string) ($employee->email ?? ''));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = is_string($user?->email) ? (string) $user->email : '';
        }

        $branchCode = trim((string) ($employee->branch?->branch_code ?? ''));
        $isActive = ($employee->status ?: 'active') === 'active'
            && ($user === null || $user->active_status !== false);

        return [
            'pin' => $pin,
            'username' => $username,
            'name' => $name,
            'email' => $email !== '' ? $email : null,
            'password_hash' => $passwordHash,
            'plain_password' => $passwordHash === null ? $pin : null,
            'branch_code' => $branchCode !== '' ? $branchCode : null,
            'designation' => $employee->designation?->name,
            'is_active' => $isActive,
        ];
    }
}
