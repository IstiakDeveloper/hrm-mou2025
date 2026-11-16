<?php

use App\Models\User;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
<<<<<<< HEAD
        'email' => $user->email,
=======
        'login' => $user->username,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('sections.index', absolute: false));
});

test('users can authenticate with email instead of username', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'login' => $user->email,
>>>>>>> feature/flutter-mobile-app
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
<<<<<<< HEAD
    $response->assertRedirect(route('dashboard', absolute: false));
=======
>>>>>>> feature/flutter-mobile-app
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
<<<<<<< HEAD
        'email' => $user->email,
=======
        'login' => $user->username,
>>>>>>> feature/flutter-mobile-app
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
<<<<<<< HEAD
});
=======
});
>>>>>>> feature/flutter-mobile-app
