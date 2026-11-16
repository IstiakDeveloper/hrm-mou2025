<?php

namespace App\Http\Middleware;

use App\Models\Movement;
use App\Models\MovementLogBook;
use App\Models\OfficeOpenDate;
use App\Models\User;
use App\Services\AssetFinancialYearService;
use App\Services\WebPushService;
use App\Support\CachedSchema;
use App\Support\InertiaNavBadges;
use App\Support\InertiaShellCache;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;
use Symfony\Component\HttpFoundation\Response;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        if ($this->isLightweightJsonRequest($request)) {
            return [
                ...parent::share($request),
                'csrf_token' => csrf_token(),
            ];
        }

        /** @var User|null $user */
        $user = Auth::user();
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');
        $shell = $user
            ? InertiaShellCache::remember($user, fn () => $this->shellFor($user))
            : $this->shellFor(null);

        return [
            ...parent::share($request),
            'csrf_token' => csrf_token(),
            'name' => config('app.name'),
            'quote' => [
                'message' => trim($message),
                'author' => trim($author),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
                'import_summary' => $request->session()->get('import_summary'),
                'import_row_errors' => $request->session()->get('import_row_errors'),
            ],
            ...$shell,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function shellFor(?User $user): array
    {
        $roleColumns = ['id', 'name', 'permissions'];
        if (CachedSchema::hasColumn('roles', 'blocked_sections')) {
            $roleColumns[] = 'blocked_sections';
        }
        if (CachedSchema::hasColumn('roles', 'block_payroll_module')) {
            $roleColumns[] = 'block_payroll_module';
        }
        $roleColumnList = implode(',', $roleColumns);
        $user?->loadMissing(["role:{$roleColumnList}", "roles:{$roleColumnList}"]);

        $employee = null;
        $activeMovement = null;
        if ($user?->employee_id) {
            $employee = $user->employee()
                ->select(['id', 'employee_id', 'pin', 'name_en', 'photo', 'signature', 'department_id', 'current_branch_id'])
                ->with([
                    'department:id,name',
                    'branch:id,name,branch_code',
                ])
                ->first();
        }

        if ($employee) {
            $selectCols = [
                'id',
                'employee_id',
                'movement_type',
                'from_datetime',
                'to_datetime',
                'destination',
                'status',
            ];

            if (CachedSchema::hasColumn('movements', 'start_meter_reading')) {
                $selectCols[] = 'start_meter_reading';
            }
            if (CachedSchema::hasColumn('movements', 'start_place')) {
                $selectCols[] = 'start_place';
            }

            $activeMovement = Movement::query()
                ->where('employee_id', $employee->id)
                ->where('status', 'active')
                ->orderByDesc('id')
                ->first($selectCols);

            if ($activeMovement) {
                $lastEndMeter = MovementLogBook::lastEndMeterReadingForEmployee(
                    (int) $employee->id,
                    (int) $activeMovement->id
                );
                $legacyStart = CachedSchema::hasColumn('movements', 'start_meter_reading')
                    ? ($activeMovement->getAttribute('start_meter_reading') !== null
                        ? (float) $activeMovement->getAttribute('start_meter_reading')
                        : null)
                    : null;
                // Prefer last close meter; fall back to legacy create-time start for in-flight movements
                $presetStart = $lastEndMeter ?? $legacyStart;
                $activeMovement->setAttribute('last_end_meter_reading', $presetStart);
                $activeMovement->setAttribute('start_meter_reading', $presetStart);
            }
        }

        $vapidPublic = (string) config('webpush.public_key', '');
        $pushConfigured = WebPushService::isConfigured();
        $subscriptionCount = $user ? (int) $user->pushSubscriptions()->count() : 0;

        $assetFinancialYear = null;
        if (CachedSchema::hasTable('asset_financial_years')) {
            $currentYear = app(AssetFinancialYearService::class)->current();
            if ($currentYear) {
                $assetFinancialYear = [
                    'id' => $currentYear->id,
                    'label' => $currentYear->label,
                    'start_date' => $currentYear->start_date->format('Y-m-d'),
                    'end_date' => $currentYear->end_date->format('Y-m-d'),
                ];
            }
        }

        $badges = $user ? InertiaNavBadges::forUser($user) : [
            'pendingLeaveCount' => 0,
            'pendingAppraisalCounts' => [
                'promotion' => 0,
                'confirmation' => 0,
                'probation_increment' => 0,
                'trainee' => 0,
                'total' => 0,
            ],
            'pendingFinalClearanceCount' => 0,
            'pendingMotorcycleLoanCount' => 0,
            'canIssueSecondMotorcycleLoan' => false,
            'pendingLogBookPaymentCount' => 0,
        ];

        $primaryRole = ($user?->roles && $user->roles->isNotEmpty())
            ? ($user->roles->firstWhere('id', $user->role_id) ?? $user->roles->first())
            : $user?->role;

        return [
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'username' => $user->username,
                    'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                    'employee_id' => $user->employee_id,
                    'account_type' => $user->account_type,
                    'branch_id' => $user->branch_id,
                    'is_department_head' => $user->isDepartmentHead(),
                    'blocked_sections' => $user->effectiveBlockedSections(),
                    'role' => $this->rolePayload($primaryRole),
                    'roles' => $user->roles
                        ? $user->roles->map(fn ($role) => $this->rolePayload($role))->filter()->values()->all()
                        : [],
                    'signature' => $user->getSignaturePath(),
                ] : null,
                'employee' => $employee?->toArray(),
            ],
            'activeMovement' => $activeMovement?->toArray(),
            'push' => [
                'vapidPublicKey' => $pushConfigured ? $vapidPublic : null,
                'configured' => $pushConfigured,
                'subscriptionCount' => $subscriptionCount,
            ],
            'assetFinancialYear' => $assetFinancialYear,
            'pendingLeaveCount' => $badges['pendingLeaveCount'],
            'pendingAppraisalCounts' => $badges['pendingAppraisalCounts'],
            'pendingFinalClearanceCount' => $badges['pendingFinalClearanceCount'],
            'pendingMotorcycleLoanCount' => $badges['pendingMotorcycleLoanCount'],
            'canIssueSecondMotorcycleLoan' => $badges['canIssueSecondMotorcycleLoan'],
            'pendingLogBookPaymentCount' => $badges['pendingLogBookPaymentCount'],
            'officeOpenDates' => OfficeOpenDate::dateStrings(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function rolePayload(mixed $role): ?array
    {
        if (! $role) {
            return null;
        }

        return [
            'id' => $role->id,
            'name' => $role->name,
            'permissions' => $role->permissions,
            'blocked_sections' => $role->blocked_sections ?? [],
            'block_payroll_module' => (bool) ($role->block_payroll_module ?? false),
        ];
    }

    /**
     * Counts are cached before the controller runs. Drop them after a write so the next page is fresh.
     */
    public function terminate(Request $request, Response $response): void
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return;
        }

        $userId = Auth::id();
        if (is_numeric($userId)) {
            InertiaNavBadges::forget((int) $userId);
            InertiaShellCache::forget((int) $userId);
        }
    }

    /**
     * Bell polling hits web middleware on every tick. Skip shared Inertia queries there.
     */
    private function isLightweightJsonRequest(Request $request): bool
    {
        return $request->is('notifications', 'notifications/*');
    }
}
