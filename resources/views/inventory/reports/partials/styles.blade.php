@include('payroll.reports.partials.styles')

<style>
    body {
        font-size: 7pt;
        line-height: 1.25;
    }

    .company-name {
        font-size: 8.5pt;
    }

    .report-title {
        font-size: 7.5pt;
    }

    .inventory-report-header {
        min-height: 38px;
        margin-bottom: 6px;
        padding-bottom: 4px;
    }

    .inventory-report-header .report-logo {
        height: 32px;
        width: 48px;
        margin-top: -16px;
    }

    .inventory-report-header.has-logo .report-header-text {
        padding-left: 52px;
        padding-right: 52px;
    }

    .report-date-label {
        display: block;
        width: 100%;
        text-align: right;
        font-size: 7pt;
        margin-top: 2px;
        padding-right: 2px;
    }

    table.data {
        margin-top: 4px;
    }

    table.data th,
    table.data td {
        padding: 2px 3px;
        font-size: 6.5pt;
        line-height: 1.2;
    }

    .section-title {
        font-size: 7pt;
        margin: 6px 0 2px;
    }

    .split-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 4px;
    }

    .split-table-wrap .data {
        margin-top: 2px;
    }

    @media print {
        body {
            font-size: 7pt;
        }

        table.data th,
        table.data td {
            font-size: 6.5pt;
            padding: 1px 2px;
        }

        .split-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
        }

        .no-print-hint {
            display: none !important;
        }
    }
</style>
