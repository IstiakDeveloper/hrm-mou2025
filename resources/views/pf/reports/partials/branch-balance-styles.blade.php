@php
    $topMargin = (float) (config('payroll_reports.print.margin_top_mm') ?? 4);
    $bottomMargin = (float) (config('payroll_reports.print.margin_bottom_mm') ?? 4);
    $sideMargin = (float) (config('payroll_reports.print.margin_side_mm') ?? 3);
    $sideExtraPx = (int) (config('payroll_reports.print.margin_side_extra_px') ?? 10);
    $horizontalMargin = "calc({$sideMargin}mm + {$sideExtraPx}px)";
@endphp
<style>
    @page {
        size: A4 landscape;
        margin: {{ $topMargin }}mm {{ $horizontalMargin }} {{ $bottomMargin }}mm;
    }

    body.pf-branch-balance-export {
        font-size: 9pt;
        line-height: 1.3;
    }

    body.pf-branch-balance-export .payroll-report-header {
        margin-bottom: 6px;
        padding: 0 8px 2px;
    }

    body.pf-branch-balance-export .section-title-table {
        margin-top: 0;
        margin-bottom: 4px;
    }

    body.pf-branch-balance-export .section-meta {
        font-size: 9pt;
    }

    table.pf-branch-balance-table {
        table-layout: fixed;
        width: 100%;
        max-width: 100%;
        border-collapse: collapse;
        margin-top: 4px;
        font-size: 7.5pt;
        page-break-inside: auto;
    }

    table.pf-branch-balance-table thead {
        display: table-header-group;
    }

    table.pf-branch-balance-table th,
    table.pf-branch-balance-table td {
        border: 1px solid #000;
        padding: 3px 4px;
        vertical-align: middle;
        line-height: 1.15;
        overflow: visible;
    }

    table.pf-branch-balance-table th {
        font-weight: bold;
        text-align: center;
        background: #fff;
    }

    table.pf-branch-balance-table tr.category-head-row th {
        font-size: 8pt;
        padding: 4px 4px;
    }

    table.pf-branch-balance-table th.component-head {
        font-size: 7pt;
        line-height: 1.15;
        white-space: normal;
    }

    table.pf-branch-balance-table td.col-serial,
    table.pf-branch-balance-table th.col-serial {
        text-align: center;
        white-space: nowrap;
    }

    table.pf-branch-balance-table td.col-amount,
    table.pf-branch-balance-table th.col-amount {
        text-align: center;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }

    table.pf-branch-balance-table td.cell-text {
        text-align: left;
        white-space: normal;
        word-break: normal;
        overflow-wrap: normal;
    }

    table.pf-branch-balance-table tr.data-row {
        page-break-inside: avoid;
        page-break-after: auto;
    }

    table.pf-branch-balance-table tr.totals-row {
        page-break-inside: avoid;
        page-break-before: avoid;
        font-weight: bold;
    }

    body.pdf-export.pf-branch-balance-export table.pf-branch-balance-table {
        font-size: 8pt;
        page-break-inside: auto;
    }

    body.pdf-export.pf-branch-balance-export table.pf-branch-balance-table tr.category-head-row th {
        font-size: 8.5pt;
    }

    body.pdf-export.pf-branch-balance-export table.pf-branch-balance-table th.component-head {
        font-size: 7.5pt;
    }

    body.pdf-export.pf-branch-balance-export table.pf-branch-balance-table th,
    body.pdf-export.pf-branch-balance-export table.pf-branch-balance-table td {
        padding: 4px 4px;
    }

    body.pdf-export.pf-branch-balance-export table.pf-branch-balance-table thead {
        display: table-header-group;
    }
</style>
