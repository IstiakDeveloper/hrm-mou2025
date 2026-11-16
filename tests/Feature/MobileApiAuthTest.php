<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Requires vendor + migrated DB. Skipped automatically when Sanctum/User factory unavailable.
 */
class MobileApiAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_login_requires_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/staff/login', []);

        $response->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_error');
    }

    public function test_bootstrap_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/bootstrap');

        $response->assertStatus(401)
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_authenticated_bootstrap_returns_user_payload(): void
    {
        if (! class_exists(Sanctum::class)) {
            $this->markTestSkipped('Sanctum not installed in this environment.');
        }

        /** @var User $user */
        $user = User::factory()->make([
            'id' => 1,
            'name' => 'Mobile Tester',
            'username' => 'mobile.tester',
            'email' => 'mobile@example.com',
            'account_type' => 'staff',
            'active_status' => true,
        ]);

        // Without a full factory/migrated schema this acts as a contract smoke when DB is ready.
        if (! method_exists(User::class, 'factory') || ! \Illuminate\Support\Facades\Schema::hasTable('users')) {
            $this->markTestSkipped('Users table/factory not available.');
        }

        $user = User::factory()->create([
            'name' => 'Mobile Tester',
            'username' => 'mobile.tester',
            'email' => 'mobile@example.com',
            'account_type' => 'staff',
            'active_status' => true,
        ]);

        Sanctum::actingAs($user, ['mobile']);

        $response = $this->getJson('/api/v1/bootstrap', [
            'X-Device-Id' => 'test-device',
            'X-App-Version' => '1.0.0',
            'X-Platform' => 'android',
        ]);

        $response->assertOk()
            ->assertJsonPath('bootstrap.user.name', 'Mobile Tester')
            ->assertJsonStructure([
                'bootstrap' => [
                    'server_time',
                    'timezone',
                    'user' => ['id', 'name', 'account_type'],
                    'permissions',
                    'sections',
                    'locks',
                ],
            ]);
    }
}
