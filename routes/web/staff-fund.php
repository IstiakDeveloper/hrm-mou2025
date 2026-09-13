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
    // STAFF FUND (PF & Gratuity)
    // ====================
    Route::middleware(['permission:staff-fund.view'])->group(function () {
        Route::prefix('provident-fund')->name('provident-fund.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'index'])->name('index');
            Route::get('/summary', [\App\Http\Controllers\Payroll\ProvidentFundController::class, 'summary'])->name('summary');
            Route::prefix('reports')->name('reports.')->group(function () {
                Route::get('/', [\App\Http\Controllers\Payroll\PfReportController::class, 'index'])->name('index');
                Route::get('/{report}/print', [\App\Http\Controllers\Payroll\PfReportController::class, 'print'])->name('print');
                Route::middleware(['permission:reports.export'])->group(function () {
                    Route::get('/{report}/pdf', [\App\Http\Controllers\Payroll\PfReportController::class, 'pdf'])->name('pdf');
                    Route::get('/{report}/excel', [\App\Http\Controllers\Payroll\PfReportController::class, 'excel'])->name('excel');
                });
                Route::get('/{report}', [\App\Http\Controllers\Payroll\PfReportController::class, 'show'])->name('show');
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
                Route::get('/{report}/print', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'print'])->name('print');
                Route::middleware(['permission:reports.export'])->group(function () {
                    Route::get('/{report}/pdf', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'pdf'])->name('pdf');
                    Route::get('/{report}/excel', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'excel'])->name('excel');
                });
                Route::get('/{report}', [\App\Http\Controllers\Payroll\GratuityReportController::class, 'show'])->name('show');
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

        Route::get('/employee-financial-statement', [\App\Http\Controllers\Payroll\EmployeeFinancialStatementController::class, 'index'])->name('employee-financial-statement.index');
        Route::get('/employee-financial-statement/lookup', [\App\Http\Controllers\Payroll\EmployeeFinancialStatementController::class, 'lookup'])->name('employee-financial-statement.lookup');
        Route::get('/employee-financial-statement/print', [\App\Http\Controllers\Payroll\EmployeeFinancialStatementController::class, 'print'])->name('employee-financial-statement.print');
        Route::redirect('/final-payments/statement', '/employee-financial-statement');
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

