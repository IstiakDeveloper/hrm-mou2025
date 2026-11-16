<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Leave Report - {{ $employee->name_en ?? $employee->full_name_en }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10px;
            line-height: 1.3;
            color: #333;
            margin: 0;
            padding: 15px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #007bff;
        }

        .header h1 {
            font-size: 20px;
            margin-bottom: 5px;
            color: #007bff;
        }

        .header h2 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #333;
        }

        .header p {
            margin: 3px 0;
            font-size: 11px;
        }

        .employee-info {
            margin-bottom: 20px;
            padding: 12px;
            background-color: #f8f9fa;
            border-radius: 5px;
            border: 1px solid #e9ecef;
        }

        .employee-info h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #007bff;
        }

        /* Filter Information Styles */
        .filter-info {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 5px;
        }

        .filter-info h4 {
            margin: 0 0 8px 0;
            font-size: 12px;
            color: #1976d2;
            font-weight: bold;
        }

        .filter-info p {
            margin: 4px 0;
            font-size: 10px;
        }

        .filter-types {
            background-color: #ffffff;
            padding: 8px;
            border-radius: 3px;
            margin-top: 5px;
            border: 1px solid #bbdefb;
        }

        /* .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        } */

        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 12px;
            padding: 8px 12px;
            background-color: #007bff;
            color: white;
            border-radius: 4px;
        }

        .subsection-title {
            font-size: 12px;
            font-weight: bold;
            margin: 15px 0 8px 0;
            padding-bottom: 3px;
            border-bottom: 1px solid #dee2e6;
            color: #495057;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 9px;
            border: 1px solid #dee2e6;
        }

        th, td {
            padding: 6px 8px;
            text-align: left;
            border: 1px solid #dee2e6;
            vertical-align: top;
        }

        th {
            font-weight: bold;
            background-color: #f8f9fa;
            color: #495057;
            font-size: 9px;
        }

        .info-table td {
            border: none;
            padding: 4px 8px;
        }

        .info-table tr:nth-child(even) {
            background-color: #f8f9fa;
        }

        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .badge-pending {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }

        .badge-approved {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .badge-rejected {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .progress-container {
            width: 100%;
            height: 8px;
            background-color: #e9ecef;
            border-radius: 4px;
            margin-top: 3px;
            border: 1px solid #dee2e6;
        }

        .progress-bar {
            height: 8px;
            border-radius: 4px;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
        }

        .summary-stats {
            background-color: #f8f9fa;
            padding: 12px;
            border-radius: 5px;
            margin-top: 15px;
            border: 1px solid #e9ecef;
        }

        .summary-stats h4 {
            margin: 0 0 10px 0;
            font-size: 12px;
            color: #495057;
        }

        .stats-grid {
            display: table;
            width: 100%;
        }

        .stats-row {
            display: table-row;
        }

        .stats-cell {
            display: table-cell;
            padding: 4px 8px;
            border-bottom: 1px solid #dee2e6;
            font-size: 10px;
        }

        .stats-cell:first-child {
            font-weight: bold;
            color: #6c757d;
        }

        .no-data {
            text-align: center;
            padding: 20px;
            color: #6c757d;
            font-style: italic;
            background-color: #f8f9fa;
            border-radius: 4px;
            border: 1px dashed #dee2e6;
        }

        .footer {
            margin-top: 30px;
            padding-top: 15px;
            text-align: center;
            font-size: 8px;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }

        .footer p {
            margin: 2px 0;
        }

        /* Page break controls */
        .page-break {
            page-break-after: always;
        }

        @media print {
            body {
                margin: 0;
                padding: 10px;
            }
        }
    </style>
</head>

<body>
    <!-- Header -->
    <div class="header">
        <h1>Leave Report</h1>
        <h2>{{ $employee->name_en ?? $employee->full_name_en }}</h2>
        <p><strong>Report Period:</strong> {{ \Carbon\Carbon::parse($fromDate)->format('M d, Y') }} to {{ \Carbon\Carbon::parse($toDate)->format('M d, Y') }}</p>
        <p><strong>Generated on:</strong> {{ $generatedAt }}</p>
    </div>

    <!-- Employee Information -->
    <div class="employee-info">
        <h3>Employee Information</h3>
        <table class="info-table">
            <tr>
                <td width="20%"><strong>Employee ID:</strong></td>
                <td width="30%">{{ $employee->employee_id }}</td>
                <td width="20%"><strong>Department:</strong></td>
                <td width="30%">{{ $employee->department->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td><strong>Full Name:</strong></td>
                <td>{{ $employee->name_en ?? $employee->full_name_en }}</td>
                <td><strong>Designation:</strong></td>
                <td>{{ $employee->designation->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td><strong>Email:</strong></td>
                <td>{{ $employee->email ?? 'N/A' }}</td>
                <td><strong>Report Type:</strong></td>
                <td>
                    @if(isset($filterMode) && $filterMode === 'all')
                        All Leave Types
                    @elseif(isset($filterMode) && $filterMode === 'specific')
                        Specific Leave Types Only
                    @elseif(isset($filterMode) && $filterMode === 'exclude')
                        Filtered Leave Types
                    @else
                        Standard Report
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <!-- Filter Information (show only if filters are applied) -->
    @if(isset($filterMode) && $filterMode !== 'all')
    <div class="filter-info">
        <h4>Applied Filters</h4>
        <p><strong>Filter Type:</strong>
            @if($filterMode === 'specific')
                Including only specific leave types
            @elseif($filterMode === 'exclude')
                Excluding specific leave types
            @endif
        </p>

        @if(isset($filterDescription))
            <p><strong>Description:</strong> {{ $filterDescription }}</p>
        @endif

        @if($filterMode === 'specific' && isset($includeLeaveTypes) && !empty($includeLeaveTypes))
            <div class="filter-types">
                <strong>Included Leave Types:</strong> {{ implode(', ', $includeLeaveTypes) }}
            </div>
        @elseif($filterMode === 'exclude' && isset($excludeLeaveTypes) && !empty($excludeLeaveTypes))
            <div class="filter-types">
                <strong>Excluded Leave Types:</strong> {{ implode(', ', $excludeLeaveTypes) }}
            </div>
        @endif
    </div>
    @endif

    <!-- Leave Balances Section -->
    @if($leaveSummary && isset($leaveSummary['balances']) && count($leaveSummary['balances']) > 0)
    <div class="section">
        <h3 class="section-title">Leave Balances ({{ $leaveSummary['year'] }})</h3>

        @php
            // Convert collection to array if needed, then chunk into 2 columns per row
            $balancesArray = is_array($leaveSummary['balances']) ? $leaveSummary['balances'] : $leaveSummary['balances']->toArray();
            $balanceChunks = array_chunk($balancesArray, 2);
        @endphp

        @foreach($balanceChunks as $chunk)
        <table style="margin-bottom: 10px; border: none;">
            <tr>
                @foreach($chunk as $balance)
                    @php
                        $usagePercentage = $balance['allocated_days'] > 0 ? ($balance['used_days'] / $balance['allocated_days']) * 100 : 0;
                    @endphp
                    <td width="48%" style="border: 1px solid #dee2e6; padding: 10px; vertical-align: top; border-radius: 4px;">
                        <div style="margin-bottom: 8px;">
                            <div style="font-weight: bold; font-size: 11px; color: #007bff; margin-bottom: 2px;">
                                {{ $balance['type'] }}
                            </div>
                            <div style="font-size: 8px; color: #6c757d;">
                                {{ $balance['is_paid'] ? 'Paid Leave' : 'Unpaid Leave' }}
                            </div>
                        </div>

                        <div style="margin-bottom: 8px;">
                            <div style="font-size: 16px; font-weight: bold; color: #28a745;">
                                {{ $balance['remaining_days'] }} / {{ $balance['allocated_days'] }}
                            </div>
                            <div style="font-size: 8px; color: #6c757d;">Days Available</div>
                        </div>

                        <div class="progress-container" style="margin-bottom: 6px;">
                            <div class="progress-bar" style="width: {{ min(100, $usagePercentage) }}%"></div>
                        </div>

                        <div style="font-size: 8px; color: #6c757d;">
                            <div style="margin-bottom: 2px;">
                                <span style="font-weight: bold;">Used:</span> {{ $balance['used_days'] }} day{{ $balance['used_days'] !== 1 ? 's' : '' }}
                            </div>
                            <div>
                                <span style="font-weight: bold;">Remaining:</span> {{ $balance['remaining_days'] }} day{{ $balance['remaining_days'] !== 1 ? 's' : '' }}
                            </div>
                        </div>
                    </td>

                    @if(!$loop->last || count($chunk) == 1)
                        <td width="4%" style="border: none;"></td> <!-- Spacer -->
                    @endif
                @endforeach

                @if(count($chunk) == 1)
                    <td width="48%" style="border: none;"></td> <!-- Empty cell if odd number -->
                @endif
            </tr>
        </table>
        @endforeach
    </div>
    @endif

    <!-- Leave Applications Section -->
    {{-- <div class="section">
        <h3 class="section-title">Leave Applications</h3>

        @if (count($leaveData) > 0)
            <table>
                <thead>
                    <tr>
                        <th width="20%">Leave Type</th>
                        <th width="25%">Period</th>
                        <th width="10%">Days</th>
                        <th width="15%">Status</th>
                        <th width="30%">Reason</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($leaveData as $leave)
                        <tr>
                            <td>
                                <strong>{{ $leave['type'] }}</strong>
                                <br>
                                <small style="color: #6c757d;">{{ $leave['is_paid'] ? 'Paid' : 'Unpaid' }}</small>
                            </td>
                            <td>
                                {{ \Carbon\Carbon::parse($leave['start_date'])->format('M d, Y') }}
                                <br>
                                <small style="color: #6c757d;">to {{ \Carbon\Carbon::parse($leave['end_date'])->format('M d, Y') }}</small>
                            </td>
                            <td style="text-align: center;">
                                <strong>{{ $leave['days'] }}</strong>
                                <br>
                                <small style="color: #6c757d;">{{ $leave['days'] > 1 ? 'days' : 'day' }}</small>
                            </td>
                            <td style="text-align: center;">
                                <span class="badge badge-{{ $leave['status'] }}">
                                    {{ ucfirst($leave['status']) }}
                                </span>
                            </td>
                            <td>{{ $leave['reason'] ?? '-' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>

            <!-- Summary Statistics -->
            <div class="summary-stats">
                <h4>Leave Application Statistics</h4>
                @php
                    $totalDays = collect($leaveData)->sum('days');
                    $approvedDays = collect($leaveData)->where('status', 'approved')->sum('days');
                    $pendingDays = collect($leaveData)->where('status', 'pending')->sum('days');
                    $rejectedDays = collect($leaveData)->where('status', 'rejected')->sum('days');
                    $paidDays = collect($leaveData)->where('is_paid', true)->sum('days');
                    $unpaidDays = collect($leaveData)->where('is_paid', false)->sum('days');
                @endphp

                <div class="stats-grid">
                    <div class="stats-row">
                        <div class="stats-cell">Total Leave Days Applied:</div>
                        <div class="stats-cell">{{ $totalDays }} day{{ $totalDays !== 1 ? 's' : '' }}</div>
                        <div class="stats-cell">Approved Days:</div>
                        <div class="stats-cell">{{ $approvedDays }} day{{ $approvedDays !== 1 ? 's' : '' }}</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">Pending Days:</div>
                        <div class="stats-cell">{{ $pendingDays }} day{{ $pendingDays !== 1 ? 's' : '' }}</div>
                        <div class="stats-cell">Rejected Days:</div>
                        <div class="stats-cell">{{ $rejectedDays }} day{{ $rejectedDays !== 1 ? 's' : '' }}</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">Paid Leave Days:</div>
                        <div class="stats-cell">{{ $paidDays }} day{{ $paidDays !== 1 ? 's' : '' }}</div>
                        <div class="stats-cell">Unpaid Leave Days:</div>
                        <div class="stats-cell">{{ $unpaidDays }} day{{ $unpaidDays !== 1 ? 's' : '' }}</div>
                    </div>
                    <div class="stats-row">
                        <div class="stats-cell">Total Applications:</div>
                        <div class="stats-cell">{{ count($leaveData) }} application{{ count($leaveData) !== 1 ? 's' : '' }}</div>
                        <div class="stats-cell">Average Days per Application:</div>
                        <div class="stats-cell">{{ count($leaveData) > 0 ? round($totalDays / count($leaveData), 1) : 0 }} days</div>
                    </div>
                </div>
            </div>
        @else
            <div class="no-data">
                @if(isset($filterMode) && $filterMode === 'specific')
                    <p><strong>No leave applications found for the selected leave types in this period.</strong></p>
                    @if(isset($includeLeaveTypes) && !empty($includeLeaveTypes))
                        <p>Searched for: {{ implode(', ', $includeLeaveTypes) }}</p>
                    @endif
                @elseif(isset($filterMode) && $filterMode === 'exclude')
                    <p><strong>No leave applications found after excluding the specified leave types.</strong></p>
                    @if(isset($excludeLeaveTypes) && !empty($excludeLeaveTypes))
                        <p>Excluded: {{ implode(', ', $excludeLeaveTypes) }}</p>
                    @endif
                @else
                    <p><strong>No leave applications found for the selected period.</strong></p>
                @endif
                <p style="margin-top: 10px; font-style: normal; font-size: 9px;">
                    Report Period: {{ \Carbon\Carbon::parse($fromDate)->format('M d, Y') }} to {{ \Carbon\Carbon::parse($toDate)->format('M d, Y') }}
                </p>
            </div>
        @endif
    </div> --}}

    <!-- Footer -->
    <div class="footer">
        <p><strong>Report Generated:</strong> {{ $generatedAt }}</p>
        <p><strong>Report Type:</strong>
            @if(isset($filterMode))
                @if($filterMode === 'all')
                    Complete Leave Report (All Leave Types)
                @elseif($filterMode === 'specific')
                    Filtered Leave Report (Specific Types Only)
                @elseif($filterMode === 'exclude')
                    Filtered Leave Report (Excluding Specific Types)
                @endif
            @else
                Standard Leave Report
            @endif
        </p>
        <p>This is a computer-generated report. For any discrepancies, please contact the HR department.</p>
        <p style="margin-top: 8px; font-style: italic;">
            {{ config('app.name') }} - Human Resource Management System
        </p>
    </div>
</body>
</html>
