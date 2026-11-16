<table class="report-table">
    <thead>
        <tr>
            <th class="text-left" style="width: 25%;">Location & Ratio</th>
            <th style="width: 12%;">Male</th>
            <th style="width: 12%;">Female</th>
            <th style="width: 15%;">Total</th>
            <th style="width: 16%;">Ratio (Male : Female)</th>
            <th style="width: 10%;">Male %</th>
            <th style="width: 10%;">Female %</th>
        </tr>
    </thead>
    <tbody>
        @foreach($payload['rows'] ?? [] as $row)
            @php $isGrand = ($row['location'] === 'Grand Total'); @endphp
            <tr class="{{ $isGrand ? 'font-bold bg-gray' : '' }}">
                <td class="text-left">{{ $row['location'] }}</td>
                <td class="text-center">{{ $row['male'] }}</td>
                <td class="text-center">{{ $row['female'] }}</td>
                <td class="text-center font-bold">{{ $row['total'] }}</td>
                <td class="text-center">{{ $row['ratio'] }}</td>
                <td class="text-center">{{ $row['male_percentage'] }}</td>
                <td class="text-center">{{ $row['female_percentage'] }}</td>
            </tr>
        @endforeach
    </tbody>
</table>
