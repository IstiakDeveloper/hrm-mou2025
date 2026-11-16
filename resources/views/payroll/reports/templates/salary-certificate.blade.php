@php
    $employee = $payload['employee'] ?? null;
@endphp

@if (!$employee)
    <p>{{ $payload['meta']['message'] ?? 'Employee not found.' }}</p>
@else
    <div class="cert-body">
        <p class="text-center"><strong>SALARY CERTIFICATE</strong></p>
        <p>
            This is to certify that <strong>{{ $employee['name'] }}</strong>
            (PIN: {{ $employee['pin'] }}) is employed with {{ $companyName }} as
            <strong>{{ $employee['designation'] ?? '—' }}</strong>
            @if (!empty($employee['department']))
                , {{ $employee['department'] }}
            @endif
            @if (!empty($employee['branch']))
                , posted at {{ $employee['branch'] }}.
            @else
                .
            @endif
        </p>
        <p>
            For the month of <strong>{{ $periodLabel }}</strong>, the salary particulars are as follows:
        </p>

        <table class="data">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num">Amount (BDT)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Basic Salary</td>
                    <td class="num">{{ taka_fmt($payload['basic'] ?? 0, 2) }}</td>
                </tr>
                @foreach ($payload['earnings'] ?? [] as $line)
                    @if (($line['name'] ?? '') !== 'Basic')
                        <tr>
                            <td>{{ $line['name'] }}</td>
                            <td class="num">{{ taka_fmt($line['amount'], 2) }}</td>
                        </tr>
                    @endif
                @endforeach
                <tr class="totals-row">
                    <td>Gross Salary</td>
                    <td class="num">{{ taka_fmt($payload['gross'] ?? 0, 2) }}</td>
                </tr>
                @foreach ($payload['deductions'] ?? [] as $line)
                    <tr>
                        <td>{{ $line['name'] }} (Deduction)</td>
                        <td class="num">{{ taka_fmt($line['amount'], 2) }}</td>
                    </tr>
                @endforeach
                <tr class="totals-row">
                    <td>Net Payable</td>
                    <td class="num">{{ taka_fmt($payload['net'] ?? 0, 2) }}</td>
                </tr>
            </tbody>
        </table>

        <p>Issued on: {{ $payload['issued_at'] ?? now()->format('d F Y') }}</p>

        <div class="signature">
            <p>_______________________________</p>
            <p>Authorized Signatory</p>
        </div>
    </div>
@endif
