<?php

namespace App\Providers;

use Illuminate\Support\Facades\Validator;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
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
    }
}
