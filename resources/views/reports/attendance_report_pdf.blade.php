<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Attendance Report - {{ $employee->name_en ?? $employee->full_name_en }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .header h1 {
            margin-bottom: 5px;
            color: #333;
        }

        .header p {
            margin: 5px 0;
            color: #666;
        }

        css .summary-box {
            border: 1px solid #ddd;
            margin-bottom: 20px;
            border-radius: 5px;
            background-color: #f9f9f9;
        }

        .summary-box h3 {
            margin: 0;
            padding: 10px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
            text-align: center;
            background-color: #f0f0f0;
            color: #333;
        }

        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }

        .summary-table td {
            padding: 8px;
            border: 1px solid #e0e0e0;
            text-align: center;
        }

        .summary-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
            background-color: #f5f5f5;
            font-weight: bold;
            width: 30%;
        }

        .summary-value {
            font-size: 14px;
            font-weight: bold;
            width: 20%;
        }

        .total-days {
            color: #333;
        }

        .present {
            color: #10b981;
        }

        .absent {
            color: #ef4444;
        }

        .late {
            color: #f59e0b;
        }

        .half-day {
            color: #ff9800;
        }

        .leave {
            color: #2196f3;
        }

        .on-duty {
            color: #9c27b0;
        }


        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th,
        td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 10px;
        }

        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }

        tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-present {
            background-color: #d4edda;
            color: #155724;
        }

        .status-absent {
            background-color: #f8d7da;
            color: #721c24;
        }

        .status-late {
            background-color: #fff3cd;
            color: #856404;
        }

        .status-half_day {
            background-color: #ffe0b2;
            color: #e65100;
        }

        .status-leave {
            background-color: #e0f7fa;
            color: #0277bd;
        }

        .status-on_duty {
            background-color: #e8eaf6;
            color: #3f51b5;
        }

        .status-holiday {
            background-color: #e6e6fa;
            color: #6a5acd;
        }

        .status-weekend {
            background-color: #f0e68c;
            color: #8b4513;
        }

        .weekend {
            color: #8b4513;
        }

        .holiday {
            color: #6a5acd;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>Attendance Report</h1>
        <p>Employee: <strong>{{ $employee->name_en ?? $employee->full_name_en }}</strong></p>
        <p>Employee ID: <strong>{{ $employee->employee_id }}</strong></p>
        <p>Report Period: <strong>{{ date('d M Y', strtotime($from_date)) }}</strong> to
            <strong>{{ date('d M Y', strtotime($to_date)) }}</strong>
        </p>
        <p>Generated on: <strong>{{ date('d M Y H:i') }}</strong></p>
    </div>

    <!-- Summary Section -->
    <div class="summary-box">
        <h3>Attendance Summary</h3>
        @php
            $stats = [
                'total_days' => count($reports),
                'present' => count(
                    array_filter($reports, function ($report) {
                        return isset($report['attendance']) && $report['attendance']->status === 'present';
                    }),
                ),
                'absent' => count(
                    array_filter($reports, function ($report) {
                        return isset($report['attendance']) && $report['attendance']->status === 'absent';
                    }),
                ),
                'late' => count(
                    array_filter($reports, function ($report) {
                        return isset($report['attendance']) && $report['attendance']->status === 'late';
                    }),
                ),
                'half_day' => count(
                    array_filter($reports, function ($report) {
                        return isset($report['attendance']) && $report['attendance']->status === 'half_day';
                    }),
                ),
                'leave' => count(
                    array_filter($reports, function ($report) {
                        return isset($report['attendance']) && $report['attendance']->status === 'leave';
                    }),
                ),
                'on_duty' => count(
                    array_filter($reports, function ($report) {
                        return isset($report['attendance']) && $report['attendance']->status === 'on_duty';
                    }),
                ),
                'weekend' => count(
                    array_filter($reports, function ($report) {
                        return isset($report['attendance']) && $report['attendance']->status === 'weekend';
                    }),
                ),
                'holiday' => count(
                    array_filter($reports, function ($report) {
                        return isset($report['attendance']) && $report['attendance']->status === 'holiday';
                    }),
                ),
            ];
        @endphp

        <table class="summary-table">
            <tbody>
                <tr>
                    <td class="summary-label">Total Days</td>
                    <td class="summary-value total-days">{{ $stats['total_days'] }}</td>

                    <td class="summary-label">Present</td>
                    <td class="summary-value present">{{ $stats['present'] }}</td>

                    <td class="summary-label">Absent</td>
                    <td class="summary-value absent">{{ $stats['absent'] }}</td>
                </tr>
                <tr>
                    <td class="summary-label">Late</td>
                    <td class="summary-value late">{{ $stats['late'] }}</td>

                    <td class="summary-label">Half Day</td>
                    <td class="summary-value half-day">{{ $stats['half_day'] }}</td>

                    <td class="summary-label">Leave</td>
                    <td class="summary-value leave">{{ $stats['leave'] }}</td>
                </tr>
                <tr>
                    <td class="summary-label">On Duty</td>
                    <td class="summary-value on-duty">{{ $stats['on_duty'] }}</td>

                    <td class="summary-label">Weekend</td>
                    <td class="summary-value weekend">{{ $stats['weekend'] }}</td>

                    <td class="summary-label">Holiday</td>
                    <td class="summary-value holiday">{{ $stats['holiday'] }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Attendance Table -->
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Device</th>
                <th>Remarks</th>
                <th>Leave</th>
                <th>Movement</th>
            </tr>
        </thead>
        <tbody>
            @forelse($reports as $report)
                <tr>
                    <td>{{ date('d M Y', strtotime($report['date'])) }}</td>
                    <td>{{ $report['day'] }}</td>
                    <td>
                        @if (isset($report['attendance']->status))
                            <div class="status-badge status-{{ $report['attendance']->status }}">
                                {{ str_replace('_', ' ', ucfirst($report['attendance']->status)) }}
                            </div>
                        @else
                            -
                        @endif
                    </td>
                    <td>
                        @if (isset($report['attendance']->check_in_formatted))
                            {{ $report['attendance']->check_in_formatted }}
                        @elseif(isset($report['attendance']->check_in))
                            {{ date('h:i A', strtotime($report['attendance']->check_in)) }}
                        @else
                            -
                        @endif
                    </td>
                    <td>
                        @if (isset($report['attendance']->check_out_formatted))
                            {{ $report['attendance']->check_out_formatted }}
                        @elseif(isset($report['attendance']->check_out))
                            {{ date('h:i A', strtotime($report['attendance']->check_out)) }}
                        @else
                            -
                        @endif
                    </td>
                    <td>
                        @if (isset($report['attendance']->device) && $report['attendance']->device)
                            {{ $report['attendance']->device->name }}
                        @else
                            -
                        @endif
                    </td>
                    <td>
                        @if (isset($report['attendance']->auto_remarks))
                            {{ $report['attendance']->auto_remarks }}
                        @elseif(isset($report['attendance']->remarks))
                            {{ $report['attendance']->remarks }}
                        @else
                            -
                        @endif
                    </td>
                    <td>
                        @if (isset($report['leave']))
                            {{ $report['leave']['type'] }}
                        @else
                            -
                        @endif
                    </td>
                    <td>
                        @if (isset($report['movement']))
                            {{ ucfirst($report['movement']['type']) }}
                        @else
                            -
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="9" style="text-align: center;">No attendance records found.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div style="text-align: center; font-size: 10px; color: #777; margin-top: 20px;">
        <p>This is a computer-generated report and does not require a signature.</p>
        <p>Generated from {{ config('app.name') }}</p>
    </div>
</body>

</html>
