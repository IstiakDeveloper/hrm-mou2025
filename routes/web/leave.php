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

