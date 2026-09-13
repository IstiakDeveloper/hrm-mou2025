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

        // Super Admin Bulk Attendance Operations
        Route::get('/bulk-preview', [AttendanceController::class, 'bulkPreview'])->name('bulk-preview');
        Route::post('/bulk-store', [AttendanceController::class, 'bulkStore'])->name('bulk-store');

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
            Route::put('/sync-settings', [AttendanceDeviceController::class, 'updateSyncSettings'])->name('sync-settings');
            Route::patch('/{device}/sync-flags', [AttendanceDeviceController::class, 'updateSyncFlags'])->name('sync-flags');
            Route::get('/{device}/edit', [AttendanceDeviceController::class, 'edit'])->name('edit');
            Route::put('/{device}', [AttendanceDeviceController::class, 'update'])->name('update');
            Route::delete('/{device}', [AttendanceDeviceController::class, 'destroy'])->name('destroy');
            Route::post('/{device}/test-connection', [AttendanceDeviceController::class, 'testConnection'])->name('test-connection');
        });

        // Attendance Settings
        Route::middleware(['permission:attendance.admin'])->prefix('settings')->name('settings.')->group(function () {
            Route::get('/', [AttendanceSettingController::class, 'index'])->name('index');
            Route::post('/toggle-bulk-attendance', [AttendanceSettingController::class, 'toggleBulkAttendance'])->name('toggle-bulk-attendance');
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

