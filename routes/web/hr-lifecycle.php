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

