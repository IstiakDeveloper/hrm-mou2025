@php
    $signatureBlocks = config('hr_reports.signature_blocks', [
        ['label' => 'Prepared By', 'department' => 'HR department'],
        ['label' => 'Verified By', 'department' => 'F & A Department'],
        ['label' => 'Approved By', 'department' => 'Executive Director'],
    ]);
@endphp
@if (!empty($signatureBlocks))
    <div class="signatures-section">
        <table class="signatures-table">
            <tr>
                @foreach ($signatureBlocks as $block)
                    <td>
                        <div class="signature-gap"></div>
                        <div class="signature-line"></div>
                        <div class="signature-label">{{ $block['label'] ?? '' }}</div>
                        <div class="signature-dept">{{ $block['department'] ?? '' }}</div>
                    </td>
                @endforeach
            </tr>
        </table>
    </div>
@endif
