<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Salary Certificate - Letter of Introduction</title>
    <style>
        @page { size: A4 portrait; margin: 1.9in 1in 0.5in; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #000; font: 10pt 'Times New Roman', 'DejaVu Serif', serif; line-height: 1.25; }
        table { width: 100%; border-collapse: collapse; }
        .reference td { vertical-align: top; }
        .right { text-align: right; }
        h1 { font-size: 16pt; text-align: center; margin: 18px 0 22px; }
        h2 { font-size: 10pt; text-decoration: underline; margin: 0 0 4px; }
        .staff { table-layout: fixed; margin-bottom: 12px; }
        .staff-column { width: 50%; vertical-align: top; }
        .staff-column:first-child { padding-right: 10px; }
        .staff-details { font-size: 9pt; }
        .staff-details td { padding: 1px 0; vertical-align: top; }
        .staff-details .label { width: 35%; }
        .service-details .label { width: 72%; }
        .service-details { font-size: 8.5pt; }
        p { margin: 0 0 10px; }
        .body-text { text-align: justify; }
        .salary { font-size: 9pt; table-layout: fixed; }
        .salary td { border: 1px solid #000; padding: 2px 5px; }
        .salary tr { page-break-inside: avoid; }
        .bold { font-weight: bold; }
        .in-words { font-size: 9pt; font-weight: bold; text-align: center; margin: 5px 0; }
        .signature { margin-top: 46px; page-break-inside: avoid; }
        .no-print { margin-bottom: 20px; }
        @media screen { body { width: 8.27in; min-height: 11.69in; margin: 0 auto; padding: 1.9in 1in 0.5in; background: #fff; } }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    @if (!empty($printMode))<div class="no-print"><button onclick="window.print()">Print certificate</button></div>@endif
    @include('payroll.reports.templates.salary-certificate')
</body>
</html>
