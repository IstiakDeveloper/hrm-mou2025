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
        Route::post('/{payment}/recommend', [MovementLogBookPaymentController::class, 'recommend'])->name('recommend');
        Route::post('/{payment}/approve', [MovementLogBookPaymentController::class, 'approve'])->name('approve');
        Route::post('/{payment}/reject', [MovementLogBookPaymentController::class, 'reject'])->name('reject');
        Route::delete('/{payment}', [MovementLogBookPaymentController::class, 'destroy'])->name('destroy');
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
        Route::post('/bulk', [MovementPenaltyController::class, 'bulkAction'])->name('bulk');
        Route::post('/{id}/approve', [MovementPenaltyController::class, 'approvePenalty'])->name('approve');
        Route::post('/{id}/reject', [MovementPenaltyController::class, 'rejectPenalty'])->name('reject');
    });

