<table class="report-table">
    <thead>
        <tr>
            <th style="width: 3%;">SL</th>
            <th class="text-left" style="width: 14%;">Present / Joining Branch</th>
            <th style="width: 5%;">PIN</th>
            <th class="text-left" style="width: 13%;">Name (English)</th>
            <th class="text-left" style="width: 13%;">Present / Last Designation</th>
            <th style="width: 7%;">Joining Date</th>
            <th style="width: 7%;">Joining Date at Present Location</th>
            <th style="width: 9%;">Duration at Present Location</th>
            <th style="width: 8%;">Staff Mobile Number</th>
            <th class="text-left" style="width: 21%;">Address Combined</th>
        </tr>
    </thead>
    <tbody>
        @forelse($payload['rows'] ?? [] as $row)
            <tr>
                <td class="text-center">{{ $row['sl'] }}</td>
                <td class="text-left">{{ $row['branch'] }}</td>
                <td class="text-center">{{ $row['pin'] }}</td>
                <td class="text-left">{{ $row['name'] }}</td>
                <td class="text-left">{{ $row['designation'] }}</td>
                <td class="text-center">{{ $row['joining_date'] }}</td>
                <td class="text-center">{{ $row['present_location_joining_date'] }}</td>
                <td class="text-center">{{ $row['duration_at_present_location'] }}</td>
                <td class="text-center">{{ $row['mobile'] }}</td>
                <td class="text-left">{{ $row['address_combined'] }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="10" class="text-center">No active staff found.</td>
            </tr>
        @endforelse
    </tbody>
    <tfoot>
        <tr class="font-bold bg-gray">
            <td colspan="9" class="text-right">Total Staff:</td>
            <td class="text-left">{{ count($payload['rows'] ?? []) }}</td>
        </tr>
    </tfoot>
</table>
