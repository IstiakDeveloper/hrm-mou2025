<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Bank Advice - {{ $advice->reference }}</title>
    <style>
        @page { size: A4 portrait; margin: 1.9in 1in 0.5in; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #000; font: 11pt 'DejaVu Sans', Arial, sans-serif; line-height: 1.7; }
        table { width: 100%; border-collapse: collapse; }
        .reference td { width: 70%; vertical-align: top; }
        .reference td:last-child { width: 30%; text-align: right; white-space: nowrap; }
        .recipient { margin-top: 28px; line-height: 1.5; }
        .subject { margin: 28px 0; }
        p { margin: 0 0 24px; }
        .body-text { text-align: justify; }
        .signatures { margin-top: 100px; table-layout: fixed; page-break-inside: avoid; }
        .signatures td { text-align: center; vertical-align: top; padding: 0 6px; line-height: 1.5; }
        .attachment { page-break-before: always; }
        .attachment h2 { font-size: 13pt; text-align: center; margin: 0; }
        .attachment-meta { text-align: center; font-size: 9pt; margin-bottom: 16px; }
        .accounts { font-size: 9pt; line-height: 1.4; table-layout: fixed; }
        .accounts th, .accounts td { border: 1px solid #000; padding: 5px; overflow-wrap: anywhere; }
        .accounts thead { display: table-header-group; }
        .accounts tr { page-break-inside: avoid; }
        .accounts .amount { text-align: right; white-space: nowrap; }
        .accounts .total { font-weight: bold; }
        .words { margin-top: 10px; font-size: 10pt; page-break-inside: avoid; }
        .no-print { margin-bottom: 20px; }
        @media screen { body { max-width: 794px; margin: 32px auto; padding: 32px; background: white; } .attachment { margin-top: 80px; } }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    @if (!empty($printMode))
        <div class="no-print"><button onclick="window.print()">{{ $advice->include_account_list ? 'Print letter and account list' : 'Print letter' }}</button></div>
    @endif
    <div class="letter">
        <table class="reference"><tr><td>Ref: {{ $advice->reference }}</td><td>Date: {{ $advice->issue_date->format('d-m-Y') }}</td></tr></table>
        <div class="recipient">
            To<br>The Manager<br>{{ $advice->details['bank_name'] }}<br>{{ $advice->details['bank_branch'] }}
            @if (!empty($advice->details['bank_address']))<br>{!! nl2br(e($advice->details['bank_address'])) !!}@endif
        </div>
        <div class="subject"><strong>Subject: Advice on salary transfer for {{ $advice->salary_month }}.</strong></div>
        <p>Dear Sir,</p>
        <p class="body-text">We would like to inform you that we are maintaining a {{ $advice->details['account_type'] }} Account No. {{ $advice->details['account_no'] }} in the name of "{{ $advice->details['account_name'] }}" at your branch. Therefore, we request you to transfer the said salary amount from the above account to {{ $advice->include_account_list ? "the employees' account numbers mentioned in the attached sheet" : "the employees' designated bank accounts" }}.</p>
        <p>The total amount is BDT <strong>{{ taka_fmt($advice->total, 2) }}</strong> ({{ $advice->in_words }}).</p>
        <p>Thanks with best regards.</p>
        <table class="signatures"><tr>
            @foreach ($advice->signatories as $signer)
                <td style="width: {{ 100 / max(1, count($advice->signatories)) }}%">
                    {{ $signer['name'] }}<br>{{ $signer['designation'] ?? '' }}<br>{{ $signer['organization'] ?? '' }}
                </td>
            @endforeach
        </tr></table>
    </div>
    @if ($advice->include_account_list)
    <div class="attachment">
        <h2>Salary Transfer Account List</h2>
        <div class="attachment-meta">{{ $advice->salary_month }} | Ref: {{ $advice->reference }}</div>
        <table class="accounts">
            <colgroup><col style="width:5%"><col style="width:10%"><col style="width:23%"><col style="width:25%"><col style="width:22%"><col style="width:15%"></colgroup>
            <thead><tr><th>SL</th><th>PIN</th><th>Employee</th><th>A/C No.</th><th>Bank / Branch</th><th class="amount">Amount (BDT)</th></tr></thead>
            <tbody>
                @foreach ($advice->entries as $entry)
                    <tr>
                        <td>{{ $loop->iteration }}</td><td>{{ implode(', ', $entry['pins']) }}</td><td>{{ implode(', ', $entry['names']) }}</td>
                        <td>{{ $entry['account_no'] }}</td><td>{{ $entry['bank_name'] }}<br>{{ $entry['bank_branch'] }}</td>
                        <td class="amount">{{ taka_fmt($entry['amount'], 2) }}</td>
                    </tr>
                @endforeach
                <tr class="total"><td colspan="5">Total</td><td class="amount">{{ taka_fmt($advice->total, 2) }}</td></tr>
            </tbody>
        </table>
        <div class="words"><strong>In Words:</strong> {{ $advice->in_words }}</div>
    </div>
    @endif
</body>
</html>
