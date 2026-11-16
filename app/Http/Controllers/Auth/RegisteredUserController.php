<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
<<<<<<< HEAD
=======
use Illuminate\Support\Str;
>>>>>>> feature/flutter-mobile-app
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

<<<<<<< HEAD
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
=======
        $email = Str::lower($request->email);
        $base = preg_replace('/[^a-z0-9_]/', '', Str::before($email, '@')) ?: 'user';
        $username = $base;
        $n = 0;
        while (User::where('username', $username)->exists()) {
            $n++;
            $username = $base.$n;
        }

        $user = User::create([
            'name' => $request->name,
            'username' => $username,
            'email' => $email,
>>>>>>> feature/flutter-mobile-app
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        Auth::login($user);

<<<<<<< HEAD
        return to_route('dashboard');
=======
        return to_route('sections.index');
>>>>>>> feature/flutter-mobile-app
    }
}
