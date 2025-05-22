<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Employee Report - {{ $employee->first_name }} {{ $employee->last_name }}</title>
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

        .badge-active {
            background-color: #cce5ff;
            color: #004085;
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
            font-style: italic;
            display: block;
            margin-top: 2px;
        }

        .badge-present {
            background-color: #d4edda;
            color: #155724;
        }

        .badge-absent {
            background-color: #f8d7da;
            color: #721c24;
        }

        .badge-leave {
            background-color: #fff3cd;
            color: #856404;
        }

        .badge-on_duty {
            background-color: #d1ecf1;
            color: #0c5460;
        }

        .badge-weekend {
            background-color: #e2e3e5;
            color: #383d41;
        }

        .badge-holiday {
            background-color: #cce5ff;
            color: #004085;
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

        .summary-grid {
            display: block;
            margin-bottom: 15px;
        }

        .summary-box {
            display: inline-block;
            width: 22%;
            margin-right: 2%;
            padding: 8px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            margin-bottom: 10px;
        }

        .summary-box-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 3px;
            color: #666;
        }

        .summary-box-value {
            font-size: 14px;
            font-weight: bold;
        }

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
        <h1>Employee Report</h1>
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
                    <div style="font-size: 14px; font-weight: bold;">{{ $attendanceSummary['attendance_percentage'] }}%
                    </div>
                </td>
            </tr>
        </table>

        <h4>Attendance Details</h4>
        <table>
            <thead>
                <tr>
                    <th width="12%">Date</th>
                    <th width="8%">Day</th>
                    <th width="8%">Status</th>
                    <th width="10%">Check In</th>
                    <th width="10%">Check Out</th>
                    <th width="25%">Movement Info</th>
                    <th width="27%">Remarks</th>
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
                        <td style="font-size: 8px; vertical-align: top;">
                            @if (isset($record['has_movement']) && $record['has_movement'])
                                @foreach ($record['movement_details'] as $index => $movement)
                                    <div style="margin-bottom: 3px; padding: 2px; border-left: 2px solid #007bff;">
                                        <strong style="color: #004085;">{{ ucfirst($movement['type']) }}:</strong><br>
                                        <strong>Purpose:</strong>
                                        @if (strlen($movement['purpose']) > 35)
                                            {{ substr($movement['purpose'], 0, 35) }}...
                                        @else
                                            {{ $movement['purpose'] }}
                                        @endif
                                        <br>
                                        <strong>From:</strong>
                                        {{ Carbon\Carbon::parse($movement['from_datetime'])->format('M d, H:i') }}<br>
                                        <strong>To:</strong>
                                        {{ Carbon\Carbon::parse($movement['effective_to_datetime'])->format('M d, H:i') }}
                                        @if ($movement['status'] === 'completed' && $movement['actual_return_datetime'])
                                            <span style="color: #155724; font-weight: bold;"> (Actual)</span>
                                        @else
                                            <span style="color: #856404;"> (Planned)</span>
                                        @endif
                                        <br>
                                        <strong>Destination:</strong>
                                        @if (strlen($movement['destination']) > 25)
                                            {{ substr($movement['destination'], 0, 25) }}...
                                        @else
                                            {{ $movement['destination'] }}
                                        @endif
                                        <br>
                                        <span class="badge badge-{{ $movement['status'] }}" style="margin-top: 2px;">
                                            {{ ucfirst($movement['status']) }}
                                        </span>
                                    </div>
                                    @if (!$loop->last)
                                        <hr style="margin: 2px 0; border: 0.5px solid #dee2e6;">
                                    @endif
                                @endforeach
                            @else
                                <span style="color: #6c757d; font-style: italic;">No Movement</span>
                            @endif
                        </td>
                        <td style="font-size: 8px; vertical-align: top;">
                            @if (isset($record['has_movement']) && $record['has_movement'])
                                {{-- Enhanced remarks with movement context --}}
                                @php
                                    $movementTypes = array_unique(array_column($record['movement_details'], 'type'));
                                    $movementCount = count($record['movement_details']);
                                @endphp

                                @if ($movementCount > 1)
                                    <strong style="color: #dc3545;">{{ $movementCount }} movements on this
                                        day</strong><br>
                                @endif

                                <span style="color: #155724;">
                                    {{ implode(', ', array_map('ucfirst', $movementTypes)) }} movement(s)
                                </span>

                                @if (isset($record['remarks']) && $record['remarks'] && !str_contains($record['remarks'], 'Movement'))
                                    <br><strong>Additional:</strong> {{ $record['remarks'] }}
                                @endif
                            @else
                                {{ $record['remarks'] ?? '-' }}
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        {{-- Movement Summary for Attendance Section --}}
        @php
            $totalMovementDays = 0;
            $totalMovements = 0;
            foreach ($attendanceData as $record) {
                if (isset($record['has_movement']) && $record['has_movement']) {
                    $totalMovementDays++;
                    $totalMovements += count($record['movement_details']);
                }
            }
        @endphp

        @if ($totalMovements > 0)
            <div style="margin-top: 10px; padding: 8px; background-color: #f8f9fa; border: 1px solid #dee2e6;">
                <h5 style="margin: 0 0 5px 0; font-size: 10px; color: #495057;">Movement Summary in Attendance Period:
                </h5>
                <table style="width: 100%; font-size: 8px; margin: 0;">
                    <tr>
                        <td style="padding: 2px; border: none;"><strong>Days with Movement:</strong>
                            {{ $totalMovementDays }}</td>
                        <td style="padding: 2px; border: none;"><strong>Total Movements:</strong> {{ $totalMovements }}
                        </td>
                        <td style="padding: 2px; border: none;"><strong>Movement Rate:</strong>
                            {{ round(($totalMovementDays / count($attendanceData)) * 100, 1) }}%</td>
                    </tr>
                </table>
            </div>
        @endif
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
                        $usagePercentage =
                            $balance['allocated_days'] > 0
                                ? ($balance['used_days'] / $balance['allocated_days']) * 100
                                : 0;
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

    <div class="section">
        <h3 class="section-title">Movements</h3>


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
                        <strong>Total Hours:</strong> {{ array_sum(array_column($movementData, 'duration_hours')) }}
                        hours
                    </td>
                </tr>
            </table>
        </div>
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
