<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Financial Statement — {{ $statement['employee']['name_en'] }} ({{ $statement['employee']['pin'] }})</title>
    @include('payroll.reports.partials.styles')
    <style>
        @page {
            size: A4 portrait;
            margin: 10mm 10mm 10mm 10mm;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.5pt;
            color: #000;
            line-height: 1.35;
            background: #fff;
            margin: 0;
            padding: 0;
        }

        .statement-wrap {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
        }

        .no-print-toolbar {
            background: #f8fafc;
            border-bottom: 1px solid #cbd5e1;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .no-print-toolbar button {
            background: #047857;
            color: #fff;
            border: none;
            padding: 6px 14px;
            font-size: 9pt;
            font-weight: 600;
            border-radius: 4px;
            cursor: pointer;
        }

        .no-print-toolbar button:hover {
            background: #065f46;
        }

        .no-print-toolbar .close-btn {
            background: #64748b;
            margin-left: 8px;
        }

        .no-print-toolbar .close-btn:hover {
            background: #475569;
        }

        @media print {
            .no-print-toolbar {
                display: none !important;
            }
            body {
                padding: 0;
                background: #fff;
            }
        }

        /* Document Header */
        .statement-header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
        }

        .statement-company {
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
        }

        .statement-address {
            font-size: 8pt;
            color: #333;
            margin: 2px 0 4px;
        }

        .statement-title-box {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 2px 16px;
            font-size: 9.5pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-radius: 2px;
            margin-top: 2px;
        }

        .statement-date-row {
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            margin-top: 4px;
            color: #333;
            font-weight: 500;
        }

        /* Particulars Grid */
        table.info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
            font-size: 8pt;
        }

        table.info-grid td {
            border: 1px solid #777;
            padding: 3px 6px;
            vertical-align: middle;
        }

        table.info-grid td.label {
            background: #f1f5f9;
            font-weight: bold;
            width: 17%;
            color: #0f172a;
        }

        table.info-grid td.val {
            width: 33%;
        }

        /* Section Headings */
        .statement-section-title {
            font-size: 8.5pt;
            font-weight: bold;
            background: #e2e8f0;
            border: 1px solid #000;
            border-bottom: none;
            padding: 3px 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 6px;
        }

        /* Sheet Data Tables */
        table.sheet-data {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            margin-bottom: 6px;
        }

        table.sheet-data th,
        table.sheet-data td {
            border: 1px solid #000;
            padding: 3px 6px;
        }

        table.sheet-data th {
            background: #f8fafc;
            font-weight: bold;
            text-align: left;
        }

        table.sheet-data th.num,
        table.sheet-data td.num {
            text-align: right;
            font-variant-numeric: tabular-nums;
        }

        table.sheet-data tr.subtotal-row td {
            font-weight: bold;
            background: #f8fafc;
        }

        table.sheet-data tr.grand-total-row td {
            font-weight: bold;
            font-size: 9.5pt;
            background: #e2e8f0;
            border-top: 2px solid #000;
            border-bottom: 2px double #000;
        }

        .amount-in-words-box {
            border: 1px solid #000;
            padding: 4px 8px;
            font-size: 8.5pt;
            font-weight: bold;
            background: #fafafa;
            margin: 6px 0;
        }

        .notice-box {
            font-size: 7.5pt;
            color: #475569;
            font-style: italic;
            margin: 4px 0 10px;
        }

        /* 5-Column Signatures */
        .signatures-wrapper {
            margin-top: 36px;
            width: 100%;
            page-break-inside: avoid;
        }

        table.signature-grid {
            width: 100%;
            border-collapse: collapse;
            border: none;
        }

        table.signature-grid td {
            border: none;
            width: 20%;
            text-align: center;
            vertical-align: top;
            padding: 0 4px;
        }

        .sig-line {
            border-top: 1px dashed #000;
            margin-bottom: 4px;
            height: 1px;
        }

        .sig-label {
            font-size: 8pt;
            font-weight: bold;
            color: #000;
        }

        .sig-dept {
            font-size: 7pt;
            color: #555;
            margin-top: 1px;
        }
    </style>
