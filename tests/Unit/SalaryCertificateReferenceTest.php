<?php

use App\Http\Controllers\Payroll\PayrollReportController;
use App\Models\SalaryCertificateIssue;
use App\Services\PayrollReportService;
use App\Services\SalaryCertificateIssueService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
    DB::purge('sqlite');
    foreach (['employees', 'users'] as $name) {
        Schema::create($name, fn (Blueprint $table) => $table->id());
    }
    DB::table('employees')->insert(['id' => 1]);
    $migration = require database_path('migrations/2026_11_18_120000_create_salary_certificate_issues_table.php');
    $migration->up();
});

afterEach(function () {
    DB::purge('sqlite');
});

function certificateReferenceFilters(string $number = '1', string $year = '2026'): array
{
    return [
        'employee_id' => 1, 'year' => 2026, 'month' => 9, 'certificate_reference_year' => $year,
        'certificate_reference_number' => $number, 'certificate_issue_date' => '2026-11-18',
        'certificate_signatory_name' => 'Director', 'certificate_signatory_designation' => 'Executive Director',
    ];
}

function certificateReferencePayload(): array
{
    return ['template' => 'salary-certificate', 'period' => 'September 2026', 'net' => 35276.0, 'meta' => []];
}

it('suggests the next number without consuming it until a certificate is generated', function () {
    $service = app(SalaryCertificateIssueService::class);
    expect($service->nextReferenceNumber(2026))->toBe('1')
        ->and($service->nextReferenceNumber(2026))->toBe('1')
        ->and(SalaryCertificateIssue::count())->toBe(0);
    $first = $service->issue(certificateReferencePayload(), certificateReferenceFilters(), true, null);
    $second = $service->issue(certificateReferencePayload(), certificateReferenceFilters(), true, null);
    expect($first->payload['reference'])->toBe('Mou/HRD/LoI/2026/1')
        ->and($second->payload['reference'])->toBe('Mou/HRD/LoI/2026/2')
        ->and($service->nextReferenceNumber(2026))->toBe('3');
});

it('honors a manually changed number and advances the next suggestion for that year', function () {
    $service = app(SalaryCertificateIssueService::class);
    $issue = $service->issue(certificateReferencePayload(), certificateReferenceFilters('0240'), false, null);
    expect($issue->payload['reference'])->toBe('Mou/HRD/LoI/2026/0240')
        ->and($service->nextReferenceNumber(2026))->toBe('0241')
        ->and($service->nextReferenceNumber(2027))->toBe('1');
    expect(fn () => $service->issue(certificateReferencePayload(), certificateReferenceFilters('240'), false, null))
        ->toThrow(ValidationException::class);
});

it('retries an automatic number if another request used that number first', function () {
    $raced = false;
    SalaryCertificateIssue::creating(function (SalaryCertificateIssue $issue) use (&$raced) {
        if (! $raced) {
            $raced = true;
            DB::table('salary_certificate_issues')->insert($issue->getAttributes());
        }
    });
    $issue = app(SalaryCertificateIssueService::class)->issue(certificateReferencePayload(), certificateReferenceFilters(), true, null);
    expect($issue->reference_number)->toBe(2)
        ->and(SalaryCertificateIssue::count())->toBe(2);
});

it('keeps the issued reference and salary fixed when preview or export is opened again', function () {
    $reports = Mockery::mock(PayrollReportService::class)->makePartial();
    $reports->shouldReceive('salaryCertificateDefaults')->andReturn(array_filter(certificateReferenceFilters(), fn ($key) => str_starts_with($key, 'certificate_'), ARRAY_FILTER_USE_KEY));
    $reports->shouldReceive('build')->once()->andReturn(certificateReferencePayload());
    $controller = new PayrollReportController($reports);
    $request = Request::create('/payroll/reports/salary-certificate/generate', 'POST', array_merge(certificateReferenceFilters(), ['project_id' => '', 'certificate_reference_auto' => true]));
    $response = $controller->generateCertificate($request);
    expect($response->getTargetUrl())->toContain('certificate_issue_id=1');

    $method = new ReflectionMethod($controller, 'documentData');
    $viewRequest = Request::create('/', 'GET', ['certificate_issue_id' => 1, 'certificate_reference_number' => '999']);
    $preview = $method->invoke($controller, $viewRequest, 'salary-certificate');
    $export = $method->invoke($controller, $viewRequest, 'salary-certificate');
    expect($preview['payload']['reference'])->toBe('Mou/HRD/LoI/2026/1')
        ->and($export['payload'])->toBe($preview['payload'])
        ->and((float) $preview['payload']['net'])->toBe(35276.0)
        ->and(SalaryCertificateIssue::count())->toBe(1)
        ->and(app(SalaryCertificateIssueService::class)->nextReferenceNumber(2026))->toBe('2');
});

it('reopens the issued certificate with its assigned number and selected employee', function () {
    $issue = app(SalaryCertificateIssueService::class)->issue(certificateReferencePayload(), certificateReferenceFilters(), true, null);
    $reports = Mockery::mock(PayrollReportService::class)->makePartial();
    $reports->shouldReceive('salaryCertificateDefaults')->andReturn(array_merge(certificateReferenceFilters(), ['certificate_reference_number' => '2']));
    $reports->shouldReceive('build')->never();
    $controller = new class($reports) extends PayrollReportController
    {
        protected function payrollFilterValues(Request $request, ?string $status = null): array
        {
            return ['year' => '2026', 'month' => '7', 'employee_id' => ''];
        }

        protected function reportFilterOptions(array $config): array
        {
            return [];
        }
    };
    $request = Request::create('/payroll/reports/salary-certificate', 'GET', ['certificate_issue_id' => $issue->id, 'project_id' => '']);
    $request->headers->set('X-Inertia', 'true');
    $props = $controller->show($request, 'salary-certificate')->toResponse($request)->getData(true)['props'];
    expect($props['generated'])->toBeTrue()
        ->and($props['filters']['certificate_reference_number'])->toBe('1')
        ->and($props['filters']['certificate_issue_id'])->toBe('1')
        ->and($props['filters']['employee_id'])->toBe('1')
        ->and($props['payload']['reference'])->toBe('Mou/HRD/LoI/2026/1')
        ->and(SalaryCertificateIssue::count())->toBe(1);
});
