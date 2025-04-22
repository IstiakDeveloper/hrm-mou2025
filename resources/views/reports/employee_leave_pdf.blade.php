<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Leave Report - {{ $employee->first_name }} {{ $employee->last_name }}</title>
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

        .badge-pending { background-color: #fff3cd; color: #856404; }
        .badge-approved { background-color: #d4edda; color: #155724; }
        .badge-rejected { background-color: #f8d7da; color: #721c24; }

        .progress-container {
            width: 100%;
            height: 10px;
            background-color: #e0e0e0;
            border-radius: 5px;
            margin-top: 5px;
        }

        .progress-bar {
            height: 10px;
            border-radius: 5px;
            background-color: #4caf50;
        }

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
        <h1>Leave Report</h1>
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

    <!-- Leave Summary Section -->
    <div class="section">
        <h3 class="section-title">Leave Summary ({{ $leaveSummary['year'] }})</h3>

        <h4>Leave Balances</h4>
        <table>
            <thead>
                <tr>
                    <th>Leave Type</th>
                    <th>Allocated</th>
                    <th>Used</th>
                    <th>Remaining</th>
                    <th>Usage</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($leaveSummary['balances'] as $balance)
                    @php
                        $usagePercentage = $balance['allocated_days'] > 0 ? ($balance['used_days'] / $balance['allocated_days']) * 100 : 0;
                    @endphp
                    <tr>
                        <td>{{ $balance['type'] }} {{ $balance['is_paid'] ? '(Paid)' : '(Unpaid)' }}</td>
                        <td>{{ $balance['allocated_days'] }}</td>
                        <td>{{ $balance['used_days'] }}</td>
                        <td>{{ $balance['remaining_days'] }}</td>
                        <td>
                            {{ round($usagePercentage) }}%
                            <div class="progress-container">
                                <div class="progress-bar" style="width: {{ min(100, $usagePercentage) }}%"></div>
                            </div>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <h4>Leave Applications</h4>
        @if (count($leaveData) > 0)
            <table>
                <thead>
                    <tr>
                        <th>Leave Type</th>
                        <th>Period</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($leaveData as $leave)
                        <tr>
                            <td>{{ $leave['type'] }}</td>
                            <td>{{ $leave['date_range'] }}</td>
                            <td>{{ $leave['days'] }}</td>
                            <td>
                                <span class="badge badge-{{ $leave['status'] }}">
                                    {{ ucfirst($leave['status']) }}
                                </span>
                            </td>
                            <td>{{ $leave['reason'] ?? '-' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p>No leave applications in the selected period.</p>
        @endif
    </div>

    <div class="footer">
        <p>This is a system-generated report. For any discrepancies, please contact HR department.</p>
    </div>
</body>
</html>
