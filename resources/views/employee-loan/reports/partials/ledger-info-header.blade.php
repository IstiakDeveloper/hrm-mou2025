@php
    $header = $header ?? [];
    $groups = [
        $header['employee'] ?? [],
        $header['policy'] ?? [],
        $header['financial'] ?? [],
    ];
@endphp

<table class="loan-ledger-info">
    <tbody>
        <tr>
            @foreach ($groups as $rows)
                <td>
                    <table class="data loan-ledger-kv">
                        <tbody>
                            @foreach ($rows as $row)
                                <tr>
                                    <th>{{ $row['label'] ?? '' }}</th>
                                    <td>{{ $row['value'] ?? '—' }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </td>
            @endforeach
        </tr>
    </tbody>
</table>
