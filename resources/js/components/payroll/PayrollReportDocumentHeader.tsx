import React from 'react';

type Props = {
    title: string;
    companyName?: string;
    companyAddress?: string;
};

export function PayrollReportDocumentHeader({ title, companyName, companyAddress }: Props) {
    return (
        <div className="relative mb-3 min-h-[52px] border-b border-black px-16 pb-1 pt-1.5 text-black print:mb-2">
            <img
                src="/logo.png"
                alt="Organization logo"
                className="absolute left-0 top-1.5 h-11 w-auto max-w-14 object-contain object-left"
            />
            <div className="w-full text-center leading-snug">
                {companyName && <p className="text-base font-bold text-slate-900">{companyName}</p>}
                {companyAddress && <p className="text-[10px] text-slate-800">{companyAddress}</p>}
                <p className="mt-0.5 text-[11px] font-bold text-slate-900">{title}</p>
            </div>
        </div>
    );
}
