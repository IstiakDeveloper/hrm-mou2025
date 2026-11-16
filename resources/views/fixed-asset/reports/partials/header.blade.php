@php
    $logoPath = public_path('logo.png');
    $logoSrc = file_exists($logoPath)
        ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
        : null;
    $address = $companyAddress ?? '';
@endphp
<header class="fa-report-header">
    <div class="fa-report-header-inner">
        @if ($logoSrc)
            <img src="{{ $logoSrc }}" alt="Logo" class="fa-report-logo" />
        @endif
        <div class="fa-report-header-text">
            @if (!empty($companyName))
                <div class="fa-company-name">{{ $companyName }}</div>
            @endif
            @if ($address !== '')
                <div class="fa-company-address">{{ $address }}</div>
            @endif
            <div class="fa-report-title">{{ $title }}</div>
        </div>
    </div>
</header>

<table class="fa-section-title-table" width="100%">
    <tr>
        <td class="fa-section-title">{{ $branchLabel ?? '' }}</td>
        <td class="fa-section-meta">
            {{ $printMetaLabel ?? '' }}
            @if (!empty($payload['meta']['row_count']))
                &nbsp;|&nbsp; Records: {{ $payload['meta']['row_count'] }}
            @endif
        </td>
    </tr>
</table>
