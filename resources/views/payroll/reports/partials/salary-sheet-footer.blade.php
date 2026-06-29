@php
    use App\Support\AmountInWords;
@endphp
<div class="salary-sheet-footer">
    @if (! empty($showInWords) && isset($net))
        <div class="salary-sheet-in-words">
            In Words: {{ AmountInWords::taka($net) }}
        </div>
    @endif
    @include('payroll.reports.partials.signature-section')
</div>
