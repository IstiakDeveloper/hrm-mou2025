<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Str;

class MisLoanSsoService
{
    public function isConfigured(): bool
    {
        $appUrl = rtrim((string) config('services.misloan.app_url'), '/');
        $token = (string) config('services.misloan.token');

        return $appUrl !== '' && $token !== '';
    }

    public function openUrl(): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        return rtrim((string) config('services.misloan.app_url'), '/').'/login';
    }

    public function redirectUrlForUser(User $user): ?string
    {
        $token = $this->createTokenForUser($user);
        if ($token === null) {
            return null;
        }

        $base = rtrim((string) config('services.misloan.app_url'), '/');

        return $base.'/auth/hrm-sso?token='.urlencode($token);
    }

    public function createTokenForUser(User $user): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $user->loadMissing(['employee', 'branch']);

        if ($user->isBranchAccount()) {
            $branch = $user->branch;
            $branchCode = trim((string) ($branch?->branch_code ?? ''));
            if ($branchCode === '') {
                return null;
            }

            return $this->signPayload([
                'type' => 'branch',
                'branch_code' => $branchCode,
                'exp' => time() + 120,
                'nonce' => Str::random(16),
            ]);
        }

        $employee = $user->employee;
        if (! $employee instanceof Employee) {
            return null;
        }

        $pin = trim((string) ($employee->getRawOriginal('pin') ?? $employee->getRawOriginal('employee_id') ?? ''));
        if ($pin === '') {
            return null;
        }

        return $this->signPayload([
            'type' => 'staff',
            'pin' => $pin,
            'username' => (string) $user->username,
            'exp' => time() + 120,
            'nonce' => Str::random(16),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function signPayload(array $payload): string
    {
        $payloadB64 = rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $secret = (string) config('services.misloan.token');
        $signature = hash_hmac('sha256', $payloadB64, $secret);

        return $payloadB64.'.'.$signature;
    }
}
