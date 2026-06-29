@include('payroll.reports.partials.header', [
    'companyName' => $companyName ?? '',
    'companyAddress' => $companyAddress ?? '',
    'title' => $title ?? '',
])

@if (($sectionLabel ?? '') !== '' || ($salaryMonth ?? '') !== '')
    <table class="section-title-table" width="100%">
        <tr>
            <td class="section-title">
                @if (($sectionLabel ?? '') !== '')
                    {{ $sectionLabel }}
                @endif
            </td>
            <td class="section-meta">
                @if (($salaryMonth ?? '') !== '')
                    Salary Month: {{ $salaryMonth }}
                @endif
            </td>
        </tr>
    </table>
@endif
