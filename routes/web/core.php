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

    // Legacy branch portal URLs → normal section flow
    Route::redirect('/branch', '/sections')->name('branch.portal');
    Route::redirect('/branch/attendance', '/attendance/daily-branch-summary?section=attendance-movement')->name('branch.portal.attendance');
    Route::redirect('/branch/inventory', '/inventory/operations?section=inventory')->name('branch.portal.inventory');
    Route::redirect('/branch/leave', '/sections/leave?section=leave')->name('branch.portal.leave');

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

