import React from 'react';

type Props = {
    title: string;
    dateLabel: string;
    companyName?: string;
};

export function InventoryReportDocumentHeader({ title, dateLabel, companyName }: Props) {
    return (
        <div className="relative mb-2 border-b border-black pb-1.5 text-black print:mb-1.5">
            <img
                src="/logo.png"
                alt="Organization logo"
                className="absolute left-0 top-1/2 h-8 w-11 -translate-y-1/2 object-contain object-left print:h-7 print:w-10"
            />
            <div className="px-11 text-center leading-tight print:px-10">
                {companyName && (
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-900 print:text-[8px]">{companyName}</p>
                )}
                <p className="text-[9px] font-bold text-slate-900 print:text-[7.5px]">{title}</p>
            </div>
            <p className="mt-0.5 text-right text-[8px] text-slate-700 pr-0.5 print:text-[7px]">{dateLabel}</p>
        </div>
    );
}
