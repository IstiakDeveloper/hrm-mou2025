@if (!empty($payload['print_date']))
    <div style="text-align: right; font-size: 8pt; margin-bottom: 4px;">
        <strong>Date:</strong> {{ $payload['print_date'] }}
    </div>
@endif

@foreach($payload['sections'] ?? [] as $index => $section)
    <div class="branch-section{{ $index > 0 ? ' page-break' : '' }}">
        <div class="branch-header">
            Branch: {{ $section['branch_name'] }} &nbsp;&nbsp;|&nbsp;&nbsp; Total Staff: {{ $section['staff_count'] }}
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 3%;">SL</th>
                    <th class="text-left" style="width: 10%;">Branch</th>
                    <th style="width: 5%;">PIN</th>
                    <th class="text-left" style="width: 10%;">Name (English)</th>
                    <th class="text-left" style="width: 9%;">Father's Name</th>
                    <th class="text-left" style="width: 10%;">Present / Last Designation</th>
                    <th style="width: 7%;">Joining Date</th>
                    <th style="width: 7%;">Joining Date at Present Location</th>
                    <th style="width: 8%;">Staff Mobile Number</th>
                    <th style="width: 8%;">NID / Smart Card</th>
                    <th style="width: 7%;">Date of Birth</th>
                    <th class="text-left" style="width: 16%;">Permanent Address</th>
                </tr>
            </thead>
            <tbody>
                @forelse($section['rows'] ?? [] as $row)
                    <tr>
                        <td class="text-center">{{ $row['sl'] }}</td>
                        <td class="text-left">{{ $row['branch'] }}</td>
                        <td class="text-center">{{ $row['pin'] }}</td>
                        <td class="text-left">{{ $row['name'] }}</td>
                        <td class="text-left">{{ $row['father_name'] }}</td>
                        <td class="text-left">{{ $row['designation'] }}</td>
                        <td class="text-center">{{ $row['joining_date'] }}</td>
                        <td class="text-center">{{ $row['present_location_joining_date'] }}</td>
                        <td class="text-center">{{ $row['mobile'] }}</td>
                        <td class="text-center">{{ $row['nid_smart_card'] }}</td>
                        <td class="text-center">{{ $row['date_of_birth'] }}</td>
                        <td class="text-left">{{ $row['permanent_address'] }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="12" class="text-center">No staff records in this branch.</td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr class="font-bold bg-gray">
                    <td colspan="11" class="text-right">Subtotal Staff for {{ $section['branch_name'] }}:</td>
                    <td class="text-left">{{ $section['staff_count'] }}</td>
                </tr>
            </tfoot>
        </table>
    </div>
@endforeach

<div style="margin-top: 10px; font-weight: bold; font-size: 9pt;">
    Grand Total Staff: {{ $payload['grand_total'] ?? 0 }}
</div>
