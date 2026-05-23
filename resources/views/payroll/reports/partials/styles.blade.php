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
        position: relative;
        min-height: 44px;
        margin-bottom: 10px;
        border-bottom: 1px solid #000;
        padding-bottom: 6px;
    }

    .report-header.has-logo {
        padding-left: 0;
        padding-right: 0;
    }

    .report-logo {
        position: absolute;
        left: 0;
        top: 50%;
        margin-top: -20px;
        height: 40px;
        width: 56px;
        object-fit: contain;
        object-position: left center;
    }

    .report-header-text {
        width: 100%;
        text-align: center;
        padding: 0 8px;
    }

    .report-header.has-logo .report-header-text {
        padding-left: 60px;
        padding-right: 60px;
    }

    .company-name {
        font-size: 11pt;
        font-weight: bold;
        text-transform: uppercase;
        line-height: 1.25;
        text-align: center;
    }

    .report-title {
        font-size: 10pt;
        font-weight: bold;
        margin-top: 2px;
        line-height: 1.25;
        text-align: center;
    }

    .report-meta {
        font-size: 8pt;
        margin-top: 2px;
        line-height: 1.3;
        text-align: center;
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
