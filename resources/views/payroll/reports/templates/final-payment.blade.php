@php
    $rows = $payload['rows'] ?? [];
    $totals = $payload['totals'] ?? [];
    $meta = $payload['meta'] ?? [];
    $dateBasis = ucfirst((string) ($payload['date_basis'] ?? 'separation'));
    $amt = static function ($value): string {
        $rounded = (int) round((float) $value);
        return $rounded === 0 ? '-' : number_format($rounded);
    };
@endphp

@if (empty($rows))
    <p>No final payment records found for the selected filters.</p>
@else
    <table class="section-title-table">
        <tr>
            <td>
                <span class="section-title">
                    Period: {{ $periodLabel }} |
                    Records: {{ $meta['row_count'] ?? count($rows) }} |
                    Pending: {{ $meta['pending_count'] ?? 0 }} |
                    Paid: {{ $meta['paid_count'] ?? 0 }}
                </span>
            </td>
            <td class="section-meta">Date basis: {{ $dateBasis }}</td>
        </tr>
    </table>

    <table class="data salary-sheet-table salary-sheet-table-fill">
        <thead>
            <tr class="category-head-row">
                <th colspan="5">Employee Information</th>
                <th colspan="2">Dates</th>
                <th colspan="3">Payable Components</th>
                <th>Deduction</th>
                <th colspan="2">Settlement</th>
            </tr>
            <tr>
                <th class="col-serial">#</th>
                <th class="cell-name">Name (PIN)</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Branch</th>
                <th>Separation</th>
                <th>Payment</th>
                <th class="component-head">PF Refund</th>
                <th class="component-head">Gratuity</th>
                <th class="component-head">Gross</th>
                <th class="component-head">Loan</th>
                <th class="component-head">Net Payable</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $index => $row)
                <tr class="data-row">
                    <td class="col-serial">{{ $index + 1 }}</td>
                    <td class="cell-name">
                        {{ $row['name'] ?? '' }}
                        @if (!empty($row['pin'])) ({{ $row['pin'] }}) @endif
                    </td>
                    <td class="cell-text">{{ $row['designation'] ?? '—' }}</td>
                    <td class="cell-text">{{ $row['department'] ?? '—' }}</td>
                    <td class="cell-text">
                        {{ $row['branch'] ?? '—' }}
                        @if (!empty($row['branch_code'])) ({{ $row['branch_code'] }}) @endif
                    </td>
                    <td class="text-center">{{ $row['separation_date'] ?? '—' }}</td>
                    <td class="text-center">{{ $row['payment_date'] ?? '—' }}</td>
                    <td class="col-amount">{{ $amt($row['pf_balance'] ?? 0) }}</td>
                    <td class="col-amount">{{ $amt($row['gratuity_amount'] ?? 0) }}</td>
                    <td class="col-amount">{{ $amt($row['gross'] ?? 0) }}</td>
                    <td class="col-amount">{{ $amt($row['loan_outstanding'] ?? 0) }}</td>
                    <td class="col-amount"><strong>{{ $amt($row['net_payable'] ?? 0) }}</strong></td>
                    <td class="text-center">{{ $row['status'] ?? '' }}</td>
                </tr>
            @endforeach
            <tr class="totals-row">
                <td colspan="7" class="text-right"><strong>Total</strong></td>
                <td class="col-amount">{{ $amt($totals['pf_balance'] ?? 0) }}</td>
                <td class="col-amount">{{ $amt($totals['gratuity_amount'] ?? 0) }}</td>
                <td class="col-amount">{{ $amt($totals['gross'] ?? 0) }}</td>
                <td class="col-amount">{{ $amt($totals['loan_outstanding'] ?? 0) }}</td>
                <td class="col-amount">{{ $amt($totals['net_payable'] ?? 0) }}</td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <div class="salary-sheet-in-words">
        In Words: {{ \App\Support\AmountInWords::taka($totals['net_payable'] ?? 0) }}
    </div>
    @include('payroll.reports.partials.signature-section')
@endif
