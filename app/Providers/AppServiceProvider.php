<?php

namespace App\Providers;

use App\Models\Employee;
use App\Models\Holiday;
use App\Observers\EmployeeAssignmentObserver;
use App\Observers\HolidayObserver;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\HolidayAttendanceSyncService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Holiday::observe(HolidayObserver::class);
        Employee::observe(EmployeeAssignmentObserver::class);

        Blade::directive('taka', function (string $expression) {
            return "<?php echo \\App\\Support\\TakaFormat::amount($expression); ?>";
        });

        Blade::directive('takaWhole', function (string $expression) {
            return "<?php echo \\App\\Support\\TakaFormat::whole($expression); ?>";
        });

        Validator::extend('english_only', function ($attribute, $value, $parameters, $validator) {
            // If value is empty, let required rule handle it
            if (empty($value)) {
                return true;
            }

            // Check if contains only English characters
            return preg_match('/^[a-zA-Z0-9\s.,!?()@#$%^&*\-_+={}[\]|\\:";\'<>?\/~`]*$/', $value);
        });

        // Set custom error message
        Validator::replacer('english_only', function ($message, $attribute, $rule, $parameters) {
            return str_replace(':attribute', $attribute, 'The :attribute must contain English characters only. Bangla, Arabic, or other non-English characters are not allowed.');
        });

        // Audit updates and deletes on HR records. Creates, login, and logout are not recorded.
        \Illuminate\Support\Facades\Event::listen('eloquent.updating: *', function (string $event, array $data) {
            if (isset($data[0]) && $data[0] instanceof \Illuminate\Database\Eloquent\Model) {
                \App\Services\SystemActivityTracker::onUpdating($data[0]);
            }
        });

        \Illuminate\Support\Facades\Event::listen('eloquent.updated: *', function (string $event, array $data) {
            if (isset($data[0]) && $data[0] instanceof \Illuminate\Database\Eloquent\Model) {
                \App\Services\SystemActivityTracker::log('updated', $data[0]);
            }
        });

        \Illuminate\Support\Facades\Event::listen('eloquent.deleted: *', function (string $event, array $data) {
            if (isset($data[0]) && $data[0] instanceof \Illuminate\Database\Eloquent\Model) {
                \App\Services\SystemActivityTracker::log('deleted', $data[0]);
            }
        });
    }
}
