@php
    $columns = $payload['group_columns'] ?? [];
    $sections = $payload['sections'] ?? [];
    $totals = $payload['totals'] ?? null;
    $headerGroups = $payload['header_groups'] ?? [];
    $childColumns = array_values(array_filter($columns, fn (array $col) => ! empty($col['group'])));
    $hasGroupedHeaders = ! empty($headerGroups) && $childColumns !== [];
@endphp

<table class="{{ $hasGroupedHeaders ? 'pf-branch-balance-table' : 'data' }}">
    @if ($hasGroupedHeaders)
        <colgroup>
            <col style="width: 4%">
            <col style="width: 22%">
            <col style="width: 7%">
            <col style="width: 8%">
            <col style="width: 8%">
            <col style="width: 8%">
            <col style="width: 8%">
            <col style="width: 8%">
            <col style="width: 8%">
            <col style="width: 11%">
        </colgroup>
    @endif
    <thead>
        @if ($hasGroupedHeaders)
            <tr class="category-head-row">
                @foreach ($headerGroups as $group)
                    <th
                        class="text-center"
                        @if (! empty($group['colspan'])) colspan="{{ $group['colspan'] }}" @endif
                        @if (! empty($group['rowspan'])) rowspan="{{ $group['rowspan'] }}" @endif
                    >{{ $group['label'] ?? '' }}</th>
                @endforeach
            </tr>
            <tr>
                @foreach ($childColumns as $col)
                    <th class="component-head col-amount">{{ $col['label'] ?? '' }}</th>
                @endforeach
            </tr>
        @else
            <tr>
                @foreach ($columns as $col)
                    <th class="text-center">{{ $col['label'] ?? '' }}</th>
                @endforeach
            </tr>
        @endif
    </thead>
    <tbody>
        @foreach ($sections as $section)
            <tr class="data-row">
                @foreach ($columns as $col)
                    @php
                        $key = $col['key'] ?? '';
                        $val = $section[$key] ?? '';
                        $class = match ($key) {
                            'sl' => 'col-serial',
                            'branch' => 'cell-text',
                            'employee_count' => 'col-serial',
                            default => ! empty($col['numeric']) ? 'col-amount' : 'cell-text',
                        };
                        if (! empty($col['numeric']) && is_numeric($val)) {
                            $val = taka_fmt($val);
                        }
                    @endphp
                    <td class="{{ $class }}">{{ $val }}</td>
                @endforeach
            </tr>
        @endforeach
        @if ($totals)
            <tr class="totals-row">
                @foreach ($columns as $col)
                    @php
                        $key = $col['key'] ?? '';
                        $val = $totals[$key] ?? '';
                        if ($key === 'branch' && ! empty($totals['title'])) {
                            $val = $totals['title'];
                        }
                        $class = match ($key) {
                            'sl' => 'col-serial',
                            'branch' => 'cell-text',
                            'employee_count' => 'col-serial',
                            default => ! empty($col['numeric']) ? 'col-amount' : 'cell-text',
                        };
                        if (! empty($col['numeric']) && is_numeric($val)) {
                            $val = taka_fmt($val);
                        }
                    @endphp
                    <td class="{{ $class }}">{{ $val }}</td>
                @endforeach
            </tr>
        @endif
    </tbody>
</table>
