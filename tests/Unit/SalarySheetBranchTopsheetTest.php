<?php

use App\Services\PayrollReportService;
use App\Support\PayrollReportXlsxExporter;
use Illuminate\Support\Collection;

function branchTopsheetFixture(array $codes = ['10', '0000', '2', '2']): array
{
    $rows = array_map(fn (string $code) => [
        'branch' => $code === '0000' ? 'Head Office' : 'Branch '.$code,
        'branch_code' => $code,
        'is_head_office' => $code === '0000',
        'components' => ['Basic' => 1000.0, 'PF' => 100.0],
        'gross' => 1000.0,
        'deduction' => 100.0,
        'net' => 900.0,
    ], $codes);

    $service = new class($rows) extends PayrollReportService
    {
        public function __construct(private array $fixtureRows) {}

        protected function fetchPayslips(array $config, array $filters): Collection
        {
            return collect();
        }

        protected function mapSalarySheet(Collection $payslips, array $config): array
        {
            return [
                'heads' => ['Basic', 'PF'],
                'earning_heads' => ['Basic'],
                'deduction_heads' => ['PF'],
                'rows' => $this->fixtureRows,
            ];
        }
    };

    return $service->build('salary-sheet-branch-wise', config('payroll_reports.reports.salary-sheet-branch-wise'), [
        'year' => 2026,
        'month' => 10,
    ]);
}

it('orders branch codes numerically before branch subtotal and head office without double counting', function () {
    $this->travelTo(now()->setDate(2026, 11, 18));
    $payload = branchTopsheetFixture();

    expect(array_column($payload['rows'], 'name'))->toBe([
        'Branch 2 (2)', 'Branch 10 (10)', 'Branch Total', 'Head Office (0000)',
    ])
        ->and($payload['rows'][2]['is_subtotal'])->toBeTrue()
        ->and($payload['rows'][2]['employee_count'])->toBe(3)
        ->and($payload['rows'][2]['components'])->toBe(['Basic' => 3000.0, 'PF' => 300.0])
        ->and($payload['rows'][2]['net'])->toBe(2700.0)
        ->and($payload['totals']['net'])->toBe(3600.0)
        ->and($payload['totals']['gross'])->toBe(4000.0)
        ->and($payload['totals']['deduction'])->toBe(400.0)
        ->and($payload['totals']['components'])->toBe(['Basic' => 4000.0, 'PF' => 400.0])
        ->and($payload['meta']['row_count'])->toBe(3)
        ->and($payload['meta']['employee_count'])->toBe(4)
        ->and($payload['totals_label'])->toBe('Branch and Head Office Total')
        ->and($payload['salary_month'])->toBe('October 2026')
        ->and($payload['issue_date'])->toBe('18/11/2026');
});

it('handles branch only, head office only and empty selections', function () {
    $branches = branchTopsheetFixture(['2']);
    $headOffice = branchTopsheetFixture(['0000']);
    $empty = branchTopsheetFixture([]);

    expect(array_column($branches['rows'], 'name'))->toBe(['Branch 2 (2)', 'Branch Total'])
        ->and($branches['totals']['net'])->toBe(900.0)
        ->and($headOffice['rows'])->toHaveCount(1)
        ->and($headOffice['rows'][0]['is_head_office'])->toBeTrue()
        ->and($headOffice['totals']['net'])->toBe(900.0)
        ->and($empty['rows'])->toBe([])
        ->and($empty['totals']['net'])->toBe(0.0);
});

it('keeps pagination totals and serial numbers correct around a branch subtotal', function () {
    $payload = branchTopsheetFixture();
    $pages = app(PayrollReportService::class)->paginateSalarySheetSectionPages(
        $payload['rows'], $payload['heads'], $payload['totals'], 3, 3,
    );

    expect($pages)->toHaveCount(2)
        ->and($pages[0]['totals']['net'])->toBe(2700.0)
        ->and($pages[1]['serial_start'])->toBe(2)
        ->and($pages[1]['totals']['net'])->toBe(3600.0);
});

it('renders the branch topsheet header and totals consistently for print and PDF', function () {
    $payload = branchTopsheetFixture();
    $html = view('payroll.reports.document', [
        'payload' => $payload,
        'title' => 'Salary Sheet Report (Branch Wise)',
        'companyName' => 'MOUSUMI',
        'companyAddress' => 'Ukilpara, Naogaon',
    ])->render();

    expect($html)->toContain('Month: October 2026', 'Issue Date: '.$payload['issue_date'], 'Branch and Head Office Total')
        ->not->toContain('Salary Month:');
    expect(strpos($html, 'Branch 2 (2)'))->toBeLessThan(strpos($html, 'Branch 10 (10)'));
    expect(strpos($html, '>Branch Total<'))->toBeLessThan(strpos($html, 'Head Office (0000)'));
    expect(strpos($html, 'Head Office (0000)'))->toBeLessThan(strpos($html, '>Branch and Head Office Total<'));
});

it('exports branch totals and centered period metadata to Excel', function () {
    $payload = branchTopsheetFixture();
    $method = new ReflectionMethod(PayrollReportXlsxExporter::class, 'salarySheetWorkbook');
    $xlsx = $method->invoke(null, $payload, ['title' => 'Salary Sheet Report (Branch Wise)']);
    $path = tempnam(sys_get_temp_dir(), 'branch-topsheet-test-');

    try {
        $xlsx->saveAs($path);
        $zip = new ZipArchive;
        $zip->open($path);
        $strings = $zip->getFromName('xl/sharedStrings.xml');
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();

        expect($strings)->toContain('Month: October 2026 | Issue Date: '.$payload['issue_date'], 'Branch Total', 'Branch and Head Office Total')
            ->not->toContain('Salary Month:');
        expect($sheet)->toContain('<mergeCell ref="A2:H2"')->not->toContain('<mergeCell ref="A3:H3"');
    } finally {
        @unlink($path);
    }
});
