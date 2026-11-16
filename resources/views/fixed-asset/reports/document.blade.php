<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @include('fixed-asset.reports.partials.styles', ['landscape' => !empty($landscape)])
    @if (!empty($printMode))
        <script>window.addEventListener('load', () => window.print());</script>
    @endif
</head>
<body>
    <div class="report-wrap">
        @if (!empty($printMode))
            <p class="no-print" style="text-align:center;font-size:8pt;">
                <button type="button" onclick="window.print()">Print</button>
            </p>
        @endif

        @include('fixed-asset.reports.partials.header', [
            'companyName' => $companyName,
            'companyAddress' => $companyAddress ?? '',
            'title' => $title,
            'branchLabel' => $branchLabel ?? '',
            'printMetaLabel' => $printMetaLabel ?? $periodLabel,
            'generatedAt' => $generatedAt,
            'payload' => $payload,
        ])

        @if (!empty($payload['meta']['message']))
            <p>{{ $payload['meta']['message'] }}</p>
        @else
            @include('fixed-asset.reports.partials.table', ['payload' => $payload])
        @endif
    </div>
</body>
</html>
