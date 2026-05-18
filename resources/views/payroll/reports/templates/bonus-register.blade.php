<table class="data">
    <thead>
        <tr>
            <th>PIN</th>
            <th>Name</th>
            <th>Branch</th>
            <th class="num">Basic</th>
            <th>Bonus</th>
            <th class="num">Rate %</th>
            <th class="num">Amount</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($payload['rows'] ?? [] as $row)
            <tr>
                <td>{{ $row['pin'] }}</td>
                <td>{{ $row['name'] }}</td>
                <td>{{ $row['branch'] }}</td>
                <td class="num">{{ number_format($row['basic'], 2) }}</td>
                <td>{{ $row['bonus_name'] }}</td>
                <td class="num">{{ $row['percentage'] }}</td>
                <td class="num">{{ number_format($row['amount'], 2) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="7" class="text-center">No bonus records found.</td>
            </tr>
        @endforelse
        @if (!empty($payload['meta']['total']))
            <tr class="totals-row">
                <td colspan="6" class="text-right">Total</td>
                <td class="num">{{ number_format($payload['meta']['total'], 2) }}</td>
            </tr>
        @endif
    </tbody>
</table>
