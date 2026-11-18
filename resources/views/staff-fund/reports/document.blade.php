<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $title ?? 'Final Payment Waiting List' }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 4mm 4mm 4mm 4mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 7.5pt;
            color: #000;
            line-height: 1.25;
            margin: 0;
            padding: 0;
            background: #fff;
        }

        .report-wrap {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
        }

        .no-print {
            margin-bottom: 10px;
            padding: 6px 10px;
            background: #f3f4f6;
            border: 1px solid #ccc;
            font-size: 8.5pt;
        }

        .no-print button {
            margin-left: 10px;
            padding: 3px 10px;
            cursor: pointer;
            font-weight: bold;
        }

        .report-header {
            margin-bottom: 6px;
            position: relative;
        }

        .report-header-inner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            text-align: center;
        }

        .report-logo {
            height: 38px;
            width: auto;
            object-fit: contain;
        }

        .company-name {
            font-size: 13pt;
            font-weight: bold;
            line-height: 1.15;
            text-transform: uppercase;
        }

        .company-address {
            font-size: 8pt;
            color: #333;
            margin-top: 1px;
        }

        .report-title {
            font-size: 10.5pt;
            font-weight: bold;
            margin-top: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .report-meta-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #444;
            border-bottom: 1px solid #444;
            padding: 3px 4px;
            margin-top: 4px;
            margin-bottom: 6px;
            font-size: 7.5pt;
        }

        .report-meta-left {
            font-weight: bold;
        }

        .report-meta-right {
            text-align: right;
            font-weight: bold;
        }

        table.report-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 8px;
            page-break-inside: auto;
        }

        table.report-table thead {
            display: table-header-group;
        }

        table.report-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }

        table.report-table th {
            border: 1px solid #000;
            background: #eaeaea;
            font-size: 7.2pt;
            font-weight: bold;
            text-align: center;
            padding: 3px 2px;
            vertical-align: middle;
            line-height: 1.15;
        }

        table.report-table td {
            border: 1px solid #333;
            font-size: 7.2pt;
            padding: 2.5px 3px;
            vertical-align: middle;
        }

        table.report-table td.text-center { text-align: center; }
        table.report-table td.text-left { text-align: left; }
        table.report-table td.text-right { text-align: right; }

        table.report-table tfoot tr td {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            font-weight: bold;
            background: #f3f4f6;
            padding: 3px 4px;
        }

        .status-badge {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 2px;
            font-size: 6.8pt;
            font-weight: bold;
            line-height: 1.1;
        }

        .status-paid {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
        }

        .status-pending {
            background: #fef9c3;
            color: #854d0e;
            border: 1px solid #fde047;
        }

        .status-waiting {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }

        .clearance-approved {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #93c5fd;
        }

        .clearance-in-progress {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fcd34d;
        }

        .clearance-rejected {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }

        .clearance-not-submitted {
            background: #f3f4f6;
            color: #4b5563;
            border: 1px solid #d1d5db;
        }

        .signatures-section {
            margin-top: 20px;
            page-break-inside: avoid;
        }

        table.signatures-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
        }

        table.signatures-table td {
            border: none;
            text-align: center;
            vertical-align: top;
            padding: 0 8px;
            width: 20%;
        }

        .signature-gap {
            height: 35px;
        }

        .signature-line {
            border-top: 1px dashed #333;
            margin: 0 10px 4px 10px;
        }

        .signature-label {
            font-size: 7.5pt;
            font-weight: bold;
            color: #111;
        }

        .signature-dept {
            font-size: 6.8pt;
            color: #555;
        }

        @media print {
            .no-print { display: none !important; }
            body { font-size: 7.2pt; }
        }
    </style>
</head>
<body class="report-landscape{{ !empty($pdfMode) ? ' pdf-export' : '' }}">
    <div class="report-wrap">
        @if (!empty($printMode))
            <div class="no-print">
                <span>Click Print or use browser print dialog (Ctrl+P / Cmd+P). For PDF file, use the PDF download button.</span>
                <button type="button" onclick="window.print()">Print Document</button>
            </div>
        @endif

        @php
            $logoPath = public_path('logo.png');
            $logoSrc = file_exists($logoPath)
                ? 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath))
                : null;
        @endphp

        <header class="report-header">
            <div class="report-header-inner">
                @if ($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Logo" class="report-logo" />
                @endif
                <div>
                    @if (!empty($companyName))
                        <div class="company-name">{{ $companyName }}</div>
                    @endif
                    @if (!empty($companyAddress))
                        <div class="company-address">{{ $companyAddress }}</div>
                    @endif
                    <div class="report-title">{{ $title ?? 'Final Payment Waiting List' }}</div>
                </div>
            </div>

            <div class="report-meta-bar">
                <div class="report-meta-left">
                    <span>As of: {{ $payload['as_of_date'] ?? now()->format('d-m-Y') }}</span>
                    @if (!empty($payload['filters']['date_from']) || !empty($payload['filters']['date_to']))
                        <span style="margin-left: 10px;">Left Date Range: {{ $payload['filters']['date_from'] ?: 'Start' }} to {{ $payload['filters']['date_to'] ?: 'End' }}</span>
                    @endif
                    @if (!empty($payload['summary']['total_staff']))
                        <span style="margin-left: 10px;">Total Separated: {{ $payload['summary']['total_staff'] }}</span>
                    @endif
                </div>
                <div class="report-meta-right">
                    <span>print Date: {{ $payload['print_date'] ?? now()->format('d-m-Y h:i A') }}</span>
                </div>
            </div>
        </header>

        @include('staff-fund.reports.templates.final-payment-waiting-list', ['payload' => $payload])

        @php
            $signatures = $signatureBlocks ?? config('staff_fund_reports.signature_blocks', []);
        @endphp

        @if (!empty($signatures))
            <div class="signatures-section">
                <table class="signatures-table">
                    <tr>
                        @foreach ($signatures as $block)
                            <td>
                                <div class="signature-gap"></div>
                                <div class="signature-line"></div>
                                <div class="signature-label">{{ $block['label'] ?? '' }}</div>
                                <div class="signature-dept">{{ $block['department'] ?? '' }}</div>
                            </td>
                        @endforeach
                    </tr>
                </table>
            </div>
        @endif
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
