@php
    $columns = $payload['group_columns'] ?? [];
    $sections = $payload['sections'] ?? [];
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
        @foreach ($sections as $section)
            <tr>
                @foreach ($columns as $col)
                    @php
                        $key = $col['key'] ?? '';
                        $val = $section[$key] ?? '';
                        $align = $col['align'] ?? 'left';
                        $class = $align === 'right' ? 'num' : ($align === 'center' ? 'text-center' : '');
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
                        $align = $col['align'] ?? 'left';
                        $class = $align === 'right' ? 'num' : ($align === 'center' ? 'text-center' : '');
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
