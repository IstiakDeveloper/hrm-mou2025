<?php

use App\Http\Controllers\ZKTeco\IclockController;
use Illuminate\Support\Facades\Route;

Route::match(['GET', 'POST'], '/iclock/cdata', [IclockController::class, 'cdata'])->name('iclock.cdata');
Route::match(['GET', 'POST'], '/iclock/getrequest', [IclockController::class, 'getRequest'])->name('iclock.getrequest');
Route::match(['GET', 'POST'], '/iclock/devicecmd', [IclockController::class, 'deviceCmd'])->name('iclock.devicecmd');
Route::get('/iclock/ping', [IclockController::class, 'ping'])->name('iclock.ping');
