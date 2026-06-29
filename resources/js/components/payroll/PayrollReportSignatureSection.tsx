import React from 'react';

export type PayrollSignatureBlock = {
    label: string;
    department: string;
};

type Props = {
    blocks: PayrollSignatureBlock[];
    className?: string;
    /** Blank height above signature line (px). Default matches payroll print config. */
    signGapPx?: number;
};

export function PayrollReportSignatureSection({ blocks, className = '', signGapPx = 72 }: Props) {
    if (blocks.length === 0) {
        return null;
    }

    return (
        <div className={`grid grid-cols-3 gap-4 text-center text-black print:break-inside-avoid ${className}`.trim()}>
            {blocks.map((block) => (
                <div key={block.label} className="px-3">
                    <div style={{ height: signGapPx }} />
                    <div className="mx-auto w-[72%] max-w-[180px] border-b border-black" />
                    <p className="mt-1 text-[10px] font-bold leading-tight">{block.label}</p>
                    <p className="mt-0.5 text-[9px] leading-tight">{block.department}</p>
                </div>
            ))}
        </div>
    );
}
