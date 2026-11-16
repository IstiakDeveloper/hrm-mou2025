import React from 'react';
import { BranchSummary, PortalStats } from './types';
import PortalStatsBar from './PortalStatsBar';
import PortalGridBoard from './PortalGridBoard';
import { format } from 'date-fns';

export function PortalPrintReport({
    branchName,
    readableDate,
    branch,
    stats,
}: {
    branchName: string;
    readableDate: string;
    branch: BranchSummary;
    stats: PortalStats;
}) {
    return (
        <div className="portal-print-report">
            <div className="mb-2 flex items-end justify-between border-b-2 border-slate-900 pb-1.5">
                <div>
                    <h1 className="text-sm font-black uppercase tracking-tight text-slate-900">{branchName}</h1>
                    <p className="text-[10px] font-medium text-slate-600">Attendance &amp; Movement — {readableDate}</p>
                </div>
                <p className="text-[9px] text-slate-500">Printed: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            </div>

            <div className="mb-2">
                <PortalStatsBar stats={stats} compact />
            </div>

            <PortalGridBoard branch={branch} stats={stats} searchQuery="" variant="print" />

            <div className="mt-2 flex items-center justify-between border-t border-slate-300 pt-1 text-[8px] text-slate-400">
                <span>Branch attendance report</span>
                <span>Confidential — internal use only</span>
            </div>
        </div>
    );
}
export default PortalPrintReport;
