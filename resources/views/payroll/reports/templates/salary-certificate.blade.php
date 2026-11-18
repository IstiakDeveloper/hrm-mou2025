@php
    $employee = $payload['employee'] ?? null;
    $fmt = static fn ($amount) => (float) $amount === 0.0 ? '-' : taka_fmt($amount, 2);
@endphp
@if (!empty($payload['meta']['message']) || !$employee)
    <p>{{ $payload['meta']['message'] ?? 'Select an employee and salary month.' }}</p>
@else
    <table class="reference"><tr><td>Ref: {{ $payload['reference'] }}</td><td class="right">Date: {{ $payload['issued_at'] }}</td></tr></table>
    <h1>LETTER OF INTRODUCTION</h1>
    <h2>Staff Information:</h2>
    <table class="staff"><tr>
        <td class="staff-column">
            <table class="staff-details">
                @foreach (["Name" => $employee['name'], "Father's Name" => $employee['fathers_name'], "Mother's Name" => $employee['mothers_name'], 'Village' => $employee['village'], 'Post Office' => $employee['post_office'], 'Thana' => $employee['upazila'], 'District' => $employee['district']] as $label => $value)
                    <tr><td class="label">{{ $label }}</td><td>: {{ $value ?: '-' }}</td></tr>
                @endforeach
            </table>
        </td>
        <td class="staff-column">
            <table class="staff-details service-details">
                @foreach (['Staff ID' => $employee['pin'], 'Designation' => $employee['designation'], 'Joining Date' => $employee['joining_date'], 'Confirmation Date' => $employee['confirmation_date'], 'Service Length from Joining' => $employee['service_from_joining'], 'Service Length from Confirmation' => $employee['service_from_confirmation']] as $label => $value)
                    <tr><td class="label">{{ $label }}:</td><td class="right">{{ $value ?: '-' }}</td></tr>
                @endforeach
            </table>
        </td>
    </tr></table>
    <p class="body-text">
        This is to certify that the above-mentioned employee
        @if ($employee['is_current'])
            has been working at {{ $companyName }}, {{ $companyAddress }}, since joining and up to the date.
            {{ $employee['pronoun'] }} is a {{ $employee['employment_type'] }} employee of the organization.
        @else
            was employed at {{ $companyName }}, {{ $companyAddress }}, from {{ $employee['joining_date'] ?: '-' }} up to {{ $employee['service_end_date'] }}.
        @endif
        According to the organization's policy, the retirement age is {{ $payload['retirement_age'] }} years.
        {{ $employee['possessive'] }} monthly salary is as follows:
    </p>
    <table class="salary">
        <colgroup><col style="width:44%"><col style="width:30%"><col style="width:26%"></colgroup>
        <tbody>
            <tr class="bold"><td colspan="2" class="right">Gross Salary for the Month of {{ $payload['period'] }}</td><td class="right">BDT {{ taka_fmt($payload['gross'], 2) }}</td></tr>
            <tr><td>Basic Salary</td><td class="right">{{ $fmt($payload['basic']) }}</td><td></td></tr>
            <tr class="bold"><td colspan="2">Less: Deduction</td><td class="right">{{ $fmt($payload['deduction']) }}</td></tr>
            @foreach ($payload['certificate_deductions'] as $line)
                <tr><td>{{ $line['name'] }}</td><td class="right">{{ $fmt($line['amount']) }}</td><td></td></tr>
            @endforeach
            <tr class="bold"><td colspan="2" class="right">Take-Home Salary for the Month of {{ $payload['period'] }}</td><td class="right">BDT {{ taka_fmt($payload['net'], 2) }}</td></tr>
        </tbody>
    </table>
    <div class="in-words">In Words: {{ $payload['in_words'] }}</div>
    <p class="body-text">To the best of my knowledge, the above information is correct, and this letter is issued at the specific request of the employee without accepting any liability on behalf of this letter or any part of this letter.</p>
    <p>I wish {{ $employee['object_pronoun'] }} every success in life.</p>
    <div class="signature">
        <strong>{{ $payload['signatory']['name'] }}</strong><br>
        {{ $payload['signatory']['designation'] }}<br>
        {{ $payload['signatory']['organization'] }}
    </div>
@endif
