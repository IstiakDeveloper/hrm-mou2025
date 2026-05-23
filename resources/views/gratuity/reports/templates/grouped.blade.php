@php
    $sections = $payload['sections'] ?? [];
    $totals = $payload['totals'] ?? null;
@endphp

<table class="data">
    <thead>
        <tr>
            <th>Group</th>
            <th class="text-center">Employees</th>
            <th class="num">Total basic salary</th>
            <th class="num">Total gratuity</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($sections as $section)
            <tr>
                <td>{{ $section['title'] ?? '—' }}</td>
                <td class="text-center">{{ $section['employee_count'] ?? 0 }}</td>
                <td class="num">{{ number_format((float) ($section['total_basic'] ?? 0), 0) }}</td>
                <td class="num">{{ number_format((float) ($section['total_gratuity'] ?? 0), 0) }}</td>
            </tr>
        @endforeach
        @if ($totals)
            <tr class="totals-row">
                <td>{{ $totals['title'] ?? 'Grand total' }}</td>
                <td class="text-center">{{ $totals['employee_count'] ?? 0 }}</td>
                <td class="num">{{ number_format((float) ($totals['total_basic'] ?? 0), 0) }}</td>
                <td class="num">{{ number_format((float) ($totals['total_gratuity'] ?? 0), 0) }}</td>
            </tr>
        @endif
    </tbody>
</table>
