<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Daily Attendance Report</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            line-height: 1.3;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }
        .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .report-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .report-info {
            font-size: 12px;
            margin-bottom: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table, th, td {
            border: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            text-align: center;
            padding: 8px 4px;
            font-size: 9px;
        }
        td {
            padding: 6px 4px;
            text-align: center;
            font-size: 9px;
        }
        .date-header {
            font-weight: bold;
            background-color: #e6e6e6;
            text-align: center;
            font-size: 12px;
            padding: 8px;
            margin-top: 15px;
            margin-bottom: 5px;
            border: 1px solid #ccc;
        }
        .weekend-header {
            background-color: #f0f0f0;
            color: #666;
        }
        .holiday-header {
            background-color: #e6f2ff;
            color: #0066cc;
        }
        .employee-name {
            text-align: left;
            font-weight: bold;
        }
        .employee-details {
            text-align: left;
            font-size: 8px;
            color: #555;
        }
        .present { color: #008000; }
        .absent { color: #ff0000; }
        .late { color: #ff6600; }
        .half_day { color: #cc9900; }
        .leave { color: #0066cc; }
        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 8px;
            padding: 5px 0;
            border-top: 1px solid #ddd;
        }
        .page-break {
            page-break-after: always;
        }
        .holiday-badge {
            background-color: #e6f2ff;
            color: #0066cc;
            font-size: 9px;
            padding: 2px 5px;
            border-radius: 3px;
        }
        .weekend-badge {
            background-color: #f0f0f0;
            color: #666;
            font-size: 9px;
            padding: 2px 5px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">HRM - Mousumi NGO</div>
        <div class="report-title">Daily Attendance Report</div>
        <div class="report-info">
            Period: {{ \Carbon\Carbon::parse($startDate)->format('d M, Y') }} to {{ \Carbon\Carbon::parse($endDate)->format('d M, Y') }}
            @if($branchName)
                | Branch: {{ $branchName }}
            @endif
            @if($departmentName)
                | Department: {{ $departmentName }}
            @endif
        </div>
    </div>

    @foreach($dateRange as $date)
        @php
            $dateObj = \Carbon\Carbon::parse($date);
            $dateStr = $dateObj->format('l, d F Y');
            $dateData = $attendanceByDate[$date] ?? null;
            $isWeekend = $dateData ? $dateData['is_weekend'] : false;
            $isHoliday = $dateData ? $dateData['is_holiday'] : false;
            $holiday = $dateData ? $dateData['holiday'] : null;
            $attendances = $dateData ? $dateData['attendances'] : collect();

            // Determine header class based on whether it's a weekend or holiday
            $headerClass = '';
            if ($isHoliday) {
                $headerClass = 'holiday-header';
            } elseif ($isWeekend) {
                $headerClass = 'weekend-header';
            }
        @endphp

        <div class="date-header {{ $headerClass }}">
            {{ $dateStr }}
            @if($isHoliday)
                <span class="holiday-badge">Holiday: {{ $holiday->title }}</span>
            @elseif($isWeekend)
                <span class="weekend-badge">Weekend</span>
            @endif
        </div>

        @if($attendances->count() > 0)
            <table>
                <thead>
                    <tr>
                        <th width="25%">Employee</th>
                        <th width="12%">Check In</th>
                        <th width="12%">Check Out</th>
                        <th width="12%">Status</th>
                        <th width="14%">Device</th>
                        <th width="25%">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($attendances as $attendance)
                        <tr>
                            <td>
                                <div class="employee-name">{{ $attendance->employee->first_name }} {{ $attendance->employee->last_name }}</div>
                                <div class="employee-details">
                                    ID: {{ $attendance->employee->employee_id }} | {{ $attendance->employee->designation->name ?? 'N/A' }} | {{ $attendance->employee->department->name ?? 'N/A' }}
                                </div>
                            </td>
                            <td>{{ $attendance->check_in_formatted ?? '-' }}</td>
                            <td>{{ $attendance->check_out_formatted ?? '-' }}</td>
                            <td class="{{ $attendance->status }}">
                                {{ ucfirst(str_replace('_', ' ', $attendance->status)) }}
                            </td>
                            <td>{{ $attendance->device->name ?? '-' }}</td>
                            <td style="text-align: left">{{ $attendance->auto_remarks ?? $attendance->remarks ?? '-' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p style="text-align: center; color: #666; padding: 10px; border: 1px solid #ddd; margin-top: 0;">
                @if($isHoliday)
                    Holiday: {{ $holiday->title }} - {{ $holiday->description ?? 'No attendance records' }}
                @elseif($isWeekend)
                    Weekend Day - No attendance records
                @else
                    No attendance records found for this date.
                @endif
            </p>
        @endif

        @if(!$loop->last && $loop->iteration % 3 == 0)
            <div class="page-break"></div>
        @endif
    @endforeach

    <div class="footer">
        Generated on: {{ \Carbon\Carbon::now()->format('d M, Y h:i A') }} | Page: <span class="page"></span>
    </div>
</body>
</html>
