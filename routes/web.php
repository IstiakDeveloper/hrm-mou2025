<?php

use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Attendance\AttendanceController;
use App\Http\Controllers\Attendance\AttendanceDeviceController;
use App\Http\Controllers\Attendance\AttendanceReportController;
use App\Http\Controllers\Attendance\AttendanceSettingController;
use App\Http\Controllers\AttendanceExportController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Branch\BranchController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Department\DepartmentController;
use App\Http\Controllers\Designation\DesignationController;
use App\Http\Controllers\Employee\EmployeeController;
use App\Http\Controllers\Employee\EmployeeDashboardController;
use App\Http\Controllers\Employee\EmployeeDocumentController;
use App\Http\Controllers\Employee\EmployeeLeaveController;
use App\Http\Controllers\Employee\EmployeeMovementController;
use App\Http\Controllers\Holiday\HolidayController;
use App\Http\Controllers\Leave\LeaveApplicationController;
use App\Http\Controllers\Leave\LeaveBalanceController;
use App\Http\Controllers\Leave\LeaveTypeController;
use App\Http\Controllers\Movement\MovementController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Report\ReportController;
use App\Http\Controllers\Transfer\TransferController;
use App\Http\Controllers\ZKTeco\ZKDeviceController;
use App\Models\Role;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes - HRM System
|--------------------------------------------------------------------------
|
| Organized permission-based routing system
| Permission Structure: module.action (e.g., users.view, employees.create)
|
*/

// ====================
// PUBLIC ROUTES
// ====================
Route::get('/', function () {
    return Auth::check() ? redirect()->route('dashboard') : redirect()->route('login');
});


Route::get('/admin/roles/fix-permissions', [RoleController::class, 'fixAllRolePermissions'])
    ->name('admin.roles.fix-permissions')
    ->middleware('permission:admin.access');

Route::get('/admin/roles/permissions-api', [RoleController::class, 'permissions'])
    ->name('admin.roles.permissions-api')
    ->middleware('permission:roles.view');

// Debug route (remove in production)
Route::get('/debug/role/{role}', function (Role $role) {
    $permissions = json_decode($role->permissions, true) ?? [];
    return response()->json([
        'role_id' => $role->id,
        'role_name' => $role->name,
        'current_permissions' => $permissions,
        'permission_count' => count($permissions)
    ]);
})->name('debug.role');
// Utility Routes
Route::get('/storage-link', function () {
    Artisan::call('storage:link');
    return response()->json(['message' => 'Storage link created successfully.']);
})->name('storage.link');

Route::get('/migrate', function () {
    Artisan::call('migrate');
    return response()->json(['message' => 'Migrations run successfully.']);
})->name('migrate');

// ====================
// AUTHENTICATION ROUTES
// ====================
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');
});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

