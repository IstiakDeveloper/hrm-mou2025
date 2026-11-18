<?php

use App\Models\ConfirmationEvaluation;
use App\Models\FinalClearance;
use App\Models\ProbationIncrementEvaluation;
use App\Models\PromotionEvaluation;
use App\Models\TraineeEvaluation;
use App\Services\Appraisal\AppraisalListQuery;
use App\Support\MonthlyListFilters;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-11-18 12:00:00', 'Asia/Dhaka'));
    Schema::create('monthly_filter_records', function (Blueprint $table) {
        $table->id();
        $table->string('status')->default('draft');
        $table->timestamp('created_at');
        $table->timestamp('updated_at')->nullable();
    });
});

afterEach(function () {
    Schema::dropIfExists('monthly_filter_records');
    Carbon::setTestNow();
});

function monthlyFilterRequest(array $query = [], string $method = 'GET'): Request
{
    $request = Request::create('/monthly-list', $method, $query);
    $request->setLaravelSession(app('session.store'));

    return $request;
}

dataset('monthly evaluation lists', [
    'promotion' => [PromotionEvaluation::class, 'promotions.evaluations.index'],
    'confirmation' => [ConfirmationEvaluation::class, 'confirmation.evaluations.index'],
    'probation increment' => [ProbationIncrementEvaluation::class, 'probation-increment-evaluations.index'],
    'trainee' => [TraineeEvaluation::class, 'trainee-evaluations.index'],
    'clearance' => [FinalClearance::class, 'final-clearances.index'],
]);

test('each list defaults to the current month and keeps updated older applications in their original month', function (string $model, string $route) {
    DB::table('monthly_filter_records')->insert([
        ['created_at' => '2026-10-31 23:59:59', 'updated_at' => '2026-11-18 12:00:00', 'status' => 'approved'],
        ['created_at' => '2026-11-01 00:00:00', 'updated_at' => null, 'status' => 'draft'],
        ['created_at' => '2026-11-30 23:59:59', 'updated_at' => null, 'status' => 'approved'],
        ['created_at' => '2026-12-01 00:00:00', 'updated_at' => null, 'status' => 'draft'],
    ]);
    $query = (new $model)->setTable('monthly_filter_records')->newQuery();
    $request = monthlyFilterRequest();

    MonthlyListFilters::apply($request, $query, $route, ['status']);

    expect($query->pluck('id')->all())->toBe([2, 3])
        ->and($request->query('month'))->toBe('2026-11')
        ->and(AppraisalListQuery::summarize($query, ['approved' => "status = 'approved'"]))
        ->toBe(['total' => 2, 'approved' => 1]);

    app()->instance('request', $request);
    $nextPage = $query->paginate(1)->withQueryString()->nextPageUrl();
    parse_str(parse_url($nextPage, PHP_URL_QUERY), $paginationQuery);
    expect($paginationQuery)->toMatchArray(['month' => '2026-11', 'page' => '2']);
})->with('monthly evaluation lists');

test('past month filtering handles leap days and year boundaries', function (string $month, string $start, string $end, string $next) {
    DB::table('monthly_filter_records')->insert([
        ['created_at' => Carbon::parse($start)->subSecond()->toDateTimeString()],
        ['created_at' => $start],
        ['created_at' => $end],
        ['created_at' => $next],
    ]);
    $request = monthlyFilterRequest(['month' => $month]);
    $query = (new PromotionEvaluation)->setTable('monthly_filter_records')->newQuery();

    MonthlyListFilters::apply($request, $query, 'promotions.evaluations.index', []);

    expect($query->pluck('id')->all())->toBe([2, 3]);
})->with([
    ['2024-02', '2024-02-01 00:00:00', '2024-02-29 23:59:59', '2024-03-01 00:00:00'],
    ['2025-12', '2025-12-01 00:00:00', '2025-12-31 23:59:59', '2026-01-01 00:00:00'],
]);

test('return navigation retains every applied filter and page after mutations for each list', function (string $model, string $route) {
    $filters = [
        'month' => '2025-12', 'status' => 'draft', 'search' => 'Staff & PIN',
        'form_type' => 'accountant', 'branch_id' => '7', 'zone_id' => '3',
        'per_page' => '25', 'page' => '2',
    ];
    $request = monthlyFilterRequest([...$filters, 'unrelated' => 'ignored']);
    $query = (new $model)->setTable('monthly_filter_records')->newQuery();
    MonthlyListFilters::apply($request, $query, $route, ['status', 'search', 'form_type', 'branch_id', 'zone_id', 'per_page']);

    foreach (['GET', 'POST', 'PUT', 'DELETE'] as $method) {
        $returnUrl = MonthlyListFilters::returnUrl(monthlyFilterRequest([], $method), $route);
        parse_str(parse_url($returnUrl, PHP_URL_QUERY), $returnedFilters);
        expect($returnedFilters)->toEqual($filters);
    }

    // Opening another list cannot overwrite this list's return filters.
    $originalReturnUrl = MonthlyListFilters::returnUrl($request, $route);
    MonthlyListFilters::apply(monthlyFilterRequest(), clone $query, 'another-list.index', []);
    expect(MonthlyListFilters::returnUrl($request, $route))->toBe($originalReturnUrl);

    // An explicit reset/fresh list visit returns to the current month.
    MonthlyListFilters::apply(monthlyFilterRequest(), clone $query, $route, ['status', 'search']);
    expect(MonthlyListFilters::returnUrl($request, $route))->toBe(route($route, ['month' => '2026-11']));
})->with('monthly evaluation lists');

test('malformed month filters are rejected', function ($month) {
    $query = (new PromotionEvaluation)->setTable('monthly_filter_records')->newQuery();

    expect(fn () => MonthlyListFilters::apply(monthlyFilterRequest(['month' => $month]), $query, 'promotions.evaluations.index', []))
        ->toThrow(ValidationException::class);
})->with(['2026-13', '2026-00', '2026-1', 'invalid', [['2026-11']]]);
