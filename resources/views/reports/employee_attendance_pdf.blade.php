<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Attendance Report - {{ $employee->first_name }} {{ $employee->last_name }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10px;
            line-height: 1.3;
            color: #333;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }

        .header h1 {
            font-size: 18px;
            margin-bottom: 5px;
        }

        .header p {
            margin: 3px 0;
        }

        .employee-info {
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f5f5f5;
        }

        .section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 9px;
        }

        th, td {
            padding: 5px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            font-weight: bold;
            background-color: #f0f0f0;
        }

        .badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
        }

        .badge-present { background-color: #d4edda; color: #155724; }
        .badge-absent { background-color: #f8d7da; color: #721c24; }
        .badge-leave { background-color: #fff3cd; color: #856404; }
        .badge-on_duty { background-color: #d1ecf1; color: #0c5460; }
        .badge-weekend { background-color: #e2e3e5; color: #383d41; }
        .badge-holiday { background-color: #cce5ff; color: #004085; }
        .badge-future { background-color: #f8f9fa; color: #6c757d; }

        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #777;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>Attendance Report</h1>
        <p>Period: {{ Carbon\Carbon::parse($fromDate)->format('M d, Y') }} to {{ Carbon\Carbon::parse($toDate)->format('M d, Y') }}</p>
        <p>Generated on: {{ $generatedAt }}</p>
    </div>

    <div class="employee-info">
        <h3>Employee Details</h3>
        <table>
            <tr>
                <td width="25%"><strong>Name:</strong> {{ $employee->first_name }} {{ $employee->last_name }}</td>
                <td width="25%"><strong>ID:</strong> {{ $employee->employee_id }}</td>
                <td width="25%"><strong>Department:</strong> {{ $employee->department->name }}</td>
                <td width="25%"><strong>Position:</strong> {{ $employee->designation->name }}</td>
            </tr>
        </table>
    </div>

    <!-- Attendance Summary Section -->
    <div class="section">
        <h3 class="section-title">Attendance Summary</h3>

        <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
            <tr>
                <td style="width: 25%; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">
                    <div style="font-size: 9px; color: #666; font-weight: bold;">Total Days</div>
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['total_days'] }}</div>
                </td>
                <td style="width: 25%; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">
                    <div style="font-size: 9px; color: #666; font-weight: bold;">Present</div>
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['present'] }}</div>
                </td>
                <td style="width: 25%; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">
                    <div style="font-size: 9px; color: #666; font-weight: bold;">Absent</div>
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['absent'] }}</div>
                </td>
                <td style="width: 25%; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">
                    <div style="font-size: 9px; color: #666; font-weight: bold;">On Leave</div>
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['leave'] }}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 25%; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">
                    <div style="font-size: 9px; color: #666; font-weight: bold;">On Duty</div>
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['on_duty'] }}</div>
                </td>
                <td style="width: 25%; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">
                    <div style="font-size: 9px; color: #666; font-weight: bold;">Weekend</div>
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['weekend'] }}</div>
                </td>
                <td style="width: 25%; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">
                    <div style="font-size: 9px; color: #666; font-weight: bold;">Holiday</div>
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['holiday'] }}</div>
                </td>
                <td style="width: 25%; padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;">
                    <div style="font-size: 9px; color: #666; font-weight: bold;">Attendance %</div>
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['attendance_percentage'] }}%</div>
                </td>
            </tr>
        </table>

        <h4>Attendance Details</h4>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Remarks</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($attendanceData as $record)
                <tr>
                    <td>{{ Carbon\Carbon::parse($record['date'])->format('M d, Y') }}</td>
                    <td>{{ $record['day'] }}</td>
                    <td>
                        <span class="badge badge-{{ $record['status'] }}">
                            {{ ucfirst(str_replace('_', ' ', $record['status'])) }}
                        </span>
                    </td>
                    <td>{{ $record['check_in'] ?? '-' }}</td>
                    <td>{{ $record['check_out'] ?? '-' }}</td>
                    <td>{{ $record['remarks'] ?? '-' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>This is a system-generated report. For any discrepancies, please contact HR department.</p>
    </div>
</body>
</html>
