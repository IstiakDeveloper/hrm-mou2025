<?php

use App\Http\Controllers\Admin\ActiveSessionController;
use App\Http\Controllers\Admin\AdminNoticeController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Attendance\AttendanceController;
use App\Http\Controllers\Attendance\AttendanceDeviceController;
use App\Http\Controllers\Attendance\AttendanceReportController;
use App\Http\Controllers\Attendance\AttendanceSettingController;
use App\Http\Controllers\Attendance\SelfAttendanceController;
use App\Http\Controllers\AttendanceExportController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Branch\BranchController;
use App\Http\Controllers\Confirmation\ConfirmationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Department\DepartmentController;
use App\Http\Controllers\Designation\DesignationController;
use App\Http\Controllers\Employee\DisciplinaryActionController;
use App\Http\Controllers\Employee\EmployeeAssetController;
use App\Http\Controllers\Employee\EmployeeController;
use App\Http\Controllers\Employee\EmployeeDashboardController;
use App\Http\Controllers\Employee\EmployeeDocumentController;
use App\Http\Controllers\Employee\EmployeeLeaveController;
use App\Http\Controllers\Employee\EmployeeMovementController;
use App\Http\Controllers\FixedAsset\AssetAssignmentController;
use App\Http\Controllers\FixedAsset\AssetCategoryController;
use App\Http\Controllers\FixedAsset\AssetCustodianChangeController;
use App\Http\Controllers\FixedAsset\AssetCustodianController;
use App\Http\Controllers\FixedAsset\AssetCustodianDepartmentController;
use App\Http\Controllers\FixedAsset\AssetCustodianDesignationController;
use App\Http\Controllers\FixedAsset\AssetDepreciationController;
use App\Http\Controllers\FixedAsset\AssetDisposalController;
use App\Http\Controllers\FixedAsset\AssetDisposalReasonController;
use App\Http\Controllers\FixedAsset\AssetFinancialYearController;
use App\Http\Controllers\FixedAsset\AssetGuaranteeController;
use App\Http\Controllers\FixedAsset\AssetInsuranceController;
use App\Http\Controllers\FixedAsset\AssetMaintenanceController;
use App\Http\Controllers\FixedAsset\AssetNotInUseController;
use App\Http\Controllers\FixedAsset\AssetPurchaseController;
use App\Http\Controllers\FixedAsset\AssetRevaluationController;
use App\Http\Controllers\FixedAsset\AssetStockController;
use App\Http\Controllers\FixedAsset\AssetSubCategoryController;
use App\Http\Controllers\FixedAsset\AssetTrackingController;
use App\Http\Controllers\FixedAsset\AssetTransferController;
use App\Http\Controllers\FixedAsset\AssetVendorController;
use App\Http\Controllers\FixedAsset\AssetWarrantyController;
use App\Http\Controllers\FixedAsset\FixedAssetController;
use App\Http\Controllers\FixedAsset\FixedAssetDashboardController;
use App\Http\Controllers\FixedAsset\FixedAssetImportController;
use App\Http\Controllers\FixedAsset\FixedAssetReportController;
use App\Http\Controllers\Holiday\HolidayController;
use App\Http\Controllers\Inventory\InventoryDashboardController;
use App\Http\Controllers\Inventory\InventoryOperationsController;
use App\Http\Controllers\Inventory\InventoryProductController;
use App\Http\Controllers\Inventory\InventoryReportController;
use App\Http\Controllers\Leave\LeaveApplicationController;
use App\Http\Controllers\Leave\LeaveBalanceController;
use App\Http\Controllers\Leave\LeaveSettingController;
use App\Http\Controllers\Leave\LeaveTypeController;
use App\Http\Controllers\Movement\MovementController;
use App\Http\Controllers\Movement\MovementLogBookController;
use App\Http\Controllers\Movement\MovementLogBookPaymentController;
use App\Http\Controllers\Movement\MovementPenaltyController;
use App\Http\Controllers\MyNoticeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Organization\EmployeeTypeController;
use App\Http\Controllers\Organization\OrganizationStructureController;
use App\Http\Controllers\Organization\ProgramController;
use App\Http\Controllers\Organization\ProjectController;
use App\Http\Controllers\Payroll\BonusCalculationController;
use App\Http\Controllers\Payroll\BonusConfigurationController;
use App\Http\Controllers\Payroll\BonusPostController;
use App\Http\Controllers\Payroll\BonusTypeController;
use App\Http\Controllers\Payroll\BranchPayrollBankController;
use App\Http\Controllers\Payroll\PayscaleController;
use App\Http\Controllers\Payroll\SalaryGradeController;
use App\Http\Controllers\Payroll\SalaryHeadController;
use App\Http\Controllers\Payroll\SalaryStepController;
use App\Http\Controllers\Payroll\SalaryStructureController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Demotion\DemotionController;
use App\Http\Controllers\Promotion\PromotionController;
use App\Http\Controllers\RegionalOffice\RegionalOfficeController;
use App\Http\Controllers\Report\ReportController;
use App\Http\Controllers\Separation\SeparationController;
use App\Http\Controllers\Transfer\TransferController;
use App\Http\Controllers\ZKTeco\ZKDeviceController;
use App\Http\Controllers\Zone\ZoneController;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes - HRM System
|--------------------------------------------------------------------------
|
| Organized permission-based routing system
| Permission Structure: module.action (e.g., users.view, employees.create)
|
*/

Route::get('/error/403', function (Request $request) {
    return Inertia::render('Errors/Unauthorized', [
        'permission' => $request->get('permission'),
        'reason' => $request->get('reason'),
        'errorDetails' => session('error_type') ? [
            'type' => session('error_type'),
            'required_permission' => session('required_permission'),
            'user_permissions' => session('user_permissions'),
            'attempted_url' => session('attempted_url'),
        ] : null,
    ]);
})->name('error.403');

Route::get('/error/404', function () {
    return Inertia::render('Errors/NotFound');
})->name('error.404');

// Generic error route
Route::get('/error/{type}', function ($type, Request $request) {
    $pages = [
        '403' => 'Errors/Unauthorized',
        '404' => 'Errors/NotFound',
        '500' => 'Errors/ServerError',
    ];

    $component = $pages[$type] ?? 'Errors/NotFound';

    return Inertia::render($component, [
        'errorType' => $type,
        'permission' => $request->get('permission'),
        'reason' => $request->get('reason'),
    ]);
})->name('error.show');

Route::get('/error/{type}', function ($type) {
    $pages = [
        '403' => 'Errors/Unauthorized',
        '404' => 'Errors/NotFound',
        '500' => 'Errors/ServerError',
    ];

    $component = $pages[$type] ?? 'Errors/NotFound';

    return Inertia::render($component, [
        'errorType' => $type,
    ]);
})->name('error.show');

// ====================
// PUBLIC ROUTES
// ====================
Route::get('/', function () {
    if (! Auth::check()) {
        return redirect()->route('login');
    }

    return redirect()->route('sections.index');
});

Route::get('/admin/roles/fix-permissions', [RoleController::class, 'fixAllRolePermissions'])
    ->name('admin.roles.fix-permissions')
    ->middleware('permission:admin.access');

Route::get('/admin/roles/permissions-api', [RoleController::class, 'permissions'])
    ->name('admin.roles.permissions-api')
    ->middleware('permission:roles.view');

// Debug route (remove in production)
Route::get('/debug/role/{role}', function (Role $role) {
    $raw = $role->permissions;
    if (is_array($raw)) {
        $permissions = $raw;
    } elseif (is_string($raw)) {
        $permissions = json_decode($raw, true) ?? [];
    } else {
        $permissions = [];
    }

    return response()->json([
        'role_id' => $role->id,
        'role_name' => $role->name,
        'current_permissions' => $permissions,
        'permission_count' => count($permissions),
    ]);
})->name('debug.role');

// Run DB migrations via GET /migrate (local env, or set ALLOW_MIGRATE_HTTP=true in .env).
// Remove ALLOW_MIGRATE_HTTP after one-time deploy; never leave it true on public servers.
Route::get('/migrate', function () {

    Artisan::call('migrate', ['--force' => true]);

    return response()->json([
        'ok' => true,
        'output' => Artisan::output(),
    ]);
})->name('migrate.http');

// ====================
// AUTHENTICATION ROUTES
// ====================
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');
});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

