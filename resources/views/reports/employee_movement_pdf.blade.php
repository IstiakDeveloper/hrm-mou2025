<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Movement Report - {{ $employee->first_name }} {{ $employee->last_name }}</title>
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
        .badge-completed { background-color: #cce5ff; color: #004085; }
        .badge-official { background-color: #d1ecf1; color: #0c5460; }
        .badge-personal { background-color: #e2e3e5; color: #383d41; }

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
        <h1>Movement Report</h1>
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

    <!-- Movement Section -->
    <div class="section">
        <h3 class="section-title">Movements</h3>

        @if (count($movementData) > 0)
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
                    @foreach ($movementData as $movement)
                        <tr>
                            <td>
                                <span class="badge badge-{{ $movement['type'] }}">
                                    {{ ucfirst($movement['type']) }}
                                </span>
                            </td>
                            <td>{{ $movement['purpose'] }}</td>
                            <td>{{ $movement['formatted_time_range'] }}</td>
                            <td>{{ $movement['duration_hours'] }} hours</td>
                            <td>{{ $movement['destination'] ?? '-' }}</td>
                            <td>
                                <span class="badge badge-{{ $movement['status'] }}">
                                    {{ ucfirst($movement['status']) }}
                                </span>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p>No movements in the selected period.</p>
        @endif
    </div>

    <div class="footer">
        <p>This is a system-generated report. For any discrepancies, please contact HR department.</p>
    </div>
</body>
</html>
