@php
    $columns = $payload['columns'] ?? [];
    $rows = $payload['rows'] ?? [];
    $totals = $payload['totals'] ?? null;
@endphp

<table class="data">
    <thead>
        <tr>
            @foreach ($columns as $col)
                @php
                    $align = $col['align'] ?? 'left';
                    $class = $align === 'right' ? 'num' : ($align === 'center' ? 'text-center' : '');
                @endphp
                <th class="{{ $class }}">{{ $col['label'] ?? '' }}</th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        @forelse ($rows as $row)
            <tr>
                @foreach ($columns as $col)
                    @php
                        $key = $col['key'] ?? '';
                        $val = $row[$key] ?? '';
                        $align = $col['align'] ?? 'left';
                        $class = $align === 'right' ? 'num' : ($align === 'center' ? 'text-center' : '');
                        if (! empty($col['numeric']) && is_numeric($val)) {
                            $val = taka_fmt($val);
                        }
                    @endphp
                    <td class="{{ $class }}">{{ $val }}</td>
                @endforeach
            </tr>
        @empty
            <tr>
                <td colspan="{{ max(count($columns), 1) }}" class="text-center">No data for the selected filters.</td>
            </tr>
        @endforelse
        @if ($totals && count($rows) > 0)
            <tr class="totals-row">
                @foreach ($columns as $i => $col)
                    @php
                        $key = $col['key'] ?? '';
                        $val = $i === 0 ? 'Total' : ($totals[$key] ?? '');
                        $align = $col['align'] ?? 'left';
                        $class = $align === 'right' ? 'num' : ($align === 'center' ? 'text-center' : '');
                        if ($i > 0 && ! empty($col['numeric']) && is_numeric($val)) {
                            $val = taka_fmt($val);
                        }
                    @endphp
                    <td class="{{ $class }}">{{ $val }}</td>
                @endforeach
            </tr>
        @endif
    </tbody>
</table>
