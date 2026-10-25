<?php

use App\Http\Controllers\Attendance\SelfAttendanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Document\DocumentCategoryController;
use App\Http\Controllers\Document\DocumentController;
use App\Http\Controllers\Employee\EmployeeAssetController;
use App\Http\Controllers\FixedAsset\FixedAssetDashboardController;
use App\Http\Controllers\Inventory\InventoryDashboardController;
use App\Http\Controllers\MyNoticeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Models\LoanApplication;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Legacy branch portal URLs → normal section flow
Route::redirect('/branch', '/sections')->name('branch.portal');
Route::redirect('/branch/attendance', '/attendance/daily-branch-summary?section=attendance-movement')->name('branch.portal.attendance');
Route::redirect('/branch/inventory', '/inventory/operations?section=inventory')->name('branch.portal.inventory');
Route::redirect('/branch/leave', '/sections/leave?section=leave')->name('branch.portal.leave');

// Section Landing - Modules (available to all authenticated users)
Route::get('/sections', [DashboardController::class, 'sections'])->name('sections.index');

// Human Resources - dedicated dashboard (new design, old data)
Route::get('/sections/human-resources', [DashboardController::class, 'humanResources'])
    ->name('sections.human-resources');

// Leave - dedicated dashboard (new design, old data)
Route::get('/sections/leave', [DashboardController::class, 'leaveSection'])
    ->name('sections.leave');

// Administration - dedicated dashboard (new design, old data)
Route::get('/sections/administration', [DashboardController::class, 'administrationSection'])
    ->name('sections.administration');

// Attendance & Movement - dedicated dashboard (new design, old data)
Route::get('/sections/attendance-movement', [DashboardController::class, 'attendanceMovementSection'])
    ->name('sections.attendance-movement');

// Payroll - setup dashboard & master data
Route::get('/sections/payroll', [DashboardController::class, 'payrollSection'])
    ->name('sections.payroll');

Route::get('/sections/staff-fund', [DashboardController::class, 'staffFundSection'])
    ->name('sections.staff-fund');

Route::get('/sections/employee-loan', [DashboardController::class, 'employeeLoanSection'])
    ->name('sections.employee-loan');

Route::get('/sections/fixed-asset', FixedAssetDashboardController::class)
    ->middleware('permission:fixed-assets.view')
    ->name('sections.fixed-asset');

Route::get('/sections/inventory', InventoryDashboardController::class)
    ->middleware('permission:inventory.view')
    ->name('sections.inventory');

