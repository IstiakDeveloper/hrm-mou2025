@include('payroll.reports.partials.header', [
    'companyName' => $companyName ?? '',
    'companyAddress' => $companyAddress ?? '',
    'title' => $title ?? '',
    'reportMonth' => !empty($issueDate) ? ($salaryMonth ?? '') : '',
    'reportIssueDate' => $issueDate ?? '',
])

@if (($sectionLabel ?? '') !== '' || (empty($issueDate) && ($salaryMonth ?? '') !== ''))
    <table class="section-title-table" width="100%">
        <tr>
            <td class="section-title">
                @if (($sectionLabel ?? '') !== '')
                    {{ $sectionLabel }}
                @endif
            </td>
            <td class="section-meta">
                @if (empty($issueDate) && ($salaryMonth ?? '') !== '')
                    Salary Month: {{ $salaryMonth }}
                @endif
            </td>
        </tr>
    </table>
@endif
