<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Movement Report - {{ $employee->name_en ?? $employee->full_name_en }}</title>
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
        .badge-completed {
            background-color: #cce5ff;
            color: #004085;
        }
        .badge-official {
            background-color: #d1ecf1;
            color: #0c5460;
        }
        .badge-personal {
            background-color: #e2e3e5;
            color: #383d41;
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
        <h1>Employee Movement Report</h1>
        <p>Period: {{ $startDate }} to {{ $endDate }}</p>
        <p>Status: {{ $status }} | Type: {{ $type }}</p>
        <p>Generated on: {{ $generatedAt }}</p>
    </div>

    <div class="employee-info">
        <h3>Employee Details</h3>
        <p><strong>Name:</strong> {{ $employee->name_en ?? $employee->full_name_en }}</p>
        <p><strong>ID:</strong> {{ $employee->employee_id }}</p>
        <p><strong>Department:</strong> {{ $employee->department->name }}</p>
        <p><strong>Position:</strong> {{ $employee->designation->name }}</p>
    </div>

    @if($movements->count() > 0)
        <table>
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Purpose</th>
                    <th>Time Period</th>
                    <th>Duration</th>
                    <th>Destination</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($movements as $movement)
                    @php
                        $from = \Carbon\Carbon::parse($movement->from_datetime);
                        $to = \Carbon\Carbon::parse($movement->to_datetime);

                        // Calculate duration
                        $durationInHours = $to->diffInSeconds($from) / 3600;

                        // Format datetime
                        if($from->isSameDay($to)) {
                            $timeRange = $from->format('M d, Y') . ', ' . $from->format('h:i A') . ' - ' . $to->format('h:i A');
                        } else {
                            $timeRange = $from->format('M d, Y h:i A') . ' - ' . $to->format('M d, Y h:i A');
                        }
                    @endphp
                    <tr>
                        <td>
                            <span class="badge badge-{{ $movement->movement_type }}">
                                {{ ucfirst($movement->movement_type) }}
                            </span>
                        </td>
                        <td>{{ $movement->purpose }}</td>
                        <td>{{ $timeRange }}</td>
                        <td>{{ number_format($durationInHours, 1) }} hours</td>
                        <td>{{ $movement->destination ?: '-' }}</td>
                        <td>
                            <span class="badge badge-{{ $movement->status }}">
                                {{ ucfirst($movement->status) }}
                            </span>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <p style="text-align: center;">No movements found for the selected criteria.</p>
    @endif

    <div class="footer">
        <p>This is a system-generated report.</p>
    </div>
</body>
</html>
