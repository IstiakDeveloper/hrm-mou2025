import { fundInterest, fundMoney } from '@/lib/security-fund';
import { staffFundPath } from '@/lib/staff-fund-nav';

export const fieldClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
export const actionClass =
    'inline-flex items-center justify-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50';
export const secondaryClass =
    'inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50';

export function Errors({ errors }: { errors: Record<string, string> }) {
    if (!Object.keys(errors).length) return null;
    return (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {Object.entries(errors).map(([key, value]) => (
                <p key={key}>{value}</p>
            ))}
        </div>
    );
}

export function Summary({ values }: { values: Partial<Record<'principal' | 'posted_interest' | 'unposted_interest' | 'total', string | number>> }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
                [
                    ['principal', 'Principal outstanding'],
                    ['posted_interest', 'Posted interest unpaid'],
                    ['unposted_interest', 'Interest accrued, unposted'],
                    ['total', 'Total payable'],
                ] as const
            ).map(([key, title]) => (
                <div key={key} className="rounded-lg border border-emerald-100 bg-white p-4">
                    <p className="text-xs text-slate-500">{title}</p>
                    <p className="mt-1 text-xl font-semibold text-emerald-800">
                        ৳{key === 'posted_interest' || key === 'unposted_interest' ? fundInterest(values[key]) : fundMoney(values[key])}
                    </p>
                </div>
            ))}
        </div>
    );
}

export function Exports({ filters, canExport }: { filters: Record<string, string | number | undefined>; canExport: boolean }) {
    const query = new URLSearchParams(
        Object.entries(filters)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, String(value)]),
    );
    return (
        <div className="flex flex-wrap gap-2 print:hidden">
            {['print', ...(canExport ? ['pdf', 'excel'] : [])].map((format) => (
                <a
                    key={format}
                    className={secondaryClass}
                    href={staffFundPath(`/security-fund/reports/${format}?${query}`)}
                    target="_blank"
                    rel="noreferrer"
                >
                    {format === 'print' ? 'Print' : format.toUpperCase()}
                </a>
            ))}
        </div>
    );
}
