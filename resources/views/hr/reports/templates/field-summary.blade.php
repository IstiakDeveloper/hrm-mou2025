<table class="report-table">
    <thead>
        <tr>
            <th rowspan="2" style="width: 3%;">SL</th>
            <th rowspan="2" class="text-left" style="width: 8%;">Zone</th>
            <th rowspan="2" class="text-left" style="width: 8%;">Region</th>
            <th rowspan="2" class="text-left" style="width: 13%;">Branch</th>
            <th colspan="3">Officer</th>
            <th colspan="3">Accountant</th>
            <th colspan="3">Branch Manager</th>
            <th colspan="3">Regional Manager</th>
            <th colspan="3">Zonal Manager</th>
            <th colspan="3">Other</th>
            <th colspan="3">Total</th>
        </tr>
        <tr>
            <th style="width: 2.5%;">M</th><th style="width: 2.5%;">F</th><th style="width: 3%;">T</th>
            <th style="width: 2.5%;">M</th><th style="width: 2.5%;">F</th><th style="width: 3%;">T</th>
            <th style="width: 2.5%;">M</th><th style="width: 2.5%;">F</th><th style="width: 3%;">T</th>
            <th style="width: 2.5%;">M</th><th style="width: 2.5%;">F</th><th style="width: 3%;">T</th>
            <th style="width: 2.5%;">M</th><th style="width: 2.5%;">F</th><th style="width: 3%;">T</th>
            <th style="width: 2.5%;">M</th><th style="width: 2.5%;">F</th><th style="width: 3%;">T</th>
            <th style="width: 3%;">M</th><th style="width: 3%;">F</th><th style="width: 4%;">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse($payload['rows'] ?? [] as $row)
            <tr>
                <td class="text-center">{{ $row['sl'] }}</td>
                <td class="text-left">{{ $row['zone'] }}</td>
                <td class="text-left">{{ $row['region'] }}</td>
                <td class="text-left">{{ $row['branch'] }}</td>

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
                <td colspan="25" class="text-center">No field staff found.</td>
            </tr>
        @endforelse
    </tbody>
    @if (!empty($payload['totals']))
        @php $t = $payload['totals']; @endphp
        <tfoot>
            <tr class="font-bold bg-gray">
                <td colspan="4" class="text-left">Grand Total</td>
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

@if (!empty($payload['head_office_summary']))
    @php $ho = $payload['head_office_summary']; @endphp
    <div style="margin-top: 25px; margin-bottom: 8px; font-weight: bold; font-size: 13px; text-transform: uppercase;">
        Head Office Staff Summary
    </div>
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
            @forelse($ho['rows'] ?? [] as $row)
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
        @if (!empty($ho['totals']))
            @php $hot = $ho['totals']; @endphp
            <tfoot>
                <tr class="font-bold bg-gray">
                    <td colspan="3" class="text-right">Head Office Total:</td>
                    <td class="text-center">{{ $hot['male'] }}</td>
                    <td class="text-center">{{ $hot['female'] }}</td>
                    <td class="text-center">{{ $hot['total'] }}</td>
                </tr>
                @if (!empty($payload['totals']))
                    @php $ft = $payload['totals']; @endphp
                    <tr class="font-bold" style="background-color: #e5e7eb;">
                        <td colspan="3" class="text-right">Combined Grand Total (Field + Head Office):</td>
                        <td class="text-center">{{ ($ft['total_male'] ?? 0) + ($hot['male'] ?? 0) }}</td>
                        <td class="text-center">{{ ($ft['total_female'] ?? 0) + ($hot['female'] ?? 0) }}</td>
                        <td class="text-center">{{ ($ft['row_total'] ?? 0) + ($hot['total'] ?? 0) }}</td>
                    </tr>
                @endif
            </tfoot>
        @endif
    </table>
@endif
