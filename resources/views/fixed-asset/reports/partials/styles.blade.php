<style>
    @page { size: A4 {{ !empty($landscape) ? 'landscape' : 'portrait' }}; margin: 8mm 6mm; }
    * { box-sizing: border-box; }
    body {
        font-family: 'DejaVu Sans', Arial, sans-serif;
        font-size: 7pt;
        color: #000;
        margin: 0;
        line-height: 1.25;
    }
    .report-wrap { width: 100%; max-width: 100%; }

    /* Salary-sheet style: logo beside company block, centered as a group */
    .fa-report-header {
        margin-bottom: 6px;
        padding: 0 8px 2px;
        text-align: center;
    }
    .fa-report-header-inner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        max-width: 100%;
        vertical-align: middle;
    }
    .fa-report-logo {
        height: 40px;
        width: auto;
        max-width: 52px;
        flex-shrink: 0;
        object-fit: contain;
        object-position: center;
        display: block;
    }
    .fa-report-header-text {
        text-align: center;
        line-height: 1.25;
    }
    .fa-company-name {
        font-size: 12pt;
        font-weight: bold;
        line-height: 1.2;
        text-align: center;
    }
    .fa-company-address {
        font-size: 7.5pt;
        margin-top: 1px;
        line-height: 1.2;
        text-align: center;
    }
    .fa-report-title {
        font-size: 8.5pt;
        font-weight: bold;
        margin-top: 2px;
        line-height: 1.2;
        text-align: center;
    }

    /* Branch left · period/meta right (same as salary sheet section row) */
    .fa-section-title-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0 0 6px;
    }
    .fa-section-title-table td {
        border: 0;
        padding: 0;
        vertical-align: baseline;
    }
    .fa-section-title {
        font-weight: bold;
        font-size: 8pt;
        text-align: left;
        margin: 0;
    }
    .fa-section-meta {
        font-weight: bold;
        font-size: 7.5pt;
        white-space: nowrap;
        text-align: right;
    }

    table.data {
        width: 100%;
        border-collapse: collapse;
        margin-top: 4px;
        font-size: 6.5pt;
        table-layout: fixed;
    }
    table.data th,
    table.data td {
        border: 1px solid #000;
        padding: 2px 3px;
        vertical-align: top;
        word-wrap: break-word;
        overflow-wrap: anywhere;
    }
    table.data th {
        font-weight: bold;
        background: #fff;
        font-size: 6pt;
        line-height: 1.15;
    }
    table.data td { font-size: 6.5pt; line-height: 1.15; }
    .section-title { font-weight: bold; margin: 8px 0 3px; font-size: 7.5pt; }
    .subtotal-row td { font-weight: bold; background: #f5f5f5; }
    .grand-total td { font-weight: bold; }
    @media print {
        .no-print { display: none !important; }
        body { font-size: 7pt; }
        table.data { font-size: 6.5pt; }
    }
</style>
