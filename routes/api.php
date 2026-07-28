<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\ZKTecoAPIController;
use App\Http\Controllers\API\BranchEmployeeAPIController;
use App\Http\Controllers\API\EmployeeAPIController;
use App\Http\Controllers\API\OrganizationSyncAPIController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ZKTeco Attendance API
Route::post('/zkteco/sync', [ZKTecoAPIController::class, 'syncAttendance']);
Route::post('/zkteco/device-pin-mappings', [ZKTecoAPIController::class, 'syncDevicePinMappings']);

// Employee Sync API
Route::post('/employees/sync', [EmployeeAPIController::class, 'syncEmployees']);

// Organization / field-officer sync (MisLoan and other consumers)
Route::get('/sync/organization-structure', [OrganizationSyncAPIController::class, 'organizationStructure']);
Route::get('/sync/field-officers', [OrganizationSyncAPIController::class, 'fieldOfficers']);

// Branch Employee APIs
Route::get('/branch/{branchId}/employees', [BranchEmployeeAPIController::class, 'getEmployeesByBranch']);
Route::get('/device/{deviceId}/employees', [BranchEmployeeAPIController::class, 'getEmployeesByDevice']);
Route::post('/device/push-employees', [BranchEmployeeAPIController::class, 'pushEmployeesToDevice']);
