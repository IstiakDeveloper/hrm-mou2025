<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @include('payroll.reports.partials.styles')
    @if (($orientation ?? 'portrait') !== 'landscape')
        <style>
            @page {
                size: A4 portrait;
                margin: 8mm 7mm;
            }
        </style>
    @endif
    @if (!empty($printMode))
        <script>
            window.addEventListener('load', () => window.print());
        </script>
    @endif
</head>

<body class="{{ ($orientation ?? 'portrait') === 'landscape' ? 'report-landscape' : 'report-portrait' }}">
    <div class="report-wrap">
        @if (!empty($printMode))
            <p class="no-print no-print-hint">Use your browser print dialog. For PDF download, use the PDF button on the report page.</p>
            <p class="no-print no-print-hint">
                <button type="button" onclick="window.print()">Print</button>
            </p>
        @endif

        @include('reports.partials.header', [
            'companyName' => $companyName,
            'title' => $title,
            'periodLabel' => $periodLabel,
            'generatedAt' => $generatedAt,
            'payload' => $payload,
        ])

        @php $template = $payload['template'] ?? 'loan-table'; @endphp

        @if (!empty($payload['meta']['message']))
            <p>{{ $payload['meta']['message'] }}</p>
        @elseif ($template === 'loan-grouped')
            @include('employee-loan.reports.templates.grouped', ['payload' => $payload])
        @elseif ($template === 'loan-installment-ledger')
            @include('employee-loan.reports.templates.installment-ledger', ['payload' => $payload])
        @elseif ($template === 'loan-collection-register')
            @include('employee-loan.reports.templates.collection-register', ['payload' => $payload])
        @elseif ($template === 'loan-statement-employee')
            @include('employee-loan.reports.templates.statement-employee', ['payload' => $payload])
        @elseif ($template === 'loan-table')
            @include('employee-loan.reports.templates.table', ['payload' => $payload])
        @else
            <p>No data for the selected filters.</p>
        @endif
    </div>
</body>

</html>
