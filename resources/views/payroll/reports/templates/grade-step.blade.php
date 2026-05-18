@php
    $heads = $payload['heads'] ?? [];
@endphp
<table class="data">
    <thead>
        <tr>
            <th>Payscale</th>
            <th>Grade</th>
            <th class="num">Step</th>
            <th class="num">Basic</th>
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
                <td>{{ $row['payscale'] }}</td>
                <td>{{ $row['grade'] }}</td>
                <td class="num">{{ $row['step'] }}</td>
                <td class="num">{{ number_format($row['basic'], 2) }}</td>
                @foreach ($heads as $head)
                    <td class="num">{{ number_format($row['components'][$head] ?? 0, 2) }}</td>
                @endforeach
                <td class="num">{{ number_format($row['gross'], 2) }}</td>
                <td class="num">{{ number_format($row['deduction'], 2) }}</td>
                <td class="num">{{ number_format($row['net'], 2) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="{{ 7 + count($heads) }}" class="text-center">No structures found.</td>
            </tr>
        @endforelse
    </tbody>
</table>
