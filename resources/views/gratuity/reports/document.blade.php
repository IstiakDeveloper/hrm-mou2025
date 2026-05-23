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

        @include('reports.partials.header', [
            'companyName' => $companyName,
            'title' => $title,
            'periodLabel' => $periodLabel,
            'generatedAt' => $generatedAt,
            'payload' => $payload,
        ])

        @php $template = $payload['template'] ?? 'gratuity-table'; @endphp

        @if (!empty($payload['meta']['message']))
            <p>{{ $payload['meta']['message'] }}</p>
        @elseif ($template === 'gratuity-rules')
            @include('gratuity.reports.templates.rules', ['payload' => $payload])
        @elseif ($template === 'gratuity-grouped')
            @include('gratuity.reports.templates.grouped', ['payload' => $payload])
        @elseif ($template === 'gratuity-table')
            @include('gratuity.reports.templates.table', ['payload' => $payload])
        @else
            <p>No data for the selected filters.</p>
        @endif
    </div>
</body>

</html>
