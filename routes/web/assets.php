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
    // FIXED ASSET
    // ====================
    Route::middleware(['permission:fixed-assets.view'])->group(function () {
        Route::redirect('/asset-categories', '/fixed-asset/settings/categories');
        Route::redirect('/asset-categories/create', '/fixed-asset/settings/categories/create');

        Route::prefix('fixed-asset/settings')->name('fixed-asset.settings.')->group(function () {
            Route::prefix('financial-years')->name('financial-years.')->group(function () {
                Route::get('/', [AssetFinancialYearController::class, 'index'])->name('index');
                Route::get('/create', [AssetFinancialYearController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetFinancialYearController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{financial_year}/edit', [AssetFinancialYearController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{financial_year}', [AssetFinancialYearController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{financial_year}', [AssetFinancialYearController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
                Route::post('/{financial_year}/activate', [AssetFinancialYearController::class, 'activate'])->name('activate')->middleware('permission:fixed-assets.edit');
            });

            Route::prefix('vendors')->name('vendors.')->group(function () {
                Route::get('/', [AssetVendorController::class, 'index'])->name('index');
                Route::get('/create', [AssetVendorController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetVendorController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{vendor}/edit', [AssetVendorController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{vendor}', [AssetVendorController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{vendor}', [AssetVendorController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('categories')->name('categories.')->group(function () {
                Route::get('/', [AssetCategoryController::class, 'index'])->name('index');
                Route::get('/create', [AssetCategoryController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetCategoryController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{asset_category}/edit', [AssetCategoryController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{asset_category}', [AssetCategoryController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{asset_category}', [AssetCategoryController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('sub-categories')->name('sub-categories.')->group(function () {
                Route::get('/', [AssetSubCategoryController::class, 'index'])->name('index');
                Route::get('/create', [AssetSubCategoryController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetSubCategoryController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{sub_category}/edit', [AssetSubCategoryController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{sub_category}', [AssetSubCategoryController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{sub_category}', [AssetSubCategoryController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });
        });

        Route::prefix('fixed-asset/custodian')->name('fixed-asset.custodian.')->group(function () {
            Route::prefix('departments')->name('departments.')->group(function () {
                Route::get('/', [AssetCustodianDepartmentController::class, 'index'])->name('index');
                Route::get('/create', [AssetCustodianDepartmentController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetCustodianDepartmentController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{department}/edit', [AssetCustodianDepartmentController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{department}', [AssetCustodianDepartmentController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{department}', [AssetCustodianDepartmentController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('designations')->name('designations.')->group(function () {
                Route::get('/', [AssetCustodianDesignationController::class, 'index'])->name('index');
                Route::get('/create', [AssetCustodianDesignationController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetCustodianDesignationController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{designation}/edit', [AssetCustodianDesignationController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{designation}', [AssetCustodianDesignationController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{designation}', [AssetCustodianDesignationController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('custodians')->name('custodians.')->group(function () {
                Route::get('/', [AssetCustodianController::class, 'index'])->name('index');
                Route::get('/employees', [AssetCustodianController::class, 'employees'])->name('employees');
                Route::get('/create', [AssetCustodianController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetCustodianController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{custodian}/edit', [AssetCustodianController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{custodian}', [AssetCustodianController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{custodian}', [AssetCustodianController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('changes')->name('changes.')->group(function () {
                Route::get('/', [AssetCustodianChangeController::class, 'index'])->name('index');
                Route::get('/create', [AssetCustodianChangeController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
                Route::post('/', [AssetCustodianChangeController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
            });
        });

        Route::prefix('fixed-asset/purchases')->name('fixed-asset.purchases.')->group(function () {
            Route::get('/', [AssetPurchaseController::class, 'index'])->name('index');
            Route::get('/create', [AssetPurchaseController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
            Route::post('/', [AssetPurchaseController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
            Route::get('/sub-categories', [AssetPurchaseController::class, 'subCategories'])->name('sub-categories');
            Route::get('/preview-codes', [AssetPurchaseController::class, 'previewCodes'])->name('preview-codes');
            Route::get('/{purchase}', [AssetPurchaseController::class, 'show'])->name('show');
            Route::get('/{purchase}/edit', [AssetPurchaseController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
            Route::match(['put', 'post'], '/{purchase}', [AssetPurchaseController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
            Route::match(['put', 'post'], '/{purchase}/update', [AssetPurchaseController::class, 'update'])->name('post-update')->middleware('permission:fixed-assets.edit');
            Route::delete('/{purchase}', [AssetPurchaseController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
        });

        Route::prefix('fixed-asset/assets')->name('fixed-asset.assets.')->group(function () {
            Route::get('/tracking', [AssetTrackingController::class, 'index'])->name('tracking.index');

            Route::prefix('insurance')->name('insurance.')->group(function () {
                Route::get('/', [AssetInsuranceController::class, 'index'])->name('index');
                Route::get('/create', [AssetInsuranceController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetInsuranceController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{insurance}/edit', [AssetInsuranceController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{insurance}', [AssetInsuranceController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{insurance}', [AssetInsuranceController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('warranties')->name('warranties.')->group(function () {
                Route::get('/', [AssetWarrantyController::class, 'index'])->name('index');
                Route::get('/create', [AssetWarrantyController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetWarrantyController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{warranty}/edit', [AssetWarrantyController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{warranty}', [AssetWarrantyController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{warranty}', [AssetWarrantyController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('guarantees')->name('guarantees.')->group(function () {
                Route::get('/', [AssetGuaranteeController::class, 'index'])->name('index');
                Route::get('/create', [AssetGuaranteeController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetGuaranteeController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{guarantee}/edit', [AssetGuaranteeController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{guarantee}', [AssetGuaranteeController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{guarantee}', [AssetGuaranteeController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::prefix('not-in-use')->name('not-in-use.')->group(function () {
                Route::get('/', [AssetNotInUseController::class, 'index'])->name('index');
                Route::get('/history', [AssetNotInUseController::class, 'history'])->name('history');
                Route::post('/', [AssetNotInUseController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
                Route::post('/{fixed_asset}/restore', [AssetNotInUseController::class, 'restore'])->name('restore')->middleware('permission:fixed-assets.edit');
            });
        });

        Route::prefix('fixed-asset/stock')->name('fixed-asset.stock.')->group(function () {
            Route::get('/category-wise', [AssetStockController::class, 'categoryWise'])->name('category-wise');
            Route::get('/branch-wise', [AssetStockController::class, 'branchWise'])->name('branch-wise');
        });

        Route::prefix('fixed-asset/depreciation')->name('fixed-asset.depreciation.')->group(function () {
            Route::get('/', [AssetDepreciationController::class, 'overview'])->name('index');
            Route::get('/calculation', [AssetDepreciationController::class, 'calculation'])->name('calculation');
            Route::get('/posting', [AssetDepreciationController::class, 'posting'])->name('posting');
            Route::post('/posting', [AssetDepreciationController::class, 'post'])->name('post')->middleware('permission:fixed-assets.edit');
            Route::get('/rollback', [AssetDepreciationController::class, 'rollback'])->name('rollback');
            Route::post('/rollback', [AssetDepreciationController::class, 'rollbackRun'])->name('rollback.run')->middleware('permission:fixed-assets.edit');
            Route::get('/manual', [AssetDepreciationController::class, 'manual'])->name('manual');
            Route::post('/manual', [AssetDepreciationController::class, 'manualStore'])->name('manual.store')->middleware('permission:fixed-assets.edit');
            Route::get('/schedule/{fixed_asset}', [AssetDepreciationController::class, 'schedule'])->name('schedule');
        });

        Route::prefix('fixed-assets')->name('fixed-assets.')->group(function () {
            Route::get('/', [FixedAssetController::class, 'index'])->name('index');
            Route::get('/import', [FixedAssetImportController::class, 'index'])->name('import.index')->middleware('permission:fixed-assets.create');
            Route::post('/import/preview', [FixedAssetImportController::class, 'preview'])->name('import.preview')->middleware('permission:fixed-assets.create');
            Route::post('/import/commit', [FixedAssetImportController::class, 'commit'])->name('import.commit')->middleware('permission:fixed-assets.create');
            Route::get('/create', [FixedAssetController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
            Route::post('/', [FixedAssetController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
            Route::get('/{fixed_asset}', [FixedAssetController::class, 'show'])->name('show');
            Route::get('/{fixed_asset}/edit', [FixedAssetController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
            Route::put('/{fixed_asset}', [FixedAssetController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
            Route::delete('/{fixed_asset}', [FixedAssetController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
        });

        Route::prefix('fixed-asset/transfer')->name('fixed-asset.transfer.')->group(function () {
            Route::get('/branch', [AssetTransferController::class, 'branchIndex'])->name('branch.index');
            Route::get('/branch/create', [AssetTransferController::class, 'branchCreate'])->name('branch.create')->middleware('permission:fixed-assets.edit');
            Route::post('/branch', [AssetTransferController::class, 'branchStore'])->name('branch.store')->middleware('permission:fixed-assets.edit');
            Route::get('/project/create', [AssetTransferController::class, 'projectCreate'])->name('project.create')->middleware('permission:fixed-assets.edit');
            Route::post('/project', [AssetTransferController::class, 'projectStore'])->name('project.store')->middleware('permission:fixed-assets.edit');
            Route::get('/custodian/create', [AssetTransferController::class, 'custodianCreate'])->name('custodian.create')->middleware('permission:fixed-assets.edit');
            Route::post('/custodian', [AssetTransferController::class, 'custodianStore'])->name('custodian.store')->middleware('permission:fixed-assets.edit');
            Route::get('/history', [AssetTransferController::class, 'history'])->name('history');
        });

        Route::redirect('/asset-transfers', '/fixed-asset/transfer/branch');
        Route::redirect('/asset-transfers/create', '/fixed-asset/transfer/branch/create');

        Route::prefix('asset-transfers')->name('asset-transfers.')->group(function () {
            Route::get('/', [AssetTransferController::class, 'index'])->name('index');
            Route::get('/create', [AssetTransferController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
            Route::post('/', [AssetTransferController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
        });

        Route::prefix('asset-assignments')->name('asset-assignments.')->group(function () {
            Route::get('/', [AssetAssignmentController::class, 'index'])->name('index');
            Route::get('/employees', [AssetAssignmentController::class, 'employeesByBranch'])->name('employees');
            Route::get('/create', [AssetAssignmentController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
            Route::post('/', [AssetAssignmentController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
            Route::post('/{asset_assignment}/release', [AssetAssignmentController::class, 'release'])->name('release')->middleware('permission:fixed-assets.edit');
        });

        Route::prefix('asset-maintenances')->name('asset-maintenances.')->group(function () {
            Route::get('/', [AssetMaintenanceController::class, 'index'])->name('index');
            Route::get('/create', [AssetMaintenanceController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
            Route::post('/', [AssetMaintenanceController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
            Route::get('/{asset_maintenance}/edit', [AssetMaintenanceController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
            Route::put('/{asset_maintenance}', [AssetMaintenanceController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
            Route::delete('/{asset_maintenance}', [AssetMaintenanceController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
        });

        Route::prefix('fixed-asset/disposal')->name('fixed-asset.disposal.')->group(function () {
            Route::prefix('reasons')->name('reasons.')->group(function () {
                Route::get('/', [AssetDisposalReasonController::class, 'index'])->name('index');
                Route::get('/create', [AssetDisposalReasonController::class, 'create'])->name('create')->middleware('permission:fixed-assets.create');
                Route::post('/', [AssetDisposalReasonController::class, 'store'])->name('store')->middleware('permission:fixed-assets.create');
                Route::get('/{reason}/edit', [AssetDisposalReasonController::class, 'edit'])->name('edit')->middleware('permission:fixed-assets.edit');
                Route::put('/{reason}', [AssetDisposalReasonController::class, 'update'])->name('update')->middleware('permission:fixed-assets.edit');
                Route::delete('/{reason}', [AssetDisposalReasonController::class, 'destroy'])->name('destroy')->middleware('permission:fixed-assets.delete');
            });

            Route::get('/requests', [AssetDisposalController::class, 'requestsIndex'])->name('requests.index');
            Route::get('/requests/create', [AssetDisposalController::class, 'requestsCreate'])->name('requests.create')->middleware('permission:fixed-assets.edit');
            Route::post('/requests', [AssetDisposalController::class, 'requestsStore'])->name('requests.store')->middleware('permission:fixed-assets.edit');

            Route::get('/dispose/create', [AssetDisposalController::class, 'disposeCreate'])->name('dispose.create')->middleware('permission:fixed-assets.delete');
            Route::post('/dispose', [AssetDisposalController::class, 'disposeStore'])->name('dispose.store')->middleware('permission:fixed-assets.delete');

            Route::get('/batch/create', [AssetDisposalController::class, 'batchCreate'])->name('batch.create')->middleware('permission:fixed-assets.delete');
            Route::post('/batch', [AssetDisposalController::class, 'batchStore'])->name('batch.store')->middleware('permission:fixed-assets.delete');

            Route::post('/requests/{asset_disposal}/approve', [AssetDisposalController::class, 'approve'])->name('approve')->middleware('permission:fixed-assets.delete');
            Route::post('/requests/{asset_disposal}/reject', [AssetDisposalController::class, 'reject'])->name('reject')->middleware('permission:fixed-assets.delete');
        });

        Route::get('/fixed-asset/disposals', [AssetDisposalController::class, 'registerIndex'])->name('fixed-asset.disposals.register');

        Route::redirect('/asset-disposals', '/fixed-asset/disposals');
        Route::redirect('/asset-disposals/create', '/fixed-asset/disposal/requests/create');

        Route::prefix('asset-disposals')->name('asset-disposals.')->group(function () {
            Route::get('/', [AssetDisposalController::class, 'index'])->name('index');
            Route::get('/create', [AssetDisposalController::class, 'create'])->name('create')->middleware('permission:fixed-assets.edit');
            Route::post('/', [AssetDisposalController::class, 'store'])->name('store')->middleware('permission:fixed-assets.edit');
            Route::post('/{asset_disposal}/approve', [AssetDisposalController::class, 'approve'])->name('approve')->middleware('permission:fixed-assets.delete');
            Route::post('/{asset_disposal}/reject', [AssetDisposalController::class, 'reject'])->name('reject')->middleware('permission:fixed-assets.delete');
        });

        Route::redirect('/asset-depreciation', '/fixed-asset/depreciation');

        Route::prefix('asset-depreciation')->name('asset-depreciation.')->group(function () {
            Route::get('/', [AssetDepreciationController::class, 'index'])->name('index');
            Route::post('/run', [AssetDepreciationController::class, 'run'])->name('run')->middleware('permission:fixed-assets.edit');
            Route::get('/schedule/{fixed_asset}', [AssetDepreciationController::class, 'schedule'])->name('schedule');
        });

        Route::post('/fixed-assets/{fixed_asset}/revaluation', [AssetRevaluationController::class, 'store'])
            ->name('fixed-assets.revaluation.store')
            ->middleware('permission:fixed-assets.edit');

        Route::prefix('fixed-asset/reports')->name('fixed-asset.reports.')->group(function () {
            Route::get('/', [FixedAssetReportController::class, 'index'])->name('index');
            Route::get('/{report}/print', [FixedAssetReportController::class, 'print'])->name('print');
            Route::get('/{report}/pdf', [FixedAssetReportController::class, 'pdf'])->name('pdf');
            Route::get('/{report}/excel', [FixedAssetReportController::class, 'excel'])->name('excel');
            Route::get('/{report}', [FixedAssetReportController::class, 'show'])->name('show');
        });
    });

