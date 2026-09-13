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
use App\Http\Controllers\Demotion\DemotionController;
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
use App\Http\Controllers\Organization\OfficeMapController;
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
use App\Http\Controllers\Promotion\PromotionController;
use App\Http\Controllers\RegionalOffice\RegionalOfficeController;
use App\Http\Controllers\Report\ReportController;
use App\Http\Controllers\Separation\SeparationController;
use App\Http\Controllers\Transfer\TransferController;
use App\Http\Controllers\ZKTeco\ZKDeviceController;
use App\Http\Controllers\Zone\ZoneController;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

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
            Route::post('/sync-line-roles', [RoleController::class, 'syncLineRoles'])
                ->name('sync-line-roles')
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

