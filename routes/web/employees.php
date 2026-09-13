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
use App\Http\Controllers\Employee\EmployeeImportController;
use App\Http\Controllers\Employee\EmployeeLookupController;
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
    // EMPLOYEE MANAGEMENT
    // ====================
    Route::get('employees/lookup', [EmployeeLookupController::class, 'lookup'])
        ->name('employees.lookup');

    Route::get('employees/locations/upazilas', [EmployeeLookupController::class, 'locationsUpazilas'])
        ->name('employees.locations.upazilas');

    Route::get('employees/locations/unions', [EmployeeLookupController::class, 'locationsUnions'])
        ->name('employees.locations.unions');

    Route::get('employees/salary-assignment-preview', [EmployeeController::class, 'salaryAssignmentPreview'])
        ->name('employees.salary-assignment-preview')
        ->middleware('permission:employees.view');

    Route::middleware(['permission:employees.view'])->group(function () {
        Route::get('employees/export.xlsx', [EmployeeController::class, 'exportXlsx'])
            ->name('employees.export');

        Route::resource('employees', EmployeeController::class)->parameters(['employees' => 'employee']);

        Route::patch('employees/{employee}/status', [EmployeeController::class, 'updateStatus'])
            ->name('employees.update-status')
            ->middleware('permission:employees.edit');

        Route::get('employees/pin-suggestion', [EmployeeLookupController::class, 'pinSuggestion'])
            ->name('employees.pin-suggestion')
            ->middleware('permission:employees.create');

        Route::post('employees/villages', [EmployeeLookupController::class, 'storeVillage'])
            ->name('employees.villages.store')
            ->middleware('permission:employees.create');

        Route::post('employees/unions', [EmployeeLookupController::class, 'storeUnion'])
            ->name('employees.unions.store')
            ->middleware('permission:employees.create');

        // Import Wizard
        Route::post('employees/import/preview', [EmployeeImportController::class, 'importPreview'])
            ->name('employees.import.preview')
            ->middleware('permission:employees.create');
        Route::get('employees/import/review/{importId}', [EmployeeImportController::class, 'importReview'])
            ->name('employees.import.review')
            ->middleware('permission:employees.create');
        Route::get('employees/import/example.xlsx', [EmployeeImportController::class, 'downloadImportExample'])
            ->name('employees.import.example')
            ->middleware('permission:employees.view');
        Route::post('employees/import/commit', [EmployeeImportController::class, 'importCommit'])
            ->name('employees.import.commit')
            ->middleware('permission:employees.create');

        // Organization Chart
        Route::get('organization-chart', [EmployeeController::class, 'organizationChart'])
            ->name('organization.chart');

        // Disciplinary Actions Management
        Route::resource('disciplinary-actions', DisciplinaryActionController::class)
            ->only(['index', 'create', 'store', 'destroy'])
            ->middleware('permission:employees.edit');

        // Blank Employee Form (Printable)
        Route::get('employees-blank-form', [EmployeeController::class, 'blankForm'])
            ->name('employees.blank-form');

        // Employee Documents Management
        Route::prefix('employees/{employee}/documents')->name('employees.documents.')->group(function () {
            Route::get('/', [EmployeeDocumentController::class, 'index'])->name('index');
            Route::get('/create', [EmployeeDocumentController::class, 'create'])
                ->name('create')
                ->middleware('permission:employees.edit');
            Route::post('/', [EmployeeDocumentController::class, 'store'])
                ->name('store')
                ->middleware('permission:employees.edit');
            Route::get('/{document}/edit', [EmployeeDocumentController::class, 'edit'])
                ->name('edit')
                ->middleware('permission:employees.edit');
            Route::put('/{document}', [EmployeeDocumentController::class, 'update'])
                ->name('update')
                ->middleware('permission:employees.edit');
            Route::delete('/{document}', [EmployeeDocumentController::class, 'destroy'])
                ->name('destroy')
                ->middleware('permission:employees.delete');
            Route::get('/{document}/download', [EmployeeDocumentController::class, 'download'])
                ->name('download');
        });

        // Employee Specific Reports
        Route::prefix('employees/{employee}')->name('employees.')->group(function () {
            Route::get('/leaves', [EmployeeLeaveController::class, 'index'])->name('leaves.index');
            Route::get('/movements', [EmployeeMovementController::class, 'index'])->name('movements.index');
            Route::get('/leaves/download', [EmployeeLeaveController::class, 'downloadPdf'])->name('leaves.download');
            Route::get('/movements/download', [EmployeeMovementController::class, 'downloadPdf'])->name('movements.download');
        });
    });

    // Employee Dashboard (HR + organogram line roles): access is enforced in the controller; dropdown is organogram-scoped.
    Route::get('employee/dashboard', [EmployeeDashboardController::class, 'index'])
        ->name('employee.dashboard');
    Route::get('employee/leave/pdf', [EmployeeDashboardController::class, 'downloadLeavePdf'])->name('employee.leave.pdf');
    Route::prefix('employee/dashboard')->name('employee.dashboard.')->group(function () {
        Route::get('/pdf', [EmployeeDashboardController::class, 'downloadPdf'])->name('pdf');
        Route::get('/leave/pdf', [EmployeeDashboardController::class, 'downloadLeavePdf'])->name('leave.pdf');
        Route::get('/attendance/pdf', [EmployeeDashboardController::class, 'downloadAttendancePdf'])->name('attendance.pdf');
        Route::get('/movement/pdf', [EmployeeDashboardController::class, 'downloadMovementPdf'])->name('movement.pdf');
    });

