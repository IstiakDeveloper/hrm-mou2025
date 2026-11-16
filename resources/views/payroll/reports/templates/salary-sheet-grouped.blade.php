@php
    use App\Services\PayrollReportService;
    use App\Support\PayrollReportTableWidths;
    use App\Support\TakaFormat;

    $salaryMonth = $payload['salary_month'] ?? '';
    $heads = $payload['heads'] ?? [];
    $earningHeads = $payload['earning_heads'] ?? [];
    $deductionHeads = $payload['deduction_heads'] ?? [];
    $reportService = app(PayrollReportService::class);
    $fmtAmt = static fn ($value) => TakaFormat::sheetCell($value);
@endphp
@forelse ($payload['sections'] ?? [] as $sectionIndex => $section)
    @php
        $heads = $section['heads'] ?? $payload['heads'] ?? [];
        $earningHeads = $section['earning_heads'] ?? $payload['earning_heads'] ?? [];
        $deductionHeads = $section['deduction_heads'] ?? $payload['deduction_heads'] ?? [];
        $headLabels = $section['head_labels'] ?? $payload['head_labels'] ?? [];
        $pages = $reportService->paginateSalarySheetSectionPages(
            $section['rows'] ?? [],
            $heads,
            $section['totals'] ?? null,
        );
        $sectionLayoutPayload = array_merge($payload, [
            'rows' => $section['rows'] ?? [],
            'totals' => $section['totals'] ?? null,
            'heads' => $heads,
            'earning_heads' => $earningHeads,
            'deduction_heads' => $deductionHeads,
            'head_labels' => $headLabels,
        ]);
        $sectionDataWidths = PayrollReportTableWidths::salarySheetData($sectionLayoutPayload, $fmtAmt);
        $sectionColWidths = PayrollReportTableWidths::salarySheet($sectionLayoutPayload, $fmtAmt);
        $sectionDataTotalChars = PayrollReportTableWidths::salarySheetTotalChars(
            $sectionDataWidths,
            $earningHeads,
            $deductionHeads,
            ! empty($payload['topsheet']),
        );
        $sectionLayoutTotalChars = PayrollReportTableWidths::salarySheetTotalChars(
            $sectionColWidths,
            $earningHeads,
            $deductionHeads,
            ! empty($payload['topsheet']),
        );
        $sectionTableLayout = [
            'colWidths' => $sectionColWidths,
            'fillPage' => PayrollReportTableWidths::shouldFillPageWidth($sectionDataTotalChars),
            'layoutTotalChars' => $sectionLayoutTotalChars,
        ];
    @endphp
    <div class="branch-section{{ $sectionIndex > 0 ? ' branch-section-break' : '' }}">
        @foreach ($pages as $pageIndex => $page)
            <div class="salary-sheet-page{{ ! $loop->last ? ' salary-sheet-page-break' : ' salary-sheet-page-final' }}">
                @if ($loop->first)
                    @include('payroll.reports.partials.salary-sheet-page-header', [
                        'companyName' => $companyName ?? '',
                        'companyAddress' => $companyAddress ?? '',
                        'title' => $title ?? '',
                        'sectionLabel' => $section['label'] ?? '',
                        'salaryMonth' => $salaryMonth,
                    ])
                @endif
                @include('payroll.reports.templates.salary-sheet-table', [
                    'payload' => array_merge($sectionLayoutPayload, [
                        'rows' => $page['rows'],
                        'totals' => $page['totals'],
                        'totals_label' => $page['totals_label'],
                        'serial_start' => $page['serial_start'],
                    ]),
                    'tableLayout' => $sectionTableLayout,
                    'pdfMode' => $pdfMode ?? false,
                ])
                @include('payroll.reports.partials.salary-sheet-footer', [
                    'showInWords' => ($page['totals_label'] ?? '') === 'Total',
                    'net' => $page['totals']['net'] ?? 0,
                ])
            </div>
        @endforeach
    </div>
@empty
    <p>No payslips found for the selected filters.</p>
@endforelse
