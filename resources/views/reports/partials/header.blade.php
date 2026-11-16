@php
    $logoPath = public_path('logo.png');
    $logoSrc = file_exists($logoPath)
        ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
        : null;
@endphp
<header class="report-header{{ $logoSrc ? ' has-logo' : '' }}">
    @if ($logoSrc)
        <img src="{{ $logoSrc }}" alt="Logo" class="report-logo" />
    @endif
    <div class="report-header-text">
        <div class="company-name">{{ $companyName }}</div>
        <div class="report-title">{{ $title }}</div>
        <div class="report-meta">
            Period: {{ $periodLabel }} &nbsp;|&nbsp; Generated: {{ $generatedAt }}
            @if (!empty($payload['meta']['row_count']))
                &nbsp;|&nbsp; Records: {{ $payload['meta']['row_count'] }}
            @endif
        </div>
    </div>
</header>
