<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
<<<<<<< HEAD
            return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
=======
            return redirect()->intended(route('sections.index', absolute: false).'?verified=1');
>>>>>>> feature/flutter-mobile-app
        }

        if ($request->user()->markEmailAsVerified()) {
            /** @var \Illuminate\Contracts\Auth\MustVerifyEmail $user */
            $user = $request->user();

            event(new Verified($user));
        }

<<<<<<< HEAD
        return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
=======
        return redirect()->intended(route('sections.index', absolute: false).'?verified=1');
>>>>>>> feature/flutter-mobile-app
    }
}
