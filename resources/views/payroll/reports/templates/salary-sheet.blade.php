@php
    $heads = $payload['heads'] ?? [];
    $totals = $payload['totals'] ?? null;
@endphp
<table class="data">
    <thead>
        <tr>
            <th>PIN</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Branch</th>
            @foreach ($heads as $head)
                <th class="num">{{ $head }}</th>
            @endforeach
            <th class="num">Gross</th>
            <th class="num">Deduction</th>
            <th class="num">Net</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($payload['rows'] ?? [] as $row)
            <tr>
                <td>{{ $row['pin'] }}</td>
                <td>{{ $row['name'] }}</td>
                <td>{{ $row['designation'] }}</td>
                <td>{{ $row['branch'] }}</td>
                @foreach ($heads as $head)
                    <td class="num">{{ number_format($row['components'][$head] ?? 0, 2) }}</td>
                @endforeach
                <td class="num">{{ number_format($row['gross'], 2) }}</td>
                <td class="num">{{ number_format($row['deduction'], 2) }}</td>
                <td class="num">{{ number_format($row['net'], 2) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="{{ 4 + count($heads) + 3 }}" class="text-center">No payslips found.</td>
            </tr>
        @endforelse
        @if ($totals && count($payload['rows'] ?? []) > 0)
            <tr class="totals-row">
                <td colspan="4">Total</td>
                @foreach ($heads as $head)
                    <td class="num">{{ number_format($totals['components'][$head] ?? 0, 2) }}</td>
                @endforeach
                <td class="num">{{ number_format($totals['gross'], 2) }}</td>
                <td class="num">{{ number_format($totals['deduction'], 2) }}</td>
                <td class="num">{{ number_format($totals['net'], 2) }}</td>
            </tr>
        @endif
    </tbody>
</table>
