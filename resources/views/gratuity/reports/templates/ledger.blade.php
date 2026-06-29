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
                <th style="text-align: left;">Designation</th>
                <td>{{ $employee['designation'] ?? '—' }}</td>
                <th style="text-align: left;">Eligible</th>
                <td>{{ $employee['eligible'] ?? '—' }}</td>
            </tr>
            <tr>
                <th style="text-align: left;">Confirmation / Service end</th>
                <td>
                    @if(filled($employee['confirmation_date'] ?? null))
                        {{ $employee['confirmation_date'] }} / {{ $employee['service_end'] ?? '—' }}
                    @else
                        {{ $employee['service_end'] ?? '—' }}
                    @endif
                </td>
                <th style="text-align: left;">Years × Basic × Multiplier</th>
                <td>
                    {{ $employee['years'] ?? 0 }} × {{ taka_fmt($employee['basic'] ?? 0) }} × {{ $employee['multiplier'] ?? 0 }}
                </td>
            </tr>
            <tr>
                <th style="text-align: left;">Projected gratuity</th>
                <td class="num">{{ taka_fmt($employee['gratuity'] ?? 0) }}</td>
                <th style="text-align: left;">Paid / Outstanding</th>
                <td class="num">
                    {{ taka_fmt($employee['paid_total'] ?? 0) }}
                    /
                    {{ taka_fmt($employee['outstanding'] ?? 0) }}
                </td>
            </tr>
        </tbody>
    </table>
@endif

@include('gratuity.reports.templates.table', ['payload' => $payload])
