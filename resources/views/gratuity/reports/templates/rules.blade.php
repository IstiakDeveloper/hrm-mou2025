@php $rows = $payload['rows'] ?? []; @endphp

<table class="data">
    <thead>
        <tr>
            <th class="text-center">SL</th>
            <th>Minimum service (years)</th>
            <th class="text-center">Basic multiplier</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($rows as $row)
            <tr>
                <td class="text-center">{{ $row['sl'] ?? '' }}</td>
                <td>{{ $row['min_years'] ?? '' }}</td>
                <td class="text-center">{{ $row['multiplier'] ?? '' }}</td>
                <td>{{ $row['description'] ?? '' }}</td>
            </tr>
        @endforeach
    </tbody>
</table>
