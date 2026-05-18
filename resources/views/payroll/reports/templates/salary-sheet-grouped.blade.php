@php $heads = $payload['heads'] ?? []; @endphp
@forelse ($payload['sections'] ?? [] as $section)
    <p class="section-title">{{ $section['label'] }}</p>
    @include('payroll.reports.templates.salary-sheet', [
        'payload' => [
            'heads' => $heads,
            'rows' => $section['rows'] ?? [],
            'totals' => $section['totals'] ?? null,
        ],
    ])
@empty
    <p>No payslips found for the selected filters.</p>
@endforelse
