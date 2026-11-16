<?php

<<<<<<< HEAD
use App\Models\User;
=======
>>>>>>> feature/flutter-mobile-app
use Illuminate\Support\Facades\Hash;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('password can be updated', function () {
<<<<<<< HEAD
    $user = User::factory()->create();
=======
    $user = userWithProfileAccess();
>>>>>>> feature/flutter-mobile-app

    $response = $this
        ->actingAs($user)
        ->from('/settings/password')
        ->put('/settings/password', [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/password');

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

<<<<<<< HEAD
test('correct password must be provided to update password', function () {
    $user = User::factory()->create();
=======
test('password page can be rendered', function () {
    $user = userWithProfileAccess();

    $response = $this
        ->actingAs($user)
        ->get('/settings/password');

    $response->assertOk();
});

test('password can be updated to a short employee password', function () {
    $user = userWithProfileAccess();

    $response = $this
        ->actingAs($user)
        ->from('/settings/password')
        ->put('/settings/password', [
            'current_password' => 'password',
            'password' => '1234',
            'password_confirmation' => '1234',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/password');

    expect(Hash::check('1234', $user->refresh()->password))->toBeTrue();
});

test('correct password must be provided to update password', function () {
    $user = userWithProfileAccess();
>>>>>>> feature/flutter-mobile-app

    $response = $this
        ->actingAs($user)
        ->from('/settings/password')
        ->put('/settings/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasErrors('current_password')
        ->assertRedirect('/settings/password');
});