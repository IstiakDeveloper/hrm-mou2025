<?php

namespace App\Support;

use Illuminate\Http\Request;

class ConfirmedPassword
{
    public static function validate(Request $request): void
    {
        $request->validate([
            'password' => ['required', 'string', 'current_password'],
        ], [
            'password.required' => 'মুছে ফেলতে আপনার পাসওয়ার্ড দিন।',
            'password.current_password' => 'পাসওয়ার্ড সঠিক নয়।',
        ]);
    }
}
