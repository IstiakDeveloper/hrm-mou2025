@php
    $headers = $payload['headers'] ?? [];
    $rows = $payload['rows'] ?? [];
    $sections = $payload['sections'] ?? [];
    $totals = $payload['totals'] ?? null;
    $template = $payload['template'] ?? '';
    $expanded = $payload['expanded'] ?? 'none';
    $expandedSections = $payload['expanded_sections'] ?? [];

    $sampleRow = !empty($rows) ? $rows[0] : (!empty($sections[0]['rows']) ? $sections[0]['rows'][0] : []);
    $keys = !empty($sampleRow) ? array_keys($sampleRow) : match ($template) {
        'asset-tracking' => ['category', 'sub_category', 'asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'book_value', 'floor', 'room', 'voucher', 'ledger', 'description'],
        'purchase-list' => ['category', 'sub_category', 'asset_no', 'model_no', 'location', 'purchase_date', 'purchase_amount', 'closing_value', 'vendor', 'voucher_no', 'ledger_no', 'status'],
        'disposal-list' => ['category', 'sub_category', 'asset_no', 'branch', 'purchase_date', 'purchase_amount', 'opening_value', 'depreciation', 'disposal_amount', 'closing_value'],
        'depreciation-schedule' => match ($payload['schedule_variant'] ?? '') {
            'audit' => ['sl', 'group_label', 'asset_count', 'cost_opening', 'cost_addition', 'cost_sales_adj', 'cost_closing', 'depreciation_rate', 'dep_opening', 'dep_charged', 'dep_sales_adj', 'dep_closing', 'written_down_value'],
            'summary' => ['category', 'sub_category', 'branch', 'asset_no', 'purchase_date', 'purchase_amount', 'opening_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal', 'transfer_out', 'deduction_total', 'cumulative_deduction', 'closing_value', 'passed_day'],
            default => ['category', 'sub_category', 'asset_no', 'location', 'purchase_date', 'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2', 'closing_value'],
        },
        default => [],
    };

    $fmt = fn ($v) => is_numeric($v) ? taka_fmt($v, 0) : ($v ?? '');
@endphp

@if (count($sections) > 0)
    <table class="data">
        <thead>
            <tr>
                @foreach ($headers as $h)
                    <th>{{ $h }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($sections as $section)
                @php
                    $secTitle = $section['title'] ?? '';
                    $isExpanded = $expanded === 'all' || in_array($secTitle, $expandedSections, true);
                    $sub = $section['subtotal'] ?? [];
                    $count = $sub['asset_count'] ?? count($section['rows'] ?? []);
                    $purchaseAmt = $sub['purchase_amount'] ?? $sub['purchase_cost'] ?? null;
                    $closingVal = $sub['closing_value'] ?? $sub['book_value'] ?? null;
                @endphp
                <tr style="background-color: #dbeafe; font-weight: bold;">
                    @foreach ($keys as $idx => $k)
                        @if ($idx === 0)
                            <td>{{ $isExpanded ? '[-] ' : '[+] ' }}{{ $secTitle }}</td>
                        @elseif ($k === 'location' || $k === 'asset_count' || $k === 'quantity' || $k === 'asset')
                            <td style="text-align: right;">{{ $count }}</td>
                        @elseif ($k === 'purchase_amount' || $k === 'purchase_cost')
                            <td style="text-align: right;">{{ $purchaseAmt !== null ? $fmt($purchaseAmt) : '' }}</td>
                        @elseif ($k === 'closing_value' || $k === 'book_value')
                            <td style="text-align: right;">{{ $closingVal !== null ? $fmt($closingVal) : '' }}</td>
                        @else
                            <td></td>
                        @endif
                    @endforeach
                </tr>
                @if ($isExpanded)
                    @foreach ($section['rows'] ?? [] as $row)
                        <tr>
                            @foreach ($keys as $k)
                                <td>{{ $fmt($row[$k] ?? '') }}</td>
                            @endforeach
                        </tr>
                    @endforeach
                @endif
            @endforeach
            @if ($totals)
                <tr class="grand-total">
                    @foreach ($keys as $idx => $k)
                        @if ($idx === 0)
                            <td><strong>Total</strong></td>
                        @elseif ($k === 'location' || $k === 'asset_count' || $k === 'quantity' || $k === 'asset')
                            <td style="text-align: right;"><strong>{{ $totals['asset_count'] ?? '' }}</strong></td>
                        @elseif ($k === 'purchase_amount' || $k === 'purchase_cost')
                            <td style="text-align: right;"><strong>{{ $fmt($totals['purchase_amount'] ?? $totals['purchase_cost'] ?? '') }}</strong></td>
                        @elseif ($k === 'closing_value' || $k === 'book_value')
                            <td style="text-align: right;"><strong>{{ $fmt($totals['closing_value'] ?? $totals['book_value'] ?? '') }}</strong></td>
                        @else
                            <td>{{ isset($totals[$k]) ? $fmt($totals[$k]) : '' }}</td>
                        @endif
                    @endforeach
                </tr>
            @endif
        </tbody>
    </table>
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
