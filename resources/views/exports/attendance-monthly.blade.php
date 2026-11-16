@php
    $logoPath = public_path('logo.png');
    $logoSrc = file_exists($logoPath)
        ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
        : null;
    $companyAddress = $companyAddress ?? '';
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Monthly Attendance - {{ $month }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 6mm 6mm 6mm 6mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 6.5pt;
            line-height: 1.25;
            margin: 0;
            padding: 0;
            color: #1e293b;
        }

        /* Header Layout (Table for 100% PDF Engine compatibility) */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            margin-bottom: 6px;
        }

        .header-table td {
            border: none;
            padding: 0;
            vertical-align: middle;
        }

        .header-logo-cell {
            width: 180px;
            text-align: left;
        }

        .report-logo {
            height: 38px;
            width: auto;
            max-width: 58px;
            display: block;
        }

        .header-title-cell {
            text-align: center;
        }

        .company-name {
            font-size: 13pt;
            font-weight: bold;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.15;
            margin: 0;
        }

        .company-address {
            font-size: 6.5pt;
            color: #64748b;
            margin-top: 1px;
            line-height: 1.2;
        }

        .report-title {
            font-size: 9.5pt;
            font-weight: bold;
            color: #334155;
            margin-top: 2px;
            line-height: 1.2;
        }

        .header-meta-cell {
            width: 180px;
            text-align: right;
        }

        .meta-box {
            display: inline-block;
            text-align: right;
            font-size: 6pt;
            color: #475569;
            line-height: 1.35;
            background-color: #f8fafc;
            border: 0.5px solid #e2e8f0;
            border-radius: 3px;
            padding: 3px 6px;
        }

        /* Legend Table / Grid */
        .legend-card {
            width: 100%;
            background-color: #f8fafc;
            border: 0.5px solid #cbd5e1;
            border-radius: 3px;
            margin-bottom: 6px;
            padding: 2px 4px;
        }

        .legend-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
        }

        .legend-table td {
            border: none;
            padding: 1.5px 2px;
            font-size: 5.8pt;
            text-align: center;
            vertical-align: middle;
            white-space: nowrap;
            color: #334155;
        }

        .legend-table td.legend-title {
            text-align: left;
            font-weight: bold;
            color: #0f172a;
            width: 42px;
            padding-left: 2px;
        }

        /* Main Data Table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 5.8pt;
            table-layout: fixed;
        }

        .data-table th, 
        .data-table td {
            border: 0.5px solid #cbd5e1;
            padding: 2px 1px;
            text-align: center;
            vertical-align: middle;
        }

        .data-table th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: bold;
            font-size: 5.8pt;
        }

        .employee-col {
            text-align: left !important;
            width: 110px;
            padding-left: 4px !important;
            padding-right: 3px !important;
        }

        .employee-name {
            font-weight: bold;
            color: #0f172a;
            font-size: 6pt;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .employee-details {
            font-size: 5.2pt;
            color: #64748b;
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .day-col {
            width: 17px;
        }

        .sum-header {
            width: 17px;
            font-weight: bold;
        }

        /* Status Colors - High Contrast & Print Friendly */
        .status-p { border: 0.5px solid #16a34a; color: #15803d; background-color: #ecfdf5; }
        .status-a { border: 0.5px solid #dc2626; color: #b91c1c; background-color: #fef2f2; }
        .status-l { border: 0.5px solid #d97706; color: #b45309; background-color: #fffbeb; }
        .status-h { border: 0.5px solid #d97706; color: #b45309; background-color: #fffbeb; }
        .status-lv { border: 0.5px solid #2563eb; color: #1d4ed8; background-color: #eff6ff; }
        .status-od { border: 0.5px solid #6366f1; color: #4338ca; background-color: #eef2ff; }
        .status-hl { border: 0.5px solid #9333ea; color: #7e22ce; background-color: #faf5ff; }
        .status-w { border: 0.5px solid #64748b; color: #334155; background-color: #f1f5f9; }

        .status-cell {
            padding: 1px 0 !important;
            height: 18px;
        }

        .badge {
            display: inline-block;
            min-width: 13px;
            height: 13px;
            line-height: 13px;
            border-radius: 2px;
            font-weight: bold;
            font-size: 5.2pt;
            text-align: center;
            vertical-align: middle;
            margin: 0 auto;
            box-sizing: border-box;
        }

        .badge.empty {
            border: 0.5px solid #cbd5e1;
            color: #94a3b8;
            background-color: #f8fafc;
            font-weight: normal;
        }

        .badge.missing {
            border: 0.5px solid #dc2626 !important;
            color: #dc2626 !important;
            background-color: #fee2e2 !important;
        }

        .badge.missing:after {
            content: "!";
            font-size: 5.2pt;
            color: #dc2626;
            font-weight: bold;
        }

        .badge-missing-legend {
            border: 0.5px solid #dc2626;
            color: #dc2626;
            background-color: #fee2e2;
            font-weight: bold;
        }

        /* Summary Column Styles */
        .sum-p { background-color: #f0fdf4; color: #15803d; font-weight: bold; }
        .sum-a { background-color: #fef2f2; color: #b91c1c; font-weight: bold; }
        .sum-l { background-color: #fffbeb; color: #b45309; font-weight: bold; }
        .sum-h { background-color: #fffbeb; color: #b45309; font-weight: bold; }
        .sum-lv { background-color: #eff6ff; color: #1d4ed8; font-weight: bold; }
        .sum-od { background-color: #eef2ff; color: #4338ca; font-weight: bold; }
        .sum-hl { background-color: #faf5ff; color: #7e22ce; font-weight: bold; }
        .sum-w { background-color: #f8fafc; color: #334155; font-weight: bold; }

        .footer {
            margin-top: 8px;
            text-align: center;
            font-size: 6pt;
            color: #94a3b8;
            border-top: 0.5px solid #e2e8f0;
            padding-top: 4px;
        }
    </style>
</head>
<body>
    <!-- Top Header -->
    <table class="header-table">
        <tr>
            <td class="header-logo-cell">
                @if ($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Logo" class="report-logo" />
                @endif
            </td>
            <td class="header-title-cell">
                <div class="company-name">{{ $companyName }}</div>
                @if(!empty($companyAddress))
                    <div class="company-address">{{ $companyAddress }}</div>
                @endif
                <div class="report-title">Monthly Attendance Report &mdash; {{ $month }}</div>
            </td>
            <td class="header-meta-cell">
                <div class="meta-box">
                    <div><strong>Date:</strong> {{ $generatedAt }}</div>
                    <div><strong>By:</strong> {{ $generatedBy }}</div>
                    @if($branchName || $departmentName)
                        <div style="margin-top: 1px;">
                            @if($branchName)<span><strong>Branch:</strong> {{ $branchName }}</span>@endif
                            @if($departmentName)<span>@if($branchName) | @endif<strong>Dept:</strong> {{ $departmentName }}</span>@endif
                        </div>
                    @endif
                </div>
            </td>
        </tr>
    </table>

    <!-- Legend Bar -->
    <div class="legend-card">
        <table class="legend-table">
            <tr>
                <td class="legend-title">Legend:</td>
                <td><span class="badge status-p">P</span> = Present</td>
                <td><span class="badge status-a">A</span> = Absent</td>
                <td><span class="badge status-l">L</span> = Late</td>
                <td><span class="badge status-h">H</span> = Half Day</td>
                <td><span class="badge status-lv">LV</span> = Leave</td>
                <td><span class="badge status-od">OD</span> = On Duty</td>
                <td><span class="badge status-hl">HL</span> = Holiday</td>
                <td><span class="badge status-w">W</span> = Weekend</td>
                <td><span class="badge badge-missing-legend">!</span> = Missing check-out</td>
                <td><span class="badge empty">-</span> = No Record</td>
            </tr>
        </table>
    </div>

    <!-- Attendance Table -->
    <table class="data-table">
        <thead>
            <tr>
                <th class="employee-col">Employee</th>
                @for ($day = 1; $day <= $daysInMonth; $day++)
                    <th class="day-col">{{ $day }}</th>
                @endfor
                <th class="sum-header status-p">P</th>
                <th class="sum-header status-a">A</th>
                <th class="sum-header status-l">L</th>
                <th class="sum-header status-h">H</th>
                <th class="sum-header status-lv">LV</th>
                <th class="sum-header status-od">OD</th>
                <th class="sum-header status-hl">HL</th>
                <th class="sum-header status-w">W</th>
            </tr>
        </thead>
        <tbody>
            @foreach($employees as $employeeData)
                @php
                    $employee = $employeeData['employee'];
                    $summary = $employeeData['summary'];
                    $dailyStatus = $employeeData['dailyStatus'];
                @endphp
                <tr>
                    <td class="employee-col">
                        <div class="employee-name">{{ $employee->name_en ?? $employee->full_name_en }}</div>
                        <div class="employee-details">
                            {{ $employee->employee_id }} &bull; {{ $employee->department->name ?? 'N/A' }}
                        </div>
                    </td>

                    @for ($day = 1; $day <= $daysInMonth; $day++)
                        @php
                            $status = isset($dailyStatus[$day]['status']) ? $dailyStatus[$day]['status'] : null;
                            $missingCheckout = !empty($dailyStatus[$day]['missing_checkout']) && in_array($status, ['present', 'late', 'half_day'], true);
                            $statusClass = '';
                            $statusCode = '-';

                            if ($status === 'present') { $statusClass = 'status-p'; $statusCode = 'P'; }
                            elseif ($status === 'absent') { $statusClass = 'status-a'; $statusCode = 'A'; }
                            elseif ($status === 'late') { $statusClass = 'status-l'; $statusCode = 'L'; }
                            elseif ($status === 'half_day') { $statusClass = 'status-h'; $statusCode = 'H'; }
                            elseif ($status === 'leave') { $statusClass = 'status-lv'; $statusCode = 'LV'; }
                            elseif ($status === 'on_duty') { $statusClass = 'status-od'; $statusCode = 'OD'; }
                            elseif ($status === 'holiday') { $statusClass = 'status-hl'; $statusCode = 'HL'; }
                            elseif ($status === 'weekend') { $statusClass = 'status-w'; $statusCode = 'W'; }
                        @endphp
                        <td class="status-cell">
                            @php
                                $badgeClass = $status ? $statusClass : 'empty';
                                if ($missingCheckout) { $badgeClass .= ' missing'; }
                            @endphp
                            <span class="badge {{ $badgeClass }}">
                                {{ $status ? $statusCode : '-' }}
                            </span>
                        </td>
                    @endfor

                    <td class="sum-p">{{ $summary['present'] }}</td>
                    <td class="sum-a">{{ $summary['absent'] }}</td>
                    <td class="sum-l">{{ $summary['late'] }}</td>
                    <td class="sum-h">{{ $summary['half_day'] }}</td>
                    <td class="sum-lv">{{ $summary['leave'] }}</td>
                    <td class="sum-od">{{ $summary['on_duty'] }}</td>
                    <td class="sum-hl">{{ $summary['holiday'] }}</td>
                    <td class="sum-w">{{ $summary['weekend'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
        {{ $companyName }} &bull; Monthly Attendance Report ({{ $month }}) &bull; Generated on {{ $generatedAt }}
    </div>
</body>
</html>
