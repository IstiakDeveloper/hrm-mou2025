<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @include('fixed-asset.reports.partials.styles')
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

        <header class="report-header">
            <div class="company-name">{{ $companyName }}</div>
            <div class="report-title">{{ $title }}</div>
            <div class="report-meta">
                Period: {{ $periodLabel }} | Generated: {{ $generatedAt }}
                @if (!empty($payload['meta']['row_count']))
                    | Records: {{ $payload['meta']['row_count'] }}
                @endif
            </div>
        </header>

        @if (!empty($payload['meta']['message']))
            <p>{{ $payload['meta']['message'] }}</p>
        @else
            @include('fixed-asset.reports.partials.table', ['payload' => $payload])
        @endif
    </div>
</body>
</html>
