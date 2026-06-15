@php
    $employee = $payload['employee'] ?? null;
    $columns = $payload['columns'] ?? [];
    $rows = $payload['rows'] ?? [];
    $totals = $payload['totals'] ?? null;
@endphp

@if ($employee)
    <table class="data" style="margin-bottom: 12px;">
        <tbody>
            <tr>
                <th style="width: 28%; text-align: left;">Employee</th>
                <td>{{ $employee['label'] ?? '' }}</td>
                <th style="width: 18%; text-align: left;">Branch</th>
                <td>{{ $employee['branch'] ?? '—' }}</td>
            </tr>
            <tr>
                <th style="text-align: left;">PIN</th>
                <td>{{ $employee['pin'] ?? '' }}</td>
                <th style="text-align: left;">Department</th>
                <td>{{ $employee['department'] ?? '—' }}</td>
            </tr>
            <tr>
                <th style="text-align: left;">Current balance</th>
                <td class="num">{{ number_format((float) ($employee['pf_balance'] ?? 0), 0) }}</td>
                <th style="text-align: left;">Own / Org contribution</th>
                <td class="num">
                    {{ number_format((float) ($employee['own_contribution'] ?? 0), 0) }}
                    /
                    {{ number_format((float) ($employee['org_contribution'] ?? 0), 0) }}
                </td>
            </tr>
        </tbody>
    </table>
@endif

@include('pf.reports.templates.table', ['payload' => $payload])
