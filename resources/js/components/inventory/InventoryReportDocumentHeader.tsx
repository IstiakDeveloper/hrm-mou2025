import React from 'react';

type Props = {
    title: string;
    dateLabel: string;
    companyName?: string;
};

export function InventoryReportDocumentHeader({ title, dateLabel, companyName }: Props) {
    return (
        <div className="relative mb-2 border-b border-black px-11 pb-1.5 pt-1 text-black print:mb-1.5 print:px-10">
            <img
                src="/logo.png"
                alt="Organization logo"
                className="absolute left-0 top-1 h-8 w-11 object-contain object-left print:h-7 print:w-10"
            />
            <div className="text-center leading-snug">
                {companyName && (
                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-900 print:text-[8px]">{companyName}</p>
                )}
                <p className="text-[9px] font-bold text-slate-900 print:text-[7.5px]">{title}</p>
            </div>
            <p className="mt-0.5 text-right text-[8px] text-slate-700 pr-0.5 print:text-[7px]">{dateLabel}</p>
        </div>
    );
}
