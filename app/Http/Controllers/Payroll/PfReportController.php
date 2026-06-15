<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Services\EmployeeProvidentFundService;
use App\Services\PfReportService;
use App\Support\PfReportCsvExporter;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PfReportController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PfReportService $reports,
    ) {}

    public function index()
    {
        return redirect()->route('sections.staff-fund', ['section' => 'staff-fund']);
    }

    public function show(Request $request, string $report)
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);
        $generated = $request->boolean('generate');
        $payload = null;
        $error = null;

        if ($generated) {
            $needsEmployee = (bool) ($config['require_employee'] ?? false);
            $needsRange = in_array('date_from', $config['filters'] ?? [], true);
            $needsYear = in_array('year', $config['filters'] ?? [], true);

            if ($needsEmployee && ! $filters['employee_id']) {
                $error = 'Please select an employee.';
            } elseif ($needsRange && ! $filters['date_from'] && ! $filters['date_to']) {
                $error = 'Please select a date range (from and/or to).';
            } elseif ($needsYear && ! $filters['year']) {
                $error = 'Please select a year.';
            } else {
                $payload = $this->reports->build($report, $config, $filters);
            }
        }

        return Inertia::render('payroll/provident-fund/reports/show', [
            'companyName' => config('pf_reports.company_name'),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
                'requireEmployee' => (bool) ($config['require_employee'] ?? false),
            ],
            'filterOptions' => $this->reportFilterOptions(),
            'transactionTypeOptions' => collect([
                EmployeeProvidentFundService::TYPE_PAYROLL => 'Salary (payroll)',
                EmployeeProvidentFundService::TYPE_MANUAL => 'Manual PF',
                EmployeeProvidentFundService::TYPE_OPENING => 'Opening balance',
                EmployeeProvidentFundService::TYPE_ADJUSTMENT => 'Adjustment',
                EmployeeProvidentFundService::TYPE_WITHDRAWAL => 'PF payment (withdrawal)',
                EmployeeProvidentFundService::TYPE_INTEREST => 'Interest',
            ])->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values()->all(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
                'year' => $request->input('year', (string) date('Y')),
                'month' => $request->input('month', (string) date('n')),
                'transaction_type' => $request->input('transaction_type', ''),
            ]),
            'generated' => $generated,
            'payload' => $payload,
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'error' => $error,
            'exportUrls' => [
                'print' => route('provident-fund.reports.print', $report).'?'.$request->getQueryString(),
                'pdf' => route('provident-fund.reports.pdf', $report).'?'.$request->getQueryString(),
                'excel' => route('provident-fund.reports.excel', $report).'?'.$request->getQueryString(),
            ],
        ]);
    }

    public function print(Request $request, string $report)
    {
        return $this->renderDocument($request, $report, 'print');
    }

    public function pdf(Request $request, string $report)
    {
        $data = $this->documentData($request, $report);

        $pdf = Pdf::loadView('pf.reports.document', $data)
            ->setPaper('a4', $data['orientation'] ?? 'portrait');

        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
    }

    public function excel(Request $request, string $report): StreamedResponse
    {
        $data = $this->documentData($request, $report);
        $template = $data['payload']['template'] ?? 'pf-table';
        [$headers, $rows] = PfReportCsvExporter::rowsFromPayload($template, $data['payload']);
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.csv';

        return PfReportCsvExporter::download($filename, $headers, $rows);
    }

    /**
     * @return \Illuminate\View\View
     */
    protected function renderDocument(Request $request, string $report, string $mode)
    {
        $data = $this->documentData($request, $report);
        $data['printMode'] = $mode === 'print';

        return view('pf.reports.document', $data);
    }

    /**
     * @return array<string, mixed>
     */
    protected function documentData(Request $request, string $report): array
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);
        $payload = $this->reports->build($report, $config, $filters);

        $template = $payload['template'] ?? 'pf-table';
        $colCount = count($payload['columns'] ?? $payload['group_columns'] ?? []);

        return [
            'companyName' => config('pf_reports.company_name'),
            'title' => $config['title'],
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'orientation' => $colCount > 9 ? 'landscape' : 'portrait',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function reportConfig(string $report): array
    {
        $config = config("pf_reports.reports.{$report}");
        if (! $config) {
            abort(404, 'Report not found.');
        }

        return $config;
    }

    /**
     * @return array<string, mixed>
     */
    protected function reportFilterOptions(): array
    {
        return $this->payrollFilterOptions(false);
    }
}
