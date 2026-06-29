@php
    $product = $payload['product'] ?? [];
    $summary = $payload['summary'] ?? [];
    $branchLabel = $payload['branch_label'] ?? 'All branches';
@endphp

<table class="data" style="margin-bottom: 8px;">
    <tbody>
        <tr>
            <th style="width: 22%; text-align: left;">Product</th>
            <td style="text-align: left;">{{ $product['name'] ?? '' }} @if(!empty($product['unit'])) ({{ $product['unit'] }}) @endif</td>
            <th style="width: 22%; text-align: left;">Branch</th>
            <td style="text-align: left;">{{ $branchLabel }}</td>
        </tr>
        <tr>
            <th style="text-align: left;">Opening (before period)</th>
            <td class="text-center">{{ taka_fmt($summary['opening'] ?? 0) }}</td>
            <th style="text-align: left;">Closing (after period)</th>
            <td class="text-center">{{ taka_fmt($summary['closing'] ?? 0) }}</td>
        </tr>
        <tr>
            <th style="text-align: left;">Stock in (period)</th>
            <td class="text-center">{{ taka_fmt($summary['period_stock_in'] ?? 0) }}</td>
            <th style="text-align: left;">Disburse (period)</th>
            <td class="text-center">{{ taka_fmt($summary['period_disburse'] ?? 0) }}</td>
        </tr>
    </tbody>
</table>

<div class="split-grid">
    @include('inventory.reports.templates.split-section', ['section' => $payload['stock_in'] ?? []])
    @include('inventory.reports.templates.split-section', ['section' => $payload['disburse'] ?? []])
</div>
