<table class="report-table">
    <thead>
        <tr>
            <th style="width: 5%;">SL</th>
            <th class="text-left" style="width: 30%;">Salary Grade</th>
            <th class="text-left" style="width: 35%;">Present / Last Designation</th>
            <th style="width: 10%;">Male</th>
            <th style="width: 10%;">Female</th>
            <th style="width: 10%;">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse($payload['rows'] ?? [] as $row)
            <tr>
                <td class="text-center">{{ $row['sl'] }}</td>
                <td class="text-left">{{ $row['salary_grade'] }}</td>
                <td class="text-left">{{ $row['designation'] }}</td>
                <td class="text-center">{{ $row['male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['female'] ?: '-' }}</td>
                <td class="text-center font-bold">{{ $row['total'] }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="6" class="text-center">No head office staff found.</td>
            </tr>
        @endforelse
    </tbody>
    @if (!empty($payload['totals']))
        @php $t = $payload['totals']; @endphp
        <tfoot>
            <tr class="font-bold bg-gray">
                <td colspan="3" class="text-right">Grand Total:</td>
                <td class="text-center">{{ $t['male'] }}</td>
                <td class="text-center">{{ $t['female'] }}</td>
                <td class="text-center">{{ $t['total'] }}</td>
            </tr>
        </tfoot>
    @endif
</table>