// ====================
// PROTECTED ROUTES
// ====================
Route::middleware(['auth'])->group(function () {

    // Dashboard - Available to all authenticated users
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Profile - Available to all authenticated users
    Route::prefix('profile')->name('profile.')->group(function () {
        Route::get('/', [ProfileController::class, 'edit'])->name('edit');
        Route::patch('/', [ProfileController::class, 'update'])->name('update');
        Route::patch('/password', [ProfileController::class, 'updatePassword'])->name('password.update');
    });

    // Notifications - Available to all authenticated users
    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('/unread-count', [NotificationController::class, 'getUnreadCount'])->name('unread-count');
        Route::get('/latest', [NotificationController::class, 'getLatestNotifications'])->name('latest');
        Route::post('/{id}/mark-as-read', [NotificationController::class, 'markAsRead'])->name('mark-as-read');
        Route::post('/mark-all-as-read', [NotificationController::class, 'markAllAsRead'])->name('mark-all-as-read');
    });

    // ====================
    // ADMIN MANAGEMENT (Super Admin Only)
    // ====================
    Route::prefix('admin')->name('admin.')->middleware(['permission:admin.access'])->group(function () {

        // User Management
        Route::middleware(['permission:users.view'])->group(function () {
            Route::resource('users', UserController::class)->parameters(['users' => 'user']);
            Route::post('users/{user}/toggle-status', [UserController::class, 'toggleStatus'])
                ->name('users.toggle-status')
                ->middleware('permission:users.edit');
        });




        // Role & Permission Management
        Route::middleware(['permission:roles.view'])->group(function () {
            Route::resource('roles', RoleController::class)->parameters(['roles' => 'role']);
            Route::get('permissions', [RoleController::class, 'permissions'])
                ->name('permissions.index')
                ->middleware('permission:roles.view');
        });
    });




    // ====================
    // EMPLOYEE MANAGEMENT
    // ====================
    Route::middleware(['permission:employees.view'])->group(function () {
        Route::resource('employees', EmployeeController::class)->parameters(['employees' => 'employee']);

        // Organization Chart
        Route::get('organization-chart', [EmployeeController::class, 'organizationChart'])
            ->name('organization.chart');

        // Employee Dashboard (for viewing individual employee data)
        Route::get('employee/dashboard', [EmployeeDashboardController::class, 'index'])
            ->name('employee.dashboard');

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

        // Employee Dashboard Reports
        Route::prefix('employee/dashboard')->name('employee.dashboard.')->group(function () {
            Route::get('/pdf', [EmployeeDashboardController::class, 'downloadPdf'])->name('pdf');
            Route::get('/leave/pdf', [EmployeeDashboardController::class, 'downloadLeavePdf'])->name('leave.pdf');
            Route::get('/attendance/pdf', [EmployeeDashboardController::class, 'downloadAttendancePdf'])->name('attendance.pdf');
            Route::get('/movement/pdf', [EmployeeDashboardController::class, 'downloadMovementPdf'])->name('movement.pdf');
        });
    });

    // ====================
    // ORGANIZATION SETUP
    // ====================

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

    // ====================
    // ATTENDANCE MANAGEMENT
    // ====================
    Route::middleware(['permission:attendance.view'])->prefix('attendance')->name('attendance.')->group(function () {

        // Basic Attendance Operations
        Route::get('/', [AttendanceController::class, 'index'])->name('index');
        Route::get('/monthly', [AttendanceController::class, 'monthly'])->name('monthly');
        Route::get('/report', [AttendanceController::class, 'report'])->name('report');
        Route::get('/sheet-report', [AttendanceController::class, 'sheetReport'])->name('sheet-report');
        Route::get('/pdf', [AttendanceController::class, 'generatePdf'])->name('pdf');

        // Attendance CRUD Operations
        Route::middleware(['permission:attendance.create'])->group(function () {
            Route::get('/create', [AttendanceController::class, 'create'])->name('create');
            Route::post('/', [AttendanceController::class, 'store'])->name('store');
        });

        Route::middleware(['permission:attendance.edit'])->group(function () {
            Route::get('/{attendance}/edit', [AttendanceController::class, 'edit'])->name('edit');
            Route::put('/{attendance}', [AttendanceController::class, 'update'])->name('update');
        });

        Route::delete('/{attendance}', [AttendanceController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:attendance.delete');

        // Device Sync Operations
        Route::post('/sync-devices', [AttendanceController::class, 'syncDevices'])
            ->name('sync-devices')
            ->middleware('permission:attendance.sync');

        // Device Management
        Route::middleware(['permission:attendance.admin'])->prefix('devices')->name('devices.')->group(function () {
            Route::get('/', [AttendanceDeviceController::class, 'index'])->name('index');
            Route::get('/create', [AttendanceDeviceController::class, 'create'])->name('create');
            Route::post('/', [AttendanceDeviceController::class, 'store'])->name('store');
            Route::get('/{device}/edit', [AttendanceDeviceController::class, 'edit'])->name('edit');
            Route::put('/{device}', [AttendanceDeviceController::class, 'update'])->name('update');
            Route::delete('/{device}', [AttendanceDeviceController::class, 'destroy'])->name('destroy');
            Route::post('/{device}/test-connection', [AttendanceDeviceController::class, 'testConnection'])->name('test-connection');
            Route::get('/biometric-ids', [AttendanceDeviceController::class, 'biometricIds'])->name('biometric-ids');
            Route::get('/sync-report', [AttendanceDeviceController::class, 'syncReport'])->name('sync-report');
        });

        // Attendance Settings
        Route::middleware(['permission:attendance.admin'])->prefix('settings')->name('settings.')->group(function () {
            Route::get('/', [AttendanceSettingController::class, 'index'])->name('index');
            Route::get('/create', [AttendanceSettingController::class, 'create'])->name('create');
            Route::post('/', [AttendanceSettingController::class, 'store'])->name('store');
            Route::get('/{setting}/edit', [AttendanceSettingController::class, 'edit'])->name('edit');
            Route::put('/{setting}', [AttendanceSettingController::class, 'update'])->name('update');
            Route::delete('/{setting}', [AttendanceSettingController::class, 'destroy'])->name('destroy');
        });
    });

    // Additional Attendance Routes
    Route::middleware(['permission:attendance.view'])->group(function () {
        Route::put('/attendance/employees/{employee}/biometric-id', [AttendanceDeviceController::class, 'updateBiometricId'])
            ->name('attendance.employees.biometric-id')
            ->middleware('permission:attendance.edit');

        // Export Routes
        Route::prefix('exports')->name('exports.')->group(function () {
            Route::get('/attendance/monthly', [AttendanceExportController::class, 'exportMonthlyPdf'])->name('attendance.monthly');
        });

        // Report Routes
        Route::prefix('attendance')->name('attendance.')->group(function () {
            Route::get('/report', [AttendanceReportController::class, 'index'])->name('report');
            Route::post('/report', [AttendanceReportController::class, 'index']);
            Route::post('/report/pdf', [AttendanceReportController::class, 'downloadPdf'])->name('report.pdf');
        });
    });

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
                Route::post('/reset-for-new-year', [LeaveBalanceController::class, 'resetForNewYear'])->name('reset-for-new-year');
            });
        });

        // Leave Applications Management
        Route::prefix('applications')->name('applications.')->group(function () {
            // View applications (employees can see their own, managers can see team's)
            Route::get('/', [LeaveApplicationController::class, 'index'])
                ->name('index')
                ->middleware('permission:leave-applications.view');

            // Create leave application (employees can apply for themselves)
            Route::middleware(['permission:leave-applications.create'])->group(function () {
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
            Route::get('/report', [LeaveApplicationController::class, 'report'])
                ->name('report')
                ->middleware('permission:reports.view');
        });
    });

    // ====================
    // MOVEMENT MANAGEMENT
    // ====================
    Route::prefix('movements')->name('movements.')->group(function () {
        // View movements
        Route::get('/', [MovementController::class, 'index'])
            ->name('index')
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

        // Edit movement
        Route::middleware(['permission:movements.edit'])->group(function () {
            Route::get('/{movement}/edit', [MovementController::class, 'edit'])->name('edit');
            Route::put('/{movement}', [MovementController::class, 'update'])->name('update');
        });

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

    // ====================
    // TRANSFER MANAGEMENT
    // ====================
    Route::middleware(['permission:transfers.view'])->prefix('transfers')->name('transfers.')->group(function () {
        Route::get('/', [TransferController::class, 'index'])->name('index');

        Route::middleware(['permission:transfers.create'])->group(function () {
            Route::get('/create', [TransferController::class, 'create'])->name('create');
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

        Route::get('/report', [TransferController::class, 'report'])
            ->name('report')
            ->middleware('permission:reports.view');
    });

    // ====================
    // HOLIDAY MANAGEMENT
    // ====================
    Route::middleware(['permission:holidays.view'])->prefix('holidays')->name('holidays.')->group(function () {
        Route::get('/', [HolidayController::class, 'index'])->name('index');
        Route::get('/calendar', [HolidayController::class, 'calendar'])->name('calendar');

        Route::middleware(['permission:holidays.create'])->group(function () {
            Route::get('/create', [HolidayController::class, 'create'])->name('create');
            Route::post('/', [HolidayController::class, 'store'])->name('store');
        });

        Route::get('/{holiday}', [HolidayController::class, 'show'])->name('show');

        Route::middleware(['permission:holidays.edit'])->group(function () {
            Route::get('/{holiday}/edit', [HolidayController::class, 'edit'])->name('edit');
            Route::put('/{holiday}', [HolidayController::class, 'update'])->name('update');
        });

        Route::delete('/{holiday}', [HolidayController::class, 'destroy'])
            ->name('destroy')
            ->middleware('permission:holidays.delete');
    });

    // ====================
    // ZKTECO INTEGRATION
    // ====================
    Route::middleware(['permission:attendance.admin'])->prefix('zkteco')->name('zkteco.')->group(function () {
        Route::get('/', [ZKDeviceController::class, 'index'])->name('dashboard');
        Route::post('/sync-device/{device}', [ZKDeviceController::class, 'syncDevice'])->name('sync-device');
        Route::post('/sync-all', [ZKDeviceController::class, 'syncAll'])->name('sync-all');
        Route::post('/test-connection/{device}', [ZKDeviceController::class, 'testConnection'])->name('test-connection');
        Route::post('/upload-employees/{device}', [ZKDeviceController::class, 'uploadEmployees'])->name('upload-employees');
    });

    // ====================
    // REPORTS MANAGEMENT
    // ====================
    Route::middleware(['permission:reports.view'])->prefix('reports')->name('reports.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::get('/attendance', [ReportController::class, 'attendance'])->name('attendance');
        Route::get('/leave', [ReportController::class, 'leave'])->name('leave');
        Route::get('/movement', [ReportController::class, 'movement'])->name('movement');
        Route::get('/transfer', [ReportController::class, 'transfer'])->name('transfer');
        Route::get('/employee', [ReportController::class, 'employee'])->name('employee');

        // Export functions
        Route::middleware(['permission:reports.export'])->group(function () {
            Route::post('/export-pdf', [ReportController::class, 'exportPdf'])->name('export-pdf');
            Route::post('/export-excel', [ReportController::class, 'exportExcel'])->name('export-excel');
            Route::get('/leave/pdf', [ReportController::class, 'downloadLeaveReportPdf'])->name('leave.pdf');
            Route::get('/leave/excel', [ReportController::class, 'downloadLeaveReportExcel'])->name('leave.excel');
        });
    });
});
