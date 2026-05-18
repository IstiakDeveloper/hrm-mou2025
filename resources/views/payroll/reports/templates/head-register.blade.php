@if (!empty($payload['summary']))
    <p class="section-title">Summary by component</p>
    <table class="data mb-2">
        <thead>
            <tr>
                <th>Component</th>
                <th class="num">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($payload['summary'] as $item)
                <tr>
                    <td>{{ $item['head_name'] }}</td>
                    <td class="num">{{ number_format($item['total'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endif

<table class="data">
    <thead>
        <tr>
            <th>PIN</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Branch</th>
            <th>Period</th>
            <th>Component</th>
            <th class="num">Amount</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($payload['rows'] ?? [] as $row)
            <tr>
                <td>{{ $row['pin'] }}</td>
                <td>{{ $row['name'] }}</td>
                <td>{{ $row['designation'] }}</td>
                <td>{{ $row['branch'] }}</td>
                <td>{{ $row['period'] }}</td>
                <td>{{ $row['head_name'] }}</td>
                <td class="num">{{ number_format($row['amount'], 2) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="7" class="text-center">No register entries.</td>
            </tr>
        @endforelse
    </tbody>
</table>
