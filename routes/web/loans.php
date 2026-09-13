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
            Route::post('/{employee_loan}/restore', [\App\Http\Controllers\EmployeeLoan\EmployeeLoanController::class, 'restore'])->name('restore')->middleware('permission:employee-loan.edit');
        });
    });

