type HeaderRow = { label: string; value: string };

export type LoanLedgerInfoHeaderData = {
    employee: HeaderRow[];
    policy: HeaderRow[];
    financial: HeaderRow[];
};

function LedgerHeaderTable({ rows }: { rows: HeaderRow[] }) {
    return (
        <table className="w-full border-collapse text-[11px]">
            <tbody>
                {rows.map((row) => (
                    <tr key={row.label} className="border border-zinc-300">
                        <td className="w-[44%] border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                            {row.label}
                        </td>
                        <td className="border border-zinc-300 bg-white px-2 py-0.5 text-zinc-900">{row.value || '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function LoanLedgerInfoHeader({ header }: { header?: LoanLedgerInfoHeaderData | null }) {
    if (!header) {
        return null;
    }

    return (
        <div className="grid gap-2 lg:grid-cols-3">
            <LedgerHeaderTable rows={header.employee ?? []} />
            <LedgerHeaderTable rows={header.policy ?? []} />
            <LedgerHeaderTable rows={header.financial ?? []} />
        </div>
    );
}
