<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Payscale;
use App\Services\PayrollReportService;
use App\Support\PayrollReportCsvExporter;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollReportController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PayrollReportService $reports
    ) {}

    public function index()
    {
        $definitions = config('payroll_reports.reports', []);
        $list = collect($definitions)->map(fn ($def, $slug) => [
            'slug' => $slug,
            'title' => $def['title'],
            'description' => $def['description'] ?? '',
        ])->values();

        return Inertia::render('payroll/reports/index', [
            'reports' => $list,
        ]);
    }

    public function show(Request $request, string $report)
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);
        $generated = $request->boolean('generate');
        $payload = null;
        $error = null;

        if ($generated) {
            if (! empty($config['require_employee']) && ! $filters['employee_id']) {
                $error = 'Please select an employee for this report.';
            } elseif (! empty($config['require_employee']) && ! $filters['month']) {
                $error = 'Please select month for this report.';
            } elseif (! empty($config['date_range']) && ! $filters['date_from'] && ! $filters['date_to'] && ! $filters['year']) {
                $error = 'Please select a date range or year/month.';
            } elseif (empty($config['date_range']) && ! $filters['year'] && ! in_array('payscale_id', $config['filters'] ?? [], true)) {
                $error = 'Please select year (and month where applicable).';
            } else {
                $payload = $this->reports->build($report, $config, $filters);
            }
        }

        return Inertia::render('payroll/reports/show', [
            'companyName' => config('payroll_reports.company_name'),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
                'requireEmployee' => (bool) ($config['require_employee'] ?? false),
            ],
            'filterOptions' => $this->reportFilterOptions($config),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'payscale_id' => $request->input('payscale_id', ''),
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
            ]),
            'generated' => $generated,
            'payload' => $payload,
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'error' => $error,
            'exportUrls' => [
                'print' => route('payroll.reports.print', $report).'?'.$request->getQueryString(),
                'pdf' => route('payroll.reports.pdf', $report).'?'.$request->getQueryString(),
                'excel' => route('payroll.reports.excel', $report).'?'.$request->getQueryString(),
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

        $pdf = Pdf::loadView('payroll.reports.document', $data)
            ->setPaper('a4', $data['orientation'] ?? 'portrait');

        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
    }

    public function excel(Request $request, string $report): StreamedResponse
    {
        $data = $this->documentData($request, $report);
        $template = $data['payload']['template'] ?? 'generic';
        [$headers, $rows] = PayrollReportCsvExporter::rowsFromPayload($template, $data['payload']);
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.csv';

        return PayrollReportCsvExporter::download($filename, $headers, $rows);
    }

    /**
     * @return \Illuminate\View\View
     */
    protected function renderDocument(Request $request, string $report, string $mode)
    {
        $data = $this->documentData($request, $report);
        $data['printMode'] = $mode === 'print';

        return view('payroll.reports.document', $data);
    }

    /**
     * @return array<string, mixed>
     */
    protected function documentData(Request $request, string $report): array
    {
        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);
        $payload = $this->reports->build($report, $config, $filters);

        return [
            'companyName' => config('payroll_reports.company_name'),
            'title' => $config['title'],
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'orientation' => ($payload['template'] ?? '') === 'salary-sheet' && count($payload['heads'] ?? []) > 6
                ? 'landscape'
                : 'portrait',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function reportConfig(string $report): array
    {
        $config = config("payroll_reports.reports.{$report}");
        if (! $config) {
            abort(404, 'Report not found.');
        }

        return $config;
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    protected function reportFilterOptions(array $config): array
    {
        $base = $this->payrollFilterOptions(true);
        $base['payscales'] = Payscale::query()->orderBy('name')->get(['id', 'name', 'code']);

        return $base;
    }
}
