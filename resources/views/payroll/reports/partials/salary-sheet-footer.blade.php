@php
    use App\Support\AmountInWords;
@endphp
@if (! empty($showInWords) && isset($net))
    <div class="salary-sheet-in-words">
        In Words: {{ AmountInWords::taka($net) }}
    </div>
@endif
<div class="salary-sheet-footer">
    @include('payroll.reports.partials.signature-section')
</div>
