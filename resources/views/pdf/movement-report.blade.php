<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Movement Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }
        .title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .subtitle {
            font-size: 12px;
            color: #666;
        }
        .filters {
            margin-bottom: 10px;
            font-size: 10px;
            color: #666;
        }
        .summary {
            margin-bottom: 15px;
        }
        .summary-title {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 12px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            padding: 4px;
            text-align: left;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            font-size: 10px;
        }
        .badge {
            display: inline-block;
            padding: 1px 4px;
            font-size: 9px;
            font-weight: bold;
            border-radius: 2px;
        }
        .badge-active {
            background-color: #e6f3ff;
            color: #1e70bf;
        }
        .badge-completed {
            background-color: #e6f9ed;
            color: #21ba45;
        }
        .badge-official {
            background-color: #eee6ff;
            color: #6435c9;
        }
        .badge-personal {
            background-color: #f9e6ff;
            color: #a333c8;
        }
        .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 9px;
            color: #888;
        }
        .summary-table {
            border: 1px solid #ddd;
        }
        .summary-table td {
            text-align: center;
        }
        .summary-value {
            font-weight: bold;
            font-size: 12px;
        }
        .summary-label {
            font-size: 9px;
            color: #666;
        }
        .department {
            font-size: 9px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Movement Report</div>
        <div class="subtitle">
            From {{ \Carbon\Carbon::parse($startDate)->format('d M, Y') }} to
            {{ \Carbon\Carbon::parse($endDate)->format('d M, Y') }}
        </div>
    </div>

    <div class="filters">
        <strong>Filters:</strong>
        @if($filters['status'])
            Status: {{ ucfirst($filters['status']) }},
        @endif
        @if($filters['movement_type'])
            Type: {{ ucfirst($filters['movement_type']) }},
        @endif
        @if($filters['department_id'])
            Department ID: {{ $filters['department_id'] }},
        @endif
        @if($filters['employee_id'])
            Employee ID: {{ $filters['employee_id'] }}
        @endif
    </div>

    <div class="summary">
        <div class="summary-title">Summary</div>
        <table class="summary-table">
            <tr>
                <td width="25%">
                    <div class="summary-value">{{ $summary['total'] }}</div>
                    <div class="summary-label">Total Movements</div>
                </td>
                <td width="25%">
                    <div class="summary-value">{{ $summary['active'] }}</div>
                    <div class="summary-label">Active</div>
                </td>
                <td width="25%">
                    <div class="summary-value">{{ $summary['completed'] }}</div>
                    <div class="summary-label">Completed</div>
                </td>
                <td width="25%">
                    <div class="summary-value">{{ $summary['official'] }}/{{ $summary['personal'] }}</div>
                    <div class="summary-label">Official/Personal</div>
                </td>
            </tr>
        </table>
    </div>

    <table>
        <thead>
            <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>From</th>
                <th>Return Time</th>
                <th>Destination</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($movements as $movement)
                <tr>
                    <td>
                        {{ $movement->employee->name_en ?? $movement->employee->full_name_en }}
                        <span class="department">({{ $movement->employee->designation->name ?? 'No Designation' }}, {{ $movement->employee->department->name ?? 'No Department' }})</span>
                    </td>
                    <td>
                        <span class="badge badge-{{ $movement->movement_type }}">
                            {{ ucfirst($movement->movement_type) }}
                        </span>
                    </td>
                    <td>{{ \Carbon\Carbon::parse($movement->from_datetime)->format('d M, Y H:i') }}</td>
                    <td>
                        @if($movement->status === 'completed' && $movement->actual_return_datetime)
                            {{ \Carbon\Carbon::parse($movement->actual_return_datetime)->format('d M, Y H:i') }}
                        @else
                            {{ \Carbon\Carbon::parse($movement->to_datetime)->format('d M, Y H:i') }}
                        @endif
                    </td>
                    <td>{{ $movement->destination }}</td>
                    <td>
                        <span class="badge badge-{{ $movement->status }}">
                            {{ ucfirst($movement->status) }}
                        </span>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        Report generated on {{ now()->format('d M, Y H:i') }} by HRM System
    </div>
</body>
</html>
