@php
    $logoPath = public_path('logo.png');
    $logoSrc = file_exists($logoPath)
        ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
        : null;
    $address = $companyAddress ?? '';
@endphp
<header class="payroll-report-header">
    <div class="payroll-report-header-inner">
        @if ($logoSrc)
            <img src="{{ $logoSrc }}" alt="Logo" class="payroll-report-logo" />
        @endif
        <div class="payroll-report-header-text">
            @if (!empty($companyName))
                <div class="payroll-company-name">{{ $companyName }}</div>
            @endif
            @if ($address !== '')
                <div class="payroll-company-address">{{ $address }}</div>
            @endif
            <div class="payroll-report-title">{{ $title }}</div>
        </div>
    </div>
</header>
