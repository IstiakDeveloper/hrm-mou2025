@php
    $columns = $payload['columns'] ?? [];
    $rows = $payload['rows'] ?? [];
@endphp

<table class="data">
    <thead>
        <tr>
            @foreach ($columns as $col)
                @php
                    $align = $col['align'] ?? 'left';
                    $class = match ($align) {
                        'right' => 'num',
                        'center' => 'text-center',
                        default => '',
                    };
                @endphp
                <th class="{{ $class }}">{{ $col['label'] ?? '' }}</th>
            @endforeach
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $row)
            <tr>
                @foreach ($columns as $col)
                    @php
                        $key = $col['key'] ?? '';
                        $val = $row[$key] ?? '';
                        $align = $col['align'] ?? 'left';
                        $class = match ($align) {
                            'right' => 'num',
                            'center' => 'text-center',
                            default => '',
                        };
                        if (! empty($col['numeric']) && is_numeric($val)) {
                            $val = number_format((float) $val, 0);
                        }
                    @endphp
                    <td class="{{ $class }}">{{ $val === '' ? '—' : $val }}</td>
                @endforeach
            </tr>
        @endforeach
    </tbody>
</table>
