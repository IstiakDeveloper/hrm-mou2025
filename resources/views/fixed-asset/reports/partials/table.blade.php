@php
    $headers = $payload['headers'] ?? [];
    $rows = $payload['rows'] ?? [];
    $sections = $payload['sections'] ?? [];
    $totals = $payload['totals'] ?? null;
    $template = $payload['template'] ?? '';

    $keysForRow = function (?array $row) use ($template, $payload) {
        if (! empty($row)) {
            return array_keys($row);
        }

        return match ($template) {
            'asset-tracking' => ['sl', 'asset_no', 'model_no', 'purchase_date', 'purchase_amount', 'book_value', 'floor', 'room', 'voucher', 'ledger', 'description'],
            'purchase-list' => ($payload['purchase_group'] ?? '') === 'category'
                ? ['category', 'sub_category', 'asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'closing_value', 'vendor', 'voucher_no', 'ledger_no', 'status']
                : ['asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'closing_value', 'vendor', 'voucher_no', 'ledger_no', 'status'],
            'disposal-list' => ['sl', 'category', 'sub_category', 'asset_no', 'branch', 'purchase_date', 'purchase_amount', 'opening_value', 'depreciation', 'disposal_amount', 'closing_value'],
            'depreciation-schedule' => match ($payload['schedule_variant'] ?? '') {
                'audit' => ['sl', 'group_label', 'asset_count', 'cost_opening', 'cost_addition', 'cost_sales_adj', 'cost_closing', 'depreciation_rate', 'dep_opening', 'dep_charged', 'dep_sales_adj', 'dep_closing', 'written_down_value'],
                'summary' => ($payload['schedule_group'] ?? '') === 'category'
                    ? ['sl', 'branch', 'asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal', 'transfer_out', 'deduction_total', 'cumulative_deduction', 'closing_value', 'passed_day']
                    : ['asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal', 'transfer_out', 'deduction_total', 'cumulative_deduction', 'closing_value', 'passed_day'],
                default => ($payload['schedule_group'] ?? '') === 'branch'
                    ? ['sub_category', 'asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2', 'closing_value']
                    : ['asset_no', 'location', 'purchase_date', 'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2', 'closing_value'],
            },
            default => [],
        };
    };

    $fmt = fn ($v) => is_numeric($v) ? taka_fmt($v, 0) : ($v ?? '');
@endphp

@if (count($sections) > 0)
    @foreach ($sections as $section)
        @php $sectionRows = $section['rows'] ?? []; $keys = $keysForRow($sectionRows[0] ?? null); @endphp
        <div class="section-title">{{ $section['title'] ?? '' }} ({{ count($sectionRows) }} assets)</div>
        <table class="data">
            <thead>
                <tr>
                    @foreach ($headers as $h)
                        <th>{{ $h }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach ($sectionRows as $row)
                    <tr>
                        @foreach ($keys as $k)
                            <td>{{ $fmt($row[$k] ?? '') }}</td>
                        @endforeach
                    </tr>
                @endforeach
                @if (!empty($section['subtotal']))
                    <tr class="subtotal-row">
                        <td colspan="{{ max(1, count($headers) - 2) }}"><strong>Subtotal</strong></td>
                        <td>{{ $fmt($section['subtotal']['purchase_amount'] ?? $section['subtotal']['purchase_cost'] ?? '') }}</td>
                        <td>{{ $fmt($section['subtotal']['closing_value'] ?? '') }}</td>
                    </tr>
                @endif
            </tbody>
        </table>
    @endforeach
@elseif (count($rows) > 0)
    @php $keys = $keysForRow($rows[0] ?? null); @endphp
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
            @if ($totals)
                <tr class="grand-total">
                    <td><strong>Total</strong></td>
                    @foreach (array_slice($keys, 1) as $k)
                        <td>{{ $fmt($totals[$k] ?? '') }}</td>
                    @endforeach
                </tr>
            @endif
        </tbody>
    </table>
@else
    <p>No data for the selected filters.</p>
@endif

@if ($totals && count($sections) > 0)
    <p class="section-title">Grand total</p>
    <table class="data">
        <tr class="grand-total">
            <td><strong>Summary</strong></td>
            @if (($totals['asset_count'] ?? null) !== null)
                <td><strong>Assets:</strong> {{ $totals['asset_count'] }}</td>
            @endif
            @if (($totals['purchase_amount'] ?? null) !== null)
                <td><strong>Purchase:</strong> {{ $fmt($totals['purchase_amount']) }}</td>
            @endif
            @if (($totals['closing_value'] ?? null) !== null)
                <td><strong>Closing:</strong> {{ $fmt($totals['closing_value']) }}</td>
            @endif
        </tr>
    </table>
@endif
