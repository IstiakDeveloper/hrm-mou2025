@php
    use App\Services\PayrollReportService;
    use App\Support\PayrollReportTableWidths;

    $salaryMonth = $payload['salary_month'] ?? '';
    $heads = $payload['heads'] ?? [];
    $earningHeads = $payload['earning_heads'] ?? [];
    $deductionHeads = $payload['deduction_heads'] ?? [];
    $reportService = app(PayrollReportService::class);
    $fmtAmt = static function ($value) {
        $n = (int) round((float) $value);

        return $n === 0 ? '-' : number_format($n, 0);
    };
@endphp
@forelse ($payload['sections'] ?? [] as $sectionIndex => $section)
    @php
        $pages = $reportService->paginateSalarySheetSectionPages(
            $section['rows'] ?? [],
            $heads,
            $section['totals'] ?? null,
        );
        $sectionLayoutPayload = array_merge($payload, [
            'rows' => $section['rows'] ?? [],
            'totals' => $section['totals'] ?? null,
        ]);
        $sectionDataWidths = PayrollReportTableWidths::salarySheetData($sectionLayoutPayload, $fmtAmt);
        $sectionColWidths = PayrollReportTableWidths::salarySheet($sectionLayoutPayload, $fmtAmt);
        $sectionDataTotalChars = PayrollReportTableWidths::salarySheetTotalChars($sectionDataWidths, $earningHeads, $deductionHeads);
        $sectionLayoutTotalChars = PayrollReportTableWidths::salarySheetTotalChars($sectionColWidths, $earningHeads, $deductionHeads);
        $sectionTableLayout = [
            'colWidths' => $sectionColWidths,
            'fillPage' => PayrollReportTableWidths::shouldFillPageWidth($sectionDataTotalChars),
            'layoutTotalChars' => $sectionLayoutTotalChars,
        ];
    @endphp
    <div class="branch-section{{ $sectionIndex > 0 ? ' branch-section-break' : '' }}">
        @foreach ($pages as $pageIndex => $page)
            @if ($pageIndex === 0 && (($section['label'] ?? '') !== '' || $salaryMonth !== ''))
                <table class="section-title-table" width="100%">
                    <tr>
                        <td class="section-title">
                            @if (($section['label'] ?? '') !== '')
                                {{ $section['label'] }}
                            @endif
                        </td>
                        <td class="section-meta">
                            @if ($salaryMonth !== '')
                                Salary Month: {{ $salaryMonth }}
                            @endif
                        </td>
                    </tr>
                </table>
            @endif
            <div class="salary-sheet-page{{ ! $loop->last ? ' salary-sheet-page-break' : ' salary-sheet-page-final' }}">
                @include('payroll.reports.templates.salary-sheet-table', [
                    'payload' => array_merge($payload, [
                        'rows' => $page['rows'],
                        'totals' => $page['totals'],
                        'totals_label' => $page['totals_label'],
                        'serial_start' => $page['serial_start'],
                    ]),
                    'tableLayout' => $sectionTableLayout,
                    'pdfMode' => $pdfMode ?? false,
                    'pageBreakAfter' => ! $loop->last,
                ])
                @if ($loop->last)
                    @include('payroll.reports.partials.signature-section')
                @endif
            </div>
        @endforeach
    </div>
@empty
    <p>No payslips found for the selected filters.</p>
@endforelse
