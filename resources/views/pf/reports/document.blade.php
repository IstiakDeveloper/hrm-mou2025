<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @include('payroll.reports.partials.styles')
    @php
        $template = $payload['template'] ?? 'pf-table';
        $isBranchBalance = $template === 'pf-grouped' && ! empty($payload['header_groups']);
    @endphp
    @if ($isBranchBalance)
        @include('pf.reports.partials.branch-balance-styles')
    @endif
</head>

<body class="{{ ($orientation ?? 'portrait') === 'landscape' ? 'report-landscape' : '' }}{{ !empty($pdfMode) ? ' pdf-export' : '' }}{{ $isBranchBalance ? ' pf-branch-balance-export' : '' }}">
    <div class="report-wrap">
        @if (!empty($printMode))
            <p class="no-print no-print-hint">Use your browser print dialog. For PDF download, use the PDF button on the report page.</p>
            <p class="no-print no-print-hint">
                <button type="button" onclick="window.print()">Print</button>
            </p>
        @endif

        @if ($isBranchBalance)
            @include('pf.reports.partials.branch-balance-page-header', [
                'companyName' => $companyName,
                'companyAddress' => $companyAddress ?? '',
                'title' => $title,
                'periodLabel' => $periodLabel,
            ])
        @else
            @include('reports.partials.header', [
                'companyName' => $companyName,
                'title' => $title,
                'periodLabel' => $periodLabel,
                'generatedAt' => $generatedAt,
                'payload' => $payload,
            ])
        @endif

        @if (!empty($payload['meta']['message']))
            <p>{{ $payload['meta']['message'] }}</p>
        @elseif ($template === 'pf-ledger')
            @include('pf.reports.templates.ledger', ['payload' => $payload])
        @elseif ($template === 'pf-grouped')
            @include('pf.reports.templates.grouped', [
                'payload' => $payload,
                'pdfMode' => $pdfMode ?? false,
            ])
        @elseif ($template === 'pf-table')
            @include('pf.reports.templates.table', ['payload' => $payload])
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
