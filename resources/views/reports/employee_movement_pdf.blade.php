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

        th,
        td {
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

        /* Updated badge colors */
        .badge-active {
            background-color: #cce5ff;
            color: #004085;
        }

        .badge-completed {
            background-color: #d4edda;
            color: #155724;
        }

        .badge-official {
            background-color: #d1ecf1;
            color: #0c5460;
        }

        .badge-personal {
            background-color: #e2e3e5;
            color: #383d41;
        }

        /* Legacy badge colors for backward compatibility */
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
            font-size: 8px;
            color: #777;
        }

        .note {
            font-size: 8px;
            color: #666;
            font-style: italic;
            display: block;
            margin-top: 2px;
        }

        .actual-time {
            font-size: 8px;
            color: #155724;
            display: block;
            margin-top: 2px;
        }

        .expected-time {
            font-size: 8px;
            color: #004085;
            display: block;
            margin-top: 2px;
        }

        .highlight {
            font-weight: bold;
            color: #155724;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>Movement Report</h1>
        <p>Period: {{ Carbon\Carbon::parse($fromDate)->format('M d, Y') }} to
            {{ Carbon\Carbon::parse($toDate)->format('M d, Y') }}</p>
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

    <div style="font-size: 9px; margin-top: 10px;">
        <p><strong>Summary:</strong></p>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td width="33%" style="border: 1px solid #ddd; padding: 5px;">
                    <strong>Total Movements:</strong> {{ count($movementData) }}
                </td>
                <td width="33%" style="border: 1px solid #ddd; padding: 5px;">
                    <strong>Active Movements:</strong>
                    {{ count(array_filter($movementData, function ($m) {return $m['status'] === 'active';})) }}
                </td>
                <td width="33%" style="border: 1px solid #ddd; padding: 5px;">
                    <strong>Completed Movements:</strong>
                    {{ count(array_filter($movementData, function ($m) {return $m['status'] === 'completed';})) }}
                </td>
            </tr>
            <tr>
                <td width="33%" style="border: 1px solid #ddd; padding: 5px;">
                    <strong>Official Movements:</strong>
                    {{ count(array_filter($movementData, function ($m) {return $m['type'] === 'official';})) }}
                </td>
                <td width="33%" style="border: 1px solid #ddd; padding: 5px;">
                    <strong>Personal Movements:</strong>
                    {{ count(array_filter($movementData, function ($m) {return $m['type'] === 'personal';})) }}
                </td>
                <td width="33%" style="border: 1px solid #ddd; padding: 5px;">
                    <strong>Total Hours:</strong> {{ array_sum(array_column($movementData, 'duration_hours')) }} hours
                </td>
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
                        <th>From</th>
                        <th>Expected Return</th>
                        <th>Actual Return</th>
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
                            <td>
                                {{ Carbon\Carbon::parse($movement['from_datetime'])->format('M d, Y H:i') }}
                            </td>
                            <td>
                                {{ Carbon\Carbon::parse($movement['planned_to_datetime'])->format('M d, Y H:i') }}
                            </td>
                            <td>
                                @if ($movement['status'] === 'completed' && isset($movement['actual_return_datetime']))
                                    <span class="highlight">
                                        {{ Carbon\Carbon::parse($movement['actual_return_datetime'])->format('M d, Y H:i') }}
                                    </span>
                                @else
                                    <span class="note">
                                        @if ($movement['status'] === 'active')
                                            (In Progress)
                                        @else
                                            -
                                        @endif
                                    </span>
                                @endif
                            </td>
                            <td>
                                {{ $movement['duration_hours'] }} hours
                                @if ($movement['status'] === 'completed' && isset($movement['actual_return_datetime']))
                                    <span class="actual-time">(Actual)</span>
                                @elseif($movement['status'] === 'active')
                                    <span class="expected-time">(Expected)</span>
                                @endif
                            </td>
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
