@php
    use App\Support\PayrollReportTableWidths;
    use App\Support\TakaFormat;

    $topsheet = ! empty($payload['topsheet']);
    $earningHeads = $payload['earning_heads'] ?? [];
    $deductionHeads = $payload['deduction_heads'] ?? [];
    $headLabels = $payload['head_labels'] ?? [];
    $totals = $payload['totals'] ?? null;
    $totalsLabel = $payload['totals_label'] ?? 'Total';
    $serialStart = (int) ($payload['serial_start'] ?? 0);
    $employeeCols = $topsheet ? 3 : 4; // topsheet: SL, Branch, Employees
    $earningCols = count($earningHeads) + 1;
    $deductionCols = count($deductionHeads) + 1;
    $summaryCols = $topsheet ? 1 : 2; // Net Payable (+ Account No. for employee sheet)
    $totalCols = $employeeCols + $earningCols + $deductionCols + $summaryCols;
    $infoLabel = $topsheet ? 'Branch Info' : 'Employee Info';
    $nameLabel = $topsheet ? 'Branch' : 'Name';
    $designationLabel = $topsheet ? 'Employees' : 'Designation';
    $fmtAmt = static fn ($value) => TakaFormat::sheetCell($value);
    if (! empty($tableLayout)) {
        $colWidths = $tableLayout['colWidths'];
        $fillPage = $tableLayout['fillPage'];
        $layoutTotalChars = $tableLayout['layoutTotalChars'];
    } else {
        $dataWidths = PayrollReportTableWidths::salarySheetData($payload, $fmtAmt);
        $colWidths = PayrollReportTableWidths::salarySheet($payload, $fmtAmt);
        $dataTotalChars = PayrollReportTableWidths::salarySheetTotalChars($dataWidths, $earningHeads, $deductionHeads, $topsheet);
        $layoutTotalChars = PayrollReportTableWidths::salarySheetTotalChars($colWidths, $earningHeads, $deductionHeads, $topsheet);
        $fillPage = PayrollReportTableWidths::shouldFillPageWidth($dataTotalChars);
    }
    $isPdf = ! empty($pdfMode);
    $colCss = static function (int $chars) use ($fillPage, $layoutTotalChars, $isPdf): string {
        if ($fillPage) {
            return PayrollReportTableWidths::cssPercent($chars, $layoutTotalChars);
        }

        return PayrollReportTableWidths::cssWidth($chars, $isPdf);
    };
@endphp
<table class="data salary-sheet-table{{ $fillPage ? ' salary-sheet-table-fill' : '' }}{{ !empty($pageBreakAfter) ? ' salary-sheet-page-break' : '' }}">
    <colgroup>
        <col style="width: {{ $colCss($colWidths['serial']) }}">
        <col style="width: {{ $colCss($colWidths['name']) }}">
        @unless ($topsheet)
            <col style="width: {{ $colCss($colWidths['pin']) }}">
        @endunless
        <col style="width: {{ $colCss($colWidths['designation']) }}">
        @foreach ($earningHeads as $head)
            <col style="width: {{ $colCss($colWidths['earning'][$head]) }}">
        @endforeach
        <col style="width: {{ $colCss($colWidths['gross']) }}">
        @foreach ($deductionHeads as $head)
            <col style="width: {{ $colCss($colWidths['deduction'][$head]) }}">
        @endforeach
        <col style="width: {{ $colCss($colWidths['ded']) }}">
        <col style="width: {{ $colCss($colWidths['net']) }}">
        @unless ($topsheet)
            <col style="width: {{ $colCss($colWidths['bank']) }}">
        @endunless
    </colgroup>
    <thead>
        <tr class="category-head-row">
            <th colspan="{{ $employeeCols }}">{{ $infoLabel }}</th>
            <th colspan="{{ $earningCols }}">Salary &amp; Allowance</th>
            <th colspan="{{ $deductionCols }}">Deduction</th>
            <th rowspan="2" class="num col-amount">Net Payable</th>
            @unless ($topsheet)
                <th rowspan="2">Account No.</th>
            @endunless
        </tr>
        <tr>
            <th class="num col-serial">SL</th>
            <th class="cell-name">{{ $nameLabel }}</th>
            @unless ($topsheet)
                <th class="num">PIN</th>
            @endunless
            <th>{{ $designationLabel }}</th>
            @foreach ($earningHeads as $head)
                <th class="num component-head col-amount">{{ $headLabels[$head] ?? $head }}</th>
            @endforeach
            <th class="num col-amount">Gross</th>
            @foreach ($deductionHeads as $head)
                <th class="num component-head col-amount">{{ $headLabels[$head] ?? $head }}</th>
            @endforeach
            <th class="num col-amount">Total Deduction</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($payload['rows'] ?? [] as $row)
            <tr class="data-row">
                <td class="num col-serial">{{ $serialStart + $loop->iteration }}</td>
                <td class="cell-name">{{ $row['name'] ?? '' }}</td>
                @unless ($topsheet)
                    <td class="num">{{ $row['pin'] ?? '' }}</td>
                @endunless
                <td class="cell-text">{{ $row['designation'] }}</td>
                @foreach ($earningHeads as $head)
                    <td class="num col-amount">{{ $fmtAmt($row['components'][$head] ?? 0) }}</td>
                @endforeach
                <td class="num col-amount">{{ $fmtAmt($row['gross']) }}</td>
                @foreach ($deductionHeads as $head)
                    <td class="num col-amount">{{ $fmtAmt($row['components'][$head] ?? 0) }}</td>
                @endforeach
                <td class="num col-amount">{{ $fmtAmt($row['deduction']) }}</td>
                <td class="num col-amount">{{ $fmtAmt($row['net']) }}</td>
                @unless ($topsheet)
                    <td class="cell-text">{{ $row['account_no'] ?? '' }}</td>
                @endunless
            </tr>
        @empty
            <tr>
                <td colspan="{{ $totalCols }}" class="text-center">No payslips found.</td>
            </tr>
        @endforelse
        @if ($totals && count($payload['rows'] ?? []) > 0)
            <tr class="totals-row">
                <td colspan="{{ $employeeCols }}" class="text-right">{{ $totalsLabel }}</td>
                @foreach ($earningHeads as $head)
                    <td class="num col-amount">{{ $fmtAmt($totals['components'][$head] ?? 0) }}</td>
                @endforeach
                <td class="num col-amount">{{ $fmtAmt($totals['gross']) }}</td>
                @foreach ($deductionHeads as $head)
                    <td class="num col-amount">{{ $fmtAmt($totals['components'][$head] ?? 0) }}</td>
                @endforeach
                <td class="num col-amount">{{ $fmtAmt($totals['deduction']) }}</td>
                <td class="num col-amount">{{ $fmtAmt($totals['net']) }}</td>
                @unless ($topsheet)
                    <td></td>
                @endunless
            </tr>
        @endif
    </tbody>
</table>
