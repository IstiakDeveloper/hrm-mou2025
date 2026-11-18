@php
    $rows = $payload['rows'] ?? [];
    $summary = $payload['summary'] ?? [];
@endphp

<table class="report-table">
    <thead>
        <tr>
            <th style="width: 3.5%;">SL No</th>
            <th style="width: 5.5%;">Pin</th>
            <th style="width: 14%;">Name (English)</th>
            <th style="width: 11%;">Designation</th>
            <th style="width: 7%;">Left Date</th>
            <th style="width: 9.5%;">Duration from the left Date</th>
            <th style="width: 11%;">Left Reason</th>
            <th style="width: 11%;">Left Branch</th>
            <th style="width: 10%;">Clearance Status</th>
            <th style="width: 8.5%;">Payment Status</th>
            <th style="width: 7%;">Payment Date</th>
            <th style="width: 7%;">Payment Amount</th>
            <th>Security Principal</th>
            <th>Security Interest</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($rows as $row)
            @php
                $clearanceClass = match ($row['clearance_status_code'] ?? 'not_submitted') {
                    'approved' => 'clearance-approved',
                    'in_progress' => 'clearance-in-progress',
                    'rejected' => 'clearance-rejected',
                    default => 'clearance-not-submitted',
                };

                $paymentClass = match ($row['payment_status_code'] ?? 'waiting') {
                    'paid' => 'status-paid',
                    'pending' => 'status-pending',
                    default => 'status-waiting',
                };
            @endphp
            <tr>
                <td class="text-center">{{ $row['sl'] ?? '' }}</td>
                <td class="text-center" style="font-weight: bold;">{{ $row['pin'] ?? '—' }}</td>
                <td class="text-left" style="font-weight: bold;">{{ $row['name'] ?? '—' }}</td>
                <td class="text-left">{{ $row['designation'] ?? '—' }}</td>
                <td class="text-center">{{ $row['left_date'] ?? '—' }}</td>
                <td class="text-center">{{ $row['duration'] ?? '—' }}</td>
                <td class="text-left">{{ $row['left_reason'] ?? '—' }}</td>
                <td class="text-left">{{ $row['left_branch'] ?? '—' }}</td>
                <td class="text-center">
                    <span class="status-badge {{ $clearanceClass }}">
                        {{ $row['clearance_status_label'] ?? 'Not Submitted' }}
                    </span>
                </td>
                <td class="text-center">
                    <span class="status-badge {{ $paymentClass }}">
                        {{ $row['payment_status_label'] ?? 'Waiting' }}
                    </span>
                </td>
                <td class="text-center">{{ $row['payment_date'] ?? '—' }}</td>
                <td class="text-right" style="font-weight: bold;">
                    {{ $row['payment_amount_formatted'] ?? '—' }}
                </td>
                <td class="text-right">{{ isset($row['security_principal']) ? number_format((float) $row['security_principal'], 2) : '—' }}</td>
                <td class="text-right">{{ isset($row['security_interest']) ? number_format((float) $row['security_interest'], 0) : '—' }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="14" class="text-center" style="padding: 16px; color: #666; font-style: italic;">
                    No separated staff found matching the selected filters.
                </td>
            </tr>
        @endforelse
    </tbody>
    @if (!empty($rows))
        <tfoot>
            <tr>
                <td colspan="4" class="text-left" style="font-weight: bold;">
                    Total Records: {{ $summary['total_staff'] ?? count($rows) }} 
                    (Waiting: {{ $summary['waiting_count'] ?? 0 }}, Pending: {{ $summary['pending_count'] ?? 0 }}, Paid: {{ $summary['paid_count'] ?? 0 }})
                </td>
                <td colspan="7" class="text-right" style="font-weight: bold;">Grand Total:</td>
                <td class="text-right" style="font-weight: bold;">
                    {{ $summary['total_amount_formatted'] ?? '0.00' }}
                </td>
                <td colspan="2" class="text-right">Included in payment amount</td>
            </tr>
        </tfoot>
    @endif
</table>
