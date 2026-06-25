@include('payroll.reports.templates.salary-sheet-grouped', [
    'payload' => array_merge($payload, [
        'sections' => [[
            'label' => '',
            'rows' => $payload['rows'] ?? [],
            'totals' => $payload['totals'] ?? null,
        ]],
    ]),
    'pdfMode' => $pdfMode ?? false,
])
