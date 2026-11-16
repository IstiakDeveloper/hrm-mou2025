@if (!empty($payload['eligibility_banner']))
    <div class="banner-box">
        @if (!empty($payload['generated_date']))
            <span class="banner-date-right">Generated on: {{ $payload['generated_date'] }}</span>
        @endif
        <span>{{ $payload['eligibility_banner'] }}</span>
        <div style="clear: both;"></div>
    </div>
@endif

@php $type = $payload['eligibility_type'] ?? 'probation_increase'; @endphp

@foreach($payload['sections'] ?? [] as $index => $section)
    <div class="branch-section{{ $index > 0 ? ' page-break' : '' }}">
        <div class="branch-header">
            Branch: {{ $section['branch_name'] }} &nbsp;&nbsp;|&nbsp;&nbsp; Eligible Staff: {{ $section['staff_count'] }}
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th style="width: 3%;">SL</th>
                    <th class="text-left" style="width: 12%;">Branch</th>
                    <th style="width: 4%;">PIN</th>
                    <th class="text-left" style="width: 11%;">Name (English)</th>
                    <th class="text-left" style="width: 11%;">Present / Last Designation</th>
                    <th style="width: 6.5%;">Joining Date</th>
                    @if ($type === 'promotion')
                        <th style="width: 6.5%;">Confirmation Date</th>
                    @endif
                    <th style="width: 8%;">Service Length</th>
                    @if ($type === 'promotion')
                        <th style="width: 6.5%;">Last Promo / Grade</th>
                        <th style="width: 6.5%;">Upcoming Promo Date</th>
                        <th style="width: 6.5%;">Upcoming Month</th>
                    @elseif ($type === 'confirmation')
                        <th style="width: 6.5%;">Upcoming Conf Date</th>
                        <th style="width: 6.5%;">Upcoming Month</th>
                    @else
                        <th style="width: 6.5%;">Upcoming Increase Date</th>
                        <th style="width: 6.5%;">Upcoming Month</th>
                    @endif
                    <th style="width: 5.5%;">Grade</th>
                    <th style="width: 3.5%;">Step</th>
                    <th style="width: 5%;">Basic Salary</th>
                    <th style="width: 5%;">Gross Salary</th>
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
                        @if ($type === 'promotion')
                            <td class="text-center">{{ $row['confirmation_date'] ?: '-' }}</td>
                        @endif
                        <td class="text-center">{{ $row['service_length'] }}</td>
                        @if ($type === 'promotion')
                            <td class="text-center">{{ $row['last_promo_date'] ?: '-' }}</td>
                        @endif
                        <td class="text-center">{{ $row['upcoming_date'] }}</td>
                        <td class="text-center">{{ $row['upcoming_month'] }}</td>
                        <td class="text-center">{{ $row['salary_grade'] }}</td>
                        <td class="text-center">{{ $row['salary_step'] }}</td>
                        <td class="text-right">{{ $row['basic_salary'] }}</td>
                        <td class="text-right">{{ $row['gross_salary'] }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ $type === 'promotion' ? 15 : 13 }}" class="text-center">No eligible staff found in this branch.</td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr class="font-bold bg-gray">
                    <td colspan="{{ $type === 'promotion' ? 14 : 12 }}" class="text-right">Subtotal for {{ $section['branch_name'] }}:</td>
                    <td class="text-left">{{ $section['staff_count'] }}</td>
                </tr>
            </tfoot>
        </table>
    </div>
@endforeach

<div style="margin-top: 10px; font-weight: bold; font-size: 9pt;">
    Grand Total Eligible Staff: {{ $payload['grand_total'] ?? 0 }}
</div>
