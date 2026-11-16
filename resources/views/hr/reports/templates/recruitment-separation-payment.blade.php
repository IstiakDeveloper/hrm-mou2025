@foreach($payload['sections'] ?? [] as $secKey => $sec)
    <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <div style="font-weight: bold; font-size: 10pt; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 2px;">
            {{ $sec['title'] }}
        </div>
        <table class="report-table">
            <thead>
                <tr>
                    <th class="text-left" style="width: 15%;">Month</th>
                    @foreach($sec['designations'] ?? [] as $desig)
                        <th>{{ $desig }}</th>
                    @endforeach
                    <th style="width: 10%;">Total</th>
                </tr>
            </thead>
            <tbody>
                @forelse($sec['rows'] ?? [] as $row)
                    @php $isSub = !empty($row['is_subtotal']); @endphp
                    <tr class="{{ $isSub ? 'font-bold bg-gray' : '' }}">
                        <td class="text-left">{{ $row['label'] }}</td>
                        @foreach($sec['designations'] ?? [] as $desig)
                            <td class="text-center">{{ $row['counts'][$desig] ?: ($isSub ? '0' : '-') }}</td>
                        @endforeach
                        <td class="text-center font-bold">{{ $row['total'] }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="{{ count($sec['designations'] ?? []) + 2 }}" class="text-center">No movement events in this period.</td>
                    </tr>
                @endforelse
            </tbody>
            @if (!empty($sec['totals']))
                <tfoot>
                    <tr class="font-bold bg-gray">
                        <td class="text-left">Grand Total</td>
                        @foreach($sec['designations'] ?? [] as $desig)
                            <td class="text-center">{{ $sec['totals']['counts'][$desig] ?? 0 }}</td>
                        @endforeach
                        <td class="text-center">{{ $sec['totals']['total'] ?? 0 }}</td>
                    </tr>
                </tfoot>
            @endif
        </table>
    </div>
@endforeach
