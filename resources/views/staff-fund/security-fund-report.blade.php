<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Security Fund Register</title>
    <style>
        @page {
            size: {{ ($pdfMode ?? false) ? 'portrait' : 'A4 portrait' }};
            margin: 8mm 8mm 12mm;
            @if($pdfMode ?? false) footer: html_securityFundFooter; @endif
        }
        body { margin: 0; font-family: "DejaVu Sans", sans-serif; font-size: 7pt; line-height: 1.25; color: #172b26; }
        h1 { margin: 0 0 3pt; font-size: 14pt; }
        h2 { margin: 0 0 3pt; font-size: 10pt; }
        p { margin: 3pt 0; }
        .header { text-align: center; margin-bottom: 8pt; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 6.5pt; }
        th, td { padding: 3pt 2pt; border: 0.5pt solid #b6c9c0; vertical-align: top; overflow-wrap: anywhere; word-wrap: break-word; }
        th { background: #e6f1eb; text-align: left; font-weight: bold; }
        .num { text-align: right; white-space: nowrap; }
        .date { white-space: nowrap; }
        .total { font-weight: bold; background: #f0f5f2; }
        .review-notes { margin-top: 6pt; font-size: 6.5pt; }
        .ledger-title { margin-top: 12pt; }
        .signatures { margin-top: 24pt; }
        .signatures td { border: 0; text-align: center; padding-top: 10pt; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        @media screen { body { max-width: 194mm; margin: 12px auto; padding: 0 8px; } }
        @media print { button { display: none; } }
    </style>
</head>
<body>
@if($pdfMode ?? false)
    <htmlpagefooter name="securityFundFooter"><div style="text-align:right;font-size:6.5pt">Page {PAGENO} of {nbpg}</div></htmlpagefooter>
@else
    <button onclick="window.print()">Print</button>
@endif
<div class="header">
    <h1>{{ config('staff_fund_reports.company_name', config('app.name')) }}</h1>
    <p>{{ config('staff_fund_reports.company_address') }}</p>
    <h2>Security Fund Register</h2>
    <p>As of {{ !empty($asOf) ? \Carbon\Carbon::parse($asOf)->format('d/m/Y') : $asOf }} · 6% annual simple interest · Effective 01 July 2026</p>
</div>
@if ($summary['review_count'])
    <p>{{ $summary['review_count'] }} account(s) require date verification. Recorded principal is included where available; unverified interest has not been added. See review notes below.</p>
@endif
<p>Each deposit must be held for one year. Only complete calendar months count (6% / 12 per month); interest is rounded to whole taka. No interest on interest.</p>
@if (!empty($filters))
    <p>Filters: @foreach ($filters as $key => $value) {{ str_replace('_', ' ', $key) }}: {{ $value ?: 'All' }}; @endforeach</p>
@endif
<table class="register">
    <thead><tr>
        <th width="5%">PIN</th><th width="20%">Employee</th><th width="10%">Branch</th>
        <th width="12.5%">Principal</th><th width="8%">Posted<br>unpaid</th><th width="8%">Unposted<br>accrued</th>
        <th width="9.5%">Interest<br>payable</th><th width="14%">Total<br>payable</th><th width="13%">Status</th>
    </tr></thead>
    <tbody>
    @forelse ($rows as $row)
        <tr>
            <td class="pin">{{ $row['pin'] }}</td><td>{{ $row['name'] }}</td><td>{{ $row['branch'] }}</td>
            @if (isset($row['review_required']) && !isset($row['principal']))
                <td colspan="5">{{ $row['review_required'] }}</td>
            @else
                @foreach (['principal','posted_interest','unposted_interest','interest','total'] as $key)
                    <td class="num">{{ number_format((float) $row[$key], in_array($key, ['principal', 'total']) ? 2 : 0) }}</td>
                @endforeach
            @endif
            <td>{{ $row['status'] }}@if(isset($row['review_required']))<br>Date review*@endif</td>
        </tr>
    @empty
        <tr><td colspan="9">No Security Fund accounts.</td></tr>
    @endforelse
        <tr class="total">
            <td colspan="3">Total</td>
            @foreach (['principal','posted_interest','unposted_interest','interest','total'] as $key)
                <td class="num">{{ number_format((float) $summary[$key], in_array($key, ['principal', 'total']) ? 2 : 0) }}</td>
            @endforeach
            <td>{{ $summary['account_count'] }} accounts</td>
        </tr>
    </tbody>
</table>
@if ($summary['review_count'])
    <div class="review-notes">
        @foreach ($rows as $row)
            @if(isset($row['review_required']))<p>* PIN {{ $row['pin'] }}: {{ $row['review_required'] }}</p>@endif
        @endforeach
    </div>
@endif
@if (isset($ledger))
    <h2 class="ledger-title">Transaction Ledger</h2>
    <table class="ledger">
        <thead><tr>
            <th width="13%">Date<br>(DD/MM/YYYY)</th><th width="12%">Type</th>
            <th width="13%">Principal +</th><th width="13%">Principal −</th>
            <th width="10%">Interest +</th><th width="10%">Interest −</th><th width="29%">Reference / notes</th>
        </tr></thead>
        <tbody>
        @foreach ($ledger as $transaction)
            <tr>
                <td class="date">{{ $transaction->transaction_date->format('d/m/Y') }}</td>
                <td>{{ str_replace('_', ' ', $transaction->type) }}</td>
                @foreach (['principal_credit','principal_debit','interest_credit','interest_debit'] as $key)
                    <td class="num">{{ number_format((float) $transaction->{$key}, str_starts_with($key, 'interest') ? 0 : 2) }}</td>
                @endforeach
                <td>{{ $transaction->reference_no }}<br>{{ $transaction->notes }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>
@endif
<table class="signatures"><tr>
    @foreach (config('staff_fund_reports.signature_blocks', [['label'=>'Prepared By'],['label'=>'Checked By'],['label'=>'Approved By']]) as $signature)
        <td>{{ $signature['label'] }}</td>
    @endforeach
</tr></table>
</body>
</html>
