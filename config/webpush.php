<?php

return [

    /*
    |--------------------------------------------------------------------------
    | VAPID (Voluntary Application Server Identification)
    |--------------------------------------------------------------------------
    |
    | Used to sign outbound Web Push messages. Generate keys once and store
    | them in .env — for example: openssl ecparam -name prime256v1 -genkey
    | -noout -out vapid_private.pem then derive the public key, or use any
    | trusted VAPID generator compatible with RFC 8292.
    |
    */

    'subject' => env('VAPID_SUBJECT', ''),

    'public_key' => env('VAPID_PUBLIC_KEY', ''),

    'private_key' => env('VAPID_PRIVATE_KEY', ''),

];
