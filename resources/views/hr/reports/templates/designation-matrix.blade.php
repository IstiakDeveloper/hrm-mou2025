<table class="report-table">
    <thead>
        <tr>
            <th rowspan="2" class="text-left" style="width: 25%;">Designation</th>
            <th colspan="3">Active Staff</th>
            <th colspan="3">Inactive Staff</th>
            <th rowspan="2" style="width: 10%;">Grand Total</th>
        </tr>
        <tr>
            <th style="width: 10%;">Male</th>
            <th style="width: 10%;">Female</th>
            <th style="width: 10%;">Total</th>
            <th style="width: 10%;">Male</th>
            <th style="width: 10%;">Female</th>
            <th style="width: 10%;">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse($payload['rows'] ?? [] as $row)
            <tr>
                <td class="text-left">{{ $row['designation'] }}</td>
                <td class="text-center">{{ $row['active_male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['active_female'] ?: '-' }}</td>
                <td class="text-center font-bold bg-gray">{{ $row['active_total'] ?: '-' }}</td>
                <td class="text-center">{{ $row['inactive_male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['inactive_female'] ?: '-' }}</td>
                <td class="text-center font-bold bg-gray">{{ $row['inactive_total'] ?: '-' }}</td>
                <td class="text-center font-bold">{{ $row['grand_total'] ?: '-' }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="8" class="text-center">No designation records found.</td>
            </tr>
        @endforelse
    </tbody>
    @if (!empty($payload['totals']))
        @php $t = $payload['totals']; @endphp
        <tfoot>
            <tr class="font-bold bg-gray">
                <td class="text-left">Grand Total</td>
                <td class="text-center">{{ $t['active_male'] }}</td>
                <td class="text-center">{{ $t['active_female'] }}</td>
                <td class="text-center">{{ $t['active_total'] }}</td>
                <td class="text-center">{{ $t['inactive_male'] }}</td>
                <td class="text-center">{{ $t['inactive_female'] }}</td>
                <td class="text-center">{{ $t['inactive_total'] }}</td>
                <td class="text-center">{{ $t['grand_total'] }}</td>
            </tr>
        </tfoot>
    @endif
</table>
