@php
    $rows = $payload['rows'] ?? [];
    $totals = $payload['totals'] ?? null;
@endphp

<table class="data loan-statement-employee">
    <thead>
        <tr class="statement-header">
            <th colspan="2" class="text-center">Employee</th>
            <th rowspan="2" class="text-left align-middle">Policy</th>
            <th colspan="3" class="text-center">Opening Loan Outstanding</th>
            <th colspan="3" class="text-center">Disburse</th>
            <th colspan="3" class="text-center">Collection</th>
            <th rowspan="2" class="text-center align-middle">Full Paid Loanee</th>
            <th rowspan="2" class="num align-middle">Rebate Amt</th>
            <th colspan="2" class="text-center">Transfer</th>
            <th colspan="3" class="text-center">Closing Outstanding</th>
        </tr>
        <tr class="statement-header">
            <th class="text-center">ID</th>
            <th class="text-left">Name</th>
            <th class="num">PR</th>
            <th class="num">SC</th>
            <th class="num">Total</th>
            <th class="num">PR</th>
            <th class="num">SC</th>
            <th class="num">Total</th>
            <th class="num">PR</th>
            <th class="num">SC</th>
            <th class="num">Total</th>
            <th class="num">In</th>
            <th class="num">Out</th>
            <th class="num">PR</th>
            <th class="num">SC</th>
            <th class="num">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($rows as $row)
            <tr>
                <td class="text-center">{{ $row['pin'] ?? '' }}</td>
                <td class="text-left">{{ $row['name'] ?? '' }}</td>
                <td class="text-left">{{ $row['policy'] ?? '' }}</td>
                <td class="num">{{ is_numeric($row['open_pr'] ?? null) ? taka_fmt($row['open_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($row['open_sc'] ?? null) ? taka_fmt($row['open_sc']) : '' }}</td>
                <td class="num font-medium">{{ is_numeric($row['open_total'] ?? null) ? taka_fmt($row['open_total']) : '' }}</td>
                <td class="num">{{ is_numeric($row['disburse_pr'] ?? null) ? taka_fmt($row['disburse_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($row['disburse_sc'] ?? null) ? taka_fmt($row['disburse_sc']) : '' }}</td>
                <td class="num font-medium">{{ is_numeric($row['disburse_total'] ?? null) ? taka_fmt($row['disburse_total']) : '' }}</td>
                <td class="num">{{ is_numeric($row['coll_pr'] ?? null) ? taka_fmt($row['coll_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($row['coll_sc'] ?? null) ? taka_fmt($row['coll_sc']) : '' }}</td>
                <td class="num font-medium">{{ is_numeric($row['coll_total'] ?? null) ? taka_fmt($row['coll_total']) : '' }}</td>
                <td class="text-center">{{ ($row['full_paid_loanee'] ?? 0) ? '1' : '' }}</td>
                <td class="num">{{ is_numeric($row['rebate_amount'] ?? null) ? taka_fmt($row['rebate_amount']) : '' }}</td>
                <td class="num">{{ is_numeric($row['transfer_in'] ?? null) ? taka_fmt($row['transfer_in']) : '' }}</td>
                <td class="num">{{ is_numeric($row['transfer_out'] ?? null) ? taka_fmt($row['transfer_out']) : '' }}</td>
                <td class="num">{{ is_numeric($row['close_pr'] ?? null) ? taka_fmt($row['close_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($row['close_sc'] ?? null) ? taka_fmt($row['close_sc']) : '' }}</td>
                <td class="num font-medium">{{ is_numeric($row['close_total'] ?? null) ? taka_fmt($row['close_total']) : '' }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="19" class="text-center">No data for the selected filters.</td>
            </tr>
        @endforelse
        @if ($totals && count($rows) > 0)
            <tr class="totals-row font-bold">
                <td colspan="3" class="text-center">{{ $totals['label'] ?? 'Total' }}</td>
                <td class="num">{{ is_numeric($totals['open_pr'] ?? null) ? taka_fmt($totals['open_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['open_sc'] ?? null) ? taka_fmt($totals['open_sc']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['open_total'] ?? null) ? taka_fmt($totals['open_total']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['disburse_pr'] ?? null) ? taka_fmt($totals['disburse_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['disburse_sc'] ?? null) ? taka_fmt($totals['disburse_sc']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['disburse_total'] ?? null) ? taka_fmt($totals['disburse_total']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['coll_pr'] ?? null) ? taka_fmt($totals['coll_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['coll_sc'] ?? null) ? taka_fmt($totals['coll_sc']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['coll_total'] ?? null) ? taka_fmt($totals['coll_total']) : '' }}</td>
                <td class="text-center">{{ is_numeric($totals['full_paid_loanee'] ?? null) ? $totals['full_paid_loanee'] : '' }}</td>
                <td class="num">{{ is_numeric($totals['rebate_amount'] ?? null) ? taka_fmt($totals['rebate_amount']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['transfer_in'] ?? null) ? taka_fmt($totals['transfer_in']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['transfer_out'] ?? null) ? taka_fmt($totals['transfer_out']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['close_pr'] ?? null) ? taka_fmt($totals['close_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['close_sc'] ?? null) ? taka_fmt($totals['close_sc']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['close_total'] ?? null) ? taka_fmt($totals['close_total']) : '' }}</td>
            </tr>
        @endif
    </tbody>
</table>
