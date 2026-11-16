@php
    $orientation = $orientation ?? 'landscape';
    $topMargin = (float) (config('hr_reports.print.margin_top_mm') ?? 4);
    $bottomMargin = (float) (config('hr_reports.print.margin_bottom_mm') ?? 4);
    $sideMargin = (float) (config('hr_reports.print.margin_side_mm') ?? 4);
@endphp
<style>
    @page {
        size: A4 {{ $orientation }};
        margin: {{ $topMargin }}mm {{ $sideMargin }}mm {{ $bottomMargin }}mm;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: 'DejaVu Sans', Arial, sans-serif;
        font-size: 8.5pt;
        color: #000;
        line-height: 1.3;
        margin: 0;
        padding: 0;
    }

    .report-wrap {
        width: 100%;
        max-width: 100%;
    }

    .report-header {
        margin-bottom: 8px;
        text-align: center;
    }

    .report-header-inner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        max-width: 100%;
    }

    .report-logo {
        height: 40px;
        width: auto;
        object-fit: contain;
    }

    .report-header-text {
        text-align: center;
    }

    .company-name {
        font-size: 14pt;
        font-weight: bold;
        line-height: 1.2;
    }

    .company-address {
        font-size: 8.5pt;
        color: #333;
        margin-top: 1px;
    }

    .report-title {
        font-size: 10.5pt;
        font-weight: bold;
        margin-top: 3px;
    }

    .report-period {
        font-size: 8.5pt;
        font-weight: normal;
        margin-top: 2px;
    }

    .banner-box {
        border: 1px solid #000;
        background-color: #f9fafb;
        padding: 4px 8px;
        font-size: 8pt;
        margin-bottom: 8px;
        font-weight: bold;
    }

    .banner-date-right {
        float: right;
        font-weight: normal;
    }

    table.report-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
        margin-bottom: 12px;
        page-break-inside: auto;
    }

    table.report-table thead {
        display: table-header-group;
    }

    table.report-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
    }

    table.report-table th,
    table.report-table td {
        border: 1px solid #000;
        padding: 3px 4px;
        font-size: 8pt;
        vertical-align: middle;
    }

    table.report-table th {
        background-color: #f3f4f6;
        font-weight: bold;
        text-align: center;
    }

    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .bg-gray { background-color: #f3f4f6; }

    .branch-header {
        background-color: #e5e7eb;
        font-weight: bold;
        padding: 4px 6px;
        border: 1px solid #000;
        margin-top: 8px;
        page-break-after: avoid;
    }

    .page-break {
        page-break-after: always;
    }

    .signatures-section {
        margin-top: 30px;
        page-break-inside: avoid;
        width: 100%;
    }

    .signatures-table {
        width: 100%;
        border-collapse: collapse;
        border: none;
    }

    .signatures-table td {
        border: none;
        text-align: center;
        vertical-align: top;
        width: 33.33%;
        padding: 0 15px;
    }

    .signature-gap {
        height: 50px;
    }

    .signature-line {
        border-top: 1px solid #000;
        margin-bottom: 4px;
    }

    .signature-label {
        font-weight: bold;
        font-size: 8.5pt;
    }

    .signature-dept {
        font-size: 7.5pt;
        color: #444;
    }

    @media print {
        .no-print {
            display: none !important;
        }
        body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    }
</style>
