<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @include('hr.reports.partials.styles', ['orientation' => $orientation ?? 'landscape'])
</head>
<body class="report-{{ $orientation ?? 'landscape' }}{{ !empty($pdfMode) ? ' pdf-export' : '' }}">
    <div class="report-wrap">
        @if (!empty($printMode))
            <div class="no-print" style="margin-bottom: 12px; padding: 6px 10px; background: #f3f4f6; border: 1px solid #ccc; font-size: 8.5pt;">
                <span>Click Print or use browser print dialog (Ctrl+P / Cmd+P). For PDF file, use the PDF download button.</span>
                <button type="button" onclick="window.print()" style="margin-left: 10px; padding: 3px 10px; cursor: pointer; font-weight: bold;">Print Document</button>
            </div>
        @endif

        @include('hr.reports.partials.header', [
            'companyName' => $companyName ?? 'MOUSUMI',
            'companyAddress' => $companyAddress ?? 'Ukilpara, Naogaon',
            'title' => $title,
            'periodLabel' => $periodLabel ?? '',
        ])

        @php $template = $payload['template'] ?? 'generic'; @endphp

        @if ($template === 'designation-matrix')
            @include('hr.reports.templates.designation-matrix', ['payload' => $payload])
        @elseif ($template === 'staff-list')
            @include('hr.reports.templates.staff-list', ['payload' => $payload])
        @elseif ($template === 'staff-list-grouped')
            @include('hr.reports.templates.staff-list-grouped', ['payload' => $payload])
        @elseif ($template === 'staff-pksf')
            @include('hr.reports.templates.staff-pksf', ['payload' => $payload])
        @elseif ($template === 'field-summary')
            @include('hr.reports.templates.field-summary', ['payload' => $payload])
        @elseif ($template === 'zone-region-summary')
            @include('hr.reports.templates.zone-region-summary', ['payload' => $payload])
        @elseif ($template === 'zone-summary')
            @include('hr.reports.templates.zone-summary', ['payload' => $payload])
        @elseif ($template === 'location-ratio')
            @include('hr.reports.templates.location-ratio', ['payload' => $payload])
        @elseif ($template === 'ho-grade-summary')
            @include('hr.reports.templates.ho-grade-summary', ['payload' => $payload])
        @elseif ($template === 'recruitment-separation-payment')
            @include('hr.reports.templates.recruitment-separation-payment', ['payload' => $payload])
        @elseif ($template === 'eligibility-list')
            @include('hr.reports.templates.eligibility-list', ['payload' => $payload])
        @else
            <p>No data available for the selected filters.</p>
        @endif

        @include('hr.reports.partials.signatures')
    </div>

    @if (!empty($printMode))
        <script>
            window.addEventListener('load', () => {
                setTimeout(() => window.print(), 250);
            });
        </script>
    @endif
</body>
</html>
