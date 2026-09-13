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

