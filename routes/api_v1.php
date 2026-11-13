<?php

use App\Http\Controllers\API\V1\ApprovalsController;
use App\Http\Controllers\API\V1\AttendanceController;
use App\Http\Controllers\API\V1\AuthController;
use App\Http\Controllers\API\V1\BranchDirectoryController;
use App\Http\Controllers\API\V1\EmployeesController;
use App\Http\Controllers\API\V1\FinanceController;
use App\Http\Controllers\API\V1\InboxController;
use App\Http\Controllers\API\V1\LeaveController;
use App\Http\Controllers\API\V1\MovementController;
use App\Http\Controllers\API\V1\OpsController;
use App\Http\Controllers\API\V1\TasksController;
use App\Http\Middleware\AssignRequestCorrelationId;
use App\Http\Middleware\EnsureApiJson;
use App\Http\Middleware\EnsureApiMovementFinePaid;
use App\Http\Middleware\IdempotencyKey;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->middleware([EnsureApiJson::class, AssignRequestCorrelationId::class])
    ->group(function () {
        Route::middleware('throttle:10,1')->group(function () {
            Route::post('/auth/staff/login', [AuthController::class, 'loginStaff'])->name('api.v1.auth.staff.login');
            Route::post('/auth/branch/login', [AuthController::class, 'loginBranch'])->name('api.v1.auth.branch.login');
        });

        Route::get('/auth/branches', BranchDirectoryController::class)
            ->middleware('throttle:30,1')
            ->name('api.v1.auth.branches');

        Route::get('/office-map', [OpsController::class, 'officeMap'])
            ->middleware('throttle:60,1')
            ->name('api.v1.office-map');

        Route::middleware(['auth:sanctum', IdempotencyKey::class, EnsureApiMovementFinePaid::class])->group(function () {
            Route::get('/bootstrap', [AuthController::class, 'bootstrap'])->name('api.v1.bootstrap');
            Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');
            Route::post('/auth/logout-all', [AuthController::class, 'logoutAll'])->name('api.v1.auth.logout-all');
            Route::post('/auth/password', [AuthController::class, 'changePassword'])->middleware('throttle:10,1')->name('api.v1.auth.password');

            Route::get('/tasks', TasksController::class)->name('api.v1.tasks');
            Route::post('/approvals/appraisal', [ApprovalsController::class, 'appraisal'])->name('api.v1.approvals.appraisal');
            Route::post('/approvals/log-book/{payment}', [ApprovalsController::class, 'logBook'])->name('api.v1.approvals.log-book');
            Route::post('/approvals/loans/{loanApplication}', [ApprovalsController::class, 'loan'])->name('api.v1.approvals.loans');

            Route::prefix('attendance')->group(function () {
                Route::get('/self/status', [AttendanceController::class, 'status'])->name('api.v1.attendance.self.status');
                Route::get('/self/history', [AttendanceController::class, 'history'])->name('api.v1.attendance.self.history');
                Route::post('/self/check-in', [AttendanceController::class, 'checkIn'])->middleware('throttle:30,1')->name('api.v1.attendance.self.check-in');
                Route::post('/self/check-out', [AttendanceController::class, 'checkOut'])->middleware('throttle:30,1')->name('api.v1.attendance.self.check-out');
            });

            Route::prefix('leave')->group(function () {
                Route::get('/types', [LeaveController::class, 'types'])->name('api.v1.leave.types');
                Route::get('/balances', [LeaveController::class, 'balances'])->name('api.v1.leave.balances');
                Route::get('/applications/mine', [LeaveController::class, 'mine'])->name('api.v1.leave.applications.mine');
                Route::get('/applications/pending', [LeaveController::class, 'pending'])->name('api.v1.leave.applications.pending');
                Route::get('/applications/{leaveApplication}', [LeaveController::class, 'show'])->name('api.v1.leave.applications.show');
                Route::post('/applications', [LeaveController::class, 'store'])->middleware('throttle:20,1')->name('api.v1.leave.applications.store');
                Route::post('/applications/{leaveApplication}/cancel', [LeaveController::class, 'cancel'])->name('api.v1.leave.applications.cancel');
                Route::post('/applications/{leaveApplication}/approve', [LeaveController::class, 'approve'])->name('api.v1.leave.applications.approve');
                Route::post('/applications/{leaveApplication}/reject', [LeaveController::class, 'reject'])->name('api.v1.leave.applications.reject');
            });

            Route::prefix('movements')->group(function () {
                Route::get('/mine', [MovementController::class, 'mine'])->name('api.v1.movements.mine');
                Route::get('/team', [MovementController::class, 'team'])->name('api.v1.movements.team');
                Route::post('/', [MovementController::class, 'store'])->middleware('throttle:20,1')->name('api.v1.movements.store');
                Route::get('/penalty/status', [MovementController::class, 'penaltyStatus'])->name('api.v1.movements.penalty.status');
                Route::post('/penalty/submit', [MovementController::class, 'penaltySubmit'])->name('api.v1.movements.penalty.submit');
                Route::get('/{movement}', [MovementController::class, 'show'])->name('api.v1.movements.show');
                Route::post('/{movement}/complete', [MovementController::class, 'complete'])->name('api.v1.movements.complete');
                Route::post('/{movement}/cancel', [MovementController::class, 'cancel'])->name('api.v1.movements.cancel');
            });

            Route::prefix('inbox')->group(function () {
                Route::get('/notifications', [InboxController::class, 'notifications'])->name('api.v1.inbox.notifications');
                Route::post('/notifications/read-all', [InboxController::class, 'markAllNotificationsRead'])->name('api.v1.inbox.notifications.read-all');
                Route::post('/notifications/{notification}/read', [InboxController::class, 'markNotificationRead'])->name('api.v1.inbox.notifications.read');
                Route::get('/notices', [InboxController::class, 'notices'])->name('api.v1.inbox.notices');
                Route::get('/notices/{notice}', [InboxController::class, 'showNotice'])->name('api.v1.inbox.notices.show');
                Route::post('/notices/read-all', [InboxController::class, 'markAllNoticesRead'])->name('api.v1.inbox.notices.read-all');
            });

            Route::prefix('employees')->group(function () {
                Route::get('/', [EmployeesController::class, 'index'])->name('api.v1.employees.index');
                Route::get('/me', [EmployeesController::class, 'me'])->name('api.v1.employees.me');
                Route::get('/organization', [EmployeesController::class, 'organization'])->name('api.v1.employees.organization');
                Route::get('/{employee}', [EmployeesController::class, 'show'])->name('api.v1.employees.show');
            });

            Route::prefix('finance')->group(function () {
                Route::get('/payslips', [FinanceController::class, 'payslips'])->name('api.v1.finance.payslips');
                Route::get('/payslips/{payslip}', [FinanceController::class, 'payslipShow'])->name('api.v1.finance.payslips.show');
                Route::get('/loans', [FinanceController::class, 'loans'])->name('api.v1.finance.loans');
                Route::get('/staff-fund', [FinanceController::class, 'staffFund'])->name('api.v1.finance.staff-fund');
            });

            Route::get('/documents', [OpsController::class, 'documents'])->name('api.v1.documents');
            Route::get('/assets/mine', [OpsController::class, 'myAssets'])->name('api.v1.assets.mine');
            Route::get('/inventory/products', [OpsController::class, 'inventory'])->name('api.v1.inventory.products');
            Route::get('/reports/catalog', [OpsController::class, 'reports'])->name('api.v1.reports.catalog');
            Route::get('/admin/summary', [OpsController::class, 'adminSummary'])->name('api.v1.admin.summary');
        });
    });
