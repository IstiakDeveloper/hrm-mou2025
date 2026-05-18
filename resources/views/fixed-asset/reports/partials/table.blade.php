@php
    $headers = $payload['headers'] ?? [];
    $rows = $payload['rows'] ?? [];
    $sections = $payload['sections'] ?? [];
    $totals = $payload['totals'] ?? null;
    $template = $payload['template'] ?? '';

    $keys = match ($template) {
        'asset-tracking' => ['asset_tag', 'name', 'branch', 'category', 'status', 'custodian', 'serial_number', 'purchase_date', 'book_value'],
        'vendor-list' => ['vendor', 'asset_count', 'total_purchase'],
        'purchase-list' => ['asset_tag', 'name', 'branch', 'category', 'purchase_date', 'purchase_cost', 'vendor', 'invoice_no'],
        'repair-list' => ['maintenance_date', 'asset_tag', 'branch', 'maintenance_type', 'status', 'description', 'cost', 'service_provider'],
        'transfer-log' => ['transfer_date', 'asset_tag', 'asset_name', 'from_branch', 'to_branch', 'notes'],
        'salvaged-list' => ['asset_tag', 'name', 'branch', 'category', 'purchase_cost', 'salvage_value', 'book_value', 'status'],
        'disposal-list' => ['disposal_date', 'asset_tag', 'branch', 'category', 'disposal_method', 'disposal_amount', 'reason'],
        'depreciation-schedule-summary' => ['group_label', 'asset_count', 'total_purchase', 'total_accumulated', 'total_book_value'],
        default => array_keys($rows[0] ?? []),
    };

    if ($template === 'depreciation-schedule') {
        $keys = ($payload['schedule_variant'] ?? '') === 'audit'
            ? ['asset_tag', 'name', 'group_label', 'serial_number', 'vendor', 'invoice_no', 'purchase_date', 'purchase_cost', 'salvage_value', 'useful_life_years', 'accumulated_depreciation', 'book_value', 'monthly_depreciation']
            : ['asset_tag', 'name', 'group_label', 'purchase_cost', 'salvage_value', 'useful_life_years', 'accumulated_depreciation', 'book_value', 'monthly_depreciation'];
    }

    $fmt = fn ($v) => is_numeric($v) ? number_format((float) $v, 2) : ($v ?? '');
@endphp

@if (count($sections) > 0)
    @foreach ($sections as $section)
        <div class="section-title">{{ $section['title'] ?? '' }} ({{ count($section['rows'] ?? []) }} assets)</div>
        <table class="data">
            <thead>
                <tr>
                    @foreach ($headers as $h)
                        <th>{{ $h }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach ($section['rows'] ?? [] as $row)
                    <tr>
                        @foreach ($keys as $k)
                            <td>{{ $fmt($row[$k] ?? '') }}</td>
                        @endforeach
                    </tr>
                @endforeach
                @if (!empty($section['subtotal']))
                    <tr class="subtotal-row">
                        <td colspan="4">Subtotal</td>
                        <td>{{ $fmt($section['subtotal']['purchase_cost'] ?? '') }}</td>
                        <td colspan="{{ max(0, count($headers) - 5) }}"></td>
                    </tr>
                @endif
            </tbody>
        </table>
    @endforeach
@elseif (count($rows) > 0)
    <table class="data">
        <thead>
            <tr>
                @foreach ($headers as $h)
                    <th>{{ $h }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr>
                    @foreach ($keys as $k)
                        <td>{{ $fmt($row[$k] ?? '') }}</td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
@else
    <p>No data for the selected filters.</p>
@endif

@if ($totals && count($rows) + count($sections) > 0)
    <p class="section-title">Grand total</p>
    <table class="data">
        <tr class="grand-total">
            <td><strong>Summary</strong></td>
            @foreach ($totals as $label => $value)
                <td><strong>{{ ucfirst(str_replace('_', ' ', $label)) }}:</strong> {{ $fmt($value) }}</td>
            @endforeach
        </tr>
    </table>
@endif
