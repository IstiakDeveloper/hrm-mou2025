<style>
    @page {
        size: A4;
        margin: 12mm 10mm;
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: 'DejaVu Sans', Arial, sans-serif;
        font-size: 9pt;
        color: #000;
        line-height: 1.35;
        margin: 0;
        padding: 0;
    }

    .report-wrap {
        max-width: 100%;
    }

    .report-header {
        text-align: center;
        margin-bottom: 14px;
        border-bottom: 1px solid #000;
        padding-bottom: 8px;
    }

    .company-name {
        font-size: 13pt;
        font-weight: bold;
        text-transform: uppercase;
    }

    .report-title {
        font-size: 11pt;
        font-weight: bold;
        margin-top: 4px;
    }

    .report-meta {
        font-size: 8pt;
        margin-top: 4px;
    }

    table.data {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
    }

    table.data th,
    table.data td {
        border: 1px solid #000;
        padding: 3px 4px;
        vertical-align: top;
    }

    table.data th {
        font-weight: bold;
        text-align: left;
        background: #fff;
    }

    table.data td.num,
    table.data th.num {
        text-align: right;
    }

    .section-title {
        font-weight: bold;
        margin: 12px 0 4px;
        font-size: 9pt;
    }

    .totals-row td {
        font-weight: bold;
    }

    .text-center {
        text-align: center;
    }

    .text-right {
        text-align: right;
    }

    .mb-2 {
        margin-bottom: 8px;
    }

    .cert-body {
        margin-top: 16px;
        font-size: 10pt;
    }

    .cert-body p {
        margin: 0 0 10px;
        text-align: justify;
    }

    .signature {
        margin-top: 40px;
    }

    .no-print-hint {
        font-size: 8pt;
        margin-bottom: 10px;
        text-align: center;
    }

    @media print {
        .no-print {
            display: none !important;
        }
    }
</style>