// ====================
// PROTECTED ROUTES
// ====================
Route::middleware(['auth'])->group(function () {

    require __DIR__.'/settings.php';

    // Legacy branch portal URLs → normal section flow
    Route::redirect('/branch', '/sections')->name('branch.portal');
    Route::redirect('/branch/attendance', '/attendance/daily-branch-summary?section=attendance-movement')->name('branch.portal.attendance');
    Route::redirect('/branch/inventory', '/inventory/operations?section=inventory')->name('branch.portal.inventory');

    // Section Landing - Modules (available to all authenticated users)
    Route::get('/sections', function () {
        return Inertia::render('sections/index');
    })->name('sections.index');

    // Human Resources - dedicated dashboard (new design, old data)
    Route::get('/sections/human-resources', [DashboardController::class, 'humanResources'])
        ->name('sections.human-resources');

    // Leave - dedicated dashboard (new design, old data)
    Route::get('/sections/leave', [DashboardController::class, 'leaveSection'])
        ->name('sections.leave');

    // Administration - dedicated dashboard (new design, old data)
    Route::get('/sections/administration', [DashboardController::class, 'administrationSection'])
        ->name('sections.administration');

    // Attendance & Movement - dedicated dashboard (new design, old data)
    Route::get('/sections/attendance-movement', [DashboardController::class, 'attendanceMovementSection'])
        ->name('sections.attendance-movement');

    // Payroll - setup dashboard & master data
    Route::get('/sections/payroll', [DashboardController::class, 'payrollSection'])
        ->name('sections.payroll');

    Route::get('/sections/staff-fund', [DashboardController::class, 'staffFundSection'])
        ->name('sections.staff-fund');

    Route::get('/sections/employee-loan', [DashboardController::class, 'employeeLoanSection'])
        ->name('sections.employee-loan');

    Route::get('/sections/fixed-asset', FixedAssetDashboardController::class)
        ->middleware('permission:fixed-assets.view')
        ->name('sections.fixed-asset');

    Route::get('/sections/inventory', InventoryDashboardController::class)
        ->middleware('permission:inventory.view')
        ->name('sections.inventory');

    // Section Dashboard (Overview) - role-aware (employee vs admin)
    Route::get('/sections/{section}', function (Request $request, string $section) {
        $allowed = [
            'human-resources',
            'attendance-movement',
            'leave',
            'employee-loan',
            'staff-fund',
            'payroll',
            'fixed-asset',
            'inventory',
            'store',
            'recruitment',
            'training',
            'administration',
        ];
        if (! in_array($section, $allowed, true)) {
            abort(404);
        }

        $user = $request->user();
        if ($user instanceof User && ! $user->canAccessSection($section)) {
            abort(403);
        }

        $perm = fn (string $p): bool => $user instanceof User
            && ($user->can($p) || $user->hasPermission($p));

        $isAdminLike = collect([
            'employees.create',
            'employees.edit',
            'employees.admin',
            'attendance.admin',
            'leave-types.create',
            'leave-types.edit',
            'leave-balances.admin',
            'admin.access',
        ])->contains(fn ($p) => $perm($p));

        return Inertia::render('sections/section-dashboard', [
            'sectionId' => $section,
            'mode' => $isAdminLike ? 'admin' : 'employee',
        ]);
    })->name('sections.dashboard');

    // Legacy URL: send everyone to the section picker (module home)
    Route::get('/dashboard', function () {
        return redirect()->route('sections.index');
    })->name('dashboard');

    // ====================
    // EMPLOYEE SELF ATTENDANCE (PWA GEO-FENCE)
    // ====================
    Route::prefix('employee/attendance')->name('employee.attendance.')->group(function () {
        Route::post('/check-in', [SelfAttendanceController::class, 'checkIn'])
            ->name('check-in')
            ->middleware('throttle:10,1');

        Route::post('/check-out', [SelfAttendanceController::class, 'checkOut'])
            ->name('check-out')
            ->middleware('throttle:10,1');
    });

    Route::get('/my-assets', [EmployeeAssetController::class, 'index'])->name('my-assets.index');

    Route::prefix('employee/staff-fund')->name('employee.staff-fund.')->group(function () {
        Route::get('/pf-ledger', [\App\Http\Controllers\Employee\EmployeeStaffFundController::class, 'pfLedger'])->name('pf-ledger');
        Route::get('/gratuity', [\App\Http\Controllers\Employee\EmployeeStaffFundController::class, 'gratuityLedger'])->name('gratuity');
    });

    Route::prefix('employee/payroll')->name('employee.payroll.')->group(function () {
        Route::get('/payslips', [\App\Http\Controllers\Employee\EmployeePayrollController::class, 'payslips'])->name('payslips.index');
        Route::get('/payslips/{payslip}', [\App\Http\Controllers\Employee\EmployeePayrollController::class, 'show'])->name('payslips.show');
    });

    Route::prefix('employee/loan')->name('employee.loan.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Employee\EmployeeLoanController::class, 'index'])->name('index');
        Route::get('/{employee_loan}', [\App\Http\Controllers\Employee\EmployeeLoanController::class, 'show'])->name('show');
        Route::get('/{employee_loan}/ledger', [\App\Http\Controllers\Employee\EmployeeLoanController::class, 'ledger'])->name('ledger');
    });

    // Profile (self-service; requires profile permissions on role)
    Route::prefix('profile')->name('profile.')->middleware(['permission:profile.view'])->group(function () {
        Route::get('/', [ProfileController::class, 'edit'])->name('edit');
        Route::patch('/', [ProfileController::class, 'update'])->name('update')->middleware('permission:profile.edit');
        Route::patch('/password', [ProfileController::class, 'updatePassword'])->name('password.update')->middleware('permission:profile.edit');
    });

    // Notifications - Available to all authenticated users
    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('/unread-count', [NotificationController::class, 'getUnreadCount'])->name('unread-count');
        Route::get('/latest', [NotificationController::class, 'getLatestNotifications'])->name('latest');
        Route::post('/{id}/mark-as-read', [NotificationController::class, 'markAsRead'])->name('mark-as-read');
        Route::post('/mark-all-as-read', [NotificationController::class, 'markAllAsRead'])->name('mark-all-as-read');
    });

    // My Notices - Admin-sent notices that this user has received
    Route::prefix('my-notices')->name('my-notices.')->group(function () {
        Route::get('/', [MyNoticeController::class, 'index'])->name('index');
        Route::post('/mark-all-read', [MyNoticeController::class, 'markAllRead'])->name('mark-all-read');
        Route::get('/{id}', [MyNoticeController::class, 'show'])->name('show');
    });

    // ====================
    // ADMIN MANAGEMENT (Super Admin Only)
    // ====================
    Route::prefix('admin')->name('admin.')->middleware(['permission:users.view'])->group(function () {
        Route::prefix('sessions')->name('sessions.')->group(function () {
            Route::get('/', [ActiveSessionController::class, 'index'])->name('index');
            Route::delete('/{sessionId}', [ActiveSessionController::class, 'destroy'])
                ->name('destroy')
                ->middleware('permission:admin.access');
            Route::delete('/user/{user}', [ActiveSessionController::class, 'destroyUser'])
                ->name('destroy-user')
                ->middleware('permission:admin.access');
        });
    });

    Route::prefix('admin')->name('admin.')->middleware(['permission:admin.access'])->group(function () {

        // Storage helpers for Hostinger / shared hosting (admin auth required).
        //   /admin/utils/storage-link       → Artisan::call('storage:link')
        //   /admin/utils/storage-link-copy  → symlink, then copy fallback
        Route::get('utils/storage-link', function () {
            $link = public_path('storage');
            $target = storage_path('app/public');

            if (is_link($link) || File::exists($link)) {
                return response()->json([
                    'ok' => true,
                    'mode' => 'already',
                    'message' => 'public/storage already exists.',
                    'path' => $link,
                    'is_link' => is_link($link),
                ]);
            }

            try {
                $exitCode = Artisan::call('storage:link');
                $output = trim(Artisan::output());
                $ok = is_link($link) || File::exists($link);

                return response()->json([
                    'ok' => $ok,
                    'mode' => 'artisan',
                    'message' => $ok
                        ? 'Storage link created via Artisan::call(storage:link).'
                        : 'Artisan storage:link ran but public/storage was not created.',
                    'exit_code' => $exitCode,
                    'output' => $output,
                    'link' => $link,
                    'target' => $target,
                    'hint' => $ok ? null : 'Try /admin/utils/storage-link-copy',
                ], $ok ? 200 : 500);
            } catch (\Throwable $e) {
                return response()->json([
                    'ok' => false,
                    'mode' => 'artisan',
                    'message' => 'Artisan::call(storage:link) failed.',
                    'error' => $e->getMessage(),
                    'hint' => 'Try /admin/utils/storage-link-copy',
                ], 500);
            }
        })->middleware(['auth'])->name('utils.storage-link');

        Route::get('utils/storage-link-copy', function () {
            $link = public_path('storage');
            $target = storage_path('app/public');

            if (is_link($link) || File::exists($link)) {
                return response()->json([
                    'ok' => true,
                    'mode' => 'already',
                    'message' => 'public/storage already exists.',
                    'path' => $link,
                    'is_link' => is_link($link),
                ]);
            }

            try {
                if (@symlink($target, $link)) {
                    return response()->json([
                        'ok' => true,
                        'mode' => 'symlink',
                        'message' => 'Storage symlink created.',
                        'link' => $link,
                        'target' => $target,
                    ]);
                }
            } catch (\Throwable $e) {
                // fall through to copy mode
            }

            try {
                File::ensureDirectoryExists($link);
                File::copyDirectory($target, $link);

                return response()->json([
                    'ok' => true,
                    'mode' => 'copy',
                    'message' => 'Symlink not available; copied storage files to public/storage.',
                    'from' => $target,
                    'to' => $link,
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'ok' => false,
                    'mode' => 'copy',
                    'message' => 'Failed to create storage link/copy.',
                    'error' => $e->getMessage(),
                ], 500);
            }
        })->middleware(['auth'])->name('utils.storage-link-copy');

        Route::get('users/bulk-email/form', [UserController::class, 'bulkEmailForm'])->name('users.bulk-email.form');
        Route::post('users/bulk-email/send', [UserController::class, 'sendBulkEmails'])->name('users.bulk-email.send');
        // User Management
        Route::middleware(['permission:users.view'])->prefix('users')->name('users.')->group(function () {
            Route::get('/', [UserController::class, 'index'])->name('index');
            Route::post('/sync-branches', [UserController::class, 'syncBranchesFromPosting'])
                ->name('sync-branches')
                ->middleware('permission:users.edit');
            Route::get('/create', [UserController::class, 'create'])->name('create')->middleware('permission:users.create');
            Route::post('/', [UserController::class, 'store'])->name('store')->middleware('permission:users.create');
            Route::get('/{user}/edit', [UserController::class, 'edit'])->name('edit')->middleware('permission:users.edit');
            Route::put('/{user}', [UserController::class, 'update'])->name('update')->middleware('permission:users.edit');
            Route::patch('/{user}', [UserController::class, 'update'])->middleware('permission:users.edit');
            Route::delete('/{user}', [UserController::class, 'destroy'])->name('destroy')->middleware('permission:users.delete');
            Route::post('/{user}/toggle-status', [UserController::class, 'toggleStatus'])
                ->name('toggle-status')
                ->middleware('permission:users.edit');
        });

        // Role & Permission Management
        Route::middleware(['permission:roles.view'])->prefix('roles')->name('roles.')->group(function () {
            Route::get('/', [RoleController::class, 'index'])->name('index');
            Route::post('/sync-defaults', [RoleController::class, 'syncDefaultRoles'])
                ->name('sync-defaults')
                ->middleware('permission:roles.edit');
            Route::get('/create', [RoleController::class, 'create'])->name('create')->middleware('permission:roles.create');
            Route::post('/', [RoleController::class, 'store'])->name('store')->middleware('permission:roles.create');
            Route::get('/{role}', [RoleController::class, 'show'])->name('show');
            Route::get('/{role}/edit', [RoleController::class, 'edit'])->name('edit')->middleware('permission:roles.edit');
            Route::put('/{role}', [RoleController::class, 'update'])->name('update')->middleware('permission:roles.edit');
            Route::patch('/{role}', [RoleController::class, 'update'])->middleware('permission:roles.edit');
            Route::delete('/{role}', [RoleController::class, 'destroy'])->name('destroy')->middleware('permission:roles.delete');
        });
        Route::get('permissions', [RoleController::class, 'permissions'])
            ->name('permissions.index')
            ->middleware('permission:roles.view');

        Route::get('notices', [AdminNoticeController::class, 'index'])->name('notices.index');
        Route::get('notices/create', [AdminNoticeController::class, 'create'])->name('notices.create');
        Route::post('notices', [AdminNoticeController::class, 'store'])->name('notices.store');
        Route::get('notices/{notice}', [AdminNoticeController::class, 'show'])->name('notices.show');
        Route::delete('notices/{notice}', [AdminNoticeController::class, 'destroy'])->name('notices.destroy');
    });

    // ====================
    // EMPLOYEE MANAGEMENT
    // ====================
    Route::get('employees/lookup', [EmployeeController::class, 'lookup'])
        ->name('employees.lookup');

    Route::get('employees/locations/upazilas', [EmployeeController::class, 'locationsUpazilas'])
        ->name('employees.locations.upazilas');

    Route::get('employees/locations/unions', [EmployeeController::class, 'locationsUnions'])
        ->name('employees.locations.unions');

    Route::get('employees/salary-assignment-preview', [EmployeeController::class, 'salaryAssignmentPreview'])
        ->name('employees.salary-assignment-preview')
        ->middleware('permission:employees.view');

    Route::middleware(['permission:employees.view'])->group(function () {
        Route::get('employees/export.xlsx', [EmployeeController::class, 'exportXlsx'])
            ->name('employees.export');

        Route::resource('employees', EmployeeController::class)->parameters(['employees' => 'employee']);

        Route::patch('employees/{employee}/status', [EmployeeController::class, 'updateStatus'])
            ->name('employees.update-status')
            ->middleware('permission:employees.edit');

        Route::get('employees/pin-suggestion', [EmployeeController::class, 'pinSuggestion'])
            ->name('employees.pin-suggestion')
            ->middleware('permission:employees.create');

        Route::post('employees/villages', [EmployeeController::class, 'storeVillage'])
            ->name('employees.villages.store')
            ->middleware('permission:employees.create');

        Route::post('employees/unions', [EmployeeController::class, 'storeUnion'])
            ->name('employees.unions.store')
            ->middleware('permission:employees.create');

        // Import Wizard
        Route::post('employees/import/preview', [EmployeeController::class, 'importPreview'])
            ->name('employees.import.preview')
            ->middleware('permission:employees.create');
        Route::get('employees/import/review/{importId}', [EmployeeController::class, 'importReview'])
            ->name('employees.import.review')
            ->middleware('permission:employees.create');
        Route::get('employees/import/example.xlsx', [EmployeeController::class, 'downloadImportExample'])
            ->name('employees.import.example')
            ->middleware('permission:employees.view');
        Route::post('employees/import/commit', [EmployeeController::class, 'importCommit'])
            ->name('employees.import.commit')
            ->middleware('permission:employees.create');

        // Organization Chart
        Route::get('organization-chart', [EmployeeController::class, 'organizationChart'])
            ->name('organization.chart');

        // Disciplinary Actions Management
        Route::resource('disciplinary-actions', DisciplinaryActionController::class)
            ->only(['index', 'create', 'store', 'destroy'])
            ->middleware('permission:employees.edit');

        // Blank Employee Form (Printable)
        Route::get('employees-blank-form', [EmployeeController::class, 'blankForm'])
            ->name('employees.blank-form');

        // Employee Documents Management
        Route::prefix('employees/{employee}/documents')->name('employees.documents.')->group(function () {
            Route::get('/', [EmployeeDocumentController::class, 'index'])->name('index');
            Route::get('/create', [EmployeeDocumentController::class, 'create'])
                ->name('create')
                ->middleware('permission:employees.edit');
            Route::post('/', [EmployeeDocumentController::class, 'store'])
                ->name('store')
                ->middleware('permission:employees.edit');
            Route::get('/{document}/edit', [EmployeeDocumentController::class, 'edit'])
                ->name('edit')
                ->middleware('permission:employees.edit');
            Route::put('/{document}', [EmployeeDocumentController::class, 'update'])
                ->name('update')
                ->middleware('permission:employees.edit');
            Route::delete('/{document}', [EmployeeDocumentController::class, 'destroy'])
                ->name('destroy')
                ->middleware('permission:employees.delete');
            Route::get('/{document}/download', [EmployeeDocumentController::class, 'download'])
                ->name('download');
        });

        // Employee Specific Reports
        Route::prefix('employees/{employee}')->name('employees.')->group(function () {
            Route::get('/leaves', [EmployeeLeaveController::class, 'index'])->name('leaves.index');
            Route::get('/movements', [EmployeeMovementController::class, 'index'])->name('movements.index');
            Route::get('/leaves/download', [EmployeeLeaveController::class, 'downloadPdf'])->name('leaves.download');
            Route::get('/movements/download', [EmployeeMovementController::class, 'downloadPdf'])->name('movements.download');
        });
    });

    // Employee Dashboard (HR + organogram line roles): access is enforced in the controller; dropdown is organogram-scoped.
    Route::get('employee/dashboard', [EmployeeDashboardController::class, 'index'])
        ->name('employee.dashboard');
    Route::get('employee/leave/pdf', [EmployeeDashboardController::class, 'downloadLeavePdf'])->name('employee.leave.pdf');
    Route::prefix('employee/dashboard')->name('employee.dashboard.')->group(function () {
        Route::get('/pdf', [EmployeeDashboardController::class, 'downloadPdf'])->name('pdf');
        Route::get('/leave/pdf', [EmployeeDashboardController::class, 'downloadLeavePdf'])->name('leave.pdf');
        Route::get('/attendance/pdf', [EmployeeDashboardController::class, 'downloadAttendancePdf'])->name('attendance.pdf');
        Route::get('/movement/pdf', [EmployeeDashboardController::class, 'downloadMovementPdf'])->name('movement.pdf');
    });

    // ====================
    // ORGANIZATION SETUP
    // ====================

    Route::middleware(['permission:branches.view'])->prefix('organization-structure')->name('organization-structure.')->group(function () {
        Route::get('/', [OrganizationStructureController::class, 'index'])->name('index');
        Route::patch('/branches/{branch}/regional-office', [OrganizationStructureController::class, 'updateBranchRegionalOffice'])
            ->name('branches.regional-office')
            ->middleware('permission:branches.edit');
        Route::patch('/regional-offices/{regionalOffice}/zone', [OrganizationStructureController::class, 'updateRegionalOfficeZone'])
            ->name('regional-offices.zone')
            ->middleware('permission:regional-offices.edit');
    });

    // Branch Management
    Route::middleware(['permission:branches.view'])->prefix('branches')->name('branches.')->group(function () {
        Route::get('/', [BranchController::class, 'index'])->name('index');
        Route::get('/create', [BranchController::class, 'create'])
            ->name('create')
            ->middleware('permission:branches.create');
        Route::post('/', [BranchController::class, 'store'])
            ->name('store')
            ->middleware('permission:branches.create');
        Route::get('/{branch}', [BranchController::class, 'show'])->name('show');
        Route::get('/{branch}/edit', [BranchController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:branches.edit');
        Route::put('/{branch}', [BranchController::class, 'update'])
            ->name('update')
            ->middleware('permission:branches.edit');
        Route::delete('/{branch}', [BranchController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:branches.delete');
    });

    // Zone Management
    Route::middleware(['permission:zones.view'])->prefix('zones')->name('zones.')->group(function () {
        Route::get('/', [ZoneController::class, 'index'])->name('index');
        Route::get('/create', [ZoneController::class, 'create'])
            ->name('create')
            ->middleware('permission:zones.create');
        Route::post('/', [ZoneController::class, 'store'])
            ->name('store')
            ->middleware('permission:zones.create');
        Route::get('/{zone}/edit', [ZoneController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:zones.edit');
        Route::put('/{zone}', [ZoneController::class, 'update'])
            ->name('update')
            ->middleware('permission:zones.edit');
        Route::delete('/{zone}', [ZoneController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:zones.delete');
    });

    // Regional Office Management
    Route::middleware(['permission:regional-offices.view'])->prefix('regional-offices')->name('regional-offices.')->group(function () {
        Route::get('/', [RegionalOfficeController::class, 'index'])->name('index');
        Route::get('/create', [RegionalOfficeController::class, 'create'])
            ->name('create')
            ->middleware('permission:regional-offices.create');
        Route::post('/', [RegionalOfficeController::class, 'store'])
            ->name('store')
            ->middleware('permission:regional-offices.create');
        Route::get('/{regionalOffice}/edit', [RegionalOfficeController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:regional-offices.edit');
        Route::put('/{regionalOffice}', [RegionalOfficeController::class, 'update'])
            ->name('update')
            ->middleware('permission:regional-offices.edit');
        Route::delete('/{regionalOffice}', [RegionalOfficeController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:regional-offices.delete');
    });

    // Department Management
    Route::middleware(['permission:departments.view'])->prefix('departments')->name('departments.')->group(function () {
        Route::get('/', [DepartmentController::class, 'index'])->name('index');
        Route::get('/create', [DepartmentController::class, 'create'])
            ->name('create')
            ->middleware('permission:departments.create');
        Route::post('/', [DepartmentController::class, 'store'])
            ->name('store')
            ->middleware('permission:departments.create');
        Route::get('/{department}', [DepartmentController::class, 'show'])->name('show');
        Route::get('/{department}/edit', [DepartmentController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:departments.edit');
        Route::put('/{department}', [DepartmentController::class, 'update'])
            ->name('update')
            ->middleware('permission:departments.edit');
        Route::delete('/{department}', [DepartmentController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:departments.delete');
    });

    // Designation Management
    Route::middleware(['permission:designations.view'])->prefix('designations')->name('designations.')->group(function () {
        Route::get('/', [DesignationController::class, 'index'])->name('index');
        Route::get('/create', [DesignationController::class, 'create'])
            ->name('create')
            ->middleware('permission:designations.create');
        Route::post('/', [DesignationController::class, 'store'])
            ->name('store')
            ->middleware('permission:designations.create');
        Route::get('/{designation}', [DesignationController::class, 'show'])->name('show');
        Route::get('/{designation}/edit', [DesignationController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:designations.edit');
        Route::put('/{designation}', [DesignationController::class, 'update'])
            ->name('update')
            ->middleware('permission:designations.edit');
        Route::delete('/{designation}', [DesignationController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:designations.delete');
    });

    // Employee types, programs & projects (employee form lookups; list like departments, edits aligned with employee create/edit)
    Route::middleware(['permission:departments.view'])->prefix('employee-types')->name('employee-types.')->group(function () {
        Route::get('/', [EmployeeTypeController::class, 'index'])->name('index');
        Route::get('/create', [EmployeeTypeController::class, 'create'])
            ->name('create')
            ->middleware('permission:employees.create');
        Route::post('/', [EmployeeTypeController::class, 'store'])
            ->name('store')
            ->middleware('permission:employees.create');
        Route::get('/{employee_type}/edit', [EmployeeTypeController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:employees.edit');
        Route::put('/{employee_type}', [EmployeeTypeController::class, 'update'])
            ->name('update')
            ->middleware('permission:employees.edit');
        Route::delete('/{employee_type}', [EmployeeTypeController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:employees.delete');
    });

    Route::middleware(['permission:departments.view'])->prefix('programs')->name('programs.')->group(function () {
        Route::get('/', [ProgramController::class, 'index'])->name('index');
        Route::get('/create', [ProgramController::class, 'create'])
            ->name('create')
            ->middleware('permission:employees.create');
        Route::post('/', [ProgramController::class, 'store'])
            ->name('store')
            ->middleware('permission:employees.create');
        Route::get('/{program}/edit', [ProgramController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:employees.edit');
        Route::put('/{program}', [ProgramController::class, 'update'])
            ->name('update')
            ->middleware('permission:employees.edit');
        Route::delete('/{program}', [ProgramController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:employees.delete');
    });

    Route::middleware(['permission:departments.view'])->prefix('projects')->name('projects.')->group(function () {
        Route::get('/', [ProjectController::class, 'index'])->name('index');
        Route::get('/create', [ProjectController::class, 'create'])
            ->name('create')
            ->middleware('permission:employees.create');
        Route::post('/', [ProjectController::class, 'store'])
            ->name('store')
            ->middleware('permission:employees.create');
        Route::get('/{project}/edit', [ProjectController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:employees.edit');
        Route::put('/{project}', [ProjectController::class, 'update'])
            ->name('update')
            ->middleware('permission:employees.edit');
        Route::delete('/{project}', [ProjectController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:employees.delete');
    });

    // ====================
    // PAYROLL SETUP (master data)
    // ====================
    Route::middleware(['permission:payroll.view'])->group(function () {
        Route::prefix('payscales')->name('payscales.')->group(function () {
            Route::get('/', [PayscaleController::class, 'index'])->name('index');
            Route::get('/create', [PayscaleController::class, 'create'])->name('create')->middleware('permission:payroll.create');
            Route::post('/', [PayscaleController::class, 'store'])->name('store')->middleware('permission:payroll.create');
            Route::get('/{payscale}/edit', [PayscaleController::class, 'edit'])->name('edit')->middleware('permission:payroll.edit');
            Route::put('/{payscale}', [PayscaleController::class, 'update'])->name('update')->middleware('permission:payroll.edit');
            Route::patch('/{payscale}/status', [PayscaleController::class, 'updateStatus'])
                ->name('update-status')
                ->middleware('permission:payroll.edit');
            Route::delete('/{payscale}', [PayscaleController::class, 'destroy'])->name('destroy')->middleware('permission:payroll.delete');
        });

        Route::prefix('salary-grades')->name('salary-grades.')->group(function () {
            Route::get('/', [SalaryGradeController::class, 'index'])->name('index');
            Route::get('/create', [SalaryGradeController::class, 'create'])->name('create')->middleware('permission:payroll.create');
            Route::post('/', [SalaryGradeController::class, 'store'])->name('store')->middleware('permission:payroll.create');
            Route::get('/{salary_grade}/edit', [SalaryGradeController::class, 'edit'])->name('edit')->middleware('permission:payroll.edit');
            Route::put('/{salary_grade}', [SalaryGradeController::class, 'update'])->name('update')->middleware('permission:payroll.edit');
            Route::delete('/{salary_grade}', [SalaryGradeController::class, 'destroy'])->name('destroy')->middleware('permission:payroll.delete');
        });

        Route::prefix('salary-steps')->name('salary-steps.')->group(function () {
            Route::get('/', [SalaryStepController::class, 'index'])->name('index');
            Route::get('/create', [SalaryStepController::class, 'create'])->name('create')->middleware('permission:payroll.create');
            Route::post('/', [SalaryStepController::class, 'store'])->name('store')->middleware('permission:payroll.create');
            Route::get('/{salary_step}/edit', [SalaryStepController::class, 'edit'])->name('edit')->middleware('permission:payroll.edit');
            Route::put('/{salary_step}', [SalaryStepController::class, 'update'])->name('update')->middleware('permission:payroll.edit');
            Route::delete('/{salary_step}', [SalaryStepController::class, 'destroy'])->name('destroy')->middleware('permission:payroll.delete');
        });

        Route::prefix('salary-heads')->name('salary-heads.')->group(function () {
            Route::get('/', [SalaryHeadController::class, 'index'])->name('index');
            Route::get('/create', [SalaryHeadController::class, 'create'])->name('create')->middleware('permission:payroll.create');
            Route::post('/', [SalaryHeadController::class, 'store'])->name('store')->middleware('permission:payroll.create');
            Route::post('/custom-overrides/reset-all', [SalaryHeadController::class, 'resetAllCustomOverrides'])->name('custom-overrides.reset-all')->middleware('permission:payroll.edit');
            Route::post('/custom-overrides/reset-selected', [SalaryHeadController::class, 'resetSelectedCustomOverrides'])->name('custom-overrides.reset-selected')->middleware('permission:payroll.edit');
            Route::post('/custom-overrides/{employee}/reset', [SalaryHeadController::class, 'resetCustomOverride'])->name('custom-overrides.reset')->middleware('permission:payroll.edit');
            Route::get('/{salary_head}/edit', [SalaryHeadController::class, 'edit'])->name('edit')->middleware('permission:payroll.edit');
            Route::put('/{salary_head}', [SalaryHeadController::class, 'update'])->name('update')->middleware('permission:payroll.edit');
            Route::delete('/{salary_head}', [SalaryHeadController::class, 'destroy'])->name('destroy')->middleware('permission:payroll.delete');
        });

        Route::prefix('salary-structures')->name('salary-structures.')->group(function () {
            Route::get('/', [SalaryStructureController::class, 'index'])->name('index');
            Route::get('/manual', [SalaryStructureController::class, 'manual'])->name('manual');
            Route::post('/manual', [SalaryStructureController::class, 'saveManual'])->name('manual.save')->middleware('permission:payroll.edit');
            Route::delete('/{salary_structure}', [SalaryStructureController::class, 'destroy'])->name('destroy')->middleware('permission:payroll.delete');
        });

        Route::prefix('branch-payroll-banks')->name('branch-payroll-banks.')->group(function () {
            Route::get('/', [BranchPayrollBankController::class, 'index'])->name('index');
            Route::get('/create', [BranchPayrollBankController::class, 'create'])->name('create')->middleware('permission:payroll.create');
            Route::post('/', [BranchPayrollBankController::class, 'store'])->name('store')->middleware('permission:payroll.create');
            Route::get('/{branch_payroll_bank}/edit', [BranchPayrollBankController::class, 'edit'])->name('edit')->middleware('permission:payroll.edit');
            Route::put('/{branch_payroll_bank}', [BranchPayrollBankController::class, 'update'])->name('update')->middleware('permission:payroll.edit');
            Route::delete('/{branch_payroll_bank}', [BranchPayrollBankController::class, 'destroy'])->name('destroy')->middleware('permission:payroll.delete');
        });

        Route::prefix('bonus-types')->name('bonus-types.')->group(function () {
            Route::get('/', [BonusTypeController::class, 'index'])->name('index');
            Route::get('/create', [BonusTypeController::class, 'create'])->name('create')->middleware('permission:payroll.create');
            Route::post('/', [BonusTypeController::class, 'store'])->name('store')->middleware('permission:payroll.create');
            Route::get('/{bonus_type}/edit', [BonusTypeController::class, 'edit'])->name('edit')->middleware('permission:payroll.edit');
            Route::put('/{bonus_type}', [BonusTypeController::class, 'update'])->name('update')->middleware('permission:payroll.edit');
            Route::delete('/{bonus_type}', [BonusTypeController::class, 'destroy'])->name('destroy')->middleware('permission:payroll.delete');
        });

        Route::prefix('bonus-configurations')->name('bonus-configurations.')->group(function () {
            Route::get('/', [BonusConfigurationController::class, 'index'])->name('index');
            Route::get('/create', [BonusConfigurationController::class, 'create'])->name('create')->middleware('permission:payroll.create');
            Route::post('/', [BonusConfigurationController::class, 'store'])->name('store')->middleware('permission:payroll.create');
            Route::get('/{bonus_configuration}/edit', [BonusConfigurationController::class, 'edit'])->name('edit')->middleware('permission:payroll.edit');
            Route::put('/{bonus_configuration}', [BonusConfigurationController::class, 'update'])->name('update')->middleware('permission:payroll.edit');
            Route::delete('/{bonus_configuration}', [BonusConfigurationController::class, 'destroy'])->name('destroy')->middleware('permission:payroll.delete');
        });

        Route::get('/bonus-calculation', [BonusCalculationController::class, 'index'])->name('bonus-calculation.index');
        Route::post('/bonus-calculation', [BonusCalculationController::class, 'process'])->name('bonus-calculation.process')->middleware('permission:payroll.edit');

        Route::get('/bonus-post', [BonusPostController::class, 'index'])->name('bonus-post.index');
        Route::get('/bonus-post/period/{year}/{month}', [BonusPostController::class, 'period'])->name('bonus-post.period')->where(['year' => '[0-9]+', 'month' => '[0-9]+']);
        Route::post('/bonus-post/period/{year}/{month}/finalize', [BonusPostController::class, 'postPeriod'])->name('bonus-post.period.finalize')->where(['year' => '[0-9]+', 'month' => '[0-9]+'])->middleware('permission:payroll.edit');
        Route::post('/bonus-post/period/{year}/{month}/cancel', [BonusPostController::class, 'cancelPeriod'])->name('bonus-post.period.cancel')->where(['year' => '[0-9]+', 'month' => '[0-9]+'])->middleware('permission:payroll.edit');
        Route::get('/bonus-post/{payroll_run}', [BonusPostController::class, 'show'])->name('bonus-post.show');
        Route::put('/bonus-post/{payroll_run}/payslips', [BonusPostController::class, 'updatePayslips'])->name('bonus-post.update-payslips')->middleware('permission:payroll.edit');
        Route::post('/bonus-post/{payroll_run}/cancel', [BonusPostController::class, 'cancel'])->name('bonus-post.cancel')->middleware('permission:payroll.edit');
        Route::post('/bonus-post/{payroll_run}', [BonusPostController::class, 'post'])->name('bonus-post.post')->middleware('permission:payroll.edit');

        Route::get('/salary-head-modifications', [\App\Http\Controllers\Payroll\SalaryHeadModificationController::class, 'index'])->name('salary-head-modifications.index');
        Route::post('/salary-head-modifications', [\App\Http\Controllers\Payroll\SalaryHeadModificationController::class, 'store'])->name('salary-head-modifications.store')->middleware('permission:payroll.edit');

        Route::get('/probation-salary', [\App\Http\Controllers\Payroll\ProbationSalaryController::class, 'index'])->name('probation-salary.index');
        Route::post('/probation-salary/rules', [\App\Http\Controllers\Payroll\ProbationSalaryController::class, 'storeRules'])->name('probation-salary.rules.store')->middleware('permission:payroll.edit');
        Route::post('/probation-salary/employee', [\App\Http\Controllers\Payroll\ProbationSalaryController::class, 'storeEmployee'])->name('probation-salary.employee.store')->middleware('permission:payroll.edit');

        Route::get('/fixed-salary', [\App\Http\Controllers\Payroll\FixedSalaryController::class, 'index'])->name('fixed-salary.index');
        Route::post('/fixed-salary/employee', [\App\Http\Controllers\Payroll\FixedSalaryController::class, 'storeEmployee'])->name('fixed-salary.employee.store')->middleware('permission:payroll.edit');

        Route::get('/salary-withheld', [\App\Http\Controllers\Payroll\SalaryWithheldController::class, 'index'])->name('salary-withheld.index');
        Route::post('/salary-withheld', [\App\Http\Controllers\Payroll\SalaryWithheldController::class, 'store'])->name('salary-withheld.store')->middleware('permission:payroll.edit');
        Route::delete('/salary-withheld/{salary_withheld}', [\App\Http\Controllers\Payroll\SalaryWithheldController::class, 'destroy'])->name('salary-withheld.destroy')->middleware('permission:payroll.delete');

        Route::get('/salary-process', [\App\Http\Controllers\Payroll\SalaryProcessController::class, 'index'])->name('salary-process.index');
        Route::post('/salary-process', [\App\Http\Controllers\Payroll\SalaryProcessController::class, 'process'])->name('salary-process.process')->middleware('permission:payroll.edit');

        Route::get('/salary-post', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'index'])->name('salary-post.index');
        Route::get('/salary-post/period/{year}/{month}', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'period'])->name('salary-post.period')->where(['year' => '[0-9]+', 'month' => '[0-9]+']);
        Route::post('/salary-post/period/{year}/{month}/finalize', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'postPeriod'])->name('salary-post.period.finalize')->where(['year' => '[0-9]+', 'month' => '[0-9]+'])->middleware('permission:payroll.edit');
        Route::post('/salary-post/period/{year}/{month}/cancel', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'cancelPeriod'])->name('salary-post.period.cancel')->where(['year' => '[0-9]+', 'month' => '[0-9]+'])->middleware('permission:payroll.edit');
        Route::get('/salary-post/{payroll_run}', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'show'])->name('salary-post.show');
        Route::put('/salary-post/{payroll_run}/payslips', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'updatePayslips'])->name('salary-post.update-payslips')->middleware('permission:payroll.edit');
        Route::post('/salary-post/{payroll_run}/recall', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'recall'])->name('salary-post.recall')->middleware('permission:payroll.edit');
        Route::post('/salary-post/{payroll_run}/cancel', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'cancel'])->name('salary-post.cancel')->middleware('permission:payroll.edit');
        Route::post('/salary-post/{payroll_run}', [\App\Http\Controllers\Payroll\SalaryPostController::class, 'post'])->name('salary-post.post')->middleware('permission:payroll.edit');

        Route::get('/salary-rollback', [\App\Http\Controllers\Payroll\SalaryRollbackController::class, 'index'])->name('salary-rollback.index');
        Route::post('/salary-rollback', [\App\Http\Controllers\Payroll\SalaryRollbackController::class, 'rollback'])->name('salary-rollback.rollback')->middleware('permission:payroll.edit');
    });

    // ====================
    // EMPLOYEE LOAN
    // ====================
    Route::middleware(['permission:employee-loan.view'])->group(function () {
        Route::prefix('loan-committees')->name('loan-committees.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanCommitteeController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\EmployeeLoan\LoanCommitteeController::class, 'create'])->name('create')->middleware('permission:employee-loan.create');
            Route::post('/', [\App\Http\Controllers\EmployeeLoan\LoanCommitteeController::class, 'store'])->name('store')->middleware('permission:employee-loan.create');
            Route::get('/{loan_committee}/edit', [\App\Http\Controllers\EmployeeLoan\LoanCommitteeController::class, 'edit'])->name('edit')->middleware('permission:employee-loan.edit');
            Route::put('/{loan_committee}', [\App\Http\Controllers\EmployeeLoan\LoanCommitteeController::class, 'update'])->name('update')->middleware('permission:employee-loan.edit');
            Route::delete('/{loan_committee}', [\App\Http\Controllers\EmployeeLoan\LoanCommitteeController::class, 'destroy'])->name('destroy')->middleware('permission:employee-loan.delete');
        });

        Route::prefix('loan-applications')->name('loan-applications.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanApplicationController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\EmployeeLoan\LoanApplicationController::class, 'create'])->name('create')->middleware('permission:employee-loan.create');
            Route::post('/', [\App\Http\Controllers\EmployeeLoan\LoanApplicationController::class, 'store'])->name('store')->middleware('permission:employee-loan.create');
            Route::get('/employee-preview/{employee}', [\App\Http\Controllers\EmployeeLoan\LoanApplicationController::class, 'employeePreview'])->name('employee-preview');
            Route::post('/calculate-preview', [\App\Http\Controllers\EmployeeLoan\LoanApplicationController::class, 'calculatePreview'])->name('calculate-preview');
            Route::get('/{loan_application}', [\App\Http\Controllers\EmployeeLoan\LoanApplicationController::class, 'show'])->name('show');
            Route::get('/{loan_application}/edit', [\App\Http\Controllers\EmployeeLoan\LoanApplicationController::class, 'edit'])->name('edit')->middleware('permission:employee-loan.edit');
            Route::put('/{loan_application}', [\App\Http\Controllers\EmployeeLoan\LoanApplicationController::class, 'update'])->name('update')->middleware('permission:employee-loan.edit');
        });

        Route::prefix('loan-approval')->name('loan-approval.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanApprovalController::class, 'index'])->name('index');
            Route::post('/{loan_application}/approve', [\App\Http\Controllers\EmployeeLoan\LoanApprovalController::class, 'approve'])->name('approve')->middleware('permission:employee-loan.edit');
            Route::post('/{loan_application}/reject', [\App\Http\Controllers\EmployeeLoan\LoanApprovalController::class, 'reject'])->name('reject')->middleware('permission:employee-loan.edit');
        });

        Route::prefix('loan-disburse')->name('loan-disburse.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanDisburseController::class, 'index'])->name('index');
            Route::post('/{loan_application}', [\App\Http\Controllers\EmployeeLoan\LoanDisburseController::class, 'disburse'])->name('disburse')->middleware('permission:employee-loan.create');
        });

        Route::prefix('loan-rollback')->name('loan-rollback.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanRollbackController::class, 'index'])->name('index');
            Route::post('/loans', [\App\Http\Controllers\EmployeeLoan\LoanRollbackController::class, 'rollbackLoans'])->name('loans')->middleware('permission:employee-loan.edit');
            Route::post('/migrations/{loan_migration}', [\App\Http\Controllers\EmployeeLoan\LoanRollbackController::class, 'rollbackMigration'])->name('migrations')->middleware('permission:employee-loan.edit');
        });

        Route::prefix('employee-loan/reports')->name('employee-loan.reports.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanReportController::class, 'index'])->name('index');
            Route::get('/{report}', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanReportController::class, 'show'])->name('show');
            Route::get('/{report}/print', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanReportController::class, 'print'])->name('print');
            Route::middleware(['permission:reports.export'])->group(function () {
                Route::get('/{report}/pdf', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanReportController::class, 'pdf'])->name('pdf');
                Route::get('/{report}/excel', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanReportController::class, 'excel'])->name('excel');
            });
        });

        Route::prefix('loan-transfer')->name('loan-transfer.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanTransferController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\EmployeeLoan\LoanTransferController::class, 'create'])->name('create')->middleware('permission:employee-loan.edit');
            Route::post('/', [\App\Http\Controllers\EmployeeLoan\LoanTransferController::class, 'store'])->name('store')->middleware('permission:employee-loan.edit');
            Route::get('/{loan_transfer}', [\App\Http\Controllers\EmployeeLoan\LoanTransferController::class, 'show'])->name('show');
        });

        Route::prefix('loan-collection')->name('loan-collection.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'index'])->name('index');
            Route::get('/single', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'createSingle'])->name('single.create')->middleware('permission:employee-loan.edit');
            Route::post('/single', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'storeSingle'])->name('single.store')->middleware('permission:employee-loan.edit');
            Route::get('/batch', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'createBatch'])->name('batch.create')->middleware('permission:employee-loan.edit');
            Route::post('/batch', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'storeBatch'])->name('batch.store')->middleware('permission:employee-loan.edit');
            Route::get('/advance', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'createAdvance'])->name('advance.create')->middleware('permission:employee-loan.edit');
            Route::post('/advance', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'storeAdvance'])->name('advance.store')->middleware('permission:employee-loan.edit');
            Route::get('/waive', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'createWaive'])->name('waive.create')->middleware('permission:employee-loan.edit');
            Route::post('/waive', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'storeWaive'])->name('waive.store')->middleware('permission:employee-loan.edit');
            Route::get('/rebate', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'createRebate'])->name('rebate.create')->middleware('permission:employee-loan.edit');
            Route::post('/rebate/preview', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'rebatePreview'])->name('rebate.preview')->middleware('permission:employee-loan.edit');
            Route::post('/rebate', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'storeRebate'])->name('rebate.store')->middleware('permission:employee-loan.edit');
            Route::get('/rollback', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'rollbackIndex'])->name('rollback.index')->middleware('permission:employee-loan.edit');
            Route::post('/{loan_collection}/rollback', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'rollback'])->name('rollback')->middleware('permission:employee-loan.edit');
            Route::get('/{loan_collection}', [\App\Http\Controllers\EmployeeLoan\LoanCollectionController::class, 'show'])->name('show');
        });

        Route::prefix('loan-migration')->name('loan-migration.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanMigrationController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\EmployeeLoan\LoanMigrationController::class, 'create'])->name('create')->middleware('permission:employee-loan.create');
            Route::post('/calculate-preview', [\App\Http\Controllers\EmployeeLoan\LoanMigrationController::class, 'calculatePreview'])->name('calculate-preview');
            Route::post('/', [\App\Http\Controllers\EmployeeLoan\LoanMigrationController::class, 'store'])->name('store')->middleware('permission:employee-loan.create');
            Route::get('/{loan_migration}', [\App\Http\Controllers\EmployeeLoan\LoanMigrationController::class, 'show'])->name('show');
            Route::put('/{loan_migration}', [\App\Http\Controllers\EmployeeLoan\LoanMigrationController::class, 'update'])->name('update')->middleware('permission:employee-loan.edit');
            Route::put('/items/{loan_migration_item}', [\App\Http\Controllers\EmployeeLoan\LoanMigrationController::class, 'updateItem'])->name('items.update')->middleware('permission:employee-loan.edit');
            Route::post('/items/{loan_migration_item}/recalculate', [\App\Http\Controllers\EmployeeLoan\LoanMigrationController::class, 'recalculateItem'])->name('items.recalculate')->middleware('permission:employee-loan.edit');
        });

        Route::prefix('loan-policies')->name('loan-policies.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\LoanPolicyController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\EmployeeLoan\LoanPolicyController::class, 'create'])->name('create')->middleware('permission:employee-loan.create');
            Route::post('/', [\App\Http\Controllers\EmployeeLoan\LoanPolicyController::class, 'store'])->name('store')->middleware('permission:employee-loan.create');
            Route::get('/{loan_policy}/edit', [\App\Http\Controllers\EmployeeLoan\LoanPolicyController::class, 'edit'])->name('edit')->middleware('permission:employee-loan.edit');
            Route::put('/{loan_policy}', [\App\Http\Controllers\EmployeeLoan\LoanPolicyController::class, 'update'])->name('update')->middleware('permission:employee-loan.edit');
            Route::delete('/{loan_policy}', [\App\Http\Controllers\EmployeeLoan\LoanPolicyController::class, 'destroy'])->name('destroy')->middleware('permission:employee-loan.delete');
        });

        Route::prefix('employee-loans')->name('employee-loans.')->group(function () {
            Route::get('/', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'index'])->name('index');
            Route::get('/ledger-lookup', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'ledgerLookup'])->name('ledger-lookup');
            Route::get('/create', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'create'])->name('create')->middleware('permission:employee-loan.create');
            Route::post('/', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'store'])->name('store')->middleware('permission:employee-loan.create');
            Route::get('/{employee_loan}', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'show'])->name('show');
            Route::get('/{employee_loan}/ledger', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'ledger'])->name('ledger');
            Route::put('/{employee_loan}/ledger-terms', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'updateLedgerTerms'])->name('ledger-terms.update')->middleware('permission:employee-loan.edit');
            Route::post('/{employee_loan}/ledger-terms/recalculate', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'recalculateLedgerTerms'])->name('ledger-terms.recalculate')->middleware('permission:employee-loan.edit');
            Route::post('/{employee_loan}/full-paid/preview', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'fullPaidPreview'])->name('full-paid.preview')->middleware('permission:employee-loan.edit');
            Route::post('/{employee_loan}/full-paid', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'storeFullPaidWithRebate'])->name('full-paid.store')->middleware('permission:employee-loan.edit');
            Route::put('/transactions/{transaction}', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'updateTransaction'])->name('transactions.update')->middleware('permission:employee-loan.edit');
            Route::delete('/transactions/{transaction}', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'destroyTransaction'])->name('transactions.destroy')->middleware('permission:employee-loan.edit');
            Route::post('/{employee_loan}/cancel', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'cancel'])->name('cancel')->middleware('permission:employee-loan.edit');
        });
    });

    // ====================
    // STAFF FUND (PF & Gratuity)
    // ====================
    Route::middleware(['permission:staff-fund.view'])->group(function () {
        Route::prefix('provident-fund')->name('provident-fund.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'index'])->name('index');
            Route::get('/summary', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'summary'])->name('summary');
            Route::prefix('reports')->name('reports.')->group(function () {
                Route::get('/', [\App\Http\Controllers\Payroll\PfReportController::class, 'index'])->name('index');
                Route::get('/{report}', [\App\Http\Controllers\Payroll\PfReportController::class, 'show'])->name('show');
                Route::get('/{report}/print', [\App\Http\Controllers\Payroll\PfReportController::class, 'print'])->name('print');
                Route::middleware(['permission:reports.export'])->group(function () {
                    Route::get('/{report}/pdf', [\App\Http\Controllers\Payroll\PfReportController::class, 'pdf'])->name('pdf');
                    Route::get('/{report}/excel', [\App\Http\Controllers\Payroll\PfReportController::class, 'excel'])->name('excel');
                });
            });
            Route::get('/interest', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'interestIndex'])->name('interest.index');
            Route::post('/interest/preview', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'interestPreview'])->name('interest.preview')->middleware('permission:staff-fund.edit');
            Route::post('/interest', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'interestStore'])->name('interest.store')->middleware('permission:staff-fund.edit');
            Route::post('/interest/{interest_run}/rollback', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'interestRollback'])->name('interest.rollback')->middleware('permission:staff-fund.edit');
            Route::get('/withdrawals', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'withdrawalsIndex'])->name('withdrawals.index');
            Route::post('/withdrawals', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'storeWithdrawal'])->name('withdrawals.store')->middleware('permission:staff-fund.edit');
            Route::get('/{employee}/ledger', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'ledger'])->name('ledger');
            Route::post('/opening-balance', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'storeOpening'])->name('opening.store')->middleware('permission:staff-fund.edit');
            Route::post('/manual', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'storeManual'])->name('manual.store')->middleware('permission:staff-fund.edit');
            Route::put('/transactions/{transaction}', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'updateTransaction'])->name('transactions.update')->middleware('permission:staff-fund.edit');
            Route::delete('/transactions/{transaction}', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'destroyTransaction'])->name('transactions.destroy')->middleware('permission:staff-fund.edit');
        });

        Route::prefix('gratuity')->name('gratuity.')->group(function () {
            Route::prefix('reports')->name('reports.')->group(function () {
                Route::get('/', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'index'])->name('index');
                Route::get('/{report}', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'show'])->name('show');
                Route::get('/{report}/print', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'print'])->name('print');
                Route::middleware(['permission:reports.export'])->group(function () {
                    Route::get('/{report}/pdf', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'pdf'])->name('pdf');
                    Route::get('/{report}/excel', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'excel'])->name('excel');
                });
            });
            Route::get('/', [\App\Http\Controllers\Payroll\GratuityController::class, 'index'])->name('index');
            Route::get('/rules', [\App\Http\Controllers\Payroll\GratuityController::class, 'rules'])->name('rules');
            Route::get('/payments', [\App\Http\Controllers\Payroll\GratuityController::class, 'payments'])->name('payments');
            Route::get('/{employee}', [\App\Http\Controllers\Payroll\GratuityController::class, 'show'])->name('show');
            Route::post('/{employee}/payments', [\App\Http\Controllers\Payroll\GratuityController::class, 'storePayment'])->name('payments.store')->middleware('permission:staff-fund.edit');
        });

        Route::get('/final-payments', [\App\Http\Controllers\Payroll\FinalPaymentController::class, 'index'])->name('final-payments.index');
        Route::get('/final-payments/employees/lookup', [\App\Http\Controllers\Payroll\FinalPaymentController::class, 'inactiveEmployeeLookup'])->name('final-payments.employees.lookup');
        Route::post('/final-payments/generate', [\App\Http\Controllers\Payroll\FinalPaymentController::class, 'generate'])->name('final-payments.generate')->middleware('permission:staff-fund.edit');
        Route::get('/final-payments/{final_payment}', [\App\Http\Controllers\Payroll\FinalPaymentController::class, 'show'])->name('final-payments.show');
        Route::post('/final-payments/{final_payment}/refresh', [\App\Http\Controllers\Payroll\FinalPaymentController::class, 'refresh'])->name('final-payments.refresh')->middleware('permission:staff-fund.edit');
        Route::post('/final-payments/{final_payment}/mark-paid', [\App\Http\Controllers\Payroll\FinalPaymentController::class, 'markPaid'])->name('final-payments.mark-paid')->middleware('permission:staff-fund.edit');
    });

    Route::middleware(['permission:payroll.view'])->group(function () {
        Route::prefix('payroll/reports')->name('payroll.reports.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Payroll\PayrollReportController::class, 'index'])->name('index');
            Route::get('/{report}', [\App\Http\Controllers\Payroll\PayrollReportController::class, 'show'])->name('show');
            Route::get('/{report}/print', [\App\Http\Controllers\Payroll\PayrollReportController::class, 'print'])->name('print');
            Route::middleware(['permission:reports.export'])->group(function () {
                Route::get('/{report}/pdf', [\App\Http\Controllers\Payroll\PayrollReportController::class, 'pdf'])->name('pdf');
                Route::get('/{report}/excel', [\App\Http\Controllers\Payroll\PayrollReportController::class, 'excel'])->name('excel');
            });
        });
    });

    // ====================
    // FIXED ASSET
    // ====================
    Route::middleware(['permission:fixed-assets.view'])->group(function () {
        Route::redirect('/asset-categories', '/fixed-asset/settings/categories');
        Route::redirect('/asset-categories/create', '/fixed-asset/settings/categories/create');

        Route::prefix('fixed-asset/settings')->name('fixed-asset.settings.')->group(function () {
            Route::prefix('financial-years')->name('financial-years.')->group(function () {
                Route::get('/', [AssetFinancialYearController::class, 'index'])->name('index');
                Route::get('/create', [AssetFinancialYearController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetFinancialYearController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{financial_year}/edit', [AssetFinancialYearController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{financial_year}', [AssetFinancialYearController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{financial_year}', [AssetFinancialYearController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
                Route::post('/{financial_year}/activate', [AssetFinancialYearController::class, 'activate'])->name('activate')->middleware('permission:fixed-assets.edit');
            });

            Route::prefix('vendors')->name('vendors.')->group(function () {
                Route::get('/', [AssetVendorController::class, 'index'])->name('index');
                Route::get('/create', [AssetVendorController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetVendorController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{vendor}/edit', [AssetVendorController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{vendor}', [AssetVendorController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{vendor}', [AssetVendorController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('categories')->name('categories.')->group(function () {
                Route::get('/', [AssetCategoryController::class, 'index'])->name('index');
                Route::get('/create', [AssetCategoryController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetCategoryController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{asset_category}/edit', [AssetCategoryController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{asset_category}', [AssetCategoryController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{asset_category}', [AssetCategoryController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('sub-categories')->name('sub-categories.')->group(function () {
                Route::get('/', [AssetSubCategoryController::class, 'index'])->name('index');
                Route::get('/create', [AssetSubCategoryController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetSubCategoryController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{sub_category}/edit', [AssetSubCategoryController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{sub_category}', [AssetSubCategoryController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{sub_category}', [AssetSubCategoryController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });
        });

        Route::prefix('fixed-asset/custodian')->name('fixed-asset.custodian.')->group(function () {
            Route::prefix('departments')->name('departments.')->group(function () {
                Route::get('/', [AssetCustodianDepartmentController::class, 'index'])->name('index');
                Route::get('/create', [AssetCustodianDepartmentController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetCustodianDepartmentController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{department}/edit', [AssetCustodianDepartmentController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{department}', [AssetCustodianDepartmentController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{department}', [AssetCustodianDepartmentController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('designations')->name('designations.')->group(function () {
                Route::get('/', [AssetCustodianDesignationController::class, 'index'])->name('index');
                Route::get('/create', [AssetCustodianDesignationController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetCustodianDesignationController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{designation}/edit', [AssetCustodianDesignationController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{designation}', [AssetCustodianDesignationController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{designation}', [AssetCustodianDesignationController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('custodians')->name('custodians.')->group(function () {
                Route::get('/', [AssetCustodianController::class, 'index'])->name('index');
                Route::get('/employees', [AssetCustodianController::class, 'employees'])->name('employees');
                Route::get('/create', [AssetCustodianController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetCustodianController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{custodian}/edit', [AssetCustodianController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{custodian}', [AssetCustodianController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{custodian}', [AssetCustodianController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('changes')->name('changes.')->group(function () {
                Route::get('/', [AssetCustodianChangeController::class, 'index'])->name('index');
                Route::get('/create', [AssetCustodianChangeController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
                Route::post('/', [AssetCustodianChangeController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
            });
        });

        Route::prefix('fixed-asset/purchases')->name('fixed-asset.purchases.')->group(function () {
            Route::get('/', [AssetPurchaseController::class, 'index'])->name('index');
            Route::get('/create', [AssetPurchaseController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
            Route::post('/', [AssetPurchaseController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
            Route::get('/sub-categories', [AssetPurchaseController::class, 'subCategories'])->name('sub-categories');
            Route::get('/preview-codes', [AssetPurchaseController::class, 'previewCodes'])->name('preview-codes');
            Route::get('/{purchase}', [AssetPurchaseController::class, 'show'])->name('show');
        });

        Route::prefix('fixed-asset/assets')->name('fixed-asset.assets.')->group(function () {
            Route::get('/tracking', [AssetTrackingController::class, 'index'])->name('tracking.index');

            Route::prefix('insurance')->name('insurance.')->group(function () {
                Route::get('/', [AssetInsuranceController::class, 'index'])->name('index');
                Route::get('/create', [AssetInsuranceController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetInsuranceController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{insurance}/edit', [AssetInsuranceController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{insurance}', [AssetInsuranceController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{insurance}', [AssetInsuranceController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('warranties')->name('warranties.')->group(function () {
                Route::get('/', [AssetWarrantyController::class, 'index'])->name('index');
                Route::get('/create', [AssetWarrantyController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetWarrantyController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{warranty}/edit', [AssetWarrantyController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{warranty}', [AssetWarrantyController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{warranty}', [AssetWarrantyController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('guarantees')->name('guarantees.')->group(function () {
                Route::get('/', [AssetGuaranteeController::class, 'index'])->name('index');
                Route::get('/create', [AssetGuaranteeController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetGuaranteeController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{guarantee}/edit', [AssetGuaranteeController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{guarantee}', [AssetGuaranteeController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{guarantee}', [AssetGuaranteeController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('not-in-use')->name('not-in-use.')->group(function () {
                Route::get('/', [AssetNotInUseController::class, 'index'])->name('index');
                Route::get('/history', [AssetNotInUseController::class, 'history'])->name('history');
                Route::post('/', [AssetNotInUseController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
                Route::post('/{fixed_asset}/restore', [AssetNotInUseController::class, 'restore'])->name('restore')->middleware('permission:fixed-assets.edit');
            });
        });

        Route::prefix('fixed-asset/stock')->name('fixed-asset.stock.')->group(function () {
            Route::get('/category-wise', [AssetStockController::class, 'categoryWise'])->name('category-wise');
            Route::get('/branch-wise', [AssetStockController::class, 'branchWise'])->name('branch-wise');
        });

        Route::prefix('fixed-asset/depreciation')->name('fixed-asset.depreciation.')->group(function () {
            Route::get('/', [AssetDepreciationController::class, 'overview'])->name('index');
            Route::get('/calculation', [AssetDepreciationController::class, 'calculation'])->name('calculation');
            Route::get('/posting', [AssetDepreciationController::class, 'posting'])->name('posting');
            Route::post('/posting', [AssetDepreciationController::class, 'post'])->name('post')->middleware('permission:fixed-assets.edit');
            Route::get('/rollback', [AssetDepreciationController::class, 'rollback'])->name('rollback');
            Route::post('/rollback', [AssetDepreciationController::class, 'rollbackRun'])->name('rollback.run')->middleware('permission:fixed-assets.edit');
            Route::get('/manual', [AssetDepreciationController::class, 'manual'])->name('manual');
            Route::post('/manual', [AssetDepreciationController::class, 'manualStore'])->name('manual.store')->middleware('permission:fixed-assets.edit');
            Route::get('/schedule/{fixed_asset}', [AssetDepreciationController::class, 'schedule'])->name('schedule');
        });

        Route::prefix('fixed-assets')->name('fixed-assets.')->group(function () {
            Route::get('/', [FixedAssetController::class, 'index'])->name('index');
            Route::get('/import', [FixedAssetImportController::class, 'index'])->name('import.index')->middleware('permission:fixed-assets.create');
            Route::post('/import/preview', [FixedAssetImportController::class, 'preview'])->name('import.preview')->middleware('permission:fixed-assets.create');
            Route::post('/import/commit', [FixedAssetImportController::class, 'commit'])->name('import.commit')->middleware('permission:fixed-assets.create');
            Route::get('/create', [FixedAssetController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
            Route::post('/', [FixedAssetController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
            Route::get('/{fixed_asset}', [FixedAssetController::class, 'show'])->name('show');
            Route::get('/{fixed_asset}/edit', [FixedAssetController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
            Route::put('/{fixed_asset}', [FixedAssetController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
            Route::delete('/{fixed_asset}', [FixedAssetController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
        });

        Route::prefix('fixed-asset/transfer')->name('fixed-asset.transfer.')->group(function () {
            Route::get('/branch', [AssetTransferController::class, 'branchIndex'])->name('branch.index');
            Route::get('/branch/create', [AssetTransferController::class, 'branchCreate'])->name('branch.create')->middleware('permission:fixed-assets.edit');
            Route::post('/branch', [AssetTransferController::class, 'branchStore'])->name('branch.store')->middleware('permission:fixed-assets.edit');
            Route::get('/project/create', [AssetTransferController::class, 'projectCreate'])->name('project.create')->middleware('permission:fixed-assets.edit');
            Route::post('/project', [AssetTransferController::class, 'projectStore'])->name('project.store')->middleware('permission:fixed-assets.edit');
            Route::get('/custodian/create', [AssetTransferController::class, 'custodianCreate'])->name('custodian.create')->middleware('permission:fixed-assets.edit');
            Route::post('/custodian', [AssetTransferController::class, 'custodianStore'])->name('custodian.store')->middleware('permission:fixed-assets.edit');
            Route::get('/history', [AssetTransferController::class, 'history'])->name('history');
        });

        Route::redirect('/asset-transfers', '/fixed-asset/transfer/branch');
        Route::redirect('/asset-transfers/create', '/fixed-asset/transfer/branch/create');

        Route::prefix('asset-transfers')->name('asset-transfers.')->group(function () {
            Route::get('/', [AssetTransferController::class, 'index'])->name('index');
            Route::get('/create', [AssetTransferController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
            Route::post('/', [AssetTransferController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
        });

        Route::prefix('asset-assignments')->name('asset-assignments.')->group(function () {
            Route::get('/', [AssetAssignmentController::class, 'index'])->name('index');
            Route::get('/employees', [AssetAssignmentController::class, 'employeesByBranch'])->name('employees');
            Route::get('/create', [AssetAssignmentController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
            Route::post('/', [AssetAssignmentController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
            Route::post('/{asset_assignment}/release', [AssetAssignmentController::class, 'release'])->name('release')->middleware('permission:fixed-assets.edit');
        });

        Route::prefix('asset-maintenances')->name('asset-maintenances.')->group(function () {
            Route::get('/', [AssetMaintenanceController::class, 'index'])->name('index');
            Route::get('/create', [AssetMaintenanceController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
            Route::post('/', [AssetMaintenanceController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
            Route::get('/{asset_maintenance}/edit', [AssetMaintenanceController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
            Route::put('/{asset_maintenance}', [AssetMaintenanceController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
            Route::delete('/{asset_maintenance}', [AssetMaintenanceController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
        });

        Route::prefix('fixed-asset/disposal')->name('fixed-asset.disposal.')->group(function () {
            Route::prefix('reasons')->name('reasons.')->group(function () {
                Route::get('/', [AssetDisposalReasonController::class, 'index'])->name('index');
                Route::get('/create', [AssetDisposalReasonController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetDisposalReasonController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{reason}/edit', [AssetDisposalReasonController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{reason}', [AssetDisposalReasonController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{reason}', [AssetDisposalReasonController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::get('/requests', [AssetDisposalController::class, 'requestsIndex'])->name('requests.index');
            Route::get('/requests/create', [AssetDisposalController::class, 'requestsCreate'])->name('requests.create')->middleware('permission:fixed-assets.edit');
            Route::post('/requests', [AssetDisposalController::class, 'requestsStore'])->name('requests.store')->middleware('permission:fixed-assets.edit');

            Route::get('/dispose/create', [AssetDisposalController::class, 'disposeCreate'])->name('dispose.create')->middleware('permission:fixed-assets.delete');
            Route::post('/dispose', [AssetDisposalController::class, 'disposeStore'])->name('dispose.store')->middleware('permission:fixed-assets.delete');

            Route::get('/batch/create', [AssetDisposalController::class, 'batchCreate'])->name('batch.create')->middleware('permission:fixed-assets.delete');
            Route::post('/batch', [AssetDisposalController::class, 'batchStore'])->name('batch.store')->middleware('permission:fixed-assets.delete');

            Route::post('/requests/{asset_disposal}/approve', [AssetDisposalController::class, 'approve'])->name('approve')->middleware('permission:fixed-assets.delete');
            Route::post('/requests/{asset_disposal}/reject', [AssetDisposalController::class, 'reject'])->name('reject')->middleware('permission:fixed-assets.delete');
        });

        Route::get('/fixed-asset/disposals', [AssetDisposalController::class, 'registerIndex'])->name('fixed-asset.disposals.register');

        Route::redirect('/asset-disposals', '/fixed-asset/disposals');
        Route::redirect('/asset-disposals/create', '/fixed-asset/disposal/requests/create');

        Route::prefix('asset-disposals')->name('asset-disposals.')->group(function () {
            Route::get('/', [AssetDisposalController::class, 'index'])->name('index');
            Route::get('/create', [AssetDisposalController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
            Route::post('/', [AssetDisposalController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
            Route::post('/{asset_disposal}/approve', [AssetDisposalController::class, 'approve'])->name('approve')->middleware('permission:fixed-assets.delete');
            Route::post('/{asset_disposal}/reject', [AssetDisposalController::class, 'reject'])->name('reject')->middleware('permission:fixed-assets.delete');
        });

        Route::redirect('/asset-depreciation', '/fixed-asset/depreciation');

        Route::prefix('asset-depreciation')->name('asset-depreciation.')->group(function () {
            Route::get('/', [AssetDepreciationController::class, 'index'])->name('index');
            Route::post('/run', [AssetDepreciationController::class, 'run'])->name('run')->middleware('permission:fixed-assets.edit');
            Route::get('/schedule/{fixed_asset}', [AssetDepreciationController::class, 'schedule'])->name('schedule');
        });

        Route::post('/fixed-assets/{fixed_asset}/revaluation', [AssetRevaluationController::class, 'store'])
            ->name('fixed-assets.revaluation.store')
            ->middleware('permission:fixed-assets.edit');

        Route::prefix('fixed-asset/reports')->name('fixed-asset.reports.')->group(function () {
            Route::get('/', [FixedAssetReportController::class, 'index'])->name('index');
            Route::get('/{report}/print', [FixedAssetReportController::class, 'print'])->name('print');
            Route::get('/{report}/pdf', [FixedAssetReportController::class, 'pdf'])->name('pdf');
            Route::get('/{report}/excel', [FixedAssetReportController::class, 'excel'])->name('excel');
            Route::get('/{report}', [FixedAssetReportController::class, 'show'])->name('show');
        });
    });

    // ====================
    // INVENTORY
    // ====================
    Route::middleware(['permission:inventory.view'])->prefix('inventory')->name('inventory.')->group(function () {
        Route::prefix('products')->name('products.')->group(function () {
            Route::get('/', [InventoryProductController::class, 'index'])->name('index');
            Route::post('/', [InventoryProductController::class, 'store'])->name('store')->middleware('permission:inventory.create');
            Route::put('/{inventory_product}', [InventoryProductController::class, 'update'])->name('update')->middleware('permission:inventory.edit');
            Route::delete('/{inventory_product}', [InventoryProductController::class, 'destroy'])->name('destroy')->middleware('permission:inventory.delete');
            Route::redirect('/create', '/inventory/products');
            Route::get('/{inventory_product}/edit', fn () => redirect()->route('inventory.products.index'));
        });

        Route::get('/operations', [InventoryOperationsController::class, 'index'])->name('operations.index');
        Route::post('/operations/stock-in', [InventoryOperationsController::class, 'storeStockIn'])->name('operations.stock-in')->middleware('permission:inventory.create');
        Route::post('/operations/disburse', [InventoryOperationsController::class, 'storeDisburse'])->name('operations.disburse')->middleware('permission:inventory.create');
        Route::put('/operations/movements/{movement}', [InventoryOperationsController::class, 'updateMovement'])->name('operations.movements.update')->middleware('permission:inventory.edit');
        Route::delete('/operations/movements/{movement}', [InventoryOperationsController::class, 'destroyMovement'])->name('operations.movements.destroy')->middleware('permission:inventory.delete');
        Route::get('/operations/stock-check', [InventoryOperationsController::class, 'stockCheck'])->name('operations.stock-check');
        Route::get('/operations/recipients', [InventoryOperationsController::class, 'recipients'])->name('operations.recipients');
        Route::post('/operations/recipients', [InventoryOperationsController::class, 'storeRecipient'])->name('operations.recipients.store')->middleware('permission:inventory.create');

        Route::post('/products/quick', [InventoryProductController::class, 'quickStore'])->name('products.quick')->middleware('permission:inventory.create');

        Route::redirect('/stock-in', '/inventory/operations?tab=in');
        Route::redirect('/stock-in/create', '/inventory/operations');
        Route::redirect('/disburse', '/inventory/operations?tab=out');
        Route::redirect('/disburse/create', '/inventory/operations');

        Route::prefix('reports')->name('reports.')->group(function () {
            Route::get('/stock-ledger', [InventoryReportController::class, 'stockLedger'])->name('stock-ledger');
            Route::get('/stock-ledger/print', [InventoryReportController::class, 'stockLedgerPrint'])->name('stock-ledger.print');
            Route::get('/stock-ledger/pdf', [InventoryReportController::class, 'stockLedgerPdf'])->name('stock-ledger.pdf');
            Route::get('/stock-ledger/excel', [InventoryReportController::class, 'stockLedgerExcel'])->name('stock-ledger.excel');
            Route::get('/product-ledger', [InventoryReportController::class, 'productLedger'])->name('product-ledger');
            Route::get('/product-ledger/print', [InventoryReportController::class, 'productLedgerPrint'])->name('product-ledger.print');
            Route::get('/product-ledger/pdf', [InventoryReportController::class, 'productLedgerPdf'])->name('product-ledger.pdf');
            Route::get('/product-ledger/excel', [InventoryReportController::class, 'productLedgerExcel'])->name('product-ledger.excel');
            Route::redirect('/current-stock', '/inventory/reports/stock-ledger');
        });
    });

    // ====================
    // ATTENDANCE MANAGEMENT
    // ====================
    Route::middleware(['permission:attendance.view'])->prefix('attendance')->name('attendance.')->group(function () {

        // Basic Attendance Operations
        Route::get('/', [AttendanceController::class, 'index'])->name('index');
        Route::get('/monthly', [AttendanceController::class, 'monthly'])->name('monthly');
        Route::get('/daily-branch-summary', [AttendanceController::class, 'dailyBranchSummary'])->name('daily-branch-summary');
        Route::get('/report', [AttendanceController::class, 'report'])->name('report');
        Route::get('/sheet-report', [AttendanceController::class, 'sheetReport'])->name('sheet-report');
        Route::get('/pdf', [AttendanceController::class, 'generatePdf'])->name('pdf');

        // Attendance CRUD Operations
        Route::middleware(['permission:attendance.create'])->group(function () {
            Route::get('/create', [AttendanceController::class, 'create'])->name('create');
            Route::post('/', [AttendanceController::class, 'store'])->name('store');
        });

        Route::middleware(['permission:attendance.edit'])->group(function () {
            Route::get('/{attendance}/edit', [AttendanceController::class, 'edit'])->name('edit');
            Route::put('/{attendance}', [AttendanceController::class, 'update'])->name('update');
        });

        Route::delete('/{attendance}', [AttendanceController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:attendance.delete');

        // Device Sync Operations
        Route::post('/sync-devices', [AttendanceController::class, 'syncDevices'])
            ->name('sync-devices')
            ->middleware('permission:attendance.sync');

        // Device Management
        Route::middleware(['permission:attendance.admin'])->prefix('devices')->name('devices.')->group(function () {
            Route::get('/', [AttendanceDeviceController::class, 'index'])->name('index');
            Route::get('/create', [AttendanceDeviceController::class, 'create'])->name('create');
            Route::post('/', [AttendanceDeviceController::class, 'store'])->name('store');
            // Static paths before {device} so they are never captured as a device id
            Route::get('/biometric-ids', [AttendanceDeviceController::class, 'biometricIds'])->name('biometric-ids');
            Route::get('/sync-report', [AttendanceDeviceController::class, 'syncReport'])->name('sync-report');
            Route::get('/{device}/edit', [AttendanceDeviceController::class, 'edit'])->name('edit');
            Route::put('/{device}', [AttendanceDeviceController::class, 'update'])->name('update');
            Route::delete('/{device}', [AttendanceDeviceController::class, 'destroy'])->name('destroy');
            Route::post('/{device}/test-connection', [AttendanceDeviceController::class, 'testConnection'])->name('test-connection');
        });

        // Attendance Settings
        Route::middleware(['permission:attendance.admin'])->prefix('settings')->name('settings.')->group(function () {
            Route::get('/', [AttendanceSettingController::class, 'index'])->name('index');
            Route::get('/create', [AttendanceSettingController::class, 'create'])->name('create');
            Route::post('/', [AttendanceSettingController::class, 'store'])->name('store');
            Route::get('/employee-times', [\App\Http\Controllers\Attendance\EmployeeAttendanceTimeController::class, 'index'])->name('employee-times');
            Route::put('/employee-times/{employee}', [\App\Http\Controllers\Attendance\EmployeeAttendanceTimeController::class, 'upsert'])->name('employee-times.upsert');
            Route::delete('/employee-times/{employee}', [\App\Http\Controllers\Attendance\EmployeeAttendanceTimeController::class, 'destroy'])->name('employee-times.destroy');
            Route::get('/{setting}/edit', [AttendanceSettingController::class, 'edit'])->name('edit');
            Route::put('/{setting}', [AttendanceSettingController::class, 'update'])->name('update');
            Route::delete('/{setting}', [AttendanceSettingController::class, 'destroy'])->name('destroy');
        });
    });

    // Additional Attendance Routes
    Route::middleware(['permission:attendance.view'])->group(function () {
        Route::put('/attendance/employees/{employee}/biometric-id', [AttendanceDeviceController::class, 'updateBiometricId'])
            ->name('attendance.employees.biometric-id')
            ->middleware('permission:attendance.edit');

        // Export Routes
        Route::prefix('exports')->name('exports.')->group(function () {
            Route::get('/attendance/monthly', [AttendanceExportController::class, 'exportMonthlyPdf'])->name('attendance.monthly');
        });

        // Report Routes
        Route::prefix('attendance')->name('attendance.')->group(function () {
            Route::get('/report', [AttendanceReportController::class, 'index'])->name('report');
            Route::post('/report', [AttendanceReportController::class, 'index']);
            Route::get('/report/pdf', [AttendanceReportController::class, 'downloadPdf'])->name('report.pdf');
        });
    });

    // ====================
    // LEAVE MANAGEMENT
    // ====================
    Route::prefix('leave')->name('leave.')->group(function () {

        // Leave Types Management
        Route::middleware(['permission:leave-types.view'])->prefix('types')->name('types.')->group(function () {
            Route::get('/', [LeaveTypeController::class, 'index'])->name('index');
            Route::get('/create', [LeaveTypeController::class, 'create'])
                ->name('create')
                ->middleware('permission:leave-types.create');
            Route::post('/', [LeaveTypeController::class, 'store'])
                ->name('store')
                ->middleware('permission:leave-types.create');
            Route::get('/{leaveType}/edit', [LeaveTypeController::class, 'edit'])
                ->name('edit')
                ->middleware('permission:leave-types.edit');
            Route::put('/{leaveType}', [LeaveTypeController::class, 'update'])
                ->name('update')
                ->middleware('permission:leave-types.edit');
            Route::delete('/{leaveType}', [LeaveTypeController::class, 'destroy'])
                ->name('destroy')
                ->middleware('permission:leave-types.delete');
        });

        // Leave settings (approval rules)
        Route::prefix('settings')->name('settings.')->group(function () {
            Route::get('/', [LeaveSettingController::class, 'index'])
                ->name('index')
                ->middleware('permission:leave-types.view');
            Route::get('/create', [LeaveSettingController::class, 'create'])
                ->name('create')
                ->middleware('permission:leave-types.edit');
            Route::post('/', [LeaveSettingController::class, 'store'])
                ->name('store')
                ->middleware('permission:leave-types.edit');
            Route::get('/{leaveApprovalTier}/edit', [LeaveSettingController::class, 'edit'])
                ->name('edit')
                ->middleware('permission:leave-types.edit');
            Route::put('/{leaveApprovalTier}', [LeaveSettingController::class, 'update'])
                ->name('update')
                ->middleware('permission:leave-types.edit');
            Route::delete('/{leaveApprovalTier}', [LeaveSettingController::class, 'destroy'])
                ->name('destroy')
                ->middleware('permission:leave-types.edit');
        });

        // Leave Balances Management
        Route::middleware(['permission:leave-balances.view'])->prefix('balances')->name('balances.')->group(function () {
            Route::get('/', [LeaveBalanceController::class, 'index'])->name('index');
            Route::get('/create', [LeaveBalanceController::class, 'create'])
                ->name('create')
                ->middleware('permission:leave-balances.create');
            Route::post('/', [LeaveBalanceController::class, 'store'])
                ->name('store')
                ->middleware('permission:leave-balances.create');
            Route::get('/{leaveBalance}/edit', [LeaveBalanceController::class, 'edit'])
                ->name('edit')
                ->middleware('permission:leave-balances.edit');
            Route::put('/{leaveBalance}', [LeaveBalanceController::class, 'update'])
                ->name('update')
                ->middleware('permission:leave-balances.edit');

            // Bulk Operations
            Route::middleware(['permission:leave-balances.admin'])->group(function () {
                Route::get('/allocate-bulk', [LeaveBalanceController::class, 'allocateBulk'])->name('allocate-bulk');
                Route::post('/store-bulk', [LeaveBalanceController::class, 'storeBulk'])->name('store-bulk');
                Route::post('/apply-defaults', [LeaveBalanceController::class, 'applyDefaults'])->name('apply-defaults');
                Route::post('/reset-for-new-year', [LeaveBalanceController::class, 'resetForNewYear'])->name('reset-for-new-year');
            });
        });

        // Leave Applications Management
        Route::prefix('applications')->name('applications.')->group(function () {

            Route::get('/report', [LeaveApplicationController::class, 'report'])
                ->name('report')
                ->middleware('permission:reports.view');

            Route::get('/', [LeaveApplicationController::class, 'index'])
                ->name('index')
                ->middleware('permission:leave-applications.view');

            Route::get('/{application}/pdf', [LeaveApplicationController::class, 'generatePdf'])
                ->name('pdf');

            // Create leave application (employees can apply for themselves)
            Route::middleware(['permission:leave-applications.create'])->group(function () {
                Route::get('/auto-approve-eligibility', [LeaveApplicationController::class, 'autoApproveEligibility'])
                    ->name('auto-approve-eligibility')
                    ->middleware('permission:leave-applications.approve');
                Route::get('/create', [LeaveApplicationController::class, 'create'])->name('create');
                Route::post('/', [LeaveApplicationController::class, 'store'])->name('store');
            });

            // View specific application
            Route::get('/{application}', [LeaveApplicationController::class, 'show'])
                ->name('show')
                ->middleware('permission:leave-applications.view');

            // Employee can cancel their own application
            Route::post('/{application}/cancel', [LeaveApplicationController::class, 'cancel'])
                ->name('cancel')
                ->middleware('permission:leave-applications.cancel');

            // Manager/HR approval actions
            Route::middleware(['permission:leave-applications.approve'])->group(function () {
                Route::post('/{application}/approve', [LeaveApplicationController::class, 'approve'])->name('approve');
                Route::post('/{application}/reject', [LeaveApplicationController::class, 'reject'])->name('reject');
            });

            // Document download
            Route::get('/{application}/document/{index}', [LeaveApplicationController::class, 'downloadDocument'])
                ->name('download-document')
                ->middleware('permission:leave-applications.view');

            // Reports

        });
    });

    // ====================
    // MOVEMENT MANAGEMENT
    // ====================
    Route::prefix('movement-log-books')->name('movement-log-books.')->middleware('permission:movements.view')->group(function () {
        Route::get('/', [MovementLogBookController::class, 'index'])->name('index');
        Route::get('/print', [MovementLogBookController::class, 'printIndex'])->name('print');
        Route::get('/export/xlsx', [MovementLogBookController::class, 'exportXlsx'])->name('export.xlsx');
        Route::get('/{logBook}/edit', [MovementLogBookController::class, 'edit'])->name('edit');
        Route::put('/{logBook}', [MovementLogBookController::class, 'update'])->name('update');
        Route::delete('/{logBook}', [MovementLogBookController::class, 'destroy'])->name('destroy');
        Route::get('/{logBook}', [MovementLogBookController::class, 'show'])->name('show');
    });

    Route::prefix('movement-log-book-payments')->name('movement-log-book-payments.')->middleware('permission:movements.view')->group(function () {
        Route::get('/', [MovementLogBookPaymentController::class, 'index'])->name('index');
        Route::post('/process', [MovementLogBookPaymentController::class, 'process'])->name('process');
        Route::get('/{payment}', [MovementLogBookPaymentController::class, 'show'])->name('show');
        Route::get('/{payment}/voucher', [MovementLogBookPaymentController::class, 'voucher'])->name('voucher');
        Route::post('/{payment}/approve', [MovementLogBookPaymentController::class, 'approve'])->name('approve');
        Route::post('/{payment}/reject', [MovementLogBookPaymentController::class, 'reject'])->name('reject');
    });

    Route::prefix('movements')->name('movements.')->group(function () {
        // View movements
        Route::get('/', [MovementController::class, 'index'])
            ->name('index')
            ->middleware('permission:movements.view');

        Route::get('/print', [MovementController::class, 'printIndex'])
            ->name('print')
            ->middleware('permission:movements.view');

        Route::get('/export/xlsx', [MovementController::class, 'exportIndexXlsx'])
            ->name('export.xlsx')
            ->middleware('permission:movements.view');

        // Create movement
        Route::middleware(['permission:movements.create'])->group(function () {
            Route::get('/create', [MovementController::class, 'create'])->name('create');
            Route::post('/', [MovementController::class, 'store'])->name('store');
        });

        // View specific movement
        Route::get('/{movement}', [MovementController::class, 'show'])
            ->name('show')
            ->middleware('permission:movements.view');

        Route::get('/{movement}/details', [MovementController::class, 'details'])
            ->name('details');

        // Edit / delete movement (admin / HR with permission)
        Route::middleware(['permission:movements.edit'])->group(function () {
            Route::get('/{movement}/edit', [MovementController::class, 'edit'])->name('edit');
            Route::put('/{movement}', [MovementController::class, 'update'])->name('update');
        });

        Route::post('/bulk-destroy', [MovementController::class, 'bulkDestroy'])
            ->name('bulk-destroy')
            ->middleware('permission:movements.delete');

        Route::delete('/{movement}', [MovementController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:movements.delete');

        // Employee actions
        Route::post('/{movement}/cancel', [MovementController::class, 'cancel'])
            ->name('cancel')
            ->middleware('permission:movements.cancel');

        Route::post('/{movement}/complete', [MovementController::class, 'complete'])
            ->name('complete')
            ->middleware('permission:movements.complete');

        // Manager/HR approval actions
        Route::middleware(['permission:movements.approve'])->group(function () {
            Route::post('/{movement}/approve', [MovementController::class, 'approve'])->name('approve');
            Route::post('/{movement}/reject', [MovementController::class, 'reject'])->name('reject');
        });

        // Reports
        Route::middleware(['permission:reports.view'])->group(function () {
            Route::get('/report', [MovementController::class, 'report'])->name('report');
            Route::get('/report/download', [MovementController::class, 'downloadReport'])->name('report.download');
        });
    });

    // Movement Penalty & Account Lock Payment routes
    Route::get('/movement/penalty-payment', [MovementPenaltyController::class, 'showPaymentPage'])->name('movement.penalty.payment');
    Route::post('/movement/penalty-submit', [MovementPenaltyController::class, 'submitTransaction'])->name('movement.penalty.submit');

    Route::prefix('movement-penalties')->name('movement-penalties.')->group(function () {
        Route::get('/', [MovementPenaltyController::class, 'adminIndex'])->name('index');
        Route::post('/sync', [MovementPenaltyController::class, 'syncPenalties'])->name('sync');
        Route::post('/{id}/approve', [MovementPenaltyController::class, 'approvePenalty'])->name('approve');
        Route::post('/{id}/reject', [MovementPenaltyController::class, 'rejectPenalty'])->name('reject');
    });

    // ====================
    // TRANSFER MANAGEMENT
    // ====================
    Route::middleware(['permission:transfers.view'])->prefix('transfers')->name('transfers.')->group(function () {
        Route::get('/', [TransferController::class, 'index'])->name('index');

        Route::middleware(['permission:transfers.create'])->group(function () {
            Route::get('/create', [TransferController::class, 'create'])->name('create');
            Route::get('/bulk', [TransferController::class, 'bulkCreate'])->name('bulk.create');
            Route::post('/bulk', [TransferController::class, 'storeBulk'])->name('bulk.store');
            Route::post('/', [TransferController::class, 'store'])->name('store');
        });

        Route::get('/{transfer}', [TransferController::class, 'show'])->name('show');

        Route::middleware(['permission:transfers.edit'])->group(function () {
            Route::get('/{transfer}/edit', [TransferController::class, 'edit'])->name('edit');
            Route::put('/{transfer}', [TransferController::class, 'update'])->name('update');
            Route::post('/{transfer}/cancel', [TransferController::class, 'cancel'])->name('cancel');
            Route::post('/{transfer}/complete', [TransferController::class, 'complete'])->name('complete');
        });

        Route::middleware(['permission:transfers.approve'])->group(function () {
            Route::post('/{transfer}/approve', [TransferController::class, 'approve'])->name('approve');
            Route::post('/{transfer}/reject', [TransferController::class, 'reject'])->name('reject');
        });
    });

    // ====================
    // CONFIRMATION MANAGEMENT
    // ====================
    Route::middleware(['permission:confirmations.view'])->prefix('confirmations')->name('confirmations.')->group(function () {
        Route::get('/', [ConfirmationController::class, 'index'])->name('index');

        Route::middleware(['permission:confirmations.create'])->group(function () {
            Route::get('/create', [ConfirmationController::class, 'create'])->name('create');
            Route::post('/', [ConfirmationController::class, 'store'])->name('store');
        });

        Route::get('/{confirmation}', [ConfirmationController::class, 'show'])->name('show');

        Route::middleware(['permission:confirmations.edit'])->group(function () {
            Route::get('/{confirmation}/edit', [ConfirmationController::class, 'edit'])->name('edit');
            Route::put('/{confirmation}', [ConfirmationController::class, 'update'])->name('update');
            Route::post('/{confirmation}/cancel', [ConfirmationController::class, 'cancel'])->name('cancel');
            Route::post('/{confirmation}/complete', [ConfirmationController::class, 'complete'])->name('complete');
        });

        Route::middleware(['permission:confirmations.approve'])->group(function () {
            Route::post('/{confirmation}/approve', [ConfirmationController::class, 'approve'])->name('approve');
            Route::post('/{confirmation}/reject', [ConfirmationController::class, 'reject'])->name('reject');
        });
    });

    // ====================
    // SEPARATION MANAGEMENT (Obbahoti / Termination)
    // ====================
    Route::middleware(['permission:separations.view'])->prefix('separations')->name('separations.')->group(function () {
        Route::get('/', [SeparationController::class, 'index'])->name('index');

        Route::middleware(['permission:separations.create'])->group(function () {
            Route::get('/create', [SeparationController::class, 'create'])->name('create');
            Route::post('/', [SeparationController::class, 'store'])->name('store');
        });

        Route::get('/{separation}', [SeparationController::class, 'show'])->name('show');

        Route::middleware(['permission:separations.edit'])->group(function () {
            Route::get('/{separation}/edit', [SeparationController::class, 'edit'])->name('edit');
            Route::put('/{separation}', [SeparationController::class, 'update'])->name('update');
            Route::post('/{separation}/cancel', [SeparationController::class, 'cancel'])->name('cancel');
            Route::post('/{separation}/complete', [SeparationController::class, 'complete'])->name('complete');
        });

        Route::delete('/{separation}', [SeparationController::class, 'destroy'])->name('destroy');

        Route::middleware(['permission:separations.approve'])->group(function () {
            Route::post('/{separation}/approve', [SeparationController::class, 'approve'])->name('approve');
            Route::post('/{separation}/reject', [SeparationController::class, 'reject'])->name('reject');
        });
    });

    // ====================
    // DEMOTION MANAGEMENT
    // ===================
    Route::middleware(['permission:demotions.view'])->prefix('demotions')->name('demotions.')->group(function () {
        Route::get('/', [DemotionController::class, 'index'])->name('index');

        Route::middleware(['permission:demotions.create'])->group(function () {
            Route::get('/create', [DemotionController::class, 'create'])->name('create');
            Route::post('/', [DemotionController::class, 'store'])->name('store');
        });

        Route::get('/{demotion}', [DemotionController::class, 'show'])->name('show');

        Route::middleware(['permission:demotions.edit'])->group(function () {
            Route::get('/{demotion}/edit', [DemotionController::class, 'edit'])->name('edit');
            Route::put('/{demotion}', [DemotionController::class, 'update'])->name('update');
            Route::post('/{demotion}/cancel', [DemotionController::class, 'cancel'])->name('cancel');
            Route::post('/{demotion}/complete', [DemotionController::class, 'complete'])->name('complete');
        });

        Route::middleware(['permission:demotions.approve'])->group(function () {
            Route::post('/{demotion}/approve', [DemotionController::class, 'approve'])->name('approve');
            Route::post('/{demotion}/reject', [DemotionController::class, 'reject'])->name('reject');
        });
    });

    // PROMOTION MANAGEMENT
    // ====================
    Route::middleware(['permission:promotions.view'])->prefix('promotions')->name('promotions.')->group(function () {
        Route::get('/', [PromotionController::class, 'index'])->name('index');

        Route::middleware(['permission:promotions.create'])->group(function () {
            Route::get('/create', [PromotionController::class, 'create'])->name('create');
            Route::post('/', [PromotionController::class, 'store'])->name('store');
        });

        Route::get('/{promotion}', [PromotionController::class, 'show'])->name('show');

        Route::middleware(['permission:promotions.edit'])->group(function () {
            Route::get('/{promotion}/edit', [PromotionController::class, 'edit'])->name('edit');
            Route::put('/{promotion}', [PromotionController::class, 'update'])->name('update');
            Route::post('/{promotion}/cancel', [PromotionController::class, 'cancel'])->name('cancel');
            Route::post('/{promotion}/complete', [PromotionController::class, 'complete'])->name('complete');
        });

        Route::middleware(['permission:promotions.approve'])->group(function () {
            Route::post('/{promotion}/approve', [PromotionController::class, 'approve'])->name('approve');
            Route::post('/{promotion}/reject', [PromotionController::class, 'reject'])->name('reject');
        });
    });

    // ====================
    // HOLIDAY MANAGEMENT
    // ====================
    Route::middleware(['permission:holidays.view'])->prefix('holidays')->name('holidays.')->group(function () {
        Route::get('/', [HolidayController::class, 'index'])->name('index');
        Route::get('/calendar', [HolidayController::class, 'calendar'])->name('calendar');

        Route::middleware(['permission:holidays.create'])->group(function () {
            Route::get('/create', [HolidayController::class, 'create'])->name('create');
            Route::post('/', [HolidayController::class, 'store'])->name('store');
        });

        Route::get('/{holiday}', [HolidayController::class, 'show'])->name('show');

        Route::middleware(['permission:holidays.edit'])->group(function () {
            Route::get('/{holiday}/edit', [HolidayController::class, 'edit'])->name('edit');
            Route::put('/{holiday}', [HolidayController::class, 'update'])->name('update');
        });

        Route::delete('/{holiday}', [HolidayController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:holidays.delete');
    });

    // ====================
    // ZKTECO INTEGRATION
    // ====================
    Route::middleware(['permission:attendance.admin'])->prefix('zkteco')->name('zkteco.')->group(function () {
        Route::get('/', [ZKDeviceController::class, 'index'])->name('dashboard');
        Route::post('/sync-device/{device}', [ZKDeviceController::class, 'syncDevice'])->name('sync-device');
        Route::post('/sync-all', [ZKDeviceController::class, 'syncAll'])->name('sync-all');
        Route::post('/test-connection/{device}', [ZKDeviceController::class, 'testConnection'])->name('test-connection');
        Route::post('/upload-employees/{device}', [ZKDeviceController::class, 'uploadEmployees'])->name('upload-employees');
    });

    // ====================
    // REPORTS MANAGEMENT
    // ====================
    Route::middleware(['permission:reports.view'])->prefix('reports')->name('reports.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::get('/administration', [ReportController::class, 'administration'])->name('administration');
        Route::get('/attendance', [ReportController::class, 'attendance'])->name('attendance');
        Route::get('/leave', [ReportController::class, 'leave'])->name('leave');
        Route::get('/movement', [ReportController::class, 'movement'])->name('movement');
        Route::get('/transfer', [ReportController::class, 'transfer'])->name('transfer');
        Route::get('/employee', [ReportController::class, 'employee'])->name('employee');

        // Export functions
        Route::middleware(['permission:reports.export'])->group(function () {
            Route::post('/export-pdf', [ReportController::class, 'exportPdf'])->name('export-pdf');
            Route::post('/export-excel', [ReportController::class, 'exportExcel'])->name('export-excel');
            Route::get('/leave/pdf', [ReportController::class, 'downloadLeaveReportPdf'])->name('leave.pdf');
            Route::get('/leave/excel', [ReportController::class, 'downloadLeaveReportExcel'])->name('leave.excel');
        });
    });
});

