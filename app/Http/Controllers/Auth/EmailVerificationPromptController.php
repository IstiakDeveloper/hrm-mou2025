<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    /**
     * Show the email verification prompt page.
     */
    public function __invoke(Request $request): Response|RedirectResponse
    {
        return $request->user()->hasVerifiedEmail()
<<<<<<< HEAD
                    ? redirect()->intended(route('dashboard', absolute: false))
=======
                    ? redirect()->intended(route('sections.index', absolute: false))
>>>>>>> feature/flutter-mobile-app
                    : Inertia::render('auth/verify-email', ['status' => $request->session()->get('status')]);
    }
}
