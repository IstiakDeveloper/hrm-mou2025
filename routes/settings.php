<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\PushNotificationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Settings routes (loaded inside the main `auth` group in routes/web.php)
|--------------------------------------------------------------------------
*/

Route::redirect('settings', 'settings/profile');

Route::get('settings/profile', [ProfileController::class, 'edit'])->name('settings.profile.edit');
Route::patch('settings/profile', [ProfileController::class, 'update'])->name('settings.profile.update');
Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('settings.profile.destroy');

Route::get('settings/password', [PasswordController::class, 'edit'])->name('settings.password.edit');
Route::put('settings/password', [PasswordController::class, 'update'])->name('settings.password.update');

Route::get('settings/appearance', function () {
    return Inertia::render('settings/appearance');
})->name('settings.appearance');

Route::get('settings/notifications', [PushNotificationController::class, 'edit'])->name('settings.notifications');
Route::post('settings/notifications', [PushNotificationController::class, 'store'])->name('settings.notifications.store');
Route::delete('settings/notifications', [PushNotificationController::class, 'destroy'])->name('settings.notifications.destroy');
Route::post('settings/notifications/test', [PushNotificationController::class, 'sendTest'])->name('settings.notifications.test');
