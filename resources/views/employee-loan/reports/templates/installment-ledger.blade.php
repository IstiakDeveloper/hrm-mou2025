@php
    $sections = $payload['sections'] ?? [];
@endphp

@forelse ($sections as $section)
    <div class="loan-ledger-section" style="margin-bottom: 1.25rem; page-break-inside: avoid;">
        <p class="section-title" style="margin: 0 0 0.35rem; font-size: 11px; font-weight: 700;">
            {{ $section['title'] ?? 'Loan' }}
            @if (!empty($section['loan_type']))
                <span style="font-weight: 500; color: #52525b;">· {{ $section['loan_type'] }}</span>
            @endif
            @if (!empty($section['status']))
                <span style="font-weight: 500; color: #52525b;">· {{ $section['status'] }}</span>
            @endif
        </p>

        <table class="data" style="font-size: 10px;">
            <thead>
                <tr>
                    <th rowspan="2" class="text-left">Scheduled month</th>
                    <th colspan="3" class="text-center">Schedule</th>
                    <th rowspan="2" class="text-center">Install no</th>
                    <th rowspan="2" class="text-center">Payment month</th>
                    <th rowspan="2" class="text-left">Payment branch</th>
                    <th colspan="3" class="text-center">Collection</th>
                    <th colspan="3" class="text-center">Loan balance</th>
                    <th rowspan="2" class="text-center">Status</th>
                </tr>
                <tr>
                    <th class="num">PR</th>
                    <th class="num">SC</th>
                    <th class="num">Total</th>
                    <th class="num">PR</th>
                    <th class="num">SC</th>
                    <th class="num">Total</th>
                    <th class="num">PR</th>
                    <th class="num">SC</th>
                    <th class="num">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($section['rows'] ?? [] as $row)
                    @php
                        $isPaid = ($row['status_label'] ?? '') === 'PAID';
                    @endphp
                    <tr>
                        <td>{{ $row['scheduled_month'] ?? '—' }}</td>
                        <td class="num">{{ taka_fmt($row['principal_amount'] ?? 0) }}</td>
                        <td class="num">{{ taka_fmt($row['service_charge_amount'] ?? 0) }}</td>
                        <td class="num">{{ taka_fmt($row['total_amount'] ?? 0) }}</td>
                        <td class="text-center">{{ $row['installment_no'] ?? '—' }}</td>
                        <td class="text-center">{{ $row['payment_month'] ?? '—' }}</td>
                        <td>{{ $row['payment_branch'] ?? '—' }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['paid_principal_amount'] ?? 0) : '—' }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['paid_service_charge_amount'] ?? 0) : '—' }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['paid_amount'] ?? 0) : '—' }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['balance_principal'] ?? 0) : taka_fmt(0) }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['balance_service_charge'] ?? 0) : taka_fmt(0) }}</td>
                        <td class="num">{{ $isPaid ? taka_fmt($row['balance_total'] ?? 0) : taka_fmt(0) }}</td>
                        <td class="text-center">{{ $row['status_label'] ?? '—' }}</td>
                    </tr>
                @endforeach
                @if (!empty($section['totals']))
                    @php $totals = $section['totals']; @endphp
                    <tr class="totals-row">
                        <td><strong>Total</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['principal_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['service_charge_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['total_amount'] ?? 0) }}</strong></td>
                        <td class="text-center">—</td>
                        <td class="text-center">—</td>
                        <td>—</td>
                        <td class="num"><strong>{{ taka_fmt($totals['paid_principal_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['paid_service_charge_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['paid_amount'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['balance_principal'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['balance_service_charge'] ?? 0) }}</strong></td>
                        <td class="num"><strong>{{ taka_fmt($totals['balance_total'] ?? 0) }}</strong></td>
                        <td class="text-center">—</td>
                    </tr>
                @endif
            </tbody>
        </table>
    </div>
@empty
    <p>No loans found for the selected filters.</p>
@endforelse
