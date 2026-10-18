<?php

use App\Http\Controllers\Attendance\AttendanceController;
use App\Http\Controllers\Attendance\AttendanceDeviceController;
use App\Http\Controllers\Attendance\AttendanceReportController;
use App\Http\Controllers\Attendance\AttendanceSettingController;
use App\Http\Controllers\AttendanceExportController;
use Illuminate\Support\Facades\Route;

// ====================
// ATTENDANCE MANAGEMENT
// ====================
Route::middleware(['permission:attendance.view'])->prefix('attendance')->name('attendance.')->group(function () {

    // Basic Attendance Operations
    Route::get('/', [AttendanceController::class, 'index'])->name('index');
    Route::get('/monthly', [AttendanceController::class, 'monthly'])->name('monthly');
    Route::get('/daily-branch-summary', [AttendanceController::class, 'dailyBranchSummary'])->name('daily-branch-summary');
    Route::get('/report', [AttendanceController::class, 'report'])->name('report');
    Route::get('/sheet-report', [AttendanceController::class, 'sheetReport'])->name('sheet-report');
    Route::get('/pdf', [AttendanceController::class, 'generatePdf'])->name('pdf');

    // Super Admin Bulk Attendance Operations
    Route::get('/bulk-preview', [AttendanceController::class, 'bulkPreview'])->name('bulk-preview');
    Route::post('/bulk-store', [AttendanceController::class, 'bulkStore'])->name('bulk-store');

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
        // Static paths before {device} so they are never captured as a device id
        Route::get('/biometric-ids', [AttendanceDeviceController::class, 'biometricIds'])->name('biometric-ids');
        Route::get('/sync-report', [AttendanceDeviceController::class, 'syncReport'])->name('sync-report');
        Route::put('/sync-settings', [AttendanceDeviceController::class, 'updateSyncSettings'])->name('sync-settings');
        Route::patch('/{device}/sync-flags', [AttendanceDeviceController::class, 'updateSyncFlags'])->name('sync-flags');
        Route::get('/{device}/edit', [AttendanceDeviceController::class, 'edit'])->name('edit');
        Route::put('/{device}', [AttendanceDeviceController::class, 'update'])->name('update');
        Route::delete('/{device}', [AttendanceDeviceController::class, 'destroy'])->name('destroy');
        Route::post('/{device}/test-connection', [AttendanceDeviceController::class, 'testConnection'])->name('test-connection');
    });

    // Attendance Settings
    Route::middleware(['permission:attendance.admin'])->prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [AttendanceSettingController::class, 'index'])->name('index');
        Route::post('/toggle-bulk-attendance', [AttendanceSettingController::class, 'toggleBulkAttendance'])->name('toggle-bulk-attendance');
        Route::post('/toggle-multi-day-movement', [AttendanceSettingController::class, 'toggleMultiDayMovement'])->name('toggle-multi-day-movement');
        Route::put('/guard-shift', [AttendanceSettingController::class, 'updateGuardShift'])->name('guard-shift');
        Route::put('/device-log-keep', [AttendanceSettingController::class, 'updateDeviceLogKeep'])->name('device-log-keep');
        Route::post('/office-open-dates', [AttendanceSettingController::class, 'storeOfficeOpenDate'])->name('office-open-dates.store');
        Route::delete('/office-open-dates/{officeOpenDate}', [AttendanceSettingController::class, 'destroyOfficeOpenDate'])->name('office-open-dates.destroy');
        Route::post('/devices/{device}/push-missing', [AttendanceSettingController::class, 'pushMissingDeviceUsers'])->name('devices.push-missing');
        Route::get('/create', [AttendanceSettingController::class, 'create'])->name('create');
        Route::post('/', [AttendanceSettingController::class, 'store'])->name('store');
        Route::get('/employee-times', [\App\Http\Controllers\Attendance\EmployeeAttendanceTimeController::class, 'index'])->name('employee-times');
        Route::put('/employee-times/{employee}', [\App\Http\Controllers\Attendance\EmployeeAttendanceTimeController::class, 'upsert'])->name('employee-times.upsert');
        Route::delete('/employee-times/{employee}', [\App\Http\Controllers\Attendance\EmployeeAttendanceTimeController::class, 'destroy'])->name('employee-times.destroy');
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
        Route::get('/report/pdf', [AttendanceReportController::class, 'downloadPdf'])->name('report.pdf');
    });
});
