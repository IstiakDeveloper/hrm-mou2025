@include('payroll.reports.templates.salary-sheet-grouped', [
    'payload' => array_merge($payload, [
        'sections' => [[
            'label' => '',
            'rows' => $payload['rows'] ?? [],
            'totals' => $payload['totals'] ?? null,
            'heads' => $payload['heads'] ?? [],
            'earning_heads' => $payload['earning_heads'] ?? [],
            'deduction_heads' => $payload['deduction_heads'] ?? [],
            'head_labels' => $payload['head_labels'] ?? [],
        ]],
    ]),
    'pdfMode' => $pdfMode ?? false,
    'companyName' => $companyName ?? '',
    'companyAddress' => $companyAddress ?? '',
    'title' => $title ?? '',
])
