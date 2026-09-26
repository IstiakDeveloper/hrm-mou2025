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
        Route::get('/salary-head-modifications/create', [\App\Http\Controllers\Payroll\SalaryHeadModificationController::class, 'create'])->name('salary-head-modifications.create');
        Route::post('/salary-head-modifications', [\App\Http\Controllers\Payroll\SalaryHeadModificationController::class, 'store'])->name('salary-head-modifications.store')->middleware('permission:payroll.edit');
        Route::delete('/salary-head-modifications/employee/{employee}', [\App\Http\Controllers\Payroll\SalaryHeadModificationController::class, 'destroy'])->name('salary-head-modifications.destroy')->middleware('permission:payroll.delete');

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

