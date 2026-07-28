<?php

namespace App\Http\Controllers;

use App\Services\MisLoanSsoService;
use Illuminate\Http\Request;

class MisLoanSsoController extends Controller
{
    public function redirect(Request $request, MisLoanSsoService $misLoanSsoService)
    {
        if (! $misLoanSsoService->isConfigured()) {
            return back()->with('error', 'MisLoan SSO is not configured.');
        }

        $user = $request->user();
        if (! $user) {
            return redirect()->route('login');
        }

        $url = $misLoanSsoService->redirectUrlForUser($user);
        if ($url === null) {
            return back()->with('error', 'No matching MisLoan account found for your HRM login.');
        }

        return redirect()->away($url);
    }

    /**
     * Entry point from MisLoan login page — uses existing HRM browser session.
     */
    public function sso(Request $request, MisLoanSsoService $misLoanSsoService)
    {
        $loginUrl = $misLoanSsoService->openUrl() ?? url('/login');

        if (! $misLoanSsoService->isConfigured()) {
            return redirect()->away($loginUrl.'?sso=not_configured');
        }

        $user = $request->user();
        if (! $user) {
            return redirect()->guest(route('login', ['intended' => route('misloan.sso')]));
        }

        $url = $misLoanSsoService->redirectUrlForUser($user);
        if ($url === null) {
            return redirect()->away($loginUrl.'?sso=no_match');
        }

        return redirect()->away($url);
    }
}
