@php
    use App\Support\PayrollReportTableWidths;

    $earningHeads = $payload['earning_heads'] ?? [];
    $deductionHeads = $payload['deduction_heads'] ?? [];
    $headLabels = $payload['head_labels'] ?? [];
    $totals = $payload['totals'] ?? null;
    $totalsLabel = $payload['totals_label'] ?? 'Total';
    $serialStart = (int) ($payload['serial_start'] ?? 0);
    $employeeCols = 4;
    $earningCols = count($earningHeads) + 1;
    $deductionCols = count($deductionHeads) + 1;
    $summaryCols = 2;
    $totalCols = $employeeCols + $earningCols + $deductionCols + $summaryCols;
    $fmtAmt = static function ($value) {
        $n = (int) round((float) $value);

        return $n === 0 ? '-' : number_format($n, 0);
    };
    if (! empty($tableLayout)) {
        $colWidths = $tableLayout['colWidths'];
        $fillPage = $tableLayout['fillPage'];
        $layoutTotalChars = $tableLayout['layoutTotalChars'];
    } else {
        $dataWidths = PayrollReportTableWidths::salarySheetData($payload, $fmtAmt);
        $colWidths = PayrollReportTableWidths::salarySheet($payload, $fmtAmt);
        $dataTotalChars = PayrollReportTableWidths::salarySheetTotalChars($dataWidths, $earningHeads, $deductionHeads);
        $layoutTotalChars = PayrollReportTableWidths::salarySheetTotalChars($colWidths, $earningHeads, $deductionHeads);
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
        <col style="width: {{ $colCss($colWidths['designation']) }}">
        <col style="width: {{ $colCss($colWidths['grade_step']) }}">
        @foreach ($earningHeads as $head)
            <col style="width: {{ $colCss($colWidths['earning'][$head]) }}">
        @endforeach
        <col style="width: {{ $colCss($colWidths['gross']) }}">
        @foreach ($deductionHeads as $head)
            <col style="width: {{ $colCss($colWidths['deduction'][$head]) }}">
        @endforeach
        <col style="width: {{ $colCss($colWidths['ded']) }}">
        <col style="width: {{ $colCss($colWidths['net']) }}">
        <col style="width: {{ $colCss($colWidths['bank']) }}">
    </colgroup>
    <thead>
        <tr class="category-head-row">
            <th colspan="{{ $employeeCols }}">Employee Info</th>
            <th colspan="{{ $earningCols }}">Salary &amp; Allowance</th>
            <th colspan="{{ $deductionCols }}">Deduction</th>
            <th colspan="{{ $summaryCols }}"></th>
        </tr>
        <tr>
            <th class="num col-serial">#</th>
            <th class="cell-name">Name (Pin)</th>
            <th>Designation</th>
            <th>Grade (Step)</th>
            @foreach ($earningHeads as $head)
                <th class="num component-head col-amount">{{ $headLabels[$head] ?? $head }}</th>
            @endforeach
            <th class="num col-amount">Gross</th>
            @foreach ($deductionHeads as $head)
                <th class="num component-head col-amount">{{ $headLabels[$head] ?? $head }}</th>
            @endforeach
            <th class="num col-amount">Ded.</th>
            <th class="num col-amount">Net</th>
            <th>Bank Account No.</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($payload['rows'] ?? [] as $row)
            <tr class="data-row">
                <td class="num col-serial">{{ $serialStart + $loop->iteration }}</td>
                <td class="cell-name">
                    @if (!empty($row['name']) && !empty($row['pin']))
                        {{ $row['name'] }} ({{ $row['pin'] }})
                    @else
                        {{ $row['name'] ?? $row['pin'] ?? '' }}
                    @endif
                </td>
                <td class="cell-text">{{ $row['designation'] }}</td>
                <td class="cell-text">{{ $row['grade_step'] ?? '' }}</td>
                @foreach ($earningHeads as $head)
                    <td class="num col-amount">{{ $fmtAmt($row['components'][$head] ?? 0) }}</td>
                @endforeach
                <td class="num col-amount">{{ $fmtAmt($row['gross']) }}</td>
                @foreach ($deductionHeads as $head)
                    <td class="num col-amount">{{ $fmtAmt($row['components'][$head] ?? 0) }}</td>
                @endforeach
                <td class="num col-amount">{{ $fmtAmt($row['deduction']) }}</td>
                <td class="num col-amount">{{ $fmtAmt($row['net']) }}</td>
                <td class="cell-text">{{ $row['account_no'] ?? '' }}</td>
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
                <td></td>
            </tr>
        @endif
    </tbody>
</table>
