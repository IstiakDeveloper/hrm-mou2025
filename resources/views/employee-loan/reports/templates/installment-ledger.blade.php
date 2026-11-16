<style>
    .report-portrait .report-header {
        min-height: 34px;
        margin-bottom: 6px;
        padding-bottom: 4px;
    }

    .report-portrait .company-name {
        font-size: 10pt;
    }

    .report-portrait .report-title {
        font-size: 9pt;
        margin-top: 0;
    }

    .report-portrait .report-meta {
        font-size: 7.5pt;
        margin-top: 0;
    }

    .report-portrait .report-logo {
        height: 32px;
        width: 46px;
        margin-top: -16px;
    }

    .loan-ledger-section {
        margin: 0 0 10px;
        page-break-inside: auto;
        break-inside: auto;
    }

    .loan-ledger-info-wrap {
        margin-bottom: 5px;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .loan-ledger-info {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0;
    }

    .loan-ledger-info > tbody > tr > td {
        width: 33.33%;
        vertical-align: top;
        padding: 0 4px 0 0;
        border: 0;
    }

    .loan-ledger-info > tbody > tr > td:last-child {
        padding-right: 0;
    }

    table.data.loan-ledger-kv {
        margin-top: 0;
        width: 100%;
    }

    table.data.loan-ledger-kv th,
    table.data.loan-ledger-kv td {
        font-size: 8pt;
        padding: 1px 4px;
        vertical-align: middle;
        line-height: 1.2;
    }

    table.data.loan-ledger-kv th {
        width: 46%;
        background: #f4f4f5;
        font-weight: 700;
        text-align: left;
        white-space: nowrap;
    }

    table.data.loan-ledger-table {
        width: auto;
        table-layout: auto;
        page-break-inside: auto;
        break-inside: auto;
        margin-top: 0;
        font-size: 9pt;
    }

    table.data.loan-ledger-table thead {
        display: table-header-group;
    }

    table.data.loan-ledger-table tbody {
        display: table-row-group;
    }

    table.data.loan-ledger-table th,
    table.data.loan-ledger-table td {
        padding: 2px 4px;
        font-size: 9pt;
        line-height: 1.25;
        vertical-align: middle;
        white-space: nowrap;
    }

    table.data.loan-ledger-table td.num,
    table.data.loan-ledger-table th.num {
        white-space: nowrap;
        text-align: right;
    }

    table.loan-ledger-table tr.data-row,
    table.loan-ledger-table tr.totals-row {
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: auto;
    }

    table.data th.loan-ledger-repeat-header {
        border: 0;
        border-bottom: 1px solid #000;
        background: #fff;
        text-align: left;
        font-size: 9pt;
        font-weight: 700;
        padding: 2px 4px;
        vertical-align: middle;
    }
</style>

@php
    $sections = $payload['sections'] ?? [];
@endphp

@forelse ($sections as $section)
    <div class="loan-ledger-section">
        <div class="loan-ledger-info-wrap">
            @include('employee-loan.reports.partials.ledger-info-header', [
                'header' => $section['header'] ?? [],
            ])
        </div>

        <table class="data loan-ledger-table">
            <thead>
                <tr>
                    <th colspan="14" class="loan-ledger-repeat-header">
                        {{ $section['title'] ?? 'Loan' }}
                        @if (!empty($section['loan_type']))
                            · {{ $section['loan_type'] }}
                        @endif
                        @if (!empty($section['status']))
                            · {{ $section['status'] }}
                        @endif
                    </th>
                </tr>
                <tr>
                    <th rowspan="2" class="text-left fit">Month</th>
                    <th colspan="3" class="text-center">Schedule</th>
                    <th rowspan="2" class="text-center">No</th>
                    <th rowspan="2" class="text-center fit">Pay month</th>
                    <th rowspan="2" class="text-left branch-head">Branch</th>
                    <th colspan="3" class="text-center">Collection</th>
                    <th colspan="3" class="text-center">Balance</th>
                    <th rowspan="2" class="text-center">St</th>
                </tr>
                <tr>
                    <th class="num">PR</th>
                    <th class="num">SC</th>
                    <th class="num">Tot</th>
                    <th class="num">PR</th>
                    <th class="num">SC</th>
                    <th class="num">Tot</th>
                    <th class="num">PR</th>
                    <th class="num">SC</th>
                    <th class="num">Tot</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($section['rows'] ?? [] as $row)
                    @php
                        $isPaid = ($row['status_label'] ?? '') === 'PAID';
                    @endphp
                    <tr class="data-row">
                        <td class="fit">{{ $row['scheduled_month'] ?? '—' }}</td>
                        <td class="num">{{ taka_fmt($row['principal_amount'] ?? 0) }}</td>
                        <td class="num">{{ taka_fmt($row['service_charge_amount'] ?? 0) }}</td>
                        <td class="num">{{ taka_fmt($row['total_amount'] ?? 0) }}</td>
                        <td class="text-center">{{ $row['installment_no'] ?? '—' }}</td>
                        <td class="text-center">{{ $row['payment_month'] ?? '—' }}</td>
                        <td class="branch-cell">{{ $row['payment_branch'] ?? '—' }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['paid_principal_amount'] ?? 0) : '—' }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['paid_service_charge_amount'] ?? 0) : '—' }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['paid_amount'] ?? 0) : '—' }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['balance_principal'] ?? 0) : taka_fmt(0) }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['balance_service_charge'] ?? 0) : taka_fmt(0) }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['balance_total'] ?? 0) : taka_fmt(0) }}</td>
                        <td class="text-center">{{ ($row['status_label'] ?? '') === 'PAID' ? 'Paid' : 'Due' }}</td>
                    </tr>
                @endforeach
                @if (!empty($section['totals']))
                    @php $totals = $section['totals']; @endphp
                    <tr class="totals-row">
                        <td class="fit"><strong>Total</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['principal_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['service_charge_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['total_amount'] ?? 0) }}</strong></td>
                        <td class="text-center">—</td>
                        <td class="text-center">—</td>
                        <td class="branch-cell">—</td>
                        <td class="num"><strong>{{ taka_fmt($totals['paid_principal_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['paid_service_charge_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['paid_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['balance_principal'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['balance_service_charge'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['balance_total'] ?? 0) }}</strong></td>
                        <td class="text-center">—</td>
                    </tr>
                @endif
            </tbody>
        </table>
    </div>
@empty
    <p>No loans found for the selected filters.</p>
@endforelse
