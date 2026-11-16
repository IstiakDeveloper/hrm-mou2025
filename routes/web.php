<?php

use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Organization\OfficeMapController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes - HRM System
|--------------------------------------------------------------------------
|
| Public/auth routes live here. Authenticated module routes are split under
| routes/web/*.php and loaded inside the auth group below.
|
*/

Route::get('/error/403', function (Request $request) {
    return Inertia::render('Errors/Unauthorized', [
        'permission' => $request->get('permission'),
        'reason' => $request->get('reason'),
        'errorDetails' => session('error_type') ? [
            'type' => session('error_type'),
            'required_permission' => session('required_permission'),
            'user_permissions' => session('user_permissions'),
            'attempted_url' => session('attempted_url'),
        ] : null,
    ]);
})->name('error.403');

Route::get('/error/404', function () {
    return Inertia::render('Errors/NotFound');
})->name('error.404');

// Generic error route
Route::get('/error/{type}', function ($type, Request $request) {
    $pages = [
        '403' => 'Errors/Unauthorized',
        '404' => 'Errors/NotFound',
        '500' => 'Errors/ServerError',
    ];

    $component = $pages[$type] ?? 'Errors/NotFound';

    return Inertia::render($component, [
        'errorType' => $type,
        'permission' => $request->get('permission'),
        'reason' => $request->get('reason'),
    ]);
})->name('error.show');

Route::get('/error/{type}', function ($type) {
    $pages = [
        '403' => 'Errors/Unauthorized',
        '404' => 'Errors/NotFound',
        '500' => 'Errors/ServerError',
    ];

    $component = $pages[$type] ?? 'Errors/NotFound';

    return Inertia::render($component, [
        'errorType' => $type,
    ]);
})->name('error.show');

// ====================
// PUBLIC ROUTES
// ====================
Route::get('/', function () {
    if (! Auth::check()) {
        return redirect()->route('login');
    }

    return redirect()->route('sections.index');
});

Route::get('/admin/roles/fix-permissions', [RoleController::class, 'fixAllRolePermissions'])
    ->name('admin.roles.fix-permissions')
    ->middleware('permission:admin.access');

Route::get('/admin/roles/permissions-api', [RoleController::class, 'permissions'])
    ->name('admin.roles.permissions-api')
    ->middleware('permission:roles.view');

// ====================
// AUTHENTICATION ROUTES
// ====================
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.attempt');
});

Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

// Public office locator — no login required
Route::get('/office-map', [OfficeMapController::class, 'index'])->name('office-map.index');

// ====================
// PROTECTED ROUTES
// ====================
Route::middleware(['auth'])->group(function () {
    require __DIR__.'/settings.php';
    require __DIR__.'/web/core.php';
    require __DIR__.'/web/admin.php';
    require __DIR__.'/web/employees.php';
    require __DIR__.'/web/organization.php';
    require __DIR__.'/web/payroll.php';
    require __DIR__.'/web/loans.php';
    require __DIR__.'/web/staff-fund.php';
    require __DIR__.'/web/assets.php';
    require __DIR__.'/web/inventory.php';
    require __DIR__.'/web/attendance.php';
    require __DIR__.'/web/leave.php';
    require __DIR__.'/web/movement.php';
    require __DIR__.'/web/hr-lifecycle.php';
    require __DIR__.'/web/holiday-reports.php';
});
