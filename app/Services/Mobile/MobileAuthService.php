<?php

namespace App\Services\Mobile;

use App\Models\Branch;
use App\Models\User;
use App\Services\BranchAccountService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MobileAuthService
{
    public function __construct(
        private readonly BranchAccountService $branchAccounts,
        private readonly MobileBootstrapService $bootstrap,
    ) {}

    /**
     * @return array{token: string, token_type: string, bootstrap: array<string, mixed>}
     */
    public function loginStaff(Request $request): array
    {
        $request->validate([
            'login' => 'required|string|max:255',
            'password' => 'required|string',
            'device_name' => 'nullable|string|max:120',
        ]);

        $login = trim((string) $request->input('login'));

        $user = User::query()
            ->where('account_type', 'staff')
            ->where('username', $login)
            ->first();

        if (! $user) {
            $user = User::query()
                ->where('account_type', 'staff')
                ->whereRaw('LOWER(email) = ?', [Str::lower($login)])
                ->first();
        }

        if (! $user || ! Hash::check((string) $request->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'login' => [__('auth.failed')],
            ]);
        }

        if ($user->active_status === false) {
            throw ValidationException::withMessages([
                'login' => ['This account is inactive. Please contact your administrator.'],
            ]);
        }

        return $this->issueToken($user, $request, 'staff');
    }

    /**
     * @return array{token: string, token_type: string, bootstrap: array<string, mixed>}
     */
    public function loginBranch(Request $request): array
    {
        $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'pin' => 'required|string|min:4|max:12',
            'device_name' => 'nullable|string|max:120',
        ]);

        $branch = Branch::query()
            ->with('branchUser')
            ->where('id', $request->integer('branch_id'))
            ->where('is_active', true)
            ->first();

        if (! $branch || ! $branch->verifyLoginPin((string) $request->input('pin'))) {
            throw ValidationException::withMessages([
                'pin' => ['Invalid branch or PIN. Please try again.'],
            ]);
        }

        $user = $branch->branchUser;
        if (! $user || ! $user->isBranchAccount()) {
            $user = $this->branchAccounts->ensureForBranch($branch);
        }

        if (! $user->active_status) {
            throw ValidationException::withMessages([
                'pin' => ['This branch account is inactive. Contact admin.'],
            ]);
        }

        return $this->issueToken($user, $request, 'branch:'.$branch->id, [
            'branch_context_id' => $branch->id,
            'branch_login' => true,
        ]);
    }

    public function logoutCurrent(Request $request): void
    {
        $request->user()?->currentAccessToken()?->delete();
    }

    public function logoutAll(Request $request): void
    {
        $request->user()?->tokens()->delete();
    }

    public function changePassword(Request $request): void
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->isBranchAccount()) {
            throw ValidationException::withMessages([
                'password' => ['Branch accounts cannot change password from the mobile app.'],
            ]);
        }

        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:4|confirmed',
        ]);

        if (! Hash::check((string) $request->input('current_password'), $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->password = Hash::make((string) $request->input('password'));
        $user->save();

        // Force re-auth on other devices after password change.
        $current = $user->currentAccessToken();
        $user->tokens()
            ->when($current, fn ($query) => $query->where('id', '!=', $current->id))
            ->delete();
    }

    /**
     * @param  array<string, mixed>  $abilitiesMeta
     * @return array{token: string, token_type: string, bootstrap: array<string, mixed>}
     */
    private function issueToken(User $user, Request $request, string $context, array $abilitiesMeta = []): array
    {
        $deviceName = trim((string) $request->input('device_name', ''));
        if ($deviceName === '') {
            $platform = (string) $request->header('X-Platform', 'mobile');
            $deviceId = (string) $request->header('X-Device-Id', 'unknown');
            $deviceName = sprintf('mobile:%s:%s:%s', $context, $platform, Str::limit($deviceId, 40, ''));
        }

        // One active token per device name keeps shared tablets manageable.
        $user->tokens()->where('name', $deviceName)->delete();

        $abilities = ['mobile', 'context:'.$context];
        foreach ($abilitiesMeta as $key => $value) {
            if (is_scalar($value)) {
                $abilities[] = $key.':'.$value;
            }
        }

        $token = $user->createToken($deviceName, $abilities, now()->addDays(30));

        return [
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => optional($token->accessToken->expires_at)?->toIso8601String(),
            'bootstrap' => $this->bootstrap->build($user, $request),
        ];
    }
}