// Document Center (View/Download for all authenticated users; Upload/Edit/Delete/Pin for Admin, Super Admin, Department Head)
Route::get('/sections/documents', [DocumentController::class, 'index'])->name('sections.documents');
Route::post('/documents', [DocumentController::class, 'store'])->name('documents.store');
Route::match(['put', 'patch', 'post'], '/documents/{document}', [DocumentController::class, 'update'])->name('documents.update');
Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])->name('documents.destroy');
Route::post('/documents/{document}/toggle-pin', [DocumentController::class, 'togglePin'])->name('documents.toggle-pin');
Route::get('/documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
Route::get('/documents/{document}/preview', [DocumentController::class, 'preview'])->name('documents.preview');

Route::post('/document-categories', [DocumentCategoryController::class, 'store'])->name('document-categories.store');
Route::delete('/document-categories/{category}', [DocumentCategoryController::class, 'destroy'])->name('document-categories.destroy');

// Section Dashboard (Overview) - role-aware (employee vs admin)
Route::get('/sections/{section}', function (Request $request, string $section) {
    $allowed = [
        'human-resources',
        'attendance-movement',
        'leave',
        'employee-loan',
        'staff-fund',
        'payroll',
        'fixed-asset',
        'inventory',
        'store',
        'documents',
        'training',
        'administration',
    ];
    if (! in_array($section, $allowed, true)) {
        abort(404);
    }

    $user = $request->user();
    if ($user instanceof User && ! $user->canAccessSection($section)) {
        abort(403);
    }

    $perm = fn (string $p): bool => $user instanceof User
        && ($user->can($p) || $user->hasPermission($p));

    $isAdminLike = collect([
        'employees.create',
        'employees.edit',
        'employees.admin',
        'attendance.admin',
        'leave-types.create',
        'leave-types.edit',
        'leave-balances.admin',
        'admin.access',
    ])->contains(fn ($p) => $perm($p));

    return Inertia::render('sections/section-dashboard', [
        'sectionId' => $section,
        'mode' => $isAdminLike ? 'admin' : 'employee',
    ]);
})->name('sections.dashboard');

// Legacy URL: send everyone to the section picker (module home)
Route::get('/dashboard', function () {
    return redirect()->route('sections.index');
})->name('dashboard');

// ====================
// EMPLOYEE SELF ATTENDANCE (PWA GEO-FENCE)
// ====================
Route::prefix('employee/attendance')->name('employee.attendance.')->group(function () {
    Route::post('/check-in', [SelfAttendanceController::class, 'checkIn'])
        ->name('check-in')
        ->middleware('throttle:10,1');

    Route::post('/check-out', [SelfAttendanceController::class, 'checkOut'])
        ->name('check-out')
        ->middleware('throttle:10,1');
});

Route::get('/my-assets', [EmployeeAssetController::class, 'index'])->name('my-assets.index');

Route::prefix('employee/staff-fund')->name('employee.staff-fund.')->group(function () {
    Route::get('/pf-ledger', [\App\Http\Controllers\Employee\EmployeeStaffFundController::class, 'pfLedger'])->name('pf-ledger');
    Route::get('/gratuity', [\App\Http\Controllers\Employee\EmployeeStaffFundController::class, 'gratuityLedger'])->name('gratuity');
});

Route::prefix('employee/payroll')->name('employee.payroll.')->group(function () {
    Route::get('/payslips', [\App\Http\Controllers\Employee\EmployeePayrollController::class, 'payslips'])->name('payslips.index');
    Route::get('/payslips/{payslip}', [\App\Http\Controllers\Employee\EmployeePayrollController::class, 'show'])->name('payslips.show');
});

Route::prefix('employee/loan')->name('employee.loan.')->group(function () {
    Route::prefix('applications')->name('applications.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Employee\EmployeePfLoanApplicationController::class, 'index'])->name('index');
        Route::get('/create', [\App\Http\Controllers\Employee\EmployeePfLoanApplicationController::class, 'create'])->name('create');
        Route::post('/preview', [\App\Http\Controllers\Employee\EmployeePfLoanApplicationController::class, 'preview'])->name('preview');
        Route::post('/', [\App\Http\Controllers\Employee\EmployeePfLoanApplicationController::class, 'store'])->name('store');
        Route::get('/motorcycle/create', [\App\Http\Controllers\Employee\EmployeeMotorcycleLoanApplicationController::class, 'create'])->name('motorcycle.create');
        Route::post('/motorcycle/preview', [\App\Http\Controllers\Employee\EmployeeMotorcycleLoanApplicationController::class, 'preview'])->name('motorcycle.preview');
        Route::post('/motorcycle', [\App\Http\Controllers\Employee\EmployeeMotorcycleLoanApplicationController::class, 'store'])->name('motorcycle.store');
        Route::post('/{loan_application}/forward', [\App\Http\Controllers\Employee\MotorcycleLoanRecommendationController::class, 'forward'])->name('forward');
        Route::post('/{loan_application}/send-back', [\App\Http\Controllers\Employee\MotorcycleLoanRecommendationController::class, 'sendBack'])->name('send-back');
        Route::get('/{loan_application}', [\App\Http\Controllers\Employee\EmployeePfLoanApplicationController::class, 'show'])->name('show');
    });

    Route::prefix('recommendations')->name('recommendations.')->group(function () {
        Route::get('/', fn () => redirect()->route('employee.loan.applications.index'))->name('index');
        Route::get('/{loan_application}', fn (LoanApplication $loan_application) => redirect()->route('employee.loan.applications.show', $loan_application))->name('show');
        Route::post('/{loan_application}/forward', [\App\Http\Controllers\Employee\MotorcycleLoanRecommendationController::class, 'forward'])->name('forward');
        Route::post('/{loan_application}/send-back', [\App\Http\Controllers\Employee\MotorcycleLoanRecommendationController::class, 'sendBack'])->name('send-back');
    });

    Route::get('/', [\App\Http\Controllers\Employee\EmployeeLoanController::class, 'index'])->name('index');
    Route::get('/{employee_loan}', [\App\Http\Controllers\Employee\EmployeeLoanController::class, 'show'])->name('show');
    Route::get('/{employee_loan}/ledger', [\App\Http\Controllers\Employee\EmployeeLoanController::class, 'ledger'])->name('ledger');
});

// Profile (self-service; requires profile permissions on role)
Route::prefix('profile')->name('profile.')->middleware(['permission:profile.view'])->group(function () {
    Route::get('/', [ProfileController::class, 'edit'])->name('edit');
    Route::patch('/', [ProfileController::class, 'update'])->name('update')->middleware('permission:profile.edit');
    Route::post('/signature', [ProfileController::class, 'updateSignature'])->name('signature')->middleware('permission:profile.edit');
    Route::delete('/signature', [ProfileController::class, 'destroySignature'])->name('signature.destroy')->middleware('permission:profile.edit');
    Route::patch('/password', [ProfileController::class, 'updatePassword'])->name('password.update')->middleware('permission:profile.edit');
});

// Notifications - Available to all authenticated users
Route::prefix('notifications')->name('notifications.')->group(function () {
    Route::get('/', [NotificationController::class, 'index'])->name('index');
    Route::get('/unread-count', [NotificationController::class, 'getUnreadCount'])->name('unread-count');
    Route::get('/latest', [NotificationController::class, 'getLatestNotifications'])->name('latest');
    Route::post('/{id}/mark-as-read', [NotificationController::class, 'markAsRead'])->name('mark-as-read');
    Route::post('/mark-all-as-read', [NotificationController::class, 'markAllAsRead'])->name('mark-all-as-read');
});

// My Notices - Admin-sent notices that this user has received
Route::prefix('my-notices')->name('my-notices.')->group(function () {
    Route::get('/', [MyNoticeController::class, 'index'])->name('index');
    Route::post('/mark-all-read', [MyNoticeController::class, 'markAllRead'])->name('mark-all-read');
    Route::get('/{id}', [MyNoticeController::class, 'show'])->name('show');
});
