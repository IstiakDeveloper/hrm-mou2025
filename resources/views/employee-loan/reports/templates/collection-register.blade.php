@php
    $rows = $payload['rows'] ?? [];
    $totals = $payload['totals'] ?? null;
@endphp

<table class="data">
    <thead>
        <tr>
            <th colspan="2" class="text-center">Employee</th>
            <th rowspan="2" class="text-left align-middle">Policy</th>
            <th rowspan="2" class="text-center align-middle">Disburse Date</th>
            <th rowspan="2" class="num align-middle">Disburse Amt</th>
            <th rowspan="2" class="num align-middle">Install Amt</th>
            <th colspan="3" class="text-center">Opening Outstanding</th>
            <th colspan="3" class="text-center">Collection</th>
            <th rowspan="2" class="num align-middle">Rebate Amount</th>
            <th colspan="3" class="text-center">Loan Balance</th>
        </tr>
        <tr>
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
        </tr>
    </thead>
    <tbody>
        @forelse ($rows as $row)
            <tr>
                <td class="text-center">{{ $row['pin'] ?? '' }}</td>
                <td class="text-left">{{ $row['name'] ?? '' }}</td>
                <td class="text-left">{{ $row['policy'] ?? '' }}</td>
                <td class="text-center whitespace-nowrap">{{ $row['disburse_date'] ?? '' }}</td>
                <td class="num">{{ is_numeric($row['disburse_amount'] ?? null) ? taka_fmt($row['disburse_amount']) : '' }}</td>
                <td class="num">{{ is_numeric($row['install_amount'] ?? null) ? taka_fmt($row['install_amount']) : '' }}</td>
                <td class="num">{{ is_numeric($row['open_pr'] ?? null) ? taka_fmt($row['open_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($row['open_sc'] ?? null) ? taka_fmt($row['open_sc']) : '' }}</td>
                <td class="num font-medium">{{ is_numeric($row['open_total'] ?? null) ? taka_fmt($row['open_total']) : '' }}</td>
                <td class="num">{{ is_numeric($row['coll_pr'] ?? null) ? taka_fmt($row['coll_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($row['coll_sc'] ?? null) ? taka_fmt($row['coll_sc']) : '' }}</td>
                <td class="num font-medium">{{ is_numeric($row['coll_total'] ?? null) ? taka_fmt($row['coll_total']) : '' }}</td>
                <td class="num">{{ is_numeric($row['rebate_amount'] ?? null) ? taka_fmt($row['rebate_amount']) : '' }}</td>
                <td class="num">{{ is_numeric($row['close_pr'] ?? null) ? taka_fmt($row['close_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($row['close_sc'] ?? null) ? taka_fmt($row['close_sc']) : '' }}</td>
                <td class="num font-medium">{{ is_numeric($row['close_total'] ?? null) ? taka_fmt($row['close_total']) : '' }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="16" class="text-center">No data for the selected filters.</td>
            </tr>
        @endforelse
        @if ($totals && count($rows) > 0)
            <tr class="totals-row font-bold">
                <td colspan="4" class="text-center">Total</td>
                <td class="num">{{ is_numeric($totals['disburse_amount'] ?? null) ? taka_fmt($totals['disburse_amount']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['install_amount'] ?? null) ? taka_fmt($totals['install_amount']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['open_pr'] ?? null) ? taka_fmt($totals['open_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['open_sc'] ?? null) ? taka_fmt($totals['open_sc']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['open_total'] ?? null) ? taka_fmt($totals['open_total']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['coll_pr'] ?? null) ? taka_fmt($totals['coll_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['coll_sc'] ?? null) ? taka_fmt($totals['coll_sc']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['coll_total'] ?? null) ? taka_fmt($totals['coll_total']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['rebate_amount'] ?? null) ? taka_fmt($totals['rebate_amount']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['close_pr'] ?? null) ? taka_fmt($totals['close_pr']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['close_sc'] ?? null) ? taka_fmt($totals['close_sc']) : '' }}</td>
                <td class="num">{{ is_numeric($totals['close_total'] ?? null) ? taka_fmt($totals['close_total']) : '' }}</td>
            </tr>
        @endif
    </tbody>
</table>
