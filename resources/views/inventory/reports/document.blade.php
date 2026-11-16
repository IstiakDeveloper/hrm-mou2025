<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    @include('inventory.reports.partials.styles')
    @if (!empty($printMode))
        <script>
            window.addEventListener('load', () => window.print());
        </script>
    @endif
</head>

<body>
    <div class="report-wrap">
        @if (!empty($printMode))
            <p class="no-print no-print-hint">
                <button type="button" onclick="window.print()">Print</button>
            </p>
        @endif

        @include('inventory.reports.partials.header', [
            'companyName' => $companyName,
            'title' => $title,
            'dateLabel' => $dateLabel,
        ])

        @php $template = $payload['template'] ?? 'summary-ledger'; @endphp

        @if (!empty($payload['meta']['message']))
            <p>{{ $payload['meta']['message'] }}</p>
        @elseif ($template === 'product-ledger-split')
            @include('inventory.reports.templates.product-ledger-split', ['payload' => $payload])
        @elseif ($template === 'product-ledger')
            @include('inventory.reports.templates.product-ledger', ['payload' => $payload])
        @else
            @include('inventory.reports.templates.table', ['payload' => $payload])
        @endif
    </div>
</body>

</html>
