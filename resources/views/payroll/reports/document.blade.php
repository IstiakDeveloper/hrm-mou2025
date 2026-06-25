<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @include('payroll.reports.partials.styles')
</head>

<body class="report-landscape{{ !empty($pdfMode) ? ' pdf-export' : '' }}">
    <div class="report-wrap">
        @if (!empty($printMode))
            <p class="no-print no-print-hint">Use your browser print dialog. For PDF download, use the PDF button on the report page.</p>
            <p class="no-print no-print-hint">
                <button type="button" onclick="window.print()">Print</button>
            </p>
        @endif

        @include('payroll.reports.partials.header', [
            'companyName' => $companyName,
            'companyAddress' => $companyAddress ?? '',
            'title' => $title,
        ])

        @php $template = $payload['template'] ?? 'generic'; @endphp

        @if (!empty($payload['meta']['message']))
            <p>{{ $payload['meta']['message'] }}</p>
        @elseif ($template === 'grade-step')
            @include('payroll.reports.templates.grade-step', ['payload' => $payload])
        @elseif ($template === 'salary-sheet')
            @include('payroll.reports.templates.salary-sheet', ['payload' => $payload, 'pdfMode' => $pdfMode ?? false])
        @elseif ($template === 'salary-sheet-grouped')
            @include('payroll.reports.templates.salary-sheet-grouped', ['payload' => $payload, 'pdfMode' => $pdfMode ?? false])
        @elseif ($template === 'bank-advice')
            @include('payroll.reports.templates.bank-advice', ['payload' => $payload])
        @elseif ($template === 'head-register')
            @include('payroll.reports.templates.head-register', ['payload' => $payload])
        @elseif ($template === 'advance-salary')
            @include('payroll.reports.templates.advance-salary', ['payload' => $payload])
        @elseif ($template === 'bonus-register')
            @include('payroll.reports.templates.bonus-register', ['payload' => $payload])
        @elseif ($template === 'salary-certificate')
            @include('payroll.reports.templates.salary-certificate', ['payload' => $payload, 'companyName' => $companyName, 'periodLabel' => $periodLabel])
        @else
            <p>No data for the selected filters.</p>
        @endif
    </div>

    @if (!empty($printMode))
        <script>
            window.addEventListener('load', () => window.print());
        </script>
    @endif
</body>

</html>
