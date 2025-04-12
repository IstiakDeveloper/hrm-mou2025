<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Leave Report - {{ $employee->first_name }} {{ $employee->last_name }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 22px;
            margin-bottom: 5px;
        }
        .header p {
            margin: 3px 0;
        }
        .employee-info {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f5f5f5;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            font-weight: bold;
            background-color: #f0f0f0;
        }
        .badge {
            padding: 3px 7px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }
        .badge-pending {
            background-color: #fff3cd;
            color: #856404;
        }
        .badge-approved {
            background-color: #d4edda;
            color: #155724;
        }
        .badge-rejected {
            background-color: #f8d7da;
            color: #721c24;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Employee Leave Report</h1>
        <p>Period: {{ $startDate }} to {{ $endDate }}</p>
        <p>Status: {{ $status }}</p>
        <p>Generated on: {{ $generatedAt }}</p>
    </div>

    <div class="employee-info">
        <h3>Employee Details</h3>
        <p><strong>Name:</strong> {{ $employee->first_name }} {{ $employee->last_name }}</p>
        <p><strong>ID:</strong> {{ $employee->employee_id }}</p>
        <p><strong>Department:</strong> {{ $employee->department->name }}</p>
        <p><strong>Position:</strong> {{ $employee->designation->name }}</p>
    </div>

    @if($leaveApplications->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Leave Type</th>
                    <th>Period</th>
                    <th>Days</th>
                    <th>Applied On</th>
                    <th>Status</th>
                    <th>Reason</th>
                </tr>
            </thead>
            <tbody>
                @foreach($leaveApplications as $leave)
                    <tr>
                        <td>{{ $leave->leaveType->name }}</td>
                        <td>
                            @php
                                $start = \Carbon\Carbon::parse($leave->start_date);
                                $end = \Carbon\Carbon::parse($leave->end_date);

                                if($start->isSameDay($end)) {
                                    echo $start->format('M d, Y');
                                } else {
                                    echo $start->format('M d, Y') . ' - ' . $end->format('M d, Y');
                                }
                            @endphp
                        </td>
                        <td>{{ $leave->days }} {{ $leave->days > 1 ? 'days' : 'day' }}</td>
                        <td>{{ \Carbon\Carbon::parse($leave->created_at)->format('M d, Y') }}</td>
                        <td>
                            <span class="badge badge-{{ $leave->status }}">
                                {{ ucfirst($leave->status) }}
                            </span>
                        </td>
                        <td>{{ $leave->reason ?: '-' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <p style="text-align: center;">No leave applications found for the selected criteria.</p>
    @endif

    <div class="footer">
        <p>This is a system-generated report.</p>
    </div>
</body>
</html>
