<?php

namespace App\Http\Middleware;

use App\Models\Movement;
use App\Models\MovementLogBook;
use App\Models\User;
use App\Services\AssetFinancialYearService;
use App\Services\WebPushService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

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
        /** @var User|null $user */
        $user = Auth::user();
        $roleColumns = Schema::hasTable('roles') && Schema::hasColumn('roles', 'blocked_sections')
            ? 'id,name,permissions,blocked_sections'
            : 'id,name,permissions';
        $user?->loadMissing(["role:{$roleColumns}", "roles:{$roleColumns}"]);

        $employee = null;
        $activeMovement = null;
        if ($user?->employee_id) {
            $employee = $user->employee()
                ->select(['id', 'employee_id', 'pin', 'name_en', 'photo', 'department_id', 'current_branch_id'])
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

            if (Schema::hasColumn('movements', 'start_meter_reading')) {
                $selectCols[] = 'start_meter_reading';
            }
            if (Schema::hasColumn('movements', 'start_place')) {
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
                $legacyStart = Schema::hasColumn('movements', 'start_meter_reading')
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

        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $vapidPublic = (string) config('webpush.public_key', '');
        $pushConfigured = WebPushService::isConfigured();
        $subscriptionCount = $user ? $user->pushSubscriptions()->count() : 0;

        $assetFinancialYear = null;
        if (Schema::hasTable('asset_financial_years')) {
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

        return [
            ...parent::share($request),
            'csrf_token' => csrf_token(),
            'name' => config('app.name'),
            'quote' => [
                'message' => trim($message),
                'author' => trim($author),
            ],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'employee_id' => $user->employee_id,
                    'account_type' => $user->account_type,
                    'branch_id' => $user->branch_id,
                    'is_department_head' => $user->isDepartmentHead(),
                    'blocked_sections' => $user->effectiveBlockedSections(),
                    'role' => $user->role,
                    'roles' => $user->roles,
                ] : null,
                'employee' => $employee,
            ],
            'activeMovement' => $activeMovement,
            'push' => [
                'vapidPublicKey' => $pushConfigured ? $vapidPublic : null,
                'configured' => $pushConfigured,
                'subscriptionCount' => $subscriptionCount,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
                'import_summary' => $request->session()->get('import_summary'),
                'import_row_errors' => $request->session()->get('import_row_errors'),
            ],
            'assetFinancialYear' => $assetFinancialYear,
        ];
    }
}
