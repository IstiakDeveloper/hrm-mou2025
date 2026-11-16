<?php

use App\Http\Middleware\VerifyZktecoApiKey;
use Illuminate\Http\Request;

test('migrate and debug role routes are gone', function () {
    $this->get('/migrate')->assertNotFound();
    $this->get('/debug/role/1')->assertNotFound();
});

test('device employee apis reject missing or empty bearer keys', function () {
    config(['app.zkteco_api_key' => 'test-device-key']);

    $this->getJson('/api/branch/1/employees')->assertUnauthorized();
    $this->getJson('/api/device/1/employees')->assertUnauthorized();
    $this->postJson('/api/device/push-employees', [])->assertUnauthorized();

    $this->withToken('wrong-key')
        ->getJson('/api/branch/1/employees')
        ->assertUnauthorized();

    config(['app.zkteco_api_key' => '']);

    $this->withToken('test-device-key')
        ->getJson('/api/branch/1/employees')
        ->assertUnauthorized();
});

test('zkteco bearer helper accepts only a non-empty matching key', function () {
    config(['app.zkteco_api_key' => 'test-device-key']);

    $valid = Request::create('/api/branch/1/employees', 'GET');
    $valid->headers->set('Authorization', 'Bearer test-device-key');
    expect(VerifyZktecoApiKey::isValid($valid))->toBeTrue();

    $wrong = Request::create('/api/branch/1/employees', 'GET');
    $wrong->headers->set('Authorization', 'Bearer other');
    expect(VerifyZktecoApiKey::isValid($wrong))->toBeFalse();

    config(['app.zkteco_api_key' => '']);
    expect(VerifyZktecoApiKey::isValid($valid))->toBeFalse();
});
