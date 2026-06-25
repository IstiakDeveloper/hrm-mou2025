import React from 'react';

type Props = {
    title: string;
    companyName?: string;
    companyAddress?: string;
};

export function PayrollReportDocumentHeader({ title, companyName, companyAddress }: Props) {
    return (
        <div className="mb-3 flex min-h-[52px] items-center justify-center px-2 pb-1 text-black print:mb-2">
            <div className="inline-flex max-w-full items-center gap-2.5">
                <img
                    src="/logo.png"
                    alt="Organization logo"
                    className="h-11 w-auto max-w-14 shrink-0 object-contain"
                />
                <div className="text-center leading-tight">
                    {companyName && <p className="text-base font-bold text-slate-900">{companyName}</p>}
                    {companyAddress && <p className="text-[10px] text-slate-800">{companyAddress}</p>}
                    <p className="mt-0.5 text-[11px] font-bold text-slate-900">{title}</p>
                </div>
            </div>
        </div>
    );
}
