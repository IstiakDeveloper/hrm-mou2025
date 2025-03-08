<?php

use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Attendance\AttendanceController;
use App\Http\Controllers\Attendance\AttendanceDeviceController;
use App\Http\Controllers\Attendance\AttendanceSettingController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Branch\BranchController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Department\DepartmentController;
use App\Http\Controllers\Designation\DesignationController;
use App\Http\Controllers\Employee\EmployeeController;
use App\Http\Controllers\Employee\EmployeeDocumentController;
use App\Http\Controllers\Holiday\HolidayController;
use App\Http\Controllers\Leave\LeaveApplicationController;
use App\Http\Controllers\Leave\LeaveBalanceController;
use App\Http\Controllers\Leave\LeaveTypeController;
use App\Http\Controllers\Movement\MovementController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Report\ReportController;
use App\Http\Controllers\Transfer\TransferController;
use App\Http\Controllers\ZKTeco\ZKDeviceController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Public Routes
Route::get('/', function () {
    return redirect()->route('login');
});

// Authentication Routes
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Protected Routes
Route::middleware(['auth'])->group(function () {
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password.update');

    // Admin Routes
    Route::prefix('admin')->name('admin.')->middleware(['permission:users.view'])->group(function () {
        // User Management
        Route::resource('users', UserController::class);

        // Role Management
        Route::resource('roles', RoleController::class);
    });

    // Employee Management
    Route::middleware(['permission:employees.view'])->group(function () {
        Route::resource('employees', EmployeeController::class);
        Route::get('organization-chart', [EmployeeController::class, 'organizationChart'])->name('organization.chart');

        // Employee Documents
        Route::prefix('employees/{employee}/documents')->name('employees.documents.')->group(function () {
            Route::get('/', [EmployeeDocumentController::class, 'index'])->name('index');
            Route::get('/create', [EmployeeDocumentController::class, 'create'])->name('create');
            Route::post('/', [EmployeeDocumentController::class, 'store'])->name('store');
            Route::get('/{document}/edit', [EmployeeDocumentController::class, 'edit'])->name('edit');
            Route::put('/{document}', [EmployeeDocumentController::class, 'update'])->name('update');
            Route::delete('/{document}', [EmployeeDocumentController::class, 'destroy'])->name('destroy');
            Route::get('/{document}/download', [EmployeeDocumentController::class, 'download'])->name('download');
        });
    });

    // Branch Management
    Route::middleware(['permission:branches.view'])->group(function () {
        Route::resource('branches', BranchController::class);
    });

    // Department Management
    Route::middleware(['permission:departments.view'])->group(function () {
        Route::resource('departments', DepartmentController::class);
    });

    // Designation Management
    Route::middleware(['permission:designations.view'])->group(function () {
        Route::resource('designations', DesignationController::class);
    });

    // Attendance Management
    Route::middleware(['permission:attendance.view'])->prefix('attendance')->name('attendance.')->group(function () {
        Route::get('/', [AttendanceController::class, 'index'])->name('index');
        Route::get('/monthly', [AttendanceController::class, 'monthly'])->name('monthly');
        Route::get('/report', [AttendanceController::class, 'report'])->name('report');
        Route::get('/create', [AttendanceController::class, 'create'])->name('create');
        Route::post('/', [AttendanceController::class, 'store'])->name('store');
        Route::get('/{attendance}/edit', [AttendanceController::class, 'edit'])->name('edit');
        Route::put('/{attendance}', [AttendanceController::class, 'update'])->name('update');
        Route::delete('/{attendance}', [AttendanceController::class, 'destroy'])->name('destroy');

        // Attendance Device Management
        Route::prefix('devices')->name('devices.')->group(function () {
            Route::get('/', [AttendanceDeviceController::class, 'index'])->name('index');
            Route::get('/create', [AttendanceDeviceController::class, 'create'])->name('create');
            Route::post('/', [AttendanceDeviceController::class, 'store'])->name('store');
            Route::get('/{device}/edit', [AttendanceDeviceController::class, 'edit'])->name('edit');
            Route::put('/{device}', [AttendanceDeviceController::class, 'update'])->name('update');
            Route::delete('/{device}', [AttendanceDeviceController::class, 'destroy'])->name('destroy');
            Route::post('/{device}/test-connection', [AttendanceDeviceController::class, 'testConnection'])->name('test-connection');
        });

        // Attendance Settings
        Route::prefix('settings')->name('settings.')->group(function () {
            Route::get('/', [AttendanceSettingController::class, 'index'])->name('index');
            Route::get('/create', [AttendanceSettingController::class, 'create'])->name('create');
            Route::post('/', [AttendanceSettingController::class, 'store'])->name('store');
            Route::get('/{setting}/edit', [AttendanceSettingController::class, 'edit'])->name('edit');
            Route::put('/{setting}', [AttendanceSettingController::class, 'update'])->name('update');
            Route::delete('/{setting}', [AttendanceSettingController::class, 'destroy'])->name('destroy');
        });

        // Sync Attendance from Devices
        Route::post('/sync-devices', [AttendanceController::class, 'syncDevices'])->name('sync-devices');
    });

    // Leave Management
    Route::prefix('leave')->name('leave.')->group(function () {
        // Leave Types
        Route::middleware(['permission:leaves.view'])->prefix('types')->name('types.')->group(function () {
            Route::get('/', [LeaveTypeController::class, 'index'])->name('index');
            Route::get('/create', [LeaveTypeController::class, 'create'])->name('create');
            Route::post('/', [LeaveTypeController::class, 'store'])->name('store');
            Route::get('/{leaveType}/edit', [LeaveTypeController::class, 'edit'])->name('edit');
            Route::put('/{leaveType}', [LeaveTypeController::class, 'update'])->name('update');
            Route::delete('/{leaveType}', [LeaveTypeController::class, 'destroy'])->name('destroy');
        });

        // Leave Balances
        Route::middleware(['permission:leaves.view'])->prefix('balances')->name('balances.')->group(function () {
            Route::get('/', [LeaveBalanceController::class, 'index'])->name('index');
            Route::get('/create', [LeaveBalanceController::class, 'create'])->name('create');
            Route::post('/', [LeaveBalanceController::class, 'store'])->name('store');
            Route::get('/{leaveBalance}/edit', [LeaveBalanceController::class, 'edit'])->name('edit');
            Route::put('/{leaveBalance}', [LeaveBalanceController::class, 'update'])->name('update');
            Route::get('/allocate-bulk', [LeaveBalanceController::class, 'allocateBulk'])->name('allocate-bulk');
            Route::post('/store-bulk', [LeaveBalanceController::class, 'storeBulk'])->name('store-bulk');
            Route::post('/reset-for-new-year', [LeaveBalanceController::class, 'resetForNewYear'])->name('reset-for-new-year');
        });

        // Leave Applications
        Route::prefix('applications')->name('applications.')->group(function () {
            Route::get('/', [LeaveApplicationController::class, 'index'])->name('index');
            Route::get('/create', [LeaveApplicationController::class, 'create'])->name('create');
            Route::post('/', [LeaveApplicationController::class, 'store'])->name('store');
            Route::get('/{application}', [LeaveApplicationController::class, 'show'])->name('show');
            Route::post('/{application}/cancel', [LeaveApplicationController::class, 'cancel'])->name('cancel');
            Route::post('/{application}/approve', [LeaveApplicationController::class, 'approve'])->name('approve')->middleware('permission:leaves.approve');
            Route::post('/{application}/reject', [LeaveApplicationController::class, 'reject'])->name('reject')->middleware('permission:leaves.approve');
            Route::get('/{application}/document/{index}', [LeaveApplicationController::class, 'downloadDocument'])->name('download-document');
            Route::get('/report', [LeaveApplicationController::class, 'report'])->name('report');
        });
    });

    // Movement Management
    Route::prefix('movements')->name('movements.')->group(function () {
        Route::get('/', [MovementController::class, 'index'])->name('index');
        Route::get('/create', [MovementController::class, 'create'])->name('create');
        Route::get('/report', [MovementController::class, 'report'])->name('report');
        Route::post('/', [MovementController::class, 'store'])->name('store');
        Route::get('/{movement}', [MovementController::class, 'show'])->name('show');
        Route::get('/{movement}/edit', [MovementController::class, 'edit'])->name('edit');
        Route::put('/{movement}', [MovementController::class, 'update'])->name('update');
        Route::post('/{movement}/cancel', [MovementController::class, 'cancel'])->name('cancel');
        Route::post('/{movement}/approve', [MovementController::class, 'approve'])->name('approve')->middleware('permission:movements.approve');
        Route::post('/{movement}/reject', [MovementController::class, 'reject'])->name('reject')->middleware('permission:movements.approve');
        Route::post('/{movement}/complete', [MovementController::class, 'complete'])->name('complete');


    });

    // Transfer Management
    Route::prefix('transfers')->name('transfers.')->group(function () {
        Route::get('/', [TransferController::class, 'index'])->name('index');
        Route::get('/create', [TransferController::class, 'create'])->name('create')->middleware('permission:transfers.create');
        Route::post('/', [TransferController::class, 'store'])->name('store')->middleware('permission:transfers.create');
        Route::get('/{transfer}', [TransferController::class, 'show'])->name('show');
        Route::get('/{transfer}/edit', [TransferController::class, 'edit'])->name('edit')->middleware('permission:transfers.edit');
        Route::put('/{transfer}', [TransferController::class, 'update'])->name('update')->middleware('permission:transfers.edit');
        Route::post('/{transfer}/cancel', [TransferController::class, 'cancel'])->name('cancel')->middleware('permission:transfers.edit');
        Route::post('/{transfer}/approve', [TransferController::class, 'approve'])->name('approve')->middleware('permission:transfers.approve');
        Route::post('/{transfer}/reject', [TransferController::class, 'reject'])->name('reject')->middleware('permission:transfers.approve');
        Route::post('/{transfer}/complete', [TransferController::class, 'complete'])->name('complete')->middleware('permission:transfers.edit');
        Route::get('/report', [TransferController::class, 'report'])->name('report');
    });

    // Holiday Management
    Route::resource('holidays', HolidayController::class);
    Route::get('/holiday-calendar', [HolidayController::class, 'calendar'])->name('holidays.calendar');

    // ZKTeco Integration
    Route::middleware(['permission:attendance.view'])->prefix('zkteco')->name('zkteco.')->group(function () {
        Route::get('/', [ZKDeviceController::class, 'index'])->name('dashboard');
        Route::post('/sync-device/{device}', [ZKDeviceController::class, 'syncDevice'])->name('sync-device');
        Route::post('/sync-all', [ZKDeviceController::class, 'syncAll'])->name('sync-all');
        Route::post('/test-connection/{device}', [ZKDeviceController::class, 'testConnection'])->name('test-connection');
        Route::post('/upload-employees/{device}', [ZKDeviceController::class, 'uploadEmployees'])->name('upload-employees');
    });

    // Reports
    Route::middleware(['permission:reports.view'])->prefix( 'reports')->name('reports.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::get('/attendance', [ReportController::class, 'attendance'])->name('attendance');
        Route::get('/leave', [ReportController::class, 'leave'])->name('leave');
        Route::get('/movement', [ReportController::class, 'movement'])->name('movement');
        Route::get('/transfer', [ReportController::class, 'transfer'])->name('transfer');
        Route::get('/employee', [ReportController::class, 'employee'])->name('employee');
        Route::post('/export-pdf', [ReportController::class, 'exportPdf'])->name('export-pdf');
        Route::post('/export-excel', [ReportController::class, 'exportExcel'])->name('export-excel');
    });
});
