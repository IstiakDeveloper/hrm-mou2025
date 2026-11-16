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
    // ORGANIZATION SETUP
    // ====================

    Route::middleware(['permission:branches.view'])->prefix('organization-structure')->name('organization-structure.')->group(function () {
        Route::get('/', [OrganizationStructureController::class, 'index'])->name('index');
        Route::patch('/branches/{branch}/regional-office', [OrganizationStructureController::class, 'updateBranchRegionalOffice'])
            ->name('branches.regional-office')
            ->middleware('permission:branches.edit');
        Route::patch('/regional-offices/{regionalOffice}/zone', [OrganizationStructureController::class, 'updateRegionalOfficeZone'])
            ->name('regional-offices.zone')
            ->middleware('permission:regional-offices.edit');
    });

    // Branch Management
    Route::middleware(['permission:branches.view'])->prefix('branches')->name('branches.')->group(function () {
        Route::get('/', [BranchController::class, 'index'])->name('index');
        Route::get('/create', [BranchController::class, 'create'])
            ->name('create')
            ->middleware('permission:branches.create');
        Route::post('/', [BranchController::class, 'store'])
            ->name('store')
            ->middleware('permission:branches.create');
        Route::get('/{branch}', [BranchController::class, 'show'])->name('show');
        Route::get('/{branch}/edit', [BranchController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:branches.edit');
        Route::put('/{branch}', [BranchController::class, 'update'])
            ->name('update')
            ->middleware('permission:branches.edit');
        Route::delete('/{branch}', [BranchController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:branches.delete');
    });

    // Zone Management
    Route::middleware(['permission:zones.view'])->prefix('zones')->name('zones.')->group(function () {
        Route::get('/', [ZoneController::class, 'index'])->name('index');
        Route::get('/create', [ZoneController::class, 'create'])
            ->name('create')
            ->middleware('permission:zones.create');
        Route::post('/', [ZoneController::class, 'store'])
            ->name('store')
            ->middleware('permission:zones.create');
        Route::get('/{zone}/edit', [ZoneController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:zones.edit');
        Route::put('/{zone}', [ZoneController::class, 'update'])
            ->name('update')
            ->middleware('permission:zones.edit');
        Route::delete('/{zone}', [ZoneController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:zones.delete');
    });

    // Regional Office Management
    Route::middleware(['permission:regional-offices.view'])->prefix('regional-offices')->name('regional-offices.')->group(function () {
        Route::get('/', [RegionalOfficeController::class, 'index'])->name('index');
        Route::get('/create', [RegionalOfficeController::class, 'create'])
            ->name('create')
            ->middleware('permission:regional-offices.create');
        Route::post('/', [RegionalOfficeController::class, 'store'])
            ->name('store')
            ->middleware('permission:regional-offices.create');
        Route::get('/{regionalOffice}/edit', [RegionalOfficeController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:regional-offices.edit');
        Route::put('/{regionalOffice}', [RegionalOfficeController::class, 'update'])
            ->name('update')
            ->middleware('permission:regional-offices.edit');
        Route::delete('/{regionalOffice}', [RegionalOfficeController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:regional-offices.delete');
    });

    // Department Management
    Route::middleware(['permission:departments.view'])->prefix('departments')->name('departments.')->group(function () {
        Route::get('/', [DepartmentController::class, 'index'])->name('index');
        Route::get('/create', [DepartmentController::class, 'create'])
            ->name('create')
            ->middleware('permission:departments.create');
        Route::post('/', [DepartmentController::class, 'store'])
            ->name('store')
            ->middleware('permission:departments.create');
        Route::get('/{department}', [DepartmentController::class, 'show'])->name('show');
        Route::get('/{department}/edit', [DepartmentController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:departments.edit');
        Route::put('/{department}', [DepartmentController::class, 'update'])
            ->name('update')
            ->middleware('permission:departments.edit');
        Route::delete('/{department}', [DepartmentController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:departments.delete');
    });

    // Designation Management
    Route::middleware(['permission:designations.view'])->prefix('designations')->name('designations.')->group(function () {
        Route::get('/', [DesignationController::class, 'index'])->name('index');
        Route::get('/create', [DesignationController::class, 'create'])
            ->name('create')
            ->middleware('permission:designations.create');
        Route::post('/', [DesignationController::class, 'store'])
            ->name('store')
            ->middleware('permission:designations.create');
        Route::get('/{designation}', [DesignationController::class, 'show'])->name('show');
        Route::get('/{designation}/edit', [DesignationController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:designations.edit');
        Route::put('/{designation}', [DesignationController::class, 'update'])
            ->name('update')
            ->middleware('permission:designations.edit');
        Route::delete('/{designation}', [DesignationController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:designations.delete');
    });

    // Employee types, programs & projects (employee form lookups; list like departments, edits aligned with employee create/edit)
    Route::middleware(['permission:departments.view'])->prefix('employee-types')->name('employee-types.')->group(function () {
        Route::get('/', [EmployeeTypeController::class, 'index'])->name('index');
        Route::get('/create', [EmployeeTypeController::class, 'create'])
            ->name('create')
            ->middleware('permission:employees.create');
        Route::post('/', [EmployeeTypeController::class, 'store'])
            ->name('store')
            ->middleware('permission:employees.create');
        Route::get('/{employee_type}/edit', [EmployeeTypeController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:employees.edit');
        Route::put('/{employee_type}', [EmployeeTypeController::class, 'update'])
            ->name('update')
            ->middleware('permission:employees.edit');
        Route::delete('/{employee_type}', [EmployeeTypeController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:employees.delete');
    });

    Route::middleware(['permission:departments.view'])->prefix('programs')->name('programs.')->group(function () {
        Route::get('/', [ProgramController::class, 'index'])->name('index');
        Route::get('/create', [ProgramController::class, 'create'])
            ->name('create')
            ->middleware('permission:employees.create');
        Route::post('/', [ProgramController::class, 'store'])
            ->name('store')
            ->middleware('permission:employees.create');
        Route::get('/{program}/edit', [ProgramController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:employees.edit');
        Route::put('/{program}', [ProgramController::class, 'update'])
            ->name('update')
            ->middleware('permission:employees.edit');
        Route::delete('/{program}', [ProgramController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:employees.delete');
    });

    Route::middleware(['permission:departments.view'])->prefix('projects')->name('projects.')->group(function () {
        Route::get('/', [ProjectController::class, 'index'])->name('index');
        Route::get('/create', [ProjectController::class, 'create'])
            ->name('create')
            ->middleware('permission:employees.create');
        Route::post('/', [ProjectController::class, 'store'])
            ->name('store')
            ->middleware('permission:employees.create');
        Route::get('/{project}/edit', [ProjectController::class, 'edit'])
            ->name('edit')
            ->middleware('permission:employees.edit');
        Route::put('/{project}', [ProjectController::class, 'update'])
            ->name('update')
            ->middleware('permission:employees.edit');
        Route::delete('/{project}', [ProjectController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:employees.delete');
    });

