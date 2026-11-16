<table class="data">
    <thead>
        <tr>
            <th>PIN</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Branch</th>
            <th>Period</th>
            <th>Component</th>
            <th>Loan Type</th>
            <th class="num">Amount</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($payload['rows'] ?? [] as $row)
            <tr>
                <td>{{ $row['pin'] }}</td>
                <td>{{ $row['name'] }}</td>
                <td>{{ $row['designation'] }}</td>
                <td>{{ $row['branch'] }}</td>
                <td>{{ $row['period'] }}</td>
                <td>{{ $row['head_name'] }}</td>
                <td>{{ $row['loan_type'] }}</td>
                <td class="num">{{ taka_fmt($row['amount'], 2) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="8" class="text-center">No advance or loan deductions in this period.</td>
            </tr>
        @endforelse
        @if (!empty($payload['meta']['total']))
            <tr class="totals-row">
                <td colspan="7" class="text-right">Total</td>
                <td class="num">{{ taka_fmt($payload['meta']['total'], 2) }}</td>
            </tr>
        @endif
    </tbody>
</table>
