@foreach($payload['sections'] ?? [] as $index => $section)
    <div class="branch-section{{ $index > 0 ? ' page-break' : '' }}">
        <div class="branch-header">
            Branch: {{ $section['branch_name'] }} &nbsp;&nbsp;|&nbsp;&nbsp; Total Staff: {{ $section['staff_count'] }}
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 3%;">SL</th>
                    <th class="text-left" style="width: 14%;">Branch</th>
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
                @forelse($section['rows'] ?? [] as $row)
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
                        <td colspan="10" class="text-center">No staff records in this branch.</td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr class="font-bold bg-gray">
                    <td colspan="9" class="text-right">Subtotal Staff for {{ $section['branch_name'] }}:</td>
                    <td class="text-left">{{ $section['staff_count'] }}</td>
                </tr>
            </tfoot>
        </table>
    </div>
@endforeach

<div style="margin-top: 10px; font-weight: bold; font-size: 9pt;">
    Grand Total Active Staff: {{ $payload['grand_total'] ?? 0 }}
</div>
