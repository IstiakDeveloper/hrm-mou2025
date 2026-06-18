@php
    $section = $section ?? [];
    $columns = $section['columns'] ?? [];
    $rows = $section['rows'] ?? [];
    $title = $section['title'] ?? '';
    $total = $section['total'] ?? null;
@endphp

<div class="split-table-wrap">
    <div class="section-title">{{ $title }}</div>
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
            @forelse ($rows as $row)
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
            @empty
                <tr>
                    <td colspan="{{ count($columns) }}" class="text-center">No records in this period.</td>
                </tr>
            @endforelse
            @if ($total !== null)
                <tr class="totals-row">
                    <td colspan="{{ count($columns) }}" class="text-center">Total qty: {{ number_format((int) $total, 0) }}</td>
                </tr>
            @endif
        </tbody>
    </table>
</div>
