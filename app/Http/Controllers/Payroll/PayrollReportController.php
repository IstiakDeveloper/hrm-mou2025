<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Payscale;
use App\Services\PayrollReportService;
use App\Support\PayrollReportPrintPdf;
use App\Support\PayrollReportXlsxExporter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Support\ProjectPdf;
use Mpdf\HTMLParserMode;
use Mpdf\Mpdf;
use Symfony\Component\HttpFoundation\Response;

class PayrollReportController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PayrollReportService $reports
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $isBranch = $user?->isBranchAccount() ?? false;

        $definitions = config('payroll_reports.reports', []);
        $list = collect($definitions)
            ->filter(function ($def, $slug) use ($isBranch) {
                if ($isBranch) {
                    return in_array($slug, ['salary-sheet-posted', 'salary-sheet-unposted'], true);
                }

                return ($def['section'] ?? 'payroll') === 'payroll';
            })
            ->map(fn ($def, $slug) => [
                'slug' => $slug,
                'title' => $def['title'],
                'description' => $def['description'] ?? '',
            ])->values();

        return Inertia::render('payroll/reports/index', [
            'reports' => $list,
        ]);
    }

    protected function assertBranchReportAllowed(Request $request, string $report): void
    {
        $user = $request->user();
        if ($user && $user->isBranchAccount()) {
            if (! in_array($report, ['salary-sheet-posted', 'salary-sheet-unposted'], true)) {
                abort(403, 'Branch users can only view branch salary sheet reports.');
            }
        }
    }

    public function show(Request $request, string $report)
    {
        $this->assertBranchReportAllowed($request, $report);

        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);

        $user = $request->user();
        if ($user && $user->isBranchAccount() && $user->branch_id) {
            $filters['branch_id'] = (int) $user->branch_id;
        }

        $hasMonthFilter = in_array('month', $config['filters'] ?? [], true);
        $isDateRange = ! empty($config['date_range']);
        $defaultPeriod = self::defaultPayrollPeriod($config['status'] ?? null);

        if (! $request->has('month') && $hasMonthFilter && ! $isDateRange) {
            $filters['month'] = $defaultPeriod['month'];
        }
        if (! $request->has('year') && ! $isDateRange) {
            $filters['year'] = $defaultPeriod['year'];
        }

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

        $defaultFilterValues = $this->payrollFilterValues($request, $config['status'] ?? null);
        if ($isDateRange && ! $request->has('month')) {
            $defaultFilterValues['month'] = '';
        }

        return Inertia::render('payroll/reports/show', [
            'companyName' => config('payroll_reports.company_name'),
            'companyAddress' => config('payroll_reports.company_address'),
            'signatureBlocks' => config('payroll_reports.signature_blocks', []),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
                'requireEmployee' => (bool) ($config['require_employee'] ?? false),
            ],
            'filterOptions' => $this->reportFilterOptions($config),
            'filters' => array_merge($defaultFilterValues, [
                'payscale_id' => $request->input('payscale_id', ''),
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
                'payment_status' => $request->input('payment_status', 'all'),
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
        $html = view('payroll.reports.document', $data)->render();
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        try {
            if (! PayrollReportPrintPdf::canGenerate()) {
                throw new \RuntimeException('Chrome is not available for PDF export.');
            }

            $pdf = PayrollReportPrintPdf::generate($html);
        } catch (\Throwable $e) {
            report($e);

            return $this->downloadPdfViaMpdf($data, $filename);
        }

        return response()->make(
            $pdf,
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control' => 'public, must-revalidate, max-age=0',
            ]
        );
    }

    protected function downloadPdfViaMpdf(array $data, string $filename): Response
    {
        $isLandscape = ($data['orientation'] ?? 'landscape') === 'landscape';

        $mpdf = new Mpdf([
            'mode' => 'utf-8',
            'format' => $isLandscape ? 'A4-L' : 'A4',
            'margin_left' => $this->printSideMarginMm(),
            'margin_right' => $this->printSideMarginMm(),
            'margin_top' => (float) (config('payroll_reports.print.margin_top_mm') ?? 4),
            'margin_bottom' => (float) (config('payroll_reports.print.margin_bottom_mm') ?? 4),
            'default_font' => 'dejavusans',
            'shrink_tables_to_fit' => 1.4,
        ]);

        $mpdf->SetTitle($data['title']);
        $mpdf->SetAuthor(config('app.name'));
        $this->writePayrollReportHtml($mpdf, view('payroll.reports.document', array_merge($data, ['pdfMode' => true]))->render());

        return response()->make(
            $mpdf->Output($filename, 'S'),
            200,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
                'Cache-Control' => 'public, must-revalidate, max-age=0',
            ]
        );
    }

    public function excel(Request $request, string $report): Response
    {
        $data = $this->documentData($request, $report);
        $template = $data['payload']['template'] ?? 'generic';
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.xlsx';

        return PayrollReportXlsxExporter::download($filename, $template, $data['payload'], [
            'companyName' => $data['companyName'],
            'companyAddress' => $data['companyAddress'],
            'title' => $data['title'],
            'periodLabel' => $data['periodLabel'],
        ]);
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
        $this->assertBranchReportAllowed($request, $report);

        $config = $this->reportConfig($report);
        $filters = $this->reports->filtersFromRequest($request);

        $user = $request->user();
        if ($user && $user->isBranchAccount() && $user->branch_id) {
            $filters['branch_id'] = (int) $user->branch_id;
        }

        $hasMonthFilter = in_array('month', $config['filters'] ?? [], true);
        $isDateRange = ! empty($config['date_range']);
        $defaultPeriod = self::defaultPayrollPeriod($config['status'] ?? null);

        if (! $request->has('month') && $hasMonthFilter && ! $isDateRange) {
            $filters['month'] = $defaultPeriod['month'];
        }
        if (! $request->has('year') && ! $isDateRange) {
            $filters['year'] = $defaultPeriod['year'];
        }

        $payload = $this->reports->build($report, $config, $filters);

        return [
            'companyName' => config('payroll_reports.company_name'),
            'companyAddress' => config('payroll_reports.company_address'),
            'title' => $config['title'],
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'orientation' => 'landscape',
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
        $defaultPeriod = self::defaultPayrollPeriod($config['status'] ?? null);
        $base = $this->payrollFilterOptions(true, $defaultPeriod['month']);
        $base['payscales'] = Payscale::query()->orderBy('name')->get(['id', 'name', 'code']);

        return $base;
    }

    protected function writePayrollReportHtml(Mpdf $mpdf, string $html): void
    {
        if (function_exists('ini_set')) {
            @ini_set('pcre.backtrack_limit', '10000000');
        }

        if (preg_match('/<style\b[^>]*>.*?<\/style>/is', $html, $styleMatch)) {
            $mpdf->WriteHTML($styleMatch[0], HTMLParserMode::HEADER_CSS);
        }

        if (! preg_match('/<body[^>]*>(.*)<\/body>/is', $html, $bodyMatch)) {
            $mpdf->WriteHTML($html);

            return;
        }

        foreach ($this->payrollReportHtmlChunks(trim($bodyMatch[1])) as $chunk) {
            $mpdf->WriteHTML($chunk);
        }
    }

    /**
     * @return list<string>
     */
    protected function payrollReportHtmlChunks(string $body): array
    {
        $chunks = [];

        if (preg_match('/^(.*?)(?=<(?:div class="branch-section|table class="data salary-sheet-table))/s', $body, $headerMatch)) {
            $header = trim($headerMatch[1]);
            if ($header !== '') {
                $chunks[] = $header;
            }
        }

        $tablePattern = '/(?:<table class="section-title-table"[^>]*>.*?<\/table>\s*)?<table class="data salary-sheet-table"[^>]*>.*?<\/table>/s';

        if (preg_match_all($tablePattern, $body, $tableMatches)) {
            foreach ($tableMatches[0] as $index => $tableHtml) {
                $chunk = trim($tableHtml);
                if ($index > 0 && str_contains($chunk, 'section-title-table')) {
                    $chunk = '<div class="branch-section-break"></div>'.$chunk;
                }
                $chunks[] = $chunk;
            }

            return $chunks;
        }

        if (preg_match_all('/<table\b[^>]*>.*?<\/table>/is', $body, $tableMatches)) {
            foreach ($tableMatches[0] as $tableHtml) {
                $chunks[] = trim($tableHtml);
            }

            return $chunks;
        }

        return [$body];
    }

    protected function printSideMarginMm(): float
    {
        $mm = (float) (config('payroll_reports.print.margin_side_mm') ?? 3);
        $extraPx = (int) (config('payroll_reports.print.margin_side_extra_px') ?? 10);

        return $mm + ($extraPx * 25.4 / 96);
    }
}
