@include('payroll.reports.partials.header', [
    'companyName' => $companyName ?? '',
    'companyAddress' => $companyAddress ?? '',
    'title' => $title ?? '',
])

@if (($periodLabel ?? '') !== '')
    <table class="section-title-table" width="100%">
        <tr>
            <td class="section-title"></td>
            <td class="section-meta">{{ $periodLabel }}</td>
        </tr>
    </table>
@endif
