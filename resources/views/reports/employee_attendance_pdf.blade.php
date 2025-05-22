<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Attendance Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }
        .header h1 {
            font-size: 16px;
            margin: 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 5px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .employee-info {
            background-color: #f9f9f9;
            padding: 10px;
            margin-bottom: 15px;
        }
        .section-title {
            font-size: 12px;
            font-weight: bold;
            margin: 15px 0 10px 0;
            color: #0066cc;
        }
        .badge {
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 8px;
            font-weight: bold;
        }
        .present { background-color: #d4edda; color: #155724; }
        .absent { background-color: #f8d7da; color: #721c24; }
        .leave { background-color: #fff3cd; color: #856404; }
        .on_duty { background-color: #d1ecf1; color: #0c5460; }
        .weekend { background-color: #e2e3e5; color: #383d41; }
        .holiday { background-color: #cce5ff; color: #004085; }
        .official { background-color: #cce5ff; color: #004085; }
        .personal { background-color: #f0d0ff; color: #6f42c1; }
        .active { background-color: #b3d9ff; color: #0056b3; }
        .completed { background-color: #d4edda; color: #155724; }
        .movement-details {
            background-color: #f8f9fa;
            padding: 3px;
            margin: 1px 0;
            border-left: 2px solid #0066cc;
            font-size: 8px;
        }
        .no-movement {
            color: #999;
            font-style: italic;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Attendance Report with Movement Details</h1>
        <p>{{ $employee->first_name }} {{ $employee->last_name }}</p>
        <p>Period: {{ Carbon\Carbon::parse($fromDate)->format('M d, Y') }} to {{ Carbon\Carbon::parse($toDate)->format('M d, Y') }}</p>
        <p>Generated: {{ $generatedAt }}</p>
    </div>

    <div class="employee-info">
        <strong>Employee Details:</strong><br>
        Name: {{ $employee->first_name }} {{ $employee->last_name }} |
        ID: {{ $employee->employee_id }} |
        Department: {{ $employee->department->name }} |
        Position: {{ $employee->designation->name }}
    </div>

    <div class="section-title">Attendance Summary</div>
    <table>
        <tr>
            <td><strong>Total Days:</strong> {{ $attendanceSummary['total_days'] }}</td>
            <td><strong>Present:</strong> {{ $attendanceSummary['present'] }}</td>
            <td><strong>Absent:</strong> {{ $attendanceSummary['absent'] }}</td>
            <td><strong>Leave:</strong> {{ $attendanceSummary['leave'] }}</td>
        </tr>
        <tr>
            <td><strong>On Duty:</strong> {{ $attendanceSummary['on_duty'] }}</td>
            <td><strong>Weekend:</strong> {{ $attendanceSummary['weekend'] }}</td>
            <td><strong>Holiday:</strong> {{ $attendanceSummary['holiday'] }}</td>
            <td><strong>Attendance:</strong> {{ $attendanceSummary['attendance_percentage'] }}%</td>
        </tr>
    </table>

    @php
        $totalMovements = 0;
        $officialMovements = 0;
        foreach ($attendanceData as $record) {
            if (isset($record['has_movement']) && $record['has_movement']) {
                $totalMovements += $record['total_movements'] ?? 1;
                if (isset($record['movement_type']) && $record['movement_type'] === 'official') {
                    $officialMovements++;
                }
            }
        }
    @endphp

    @if($totalMovements > 0)
    <div class="section-title">Movement Summary</div>
    <table>
        <tr>
            <td><strong>Total Movements:</strong> {{ $totalMovements }}</td>
            <td><strong>Official:</strong> {{ $officialMovements }}</td>
            <td><strong>Personal:</strong> {{ $totalMovements - $officialMovements }}</td>
        </tr>
    </table>
    @endif

    <div class="section-title">Daily Attendance Details</div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Movement</th>
                <th>Remarks</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($attendanceData as $record)
            <tr>
                <td>{{ Carbon\Carbon::parse($record['date'])->format('M d') }}</td>
                <td>{{ $record['day'] }}</td>
                <td>
                    <span class="badge {{ $record['status'] }}">
                        {{ ucfirst(str_replace('_', ' ', $record['status'])) }}
                    </span>
                </td>
                <td>{{ $record['check_in'] ?? '-' }}</td>
                <td>{{ $record['check_out'] ?? '-' }}</td>
                <td>
                    @if(isset($record['has_movement']) && $record['has_movement'])
                        @if(isset($record['multiple_movements']) && $record['multiple_movements'])
                            <div class="movement-details">
                                <strong>{{ $record['total_movements'] ?? 0 }} Movements</strong><br>
                                @if(isset($record['movements']) && is_array($record['movements']))
                                    @foreach($record['movements'] as $index => $movement)
                                        {{ $index + 1 }}. {{ ucfirst($movement['movement_type'] ?? 'Official') }}<br>
                                        {{ Str::limit($movement['purpose'] ?? 'N/A', 25) }}<br>
                                    @endforeach
                                @endif
                            </div>
                        @else
                            <div class="movement-details">
                                <span class="badge {{ $record['movement_type'] ?? 'official' }}">
                                    {{ ucfirst($record['movement_type'] ?? 'Official') }}
                                </span><br>
                                <strong>Purpose:</strong> {{ Str::limit($record['movement_purpose'] ?? 'N/A', 30) }}<br>
                                <strong>Time:</strong> {{ $record['movement_from'] ?? 'N/A' }} - {{ $record['movement_to'] ?? 'N/A' }}
                            </div>
                        @endif
                    @else
                        <span class="no-movement">No movement</span>
                    @endif
                </td>
                <td>{{ $record['auto_remarks'] ?? $record['remarks'] ?? '-' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        <p>This is a system-generated report. For any discrepancies, please contact HR department.</p>
    </div>
</body>
</html>
