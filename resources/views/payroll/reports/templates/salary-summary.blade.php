<table class="data salary-summary-table">
    <colgroup>
        <col style="width: 5%">
        <col style="width: 9%">
        <col style="width: 25%">
        <col style="width: 14%">
        <col style="width: 19%">
        <col style="width: 28%">
    </colgroup>
    <thead>
        <tr>
            <th>SL No.</th>
            <th>PIN</th>
            <th>Name of Employee</th>
            <th class="num">Net Salary (Payable)</th>
            <th>A/C No.</th>
            <th>Remarks</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($payload['rows'] ?? [] as $row)
            <tr>
                <td class="text-center">{{ $loop->iteration }}</td>
                <td class="text-center">{{ $row['pin'] }}</td>
                <td>{{ $row['name'] }}</td>
                <td class="num">{{ taka_fmt($row['net'], 0) }}</td>
                <td>{{ $row['account_no'] }}</td>
                <td>{{ $row['remarks'] }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="6" class="text-center">No payslips found for the selected filters.</td>
            </tr>
        @endforelse
        <tr class="totals-row">
            <td colspan="3" class="text-right">Total</td>
            <td class="num">{{ taka_fmt($payload['totals']['net'] ?? 0, 0) }}</td>
            <td colspan="2"></td>
        </tr>
        <tr class="totals-row">
            <td colspan="6">In Words: {{ $payload['in_words'] ?? '' }}</td>
        </tr>
    </tbody>
</table>
@include('payroll.reports.partials.signature-section')
