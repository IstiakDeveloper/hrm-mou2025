<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leave Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e5e5e5;
        }

        .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }

        .report-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .report-subtitle {
            font-size: 11px;
            color: #666;
            margin-bottom: 8px;
        }

        .date-range {
            font-size: 10px;
            color: #888;
        }

        .summary-section {
            margin-bottom: 20px;
        }

        .summary-grid {
            display: table;
            width: 100%;
            border-collapse: collapse;
        }

        .summary-row {
            display: table-row;
        }

        .summary-card {
            display: table-cell;
            width: 20%;
            padding: 10px;
            margin: 0 5px;
            background-color: #f8f9fa;
            border: 1px solid #e5e5e5;
            text-align: center;
            vertical-align: middle;
        }

        .summary-card.total {
            border-left: 4px solid #3b82f6;
        }

        .summary-card.approved {
            border-left: 4px solid #10b981;
        }

        .summary-card.pending {
            border-left: 4px solid #f59e0b;
        }

        .summary-card.rejected {
            border-left: 4px solid #ef4444;
        }

        .summary-card.days {
            border-left: 4px solid #8b5cf6;
        }

        .summary-label {
            font-size: 9px;
            color: #666;
            margin-bottom: 2px;
        }

        .summary-value {
            font-size: 14px;
            font-weight: bold;
        }

        .summary-value.total {
            color: #3b82f6;
        }

        .summary-value.approved {
            color: #10b981;
        }

        .summary-value.pending {
            color: #f59e0b;
        }

        .summary-value.rejected {
            color: #ef4444;
        }

        .summary-value.days {
            color: #8b5cf6;
        }

        .filters-section {
            margin-bottom: 15px;
            padding: 8px 10px;
            background-color: #f1f5f9;
            border-radius: 4px;
        }

        .filters-title {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #374151;
        }

        .filters-list {
            font-size: 9px;
            color: #6b7280;
        }

        .table-container {
            margin-bottom: 20px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
        }

        .data-table th,
        .data-table td {
            border: 1px solid #d1d5db;
            padding: 6px 4px;
            text-align: left;
            vertical-align: top;
        }

        .data-table th {
            background-color: #f9fafb;
            font-weight: bold;
            font-size: 8px;
            color: #374151;
            text-transform: uppercase;
        }

        .data-table tr:nth-child(even) {
            background-color: #f9fafb;
        }

        .data-table tr:hover {
            background-color: #e5e7eb;
        }

        .status-badge {
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 7px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }

        .status-approved {
            background-color: #d1fae5;
            color: #065f46;
        }

        .status-rejected {
            background-color: #fee2e2;
            color: #991b1b;
        }

        .days-badge {
            background-color: #e0e7ff;
            color: #3730a3;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 7px;
            font-weight: bold;
        }

        .employee-info {
            line-height: 1.2;
        }

        .employee-name {
            font-weight: bold;
            font-size: 8px;
        }

        .employee-id {
            color: #6b7280;
            font-size: 7px;
        }

        .department-info {
            line-height: 1.2;
        }

        .department-name {
            font-size: 8px;
        }

        .designation-name {
            color: #6b7280;
            font-size: 7px;
        }

        .date-info {
            line-height: 1.2;
            text-align: center;
        }

        .date-value {
            font-size: 7px;
        }

        .leave-type {
            background-color: #dbeafe;
            color: #1e40af;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 7px;
            font-weight: bold;
        }

        .reason-text {
            max-width: 120px;
            word-wrap: break-word;
            font-size: 7px;
            line-height: 1.3;
        }

        .footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            font-size: 8px;
            color: #888;
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #6b7280;
            font-style: italic;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>

