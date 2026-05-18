<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @include('payroll.reports.partials.styles')
    @if (!empty($printMode))
        <script>
            window.addEventListener('load', () => window.print());
        </script>
    @endif
</head>

<body>
    <div class="report-wrap">
        @if (!empty($printMode))
            <p class="no-print no-print-hint">Use your browser print dialog. For PDF download, use the PDF button on the report page.</p>
            <p class="no-print no-print-hint">
                <button type="button" onclick="window.print()">Print</button>
            </p>
        @endif

        <header class="report-header">
            <div class="company-name">{{ $companyName }}</div>
            <div class="report-title">{{ $title }}</div>
            <div class="report-meta">
                Period: {{ $periodLabel }} &nbsp;|&nbsp; Generated: {{ $generatedAt }}
                @if (!empty($payload['meta']['row_count']))
                    &nbsp;|&nbsp; Records: {{ $payload['meta']['row_count'] }}
                @endif
            </div>
        </header>

        @php $template = $payload['template'] ?? 'generic'; @endphp

        @if (!empty($payload['meta']['message']))
            <p>{{ $payload['meta']['message'] }}</p>
        @elseif ($template === 'grade-step')
            @include('payroll.reports.templates.grade-step', ['payload' => $payload])
        @elseif ($template === 'salary-sheet')
            @include('payroll.reports.templates.salary-sheet', ['payload' => $payload])
        @elseif ($template === 'salary-sheet-grouped')
            @include('payroll.reports.templates.salary-sheet-grouped', ['payload' => $payload])
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
</body>

</html>
