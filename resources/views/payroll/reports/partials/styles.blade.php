@php
    $topMargin = (float) (config('payroll_reports.print.margin_top_mm') ?? 4);
    $bottomMargin = (float) (config('payroll_reports.print.margin_bottom_mm') ?? 4);
    $sideMargin = (float) (config('payroll_reports.print.margin_side_mm') ?? 3);
    $sideExtraPx = (int) (config('payroll_reports.print.margin_side_extra_px') ?? 10);
    $signatureBottomPx = (int) (config('payroll_reports.print.signature_bottom_offset_px') ?? 100);
    $signatureGapPx = (int) (config('payroll_reports.print.signature_gap_px') ?? 72);
    $horizontalMargin = "calc({$sideMargin}mm + {$sideExtraPx}px)";
@endphp
<style>
    @page {
        size: A4 landscape;
        margin: {{ $topMargin }}mm {{ $horizontalMargin }} {{ $bottomMargin }}mm;
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
        width: 100%;
        max-width: 100%;
    }

    .payroll-report-header {
        margin-bottom: 10px;
        padding: 0 8px 2px;
        text-align: center;
    }

    .payroll-report-header-inner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        max-width: 100%;
        vertical-align: middle;
    }

    .payroll-report-header-text {
        text-align: center;
        line-height: 1.3;
    }

    .payroll-company-name {
        font-size: 15pt;
        font-weight: bold;
        line-height: 1.25;
        text-align: center;
    }

    .payroll-company-address {
        font-size: 9pt;
        margin-top: 1px;
        line-height: 1.25;
        text-align: center;
    }

    .payroll-report-title {
        font-size: 10pt;
        font-weight: bold;
        margin-top: 3px;
        line-height: 1.25;
        text-align: center;
    }

    .payroll-report-logo {
        height: 44px;
        width: auto;
        max-width: 56px;
        flex-shrink: 0;
        object-fit: contain;
        object-position: center;
        display: block;
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
        padding: 2px 3px;
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
        margin: 0;
        font-size: 9pt;
        text-align: left;
    }

    .section-title-table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0 4px;
    }

    .section-title-table td {
        border: 0;
        padding: 0;
        vertical-align: baseline;
    }

    .section-title-row {
        display: table;
        width: 100%;
        margin: 12px 0 4px;
    }

    .section-meta {
        font-weight: bold;
        font-size: 9pt;
        white-space: nowrap;
        text-align: right;
    }

    .salary-sheet-page {
        page-break-inside: avoid;
    }

    .salary-sheet-page .payroll-report-header {
        margin-bottom: 6px;
        padding-bottom: 0;
    }

    .salary-sheet-page .section-title-table {
        margin-top: 0;
        margin-bottom: 4px;
    }

    table.salary-sheet-table {
        table-layout: fixed;
        width: auto;
        max-width: 100%;
        page-break-inside: avoid;
        font-size: 8pt;
    }

    table.salary-sheet-table.salary-sheet-table-fill {
        width: 100%;
    }

    .branch-section-break {
        page-break-before: always;
    }

    .salary-sheet-page-break {
        page-break-after: always;
    }

    table.salary-sheet-table.salary-sheet-page-break {
        page-break-after: always;
    }

    table.salary-sheet-table thead {
        display: table-header-group;
    }

    table.salary-sheet-table tr.data-row {
        page-break-inside: avoid;
        page-break-after: auto;
    }

    table.salary-sheet-table tr.totals-row {
        page-break-inside: avoid;
        page-break-before: avoid;
    }

    table.salary-sheet-table th,
    table.salary-sheet-table td {
        vertical-align: middle;
        padding: 3px 3px;
    }

    table.salary-sheet-table td {
        overflow: visible;
    }

    table.salary-sheet-table th {
        text-align: center;
        white-space: normal;
        word-break: normal;
        overflow-wrap: normal;
        hyphens: none;
        overflow: visible;
        line-height: 1.1;
        font-size: 7.5pt;
    }

    table.salary-sheet-table td.col-amount,
    table.salary-sheet-table td.col-serial,
    table.salary-sheet-table th.col-serial {
        white-space: nowrap;
        text-align: center;
    }

    table.salary-sheet-table th.col-serial,
    table.salary-sheet-table td.col-serial {
        min-width: 4ch;
    }

    table.salary-sheet-table td.col-amount {
        font-variant-numeric: tabular-nums;
        font-size: 7.5pt;
    }

    table.salary-sheet-table tr.totals-row td.col-amount {
        font-weight: bold;
        letter-spacing: 0;
    }

    table.salary-sheet-table td.cell-name,
    table.salary-sheet-table td.cell-text {
        white-space: nowrap;
        text-align: left;
        overflow: visible;
        font-size: 7.5pt;
    }

    table.salary-sheet-table th.cell-name {
        text-align: center;
    }

    table.salary-sheet-table td.num,
    table.salary-sheet-table th.num {
        text-align: center;
    }

    table.salary-sheet-table th.component-head {
        font-size: 6.5pt;
        line-height: 1.1;
        word-break: normal;
        overflow-wrap: normal;
        hyphens: none;
        padding: 2px 2px;
    }

    table.salary-sheet-table tr.category-head-row th {
        text-align: center;
        font-size: 8pt;
        border-bottom: 1px solid #000;
        vertical-align: middle;
        padding: 4px 3px;
    }

    table.data tr.category-head-row th {
        text-align: center;
        font-size: 8pt;
        border-bottom: 1px solid #000;
        vertical-align: middle;
        padding: 5px 4px;
    }

    .totals-row td {
        font-weight: bold;
    }

    table.data.loan-statement-employee tr.statement-header th {
        background: #3d3d3d;
        color: #fbbf24;
        text-align: center;
        font-weight: 600;
        vertical-align: middle;
    }

    table.salary-sheet-table tr.totals-row td:first-child {
        text-align: right;
    }

    .salary-sheet-footer {
        margin-top: 4px;
        page-break-inside: avoid;
    }

    .salary-sheet-in-words {
        font-size: 7.5pt;
        font-weight: bold;
        line-height: 1.2;
        padding: 0 4px 2px;
        page-break-inside: avoid;
        page-break-after: avoid;
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

    .salary-sheet-page-final {
        page-break-inside: avoid;
        page-break-after: auto;
    }

    .payroll-signature-section {
        margin-top: 16px;
        margin-bottom: {{ $signatureBottomPx }}px;
        padding-top: 0;
        page-break-inside: avoid;
    }

    .payroll-signature-table {
        width: 100%;
        border-collapse: collapse;
        border: 0;
    }

    .payroll-signature-table td {
        border: 0;
        width: 33.33%;
        vertical-align: top;
        text-align: center;
        padding: 0 10px;
    }

    .payroll-signature-gap {
        height: {{ $signatureGapPx }}px;
    }

    .payroll-signature-label {
        font-size: 9pt;
        font-weight: bold;
        line-height: 1.25;
        margin-top: 5px;
    }

    .payroll-signature-line {
        border-bottom: 1px solid #000;
        width: 72%;
        max-width: 180px;
        height: 0;
        margin: 0 auto;
    }

    .payroll-signature-dept {
        font-size: 8.5pt;
        line-height: 1.25;
        margin-top: 2px;
    }

    body.pdf-export .salary-sheet-page-final {
        page-break-inside: avoid;
    }

    body.pdf-export .payroll-signature-section {
        margin-top: 16px;
        margin-bottom: {{ $signatureBottomPx }}px;
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

    body.report-landscape @page {
        size: A4 landscape;
        margin: {{ $topMargin }}mm {{ $horizontalMargin }} {{ $bottomMargin }}mm;
    }

    body.report-landscape table.data {
        font-size: 7.5pt;
    }

    body.report-landscape table.data th.component-head {
        font-size: 7pt;
        line-height: 1.2;
        white-space: normal;
        word-break: normal;
        overflow-wrap: normal;
        hyphens: none;
        text-align: center;
        vertical-align: middle;
    }

    body.report-landscape table.salary-sheet-table {
        font-size: 7pt;
    }

    body.report-landscape table.salary-sheet-table th,
    body.report-landscape table.salary-sheet-table td {
        padding: 2px 2px;
        font-size: 7pt;
    }

    body.report-landscape table.salary-sheet-table th.component-head {
        font-size: 6pt;
        line-height: 1.1;
        padding: 2px 1.5px;
    }

    body.report-landscape table.salary-sheet-table tr.category-head-row th {
        font-size: 7.5pt;
        padding: 3px 2px;
    }

    body.report-landscape table.salary-sheet-table th.num,
    body.report-landscape table.salary-sheet-table td.num {
        text-align: center;
    }

    body.pdf-export table.salary-sheet-table {
        font-size: 7pt;
    }

    body.pdf-export table.salary-sheet-table th,
    body.pdf-export table.salary-sheet-table td {
        padding: 2px 2px;
        font-size: 7pt;
    }

    body.pdf-export table.salary-sheet-table th.component-head {
        font-size: 6pt;
    }

    body.pdf-export table.salary-sheet-table.salary-sheet-table-fill {
        width: 100%;
        max-width: 100%;
    }

    body.pdf-export table.salary-sheet-table thead {
        display: table-row-group;
    }

    body.pdf-export table.salary-sheet-table th,
    body.pdf-export table.salary-sheet-table td {
        overflow: visible;
    }

    body.pdf-export .salary-sheet-page,
    body.pdf-export table.salary-sheet-table {
        page-break-inside: auto;
    }

    body.pdf-export .salary-sheet-page-break {
        page-break-after: always;
    }
</style>
