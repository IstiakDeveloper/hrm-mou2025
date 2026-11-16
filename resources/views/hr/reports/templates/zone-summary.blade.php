<table class="report-table">
    <thead>
        <tr>
            <th rowspan="2" style="width: 3%;">SL</th>
            <th rowspan="2" class="text-left" style="width: 25%;">Zone</th>
            <th colspan="3">Officer</th>
            <th colspan="3">Accountant</th>
            <th colspan="3">Branch Manager</th>
            <th colspan="3">Regional Manager</th>
            <th colspan="3">Zonal Manager</th>
            <th colspan="3">Other</th>
            <th colspan="3">Total</th>
        </tr>
        <tr>
            <th style="width: 3%;">M</th><th style="width: 3%;">F</th><th style="width: 3.5%;">T</th>
            <th style="width: 3%;">M</th><th style="width: 3%;">F</th><th style="width: 3.5%;">T</th>
            <th style="width: 3%;">M</th><th style="width: 3%;">F</th><th style="width: 3.5%;">T</th>
            <th style="width: 3%;">M</th><th style="width: 3%;">F</th><th style="width: 3.5%;">T</th>
            <th style="width: 3%;">M</th><th style="width: 3%;">F</th><th style="width: 3.5%;">T</th>
            <th style="width: 3%;">M</th><th style="width: 3%;">F</th><th style="width: 3.5%;">T</th>
            <th style="width: 3.5%;">M</th><th style="width: 3.5%;">F</th><th style="width: 5%;">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse($payload['rows'] ?? [] as $row)
            <tr>
                <td class="text-center">{{ $row['sl'] }}</td>
                <td class="text-left font-bold">{{ $row['zone'] }}</td>

                <td class="text-center">{{ $row['officer_male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['officer_female'] ?: '-' }}</td>
                <td class="text-center font-bold">{{ $row['officer_total'] ?: '-' }}</td>

                <td class="text-center">{{ $row['accountant_male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['accountant_female'] ?: '-' }}</td>
                <td class="text-center font-bold">{{ $row['accountant_total'] ?: '-' }}</td>

                <td class="text-center">{{ $row['bm_male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['bm_female'] ?: '-' }}</td>
                <td class="text-center font-bold">{{ $row['bm_total'] ?: '-' }}</td>

                <td class="text-center">{{ $row['rm_male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['rm_female'] ?: '-' }}</td>
                <td class="text-center font-bold">{{ $row['rm_total'] ?: '-' }}</td>

                <td class="text-center">{{ $row['zm_male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['zm_female'] ?: '-' }}</td>
                <td class="text-center font-bold">{{ $row['zm_total'] ?: '-' }}</td>

                <td class="text-center">{{ $row['other_male'] ?: '-' }}</td>
                <td class="text-center">{{ $row['other_female'] ?: '-' }}</td>
                <td class="text-center font-bold">{{ $row['other_total'] ?: '-' }}</td>

                <td class="text-center font-bold bg-gray">{{ $row['total_male'] }}</td>
                <td class="text-center font-bold bg-gray">{{ $row['total_female'] }}</td>
                <td class="text-center font-bold bg-gray">{{ $row['row_total'] }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="23" class="text-center">No zone records found.</td>
            </tr>
        @endforelse
    </tbody>
    @if (!empty($payload['totals']))
        @php $t = $payload['totals']; @endphp
        <tfoot>
            <tr class="font-bold bg-gray">
                <td colspan="2" class="text-left">Grand Total</td>
                <td class="text-center">{{ $t['officer_male'] }}</td>
                <td class="text-center">{{ $t['officer_female'] }}</td>
                <td class="text-center">{{ $t['officer_total'] }}</td>

                <td class="text-center">{{ $t['accountant_male'] }}</td>
                <td class="text-center">{{ $t['accountant_female'] }}</td>
                <td class="text-center">{{ $t['accountant_total'] }}</td>

                <td class="text-center">{{ $t['bm_male'] }}</td>
                <td class="text-center">{{ $t['bm_female'] }}</td>
                <td class="text-center">{{ $t['bm_total'] }}</td>

                <td class="text-center">{{ $t['rm_male'] }}</td>
                <td class="text-center">{{ $t['rm_female'] }}</td>
                <td class="text-center">{{ $t['rm_total'] }}</td>

                <td class="text-center">{{ $t['zm_male'] }}</td>
                <td class="text-center">{{ $t['zm_female'] }}</td>
                <td class="text-center">{{ $t['zm_total'] }}</td>

                <td class="text-center">{{ $t['other_male'] }}</td>
                <td class="text-center">{{ $t['other_female'] }}</td>
                <td class="text-center">{{ $t['other_total'] }}</td>

                <td class="text-center">{{ $t['total_male'] }}</td>
                <td class="text-center">{{ $t['total_female'] }}</td>
                <td class="text-center">{{ $t['row_total'] }}</td>
            </tr>
        </tfoot>
    @endif
</table>
