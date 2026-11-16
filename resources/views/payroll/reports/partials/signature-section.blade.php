@php
    $signatureBlocks = config('payroll_reports.signature_blocks', []);
@endphp
@if (! empty($signatureBlocks))
    <div class="payroll-signature-section">
        <table class="payroll-signature-table" width="100%">
            <tr>
                @foreach ($signatureBlocks as $block)
                    <td class="payroll-signature-cell">
                        <div class="payroll-signature-gap"></div>
                        <div class="payroll-signature-line"></div>
                        <div class="payroll-signature-label">{{ $block['label'] ?? '' }}</div>
                        <div class="payroll-signature-dept">{{ $block['department'] ?? '' }}</div>
                    </td>
                @endforeach
            </tr>
        </table>
    </div>
@endif
