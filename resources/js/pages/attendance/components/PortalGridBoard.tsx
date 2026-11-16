import React from 'react';
import { BranchSummary, PortalStats } from './types';
import { PORTAL_GRID_COLUMNS, portalColumnEmployees, filterStaffList } from './helpers';
import PortalGridStaffCard from './PortalGridStaffCard';
import { cn } from '@/lib/utils';

export function PortalGridBoard({
    branch,
    stats,
    searchQuery,
    variant = 'screen',
}: {
    branch: BranchSummary;
    stats: PortalStats;
    searchQuery: string;
    variant?: 'screen' | 'print';
}) {
    const isPrint = variant === 'print';

    // Get color themes for columns
    const getColumnColors = (key: 'present' | 'movement' | 'absent' | 'leave') => {
        return {
            present: {
                bg: 'bg-emerald-50/20 border-emerald-100',
                accent: 'bg-emerald-500',
                text: 'text-emerald-800',
                badge: 'bg-emerald-650 text-white',
                subtext: 'checked in today'
            },
            movement: {
                bg: 'bg-indigo-50/20 border-indigo-100',
                accent: 'bg-indigo-500',
                text: 'text-indigo-850',
                badge: 'bg-indigo-650 text-white',
                subtext: 'official duty / destination'
            },
            absent: {
                bg: 'bg-rose-50/20 border-rose-100',
                accent: 'bg-rose-500',
                text: 'text-rose-805',
                badge: 'bg-rose-650 text-white',
                subtext: 'unexcused absences'
            },
            leave: {
                bg: 'bg-blue-50/20 border-blue-100',
                accent: 'bg-blue-500',
                text: 'text-blue-800',
                badge: 'bg-blue-650 text-white',
                subtext: 'approved leaves'
            }
        }[key];
    };

    const getCount = (key: 'present' | 'movement' | 'absent' | 'leave') => {
        switch (key) {
            case 'present': return stats.presentOnly;
            case 'movement': return stats.movementCount;
            case 'absent': return stats.absent;
            case 'leave': return stats.leave;
        }
    };

    // Render single column helper
    const renderColumn = (column: typeof PORTAL_GRID_COLUMNS[0]) => {
        const allRows = portalColumnEmployees(branch, column.key);
        const rows = filterStaffList(allRows, searchQuery);
        const count = getCount(column.key);
        const colors = getColumnColors(column.key);

        return (
            <div
                key={column.key}
                className={cn(
                    'flex flex-col rounded-2xl border bg-slate-50/30 shadow-xs transition-all duration-350',
                    colors.bg,
                    isPrint ? 'break-inside-avoid' : 'h-auto overflow-visible lg:min-h-0 lg:h-full lg:overflow-hidden',
                )}
            >
                <div className={cn(
                    'flex shrink-0 items-center justify-between border-b border-inherit px-3.5 py-2.5 relative',
                    isPrint ? 'px-1.5 py-0.5' : ''
                )}>
                    <div className="flex items-center gap-2">
                        <span className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl', colors.accent)} />
                        <div>
                            <span className={cn('font-extrabold tracking-tight text-[13px]', isPrint ? 'text-[10px]' : '', colors.text)}>
                                {column.label}
                            </span>
                            {!isPrint && (
                                <p className="text-[9.5px] text-slate-400 font-medium">
                                    {colors.subtext}
                                </p>
                            )}
                        </div>
                    </div>
                    <span className={cn('rounded-full font-black text-center min-w-[20px] px-1.5 py-0.5 text-[9.5px] tabular-nums', colors.badge)}>
                        {count}
                    </span>
                </div>
                <div className={cn(
                    isPrint 
                        ? 'bg-white' 
                        : 'p-2.5 bg-slate-50/10 lg:overflow-y-auto lg:flex-1 lg:min-h-0 scrollbar-thin overflow-visible h-auto'
                )}>
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 select-none">
                            <span className="text-[10px] font-medium bg-slate-100/60 border border-slate-200/50 rounded-lg px-2.5 py-1">
                                No staff
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {rows.map((row) => (
                                <PortalGridStaffCard key={row.id} row={row} column={column.key} compact={isPrint} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (isPrint) {
        return (
            <div className="portal-print-grid grid grid-cols-4 gap-1.5">
                {PORTAL_GRID_COLUMNS.map((column) => renderColumn(column))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-4 lg:gap-4 lg:h-full lg:overflow-hidden p-0.5">
            {PORTAL_GRID_COLUMNS.map((column) => renderColumn(column))}
        </div>
    );
}
export default PortalGridBoard;