</head>
<body>
    @if (!empty($printMode))
        <div class="no-print-toolbar">
            <div>
                <strong>Employee Financial Statement</strong> — Print Preview (A4 Portrait)
            </div>
            <div>
                <button type="button" onclick="window.print()">Print Statement</button>
                <button type="button" class="close-btn" onclick="window.close()">Close</button>
            </div>
        </div>
    @endif

    <div class="statement-wrap">
        <!-- Header -->
        <div class="statement-header">
            <div class="statement-company">{{ $companyName }}</div>
            @if (!empty($companyAddress))
                <div class="statement-address">{{ $companyAddress }}</div>
            @endif
            <div class="statement-title-box">
                EMPLOYEE FINANCIAL STATEMENT
            </div>
            <div class="statement-date-row">
                <span><strong>Calculation Date:</strong> {{ $statement['employee']['calculation_date'] }}</span>
                <span><strong>Status:</strong> {{ strtoupper($statement['employee']['status']) }}</span>
            </div>
        </div>

        <!-- Employee Particulars Grid -->
        <table class="info-grid">
            <tr>
                <td class="label">Employee Name</td>
                <td class="val"><strong>{{ $statement['employee']['name_en'] }}</strong></td>
                <td class="label">PIN / Employee ID</td>
                <td class="val">
                    <strong>{{ $statement['employee']['pin'] }}</strong>
                    @if ($statement['employee']['employee_id'] && $statement['employee']['employee_id'] !== $statement['employee']['pin'])
                        / {{ $statement['employee']['employee_id'] }}
                    @endif
                </td>
            </tr>
            <tr>
                <td class="label">Designation</td>
                <td class="val">{{ $statement['employee']['designation'] }}</td>
                <td class="label">Department</td>
                <td class="val">{{ $statement['employee']['department'] }}</td>
            </tr>
            <tr>
                <td class="label">Branch / Office</td>
                <td class="val">{{ $statement['employee']['branch'] }}</td>
                <td class="label">Basic Salary</td>
                <td class="val"><strong>৳{{ number_format($statement['employee']['basic_salary']) }}</strong></td>
            </tr>
            <tr>
                <td class="label">Joining Date</td>
                <td class="val">{{ $statement['employee']['joining_date'] ?? '—' }}</td>
                <td class="label">Confirmation Date</td>
                <td class="val">{{ $statement['employee']['confirmation_date'] ?? '—' }}</td>
            </tr>
            <tr>
                <td class="label">Separation Date</td>
                <td class="val">{{ $statement['employee']['separation_date'] ?? 'Active / In Service' }}</td>
                <td class="label">Service Length</td>
                <td class="val">{{ $statement['employee']['tenure_joining'] ?? '—' }}</td>
            </tr>
        </table>

        <!-- Section A: Entitlements -->
        <div class="statement-section-title">A. Accrued Benefits &amp; Entitlements</div>
        <table class="sheet-data">
            <thead>
                <tr>
                    <th style="width: 8%;">SL</th>
                    <th style="width: 42%;">Particulars</th>
                    <th style="width: 30%;">Calculation Basis / Description</th>
                    <th style="width: 20%;" class="num">Amount (BDT)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="text-align: center;">1</td>
                    <td>
                        <strong>Provident Fund (PF) Balance</strong><br>
                        <span style="font-size: 7.5pt; color: #555;">
                            Own: ৳{{ number_format($statement['pf']['own_contribution']) }} |
                            Employer: ৳{{ number_format($statement['pf']['org_contribution']) }}
                        </span>
                    </td>
                    <td>
                        @if ($statement['pf']['enrolled'])
                            PF Enrolled — Total balance refund
                        @else
                            Not enrolled in PF
                        @endif
                    </td>
                    <td class="num"><strong>{{ number_format($statement['pf']['balance']) }}</strong></td>
                </tr>
                <tr>
                    <td style="text-align: center;">2</td>
                    <td>
                        <strong>Gratuity Entitlement</strong><br>
                        <span style="font-size: 7.5pt; color: #555;">
                            Completed: {{ $statement['gratuity']['completed_years'] }} Years |
                            Multiplier: {{ $statement['gratuity']['basic_multiplier'] }} × Basic Salary
                        </span>
                    </td>
                    <td>
                        @if ($statement['gratuity']['already_paid'])
                            Gratuity already paid separately
                        @elseif ($statement['gratuity']['eligible'])
                            {{ $statement['gratuity']['label'] ?: 'Eligible based on service tenure' }}
                        @else
                            {{ $statement['gratuity']['label'] ?: 'Not eligible for gratuity' }}
                        @endif
                    </td>
                    <td class="num"><strong>{{ number_format($statement['gratuity']['amount']) }}</strong></td>
                </tr>
                <tr class="subtotal-row">
                    <td colspan="3" style="text-align: right;"><strong>Total Entitlements (A):</strong></td>
                    <td class="num"><strong>৳{{ number_format($statement['summary']['gross_entitlement']) }}</strong></td>
                </tr>
            </tbody>
        </table>

        <!-- Section B: Deductions & Loan Recovery -->
        <div class="statement-section-title">B. Liabilities &amp; Loan Deductions</div>
        <table class="sheet-data">
            <thead>
                <tr>
                    <th style="width: 8%;">SL</th>
                    <th style="width: 32%;">Loan Particulars</th>
                    <th style="width: 20%;" class="num">Total Loan (BDT)</th>
                    <th style="width: 20%;" class="num">Paid So Far (BDT)</th>
                    <th style="width: 20%;" class="num">Outstanding Due (BDT)</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($statement['loans']['items'] as $index => $loan)
                    <tr>
                        <td style="text-align: center;">{{ $index + 1 }}</td>
                        <td>
                            <strong>{{ $loan['loan_number'] }}</strong> ({{ $loan['type_label'] }})
                        </td>
                        <td class="num">{{ number_format($loan['total_payable']) }}</td>
                        <td class="num">{{ number_format($loan['paid_amount']) }}</td>
                        <td class="num" style="color: #b91c1c;"><strong>{{ number_format($loan['outstanding_balance']) }}</strong></td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" style="text-align: center; color: #666; padding: 5px;">
                            No active loans or outstanding liabilities.
                        </td>
                    </tr>
                @endforelse
                <tr class="subtotal-row">
                    <td colspan="4" style="text-align: right;"><strong>Total Deductions (B):</strong></td>
                    <td class="num" style="color: #b91c1c;"><strong>৳{{ number_format($statement['summary']['total_deductions']) }}</strong></td>
                </tr>
            </tbody>
        </table>

        <!-- Section C: Net Position -->
        <table class="sheet-data" style="margin-top: 4px;">
            <tbody>
                <tr class="grand-total-row">
                    <td style="width: 70%; text-align: right; padding: 5px 8px;">
                        <strong>NET FINANCIAL POSITION (A − B):</strong>
                    </td>
                    <td style="width: 30%; font-size: 10.5pt;" class="num">
                        <strong>৳{{ number_format($statement['summary']['net_payable']) }}</strong>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- Amount In Words -->
        <div class="amount-in-words-box">
            In Words: {{ $statement['summary']['amount_in_words'] }}
        </div>

        <div class="notice-box">
            * Note: This statement reflects the employee's financial standing (PF balance, calculated gratuity, and outstanding loans) as of {{ $statement['employee']['calculation_date'] }}.
        </div>

        <!-- 5 Signatures in English -->
        <div class="signatures-wrapper">
            <table class="signature-grid">
                <tr>
                    <td>
                        <div class="sig-line"></div>
                        <div class="sig-label">Prepared By</div>
                        <div class="sig-dept">Human Resources</div>
                    </td>
                    <td>
                        <div class="sig-line"></div>
                        <div class="sig-label">Verified By</div>
                        <div class="sig-dept">Finance &amp; Accounts</div>
                    </td>
                    <td>
                        <div class="sig-line"></div>
                        <div class="sig-label">Head of Department</div>
                        <div class="sig-dept">Department Head</div>
                    </td>
                    <td>
                        <div class="sig-line"></div>
                        <div class="sig-label">Approved By</div>
                        <div class="sig-dept">Executive Director / MD</div>
                    </td>
                    <td>
                        <div class="sig-line"></div>
                        <div class="sig-label">Employee Signature</div>
                        <div class="sig-dept">Signature &amp; Date</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    @if (!empty($printMode))
        <script>
            window.addEventListener('load', () => {
                setTimeout(() => window.print(), 250);
            });
        </script>
    @endif
</body>
</html>