<body>
    <!-- Header -->
    <div class="header">
        <div class="company-name">{{ $companyName }}</div>
        <div class="report-title">Leave Applications Report</div>
        <div class="report-subtitle">Comprehensive Leave Management Overview</div>
        <div class="date-range">
            Period: {{ $startDate->format('d M, Y') }} to {{ $endDate->format('d M, Y') }}
        </div>
    </div>

    <!-- Summary Statistics -->
    <div class="summary-section">
        <div class="summary-grid">
            <div class="summary-row">
                <div class="summary-card total">
                    <div class="summary-label">Total Applications</div>
                    <div class="summary-value total">{{ $summary['total'] }}</div>
                </div>
                <div class="summary-card approved">
                    <div class="summary-label">Approved</div>
                    <div class="summary-value approved">{{ $summary['approved'] }}</div>
                </div>
                <div class="summary-card pending">
                    <div class="summary-label">Pending</div>
                    <div class="summary-value pending">{{ $summary['pending'] }}</div>
                </div>
                <div class="summary-card rejected">
                    <div class="summary-label">Rejected</div>
                    <div class="summary-value rejected">{{ $summary['rejected'] }}</div>
                </div>
                <div class="summary-card days">
                    <div class="summary-label">Total Days</div>
                    <div class="summary-value days">{{ $summary['totalDays'] }}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Applied Filters -->
    @if (count($filterLabels) > 0)
        <div class="filters-section">
            <div class="filters-title">Applied Filters:</div>
            <div class="filters-list">{{ implode(' | ', $filterLabels) }}</div>
        </div>
    @endif

    <!-- Data Table -->
    <div class="table-container">
        @if ($applications->count() > 0)
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 12%;">Employee</th>
                        <th style="width: 12%;">Department</th>
                        <th style="width: 10%;">Leave Type</th>
                        <th style="width: 12%;">Start Date</th>
                        <th style="width: 12%;">End Date</th>
                        <th style="width: 6%;">Days</th>
                        <th style="width: 8%;">Status</th>
                        <th style="width: 10%;">Applied Date</th>
                        <th style="width: 18%;">Reason</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($applications as $application)
                        <tr>
                            <td>
                                <div class="employee-info">
                                    <div class="employee-name">
                                        {{ ($application->employee->name_en ?? $application->employee->full_name_en ?? '') }}
                                    </div>
                                    <div class="employee-id">ID: {{ $application->employee->employee_id }}</div>
                                </div>
                            </td>
                            <td>
                                <div class="department-info">
                                    <div class="department-name">{{ $application->employee->department->name }}</div>
                                    <div class="designation-name">{{ $application->employee->designation->name }}</div>
                                </div>
                            </td>
                            <td>
                                <span class="leave-type">{{ $application->leaveType->name }}</span>
                                @if (!$application->leaveType->is_paid)
                                    <div style="font-size: 6px; color: #ef4444; margin-top: 2px;">Unpaid</div>
                                @endif
                            </td>
                            <td>
                                <div class="date-info">
                                    <div class="date-value">{{ $application->start_date->format('d M, Y') }}</div>
                                </div>
                            </td>
                            <td>
                                <div class="date-info">
                                    <div class="date-value">{{ $application->end_date->format('d M, Y') }}</div>
                                </div>
                            </td>
                            <td style="text-align: center;">
                                <span class="days-badge">{{ $application->days }}</span>
                            </td>
                            <td style="text-align: center;">
                                <span class="status-badge status-{{ $application->status }}">
                                    {{ ucfirst($application->status) }}
                                </span>
                            </td>
                            <td>
                                <div class="date-info">
                                    <div class="date-value">{{ $application->applied_at->format('d M, Y') }}</div>
                                </div>
                            </td>
                            <td>
                                <div class="reason-text">
                                    {{ $application->reason ?: 'No reason provided' }}
                                </div>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <div class="no-data">
                <div>No leave applications found for the selected criteria.</div>
            </div>
        @endif
    </div>

    <!-- Footer -->
    <div class="footer">
        <div>Generated on {{ $generatedAt->format('d M, Y \a\t h:i A') }}</div>
        <div>Total Records: {{ $applications->count() }}</div>
    </div>
</body>

</html>
