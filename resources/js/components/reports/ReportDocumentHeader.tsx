import React from 'react';

type Props = {
    title: string;
    periodLabel: string;
    companyName?: string;
    rowCount?: number;
};

export function ReportDocumentHeader({ title, periodLabel, companyName, rowCount }: Props) {
    return (
        <div className="relative mb-3 min-h-[44px] border-b border-black px-14 pb-2 pt-1.5 text-black print:mb-2">
            <img
                src="/logo.png"
                alt="Organization logo"
                className="absolute left-0 top-1.5 h-10 w-14 object-contain object-left"
            />
            <div className="w-full text-center leading-snug">
                {companyName && (
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-900">{companyName}</p>
                )}
                <p className="text-[11px] font-bold text-slate-900">{title}</p>
                <p className="mt-0.5 text-center text-[8px] text-slate-600">
                    Period: {periodLabel}
                    {rowCount != null && <> &nbsp;|&nbsp; Records: {rowCount}</>}
                </p>
            </div>
        </div>
    );
}
