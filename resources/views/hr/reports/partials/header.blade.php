@php
    $logoPath = public_path('logo.png');
    $logoSrc = file_exists($logoPath)
        ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
        : null;
@endphp
<header class="report-header">
    <div class="report-header-inner">
        @if ($logoSrc)
            <img src="{{ $logoSrc }}" alt="Logo" class="report-logo" />
        @endif
        <div class="report-header-text">
            @if (!empty($companyName))
                <div class="company-name">{{ $companyName }}</div>
            @endif
            @if (!empty($companyAddress))
                <div class="company-address">{{ $companyAddress }}</div>
            @endif
            <div class="report-title">{{ $title }}</div>
            @if (!empty($periodLabel))
                <div class="report-period">{{ $periodLabel }}</div>
            @endif
        </div>
    </div>
</header>
