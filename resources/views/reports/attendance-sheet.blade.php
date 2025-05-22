<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Daily Attendance Report with Movements</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            line-height: 1.3;
            margin: 0;
            padding: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2563eb;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #1e3a8a;
        }
        .report-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #374151;
        }
        .report-info {
            font-size: 12px;
            margin-bottom: 5px;
            color: #6b7280;
        }
        .summary-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
        }
        .summary-item {
            text-align: center;
            flex: 1;
        }
        .summary-label {
            font-size: 8px;
            color: #6b7280;
            margin-bottom: 2px;
        }
        .summary-value {
            font-size: 12px;
            font-weight: bold;
            color: #1f2937;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 8px;
        }
        table, th, td {
            border: 1px solid #d1d5db;
        }
        th {
            background-color: #f3f4f6;
            font-weight: bold;
            text-align: center;
            padding: 6px 3px;
            font-size: 8px;
            color: #374151;
        }
        td {
            padding: 4px 3px;
            text-align: center;
            font-size: 8px;
            vertical-align: top;
        }
        .date-header {
            font-weight: bold;
            background-color: #e5e7eb;
            text-align: center;
            font-size: 12px;
            padding: 8px;
            margin-top: 15px;
            margin-bottom: 5px;
            border: 1px solid #9ca3af;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .date-stats {
            font-size: 10px;
            color: #6b7280;
        }
        .weekend-header {
            background-color: #fef3c7;
            color: #92400e;
            border-color: #f59e0b;
        }
        .holiday-header {
            background-color: #dbeafe;
            color: #1e40af;
            border-color: #3b82f6;
        }
        .employee-name {
            text-align: left;
            font-weight: bold;
            font-size: 9px;
        }
        .employee-details {
            text-align: left;
            font-size: 7px;
            color: #6b7280;
            margin-top: 1px;
        }
        .movement-info {
            background-color: #eff6ff;
            padding: 3px 5px;
            border-radius: 2px;
            font-size: 7px;
            text-align: left;
            border: 1px solid #bae6fd;
        }
        .multiple-movements {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
        }
        .movement-official {
            background-color: #dbeafe;
            color: #1e40af;
        }
        .movement-personal {
            background-color: #fef3c7;
            color: #92400e;
        }
        .status-present { color: #059669; font-weight: bold; }
        .status-absent { color: #dc2626; font-weight: bold; }
        .status-late { color: #ea580c; font-weight: bold; }
        .status-half_day { color: #ca8a04; font-weight: bold; }
        .status-leave { color: #2563eb; font-weight: bold; }

        .footer {
            position: fixed;
            bottom: 10px;
            width: 100%;
            text-align: center;
            font-size: 8px;
            padding: 5px 0;
            border-top: 1px solid #d1d5db;
            color: #6b7280;
        }
        .page-break {
            page-break-after: always;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
        }
        .holiday-badge {
            background-color: #dbeafe;
            color: #1e40af;
        }
        .weekend-badge {
            background-color: #fef3c7;
            color: #92400e;
        }
        .movement-badge {
            background-color: #f0f9ff;
            color: #0369a1;
            border: 1px solid #bae6fd;
        }
        .no-records {
            text-align: center;
            color: #6b7280;
            padding: 15px;
            border: 1px dashed #d1d5db;
            margin-top: 0;
            font-style: italic;
            background-color: #f9fafb;
        }
        .remarks-cell {
            text-align: left;
            font-size: 7px;
            max-width: 120px;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">HRM - Mousumi NGO</div>
        <div class="report-title">Daily Attendance Report with Movement Details</div>
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

            $headerClass = '';
            if ($isHoliday) {
                $headerClass = 'holiday-header';
            } elseif ($isWeekend) {
                $headerClass = 'weekend-header';
            }
        @endphp

        <div class="date-header {{ $headerClass }}">
            <div>
                {{ $dateStr }}
                @if($isHoliday)
                    <span class="badge holiday-badge">Holiday: {{ $holiday->title }}</span>
                @elseif($isWeekend)
                    <span class="badge weekend-badge">Weekend</span>
                @endif
            </div>
            @if($dateData)
                <div class="date-stats">
                    Present: {{ $dateData['total_present'] }} |
                    Absent: {{ $dateData['total_absent'] }} |
                    Late: {{ $dateData['total_late'] }} |
                    Movements: {{ $dateData['total_movements'] }}
                </div>
            @endif
        </div>

        @if($attendances->count() > 0)
            <table>
                <thead>
                    <tr>
                        <th width="20%">Employee</th>
                        <th width="10%">Check In</th>
                        <th width="10%">Check Out</th>
                        <th width="8%">Status</th>
                        <th width="10%">Device</th>
                        <th width="20%">Movement Details</th>
                        <th width="22%">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($attendances as $attendance)
                        <tr>
                            <td>
                                <div class="employee-name">
                                    {{ $attendance->employee->first_name }} {{ $attendance->employee->last_name }}
                                </div>
                                <div class="employee-details">
                                    ID: {{ $attendance->employee->employee_id }}<br>
                                    {{ $attendance->employee->designation->name ?? 'N/A' }}<br>
                                    {{ $attendance->employee->department->name ?? 'N/A' }}
                                </div>
                            </td>
                            <td>
                                @if($attendance->check_in_formatted)
                                    <strong>{{ $attendance->check_in_formatted }}</strong>
                                @else
                                    <span style="color: #9ca3af;">-</span>
                                @endif
                            </td>
                            <td>
                                @if($attendance->check_out_formatted)
                                    <strong>{{ $attendance->check_out_formatted }}</strong>
                                @else
                                    <span style="color: #9ca3af;">-</span>
                                @endif
                            </td>
                            <td class="status-{{ $attendance->status }}">
                                {{ ucfirst(str_replace('_', ' ', $attendance->status)) }}
                            </td>
                            <td>{{ $attendance->device->name ?? 'Manual' }}</td>
                            <td>
                                @if($attendance->has_movement)
                                    @if($attendance->multiple_movements)
                                        <div class="movement-info">
                                            <strong style="color: #dc2626;">{{ count($attendance->movements) }} Movements on this day</strong><br>
                                            @foreach($attendance->movements as $index => $movement)
                                                <div style="margin-bottom: 4px; padding: 2px; border-left: 2px solid #3b82f6;">
                                                    <strong>{{ $index + 1 }}. {{ ucfirst($movement->movement_type) }}</strong><br>
                                                    <strong>Purpose:</strong>
                                                    @if(strlen($movement->purpose) > 35)
                                                        {{ Str::limit($movement->purpose, 35) }}
                                                        <span style="color: #6b7280; font-style: italic;">(truncated)</span>
                                                    @else
                                                        {{ $movement->purpose }}
                                                    @endif
                                                    <br>
                                                    <strong>Time:</strong> {{ \Carbon\Carbon::parse($movement->from_datetime)->format('h:i A') }} - {{ \Carbon\Carbon::parse($movement->actual_return_datetime)->format('h:i A') }}<br>
                                                    <strong>Status:</strong> {{ ucfirst($movement->status) }}
                                                </div>
                                                @if(!$loop->last)<hr style="margin: 2px 0; border: 0.5px solid #e5e7eb;">@endif
                                            @endforeach
                                        </div>
                                    @else
                                        <div class="movement-info movement-{{ $attendance->movement_type }}">
                                            <strong>{{ ucfirst($attendance->movement_type) }} Movement</strong><br>
                                            <strong>Purpose:</strong>
                                            @if(strlen($attendance->movement_purpose) > 40)
                                                {{ Str::limit($attendance->movement_purpose, 40) }}
                                                <br><span style="color: #6b7280; font-style: italic; font-size: 6px;">Full purpose available in detailed report</span>
                                            @else
                                                {{ $attendance->movement_purpose }}
                                            @endif
                                            <br>
                                            <strong>Destination:</strong> {{ Str::limit($attendance->movement_destination, 30) }}<br>
                                            <strong>Time:</strong> {{ $attendance->movement_from }} - {{ $attendance->movement_to }}<br>
                                            <strong>Status:</strong> {{ ucfirst($attendance->movement_status) }}
                                        </div>
                                    @endif
                                @else
                                    <span style="color: #9ca3af;">No Movement</span>
                                @endif
                            </td>
                            <td class="remarks-cell">
                                @if($attendance->auto_remarks)
                                    <strong>Auto:</strong> {{ $attendance->auto_remarks }}
                                @endif
                                @if($attendance->remarks)
                                    @if($attendance->auto_remarks)<br>@endif
                                    <strong>Manual:</strong> {{ $attendance->remarks }}
                                @endif
                                @if(!$attendance->auto_remarks && !$attendance->remarks)
                                    <span style="color: #9ca3af;">-</span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div class="no-records">
                @if($isHoliday)
                    🏖️ Holiday: {{ $holiday->title }} - {{ $holiday->description ?? 'No attendance records required' }}
                @elseif($isWeekend)
                    📅 Weekend Day - No attendance records
                @else
                    📋 No attendance records found for this date
                @endif
            </div>
        @endif

        @if(!$loop->last && $loop->iteration % 2 == 0)
            <div class="page-break"></div>
        @endif
    @endforeach

    <div class="footer">
        Generated by: {{ $generatedBy }} |
        Generated on: {{ $generatedAt->format('d M, Y h:i A') }} |
        Page: <span class="pagenum"></span>
    </div>
</body>
</html>
