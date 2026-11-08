<?php

use App\Http\Controllers\Designation\DesignationController;
use App\Models\Designation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Response;

beforeEach(function () {
    Schema::dropIfExists('designations');
    Schema::create('designations', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->text('description')->nullable();
        $table->integer('rank')->default(0);
        $table->timestamps();
    });
});

it('defaults to 100 per page and sorts a to z by name', function () {
    Designation::create(['name' => 'Zookeeper', 'rank' => 1]);
    Designation::create(['name' => 'Accountant', 'rank' => 5]);
    Designation::create(['name' => 'Manager', 'rank' => 2]);

    $controller = new DesignationController();
    $request = Request::create('/designations', 'GET');

    /** @var Response $response */
    $response = $controller->index($request);
    $pageProps = $response->toResponse($request)->getOriginalContent()['page']['props'];

    expect($pageProps['designations']['meta']['per_page'])->toBe(100);

    $names = array_column($pageProps['designations']['data'], 'name');
    expect($names)->toBe(['Accountant', 'Manager', 'Zookeeper']);
});

it('respects valid custom per_page query parameter', function () {
    $controller = new DesignationController();
    $request = Request::create('/designations', 'GET', ['per_page' => 25]);

    /** @var Response $response */
    $response = $controller->index($request);
    $pageProps = $response->toResponse($request)->getOriginalContent()['page']['props'];

    expect($pageProps['designations']['meta']['per_page'])->toBe(25);
});
