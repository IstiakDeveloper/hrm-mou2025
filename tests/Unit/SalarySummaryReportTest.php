<?php

use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\PayrollReportService;
use App\Support\PayrollReportCsvExporter;
use App\Support\PayrollReportXlsxExporter;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
    DB::purge('sqlite');
    Schema::create('employee_bank_accounts', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('employee_id');
        $table->string('account_no');
        $table->boolean('is_primary')->default(false);
    });
    DB::table('employee_bank_accounts')->insert([
        ['employee_id' => 1, 'account_no' => 'OLD-ACCOUNT', 'is_primary' => false],
        ['employee_id' => 1, 'account_no' => '00123456789012345678', 'is_primary' => true],
        ['employee_id' => 2, 'account_no' => '000987654321', 'is_primary' => true],
    ]);
});

afterEach(function () {
    DB::purge('sqlite');
});

function salarySummaryPayslip(int $id, string $pin, float $net, bool $withheld = false, int $month = 9): Payslip
{
    $payslip = new Payslip([
        'employee_id' => $id,
        'employee_name' => 'Payroll Employee '.$id,
        'net_payable' => $net,
        'is_withheld' => $withheld,
    ]);
    $payslip->setRelation('employee', new Employee(['pin' => $pin, 'name_en' => 'Changed Name']));
    $payslip->setRelation('payrollRun', new PayrollRun(['year' => 2026, 'month' => $month]));

    return $payslip;
}

function salarySummaryFixture(?array $payslips = null): array
{
    $payslips ??= [
        salarySummaryPayslip(1, '0010', 15000),
        salarySummaryPayslip(2, '0002', 25000),
        salarySummaryPayslip(3, '0001', 99999, true),
        salarySummaryPayslip(4, '0003', 0),
    ];
    $service = new class($payslips) extends PayrollReportService
    {
        public function __construct(private array $fixturePayslips) {}

        protected function fetchPayslips(array $config, array $filters): Collection
        {
            return collect($this->fixturePayslips);
        }
    };

    return $service->build('salary-summary-sheet', config('payroll_reports.reports.salary-summary-sheet'), [
        'year' => 2026, 'month' => 9,
    ]);
}

it('uses posted salary payroll and supports the report filters', function () {
    $config = config('payroll_reports.reports.salary-summary-sheet');
    $service = app(PayrollReportService::class);
    $method = new ReflectionMethod($service, 'payrollRunQuery');
    $scope = $method->invoke($service, $config, ['year' => 2026, 'month' => 9]);
    $query = PayrollRun::query();
    $scope($query);

    expect($config['title'])->toBe('Salary Summery Sheet')
        ->and($config['filters'])->toBe(['year', 'month', 'branch_id', 'project_id'])
        ->and($query->getBindings())->toBe(['salary', 'posted', 2026, 9]);
});

it('uses net salary and the primary bank account while preserving PIN and payroll names', function () {
    $payload = salarySummaryFixture();

    expect($payload['template'])->toBe('salary-summary')
        ->and(array_column($payload['rows'], 'pin'))->toBe(['0002', '0003', '0010'])
        ->and($payload['rows'][0]['name'])->toBe('Payroll Employee 2')
        ->and($payload['rows'][0]['net'])->toBe(25000.0)
        ->and($payload['rows'][0]['account_no'])->toBe('000987654321')
        ->and($payload['rows'][1]['account_no'])->toBe('')
        ->and($payload['rows'][2]['account_no'])->toBe('00123456789012345678')
        ->and($payload['rows'][0]['remarks'])->toBe('Salary for the Month of September')
        ->and($payload['totals']['net'])->toBe(40000.0)
        ->and($payload['in_words'])->toBe('Forty Thousand Taka Only')
        ->and($payload['meta']['row_count'])->toBe(3)
        ->and($payload['salary_month'])->toBe('September 2026');
});

it('uses each payroll month in remarks and totals the displayed whole taka amounts', function () {
    $payload = salarySummaryFixture([
        salarySummaryPayslip(1, '0001', 1000.4, month: 9),
        salarySummaryPayslip(2, '0002', 1000.6, month: 10),
    ]);

    expect(array_column($payload['rows'], 'net'))->toBe([1000.0, 1001.0])
        ->and($payload['rows'][1]['remarks'])->toBe('Salary for the Month of October')
        ->and($payload['totals']['net'])->toBe(2001.0)
        ->and($payload['in_words'])->toBe('Two Thousand One Taka Only');
});

it('renders all six columns, totals and words in print and PDF including an empty selection', function () {
    foreach ([salarySummaryFixture(), salarySummaryFixture([])] as $payload) {
        $html = view('payroll.reports.document', [
            'payload' => $payload,
            'title' => 'Salary Summery Sheet',
            'companyName' => 'MOUSUMI',
            'companyAddress' => 'Ukilpara, Naogaon',
        ])->render();

        expect($html)->toContain('Salary Summery Sheet', 'Month: September 2026 | Issue Date:',
            'SL No.', 'PIN', 'Name of Employee', 'Net Salary (Payable)', 'A/C No.', 'Remarks',
            '>Total</td>', 'In Words: '.$payload['in_words']);
    }
    expect($html)->toContain('No payslips found for the selected filters.', 'Zero Taka Only');
});

it('exports the requested column order with total and amount in words', function () {
    $payload = salarySummaryFixture();
    [$headers, $rows] = PayrollReportCsvExporter::rowsFromPayload('salary-summary', $payload);

    expect($headers)->toBe(['SL No.', 'PIN', 'Name of Employee', 'Net Salary (Payable)', 'A/C No.', 'Remarks'])
        ->and($rows[0])->toBe([1, '0002', 'Payroll Employee 2', 25000.0, '000987654321', 'Salary for the Month of September'])
        ->and($rows[3])->toBe(['Total', '', '', 40000.0, '', ''])
        ->and($rows[4][0])->toBe('In Words: Forty Thousand Taka Only');
});

it('downloads Excel with text PIN and account cells and numeric net salary cells', function () {
    $payload = salarySummaryFixture();
    $response = PayrollReportXlsxExporter::download('salary-summary.xlsx', 'salary-summary', $payload, [
        'companyName' => 'MOUSUMI', 'title' => 'Salary Summery Sheet',
    ]);
    $path = tempnam(sys_get_temp_dir(), 'salary-summary-test-');

    try {
        file_put_contents($path, $response->getContent());
        $zip = new ZipArchive;
        $zip->open($path);
        $strings = $zip->getFromName('xl/sharedStrings.xml');
        $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();

        expect($response->getStatusCode())->toBe(200)
            ->and($strings)->toContain('Salary Summery Sheet', '0002', '00123456789012345678',
                'Salary for the Month of September', 'In Words: Forty Thousand Taka Only')
            ->not->toContain('OLD-ACCOUNT');

        $sheet = simplexml_load_string($xml);
        $sheet->registerXPathNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        expect((string) $sheet->xpath('//s:c[@r="B6"]')[0]['t'])->toBe('s')
            ->and((string) $sheet->xpath('//s:c[@r="E6"]')[0]['t'])->toBe('s')
            ->and((string) $sheet->xpath('//s:c[@r="D6"]/s:v')[0])->toBe('25000');
    } finally {
        @unlink($path);
    }
});
