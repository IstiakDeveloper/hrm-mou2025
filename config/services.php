<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'misloan' => [
        'url' => env('MISLOAN_API_URL'),
        'app_url' => env('MISLOAN_APP_URL'),
        'token' => env('MISLOAN_API_TOKEN'),
    ],

    'payment' => [
        'bkash_number' => env('BKASH_PAYMENT_NUMBER', '01334766432'),
        'whatsapp_number' => env('WHATSAPP_NUMBER', env('WHATSAPP_SUPPORT_NUMBER', '01717893432')),
        'auto_approve' => env('PENALTY_AUTO_APPROVE', false),
        'auto_approve_min_seconds' => (int) env('PENALTY_AUTO_APPROVE_MIN_SECONDS', 8),
        'auto_approve_max_seconds' => (int) env('PENALTY_AUTO_APPROVE_MAX_SECONDS', 28),
    ],

];
