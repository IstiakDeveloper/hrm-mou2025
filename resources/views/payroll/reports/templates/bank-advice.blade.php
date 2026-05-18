<table class="data">
    <thead>
        <tr>
            <th>PIN</th>
            <th>Name</th>
            <th>Branch</th>
            <th>Bank</th>
            <th>Branch Name</th>
            <th>Account No</th>
            <th>Type</th>
            <th class="num">Amount</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($payload['rows'] ?? [] as $row)
            <tr>
                <td>{{ $row['pin'] }}</td>
                <td>{{ $row['name'] }}</td>
                <td>{{ $row['branch'] }}</td>
                <td>{{ $row['bank_name'] }}</td>
                <td>{{ $row['bank_branch'] }}</td>
                <td>{{ $row['account_no'] }}</td>
                <td>{{ $row['account_type'] }}</td>
                <td class="num">{{ number_format($row['amount'], 2) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="8" class="text-center">No bank advice rows.</td>
            </tr>
        @endforelse
        @if (!empty($payload['meta']['total']))
            <tr class="totals-row">
                <td colspan="7" class="text-right">Grand Total</td>
                <td class="num">{{ number_format($payload['meta']['total'], 2) }}</td>
            </tr>
        @endif
    </tbody>
</table>
