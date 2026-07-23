<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetCategory;
use App\Models\AssetFinancialYear;
use App\Models\Branch;
use App\Models\FixedAsset;
use App\Services\AssetFinancialYearService;
use App\Services\FixedAssetReportService;
use App\Support\FixedAssetReportCsvExporter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Support\ProjectPdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FixedAssetReportController extends Controller
{
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly FixedAssetReportService $reports,
        private readonly AssetFinancialYearService $financialYears,
    ) {}

    public function index()
    {
        $first = array_key_first(config('fixed_asset_reports.reports', []));

        return redirect()->route('fixed-asset.reports.show', $first ?: 'asset-tracking');
    }

    public function show(Request $request, string $report)
    {
        $config = $this->reportConfig($report);
        $forcedBranch = $this->scopedBranchIdForUser($request->user());
        $filters = $this->reports->applyDefaultDateRange(
            $this->reports->filtersFromRequest($request, $forcedBranch),
            $config,
        );
        $generated = $request->boolean('generate');
        $payload = null;
        $error = null;

        if ($generated) {
            if (! empty($config['uses_financial_year']) && empty($filters['financial_year_id'])) {
                $error = 'Please select a financial year.';
            } elseif (! empty($config['date_range']) && ! ($filters['date_from'] ?? null) && ! ($filters['date_to'] ?? null)) {
                $error = 'Please select date from and date to.';
            } else {
                $payload = $this->reports->build($report, $config, $filters);
            }
        }

        $query = $request->getQueryString();

        return Inertia::render('fixed-asset/reports/show', [
            'companyName' => config('fixed_asset_reports.company_name'),
            'companyAddress' => config('fixed_asset_reports.company_address', config('payroll_reports.company_address', '')),
            'report' => [
                'slug' => $report,
                'title' => $config['title'],
                'description' => $config['description'] ?? '',
                'filters' => $config['filters'] ?? [],
                'dateRange' => (bool) ($config['date_range'] ?? false),
                'purchaseMonth' => ($config['purchase_group'] ?? null) === 'month',
                'usesFinancialYear' => (bool) ($config['uses_financial_year'] ?? false),
            ],
            'filterOptions' => $this->filterOptions($request, $config),
            'filters' => $this->filterValuesForView($filters),
            'branchScoped' => $forcedBranch !== null,
            'generated' => $generated,
            'payload' => $payload,
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'branchLabel' => $this->reports->branchHeaderLabel($filters),
            'printMetaLabel' => $this->reports->printMetaLabel($filters, $config),
            'error' => $error,
            'exportUrls' => $generated && $payload ? [
                'print' => route('fixed-asset.reports.print', $report).($query ? '?'.$query : ''),
                'pdf' => route('fixed-asset.reports.pdf', $report).($query ? '?'.$query : ''),
                'excel' => route('fixed-asset.reports.excel', $report).($query ? '?'.$query : ''),
            ] : null,
        ]);
    }

    public function print(Request $request, string $report)
    {
        $data = $this->documentData($request, $report);
        $data['printMode'] = true;

        return view('fixed-asset.reports.document', $data);
    }

    public function pdf(Request $request, string $report)
    {
        $data = $this->documentData($request, $report);
        $orientation = ! empty($data['landscape']) ? 'landscape' : 'portrait';
        $pdf = Pdf::loadView('fixed-asset.reports.document', $data)->setPaper('a4', $orientation);
        $filename = str($data['title'])->slug().'-'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
    }

    public function excel(Request $request, string $report): StreamedResponse
    {
        $data = $this->documentData($request, $report);
        [$headers, $rows] = FixedAssetReportCsvExporter::rowsFromPayload($data['payload']);
        $filename = str($report)->slug().'-'.now()->format('Y-m-d').'.csv';

        return FixedAssetReportCsvExporter::download($filename, $headers, $rows);
    }

    /**
     * @return array<string, mixed>
     */
    private function documentData(Request $request, string $report): array
    {
        $config = $this->reportConfig($report);
        $forcedBranch = $this->scopedBranchIdForUser($request->user());
        $filters = $this->reports->applyDefaultDateRange(
            $this->reports->filtersFromRequest($request, $forcedBranch),
            $config,
        );
        $payload = $this->reports->build($report, $config, $filters);
        $wideSchedule = ($config['template'] ?? '') === 'depreciation-schedule'
            && in_array($config['schedule_variant'] ?? '', ['audit', 'summary'], true);

        return [
            'companyName' => config('fixed_asset_reports.company_name'),
            'companyAddress' => config('fixed_asset_reports.company_address', config('payroll_reports.company_address', '')),
            'title' => $config['title'],
            'periodLabel' => $this->reports->periodLabel($filters, $config),
            'branchLabel' => $this->reports->branchHeaderLabel($filters),
            'printMetaLabel' => $this->reports->printMetaLabel($filters, $config),
            'generatedAt' => now()->format('d M Y H:i'),
            'payload' => $payload,
            'printMode' => false,
            'landscape' => $wideSchedule,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function reportConfig(string $report): array
    {
        $config = config("fixed_asset_reports.reports.{$report}");
        if (! $config) {
            abort(404);
        }

        return $config;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, string>
     */
    private function filterValuesForView(array $filters): array
    {
        return [
            'financial_year_id' => $filters['financial_year_id'] ? (string) $filters['financial_year_id'] : '',
            'branch_id' => $filters['branch_id'] ? (string) $filters['branch_id'] : '',
            'asset_category_id' => $filters['asset_category_id'] ? (string) $filters['asset_category_id'] : '',
            'status' => $filters['status'] ?? '',
            'date_from' => $filters['date_from'] ?? '',
            'date_to' => $filters['date_to'] ?? '',
            'year' => (string) $filters['year'],
            'month' => (string) $filters['month'],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    private function filterOptions(Request $request, array $config): array
    {
        $allowed = $config['filters'] ?? [];
        $scopedBranch = $this->scopedBranchIdForUser($request->user());

        $branches = Branch::query()
            ->where('is_active', true)
            ->when($scopedBranch, fn ($q) => $q->where('id', $scopedBranch))
            ->orderBy('is_head_office', 'desc')
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code', 'is_head_office']);

        return [
            'branches' => $branches,
            'categories' => in_array('asset_category_id', $allowed, true)
                ? AssetCategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'code', 'name'])
                : [],
            'financialYears' => in_array('financial_year_id', $allowed, true)
                ? $this->financialYears->options()->map(fn (AssetFinancialYear $fy) => [
                    'id' => $fy->id,
                    'label' => $fy->label,
                    'start_date' => $fy->start_date->toDateString(),
                    'end_date' => $fy->end_date->toDateString(),
                    'is_active' => $fy->is_active,
                ])
                : [],
            'statuses' => collect(FixedAsset::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'years' => range((int) date('Y'), (int) date('Y') - 10),
            'months' => collect(range(1, 12))->map(fn ($m) => [
                'value' => $m,
                'label' => date('F', mktime(0, 0, 0, $m, 1)),
            ]),
        ];
    }
}
