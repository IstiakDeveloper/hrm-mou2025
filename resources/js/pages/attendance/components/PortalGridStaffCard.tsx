import React from 'react';
import { EmployeeRow, Status } from './types';
import { portalEmployeeStatusTag } from './helpers';
import { Clock, MapPin, AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PortalGridStaffCard({
    row,
    column,
    compact = false,
}: {
    row: EmployeeRow;
    column: 'present' | 'movement' | 'absent' | 'leave';
    compact?: boolean;
}) {
    const statusTag = portalEmployeeStatusTag(row.status);
    const movement = row.movements?.[0];

    // Determine left border color and icons for SaaS feel
    let borderLeftColor = 'border-l-slate-200';
    if (column === 'present') {
        if (row.status === 'late') borderLeftColor = 'border-l-amber-500';
        else if (row.status === 'half_day') borderLeftColor = 'border-l-orange-500';
        else if (row.status === 'on_duty') borderLeftColor = 'border-l-teal-500';
        else borderLeftColor = 'border-l-emerald-500';
    } else if (column === 'movement') {
        borderLeftColor = 'border-l-indigo-500';
    } else if (column === 'absent') {
        borderLeftColor = 'border-l-rose-500';
    } else if (column === 'leave') {
        borderLeftColor = 'border-l-blue-500';
    }

    const initials = row.name
        ? row.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()
        : '??';

    if (compact) {
        return (
            <div className="border-b border-slate-100 px-2 py-1 last:border-0 hover:bg-slate-50/80">
                <p className="truncate font-bold text-[9px] leading-tight text-slate-800" title={row.name}>
                    {row.name}
                </p>
                <p className="truncate text-[8px] text-slate-500">
                    <span className="font-mono">{row.employee_id}</span>
                    {row.designation ? <span> · {row.designation}</span> : null}
                </p>
                {column === 'present' && (
                    <div className="mt-0.5 flex items-center gap-1 font-mono text-[8px] text-slate-600">
                        {statusTag && (
                            <span className="rounded bg-amber-100 px-1 py-px text-[7px] font-bold uppercase text-amber-800">
                                {statusTag}
                            </span>
                        )}
                        {row.check_in ? (
                            <span className="font-semibold text-emerald-700">IN {row.check_in}</span>
                        ) : (
                            <span className="text-slate-400">No IN</span>
                        )}
                        {row.check_out && <span className="text-slate-500">OUT {row.check_out}</span>}
                    </div>
                )}
                {column === 'movement' && movement && (
                    <p className="truncate text-[8px] text-indigo-700 font-semibold">
                        {movement.destination || 'On duty'}
                    </p>
                )}
                {column === 'absent' && (
                    <p className="text-[8px] font-semibold text-rose-600">Absent</p>
                )}
                {column === 'leave' && (
                    <p className="text-[8px] font-semibold text-blue-700">{row.leave_type || 'Leave'}</p>
                )}
            </div>
        );
    }

    return (
        <div className={cn(
            'bg-white rounded-xl border border-slate-200/60 p-2.5 shadow-xs hover:shadow-md transition-all duration-200 border-l-4 flex flex-col gap-1.5 relative group overflow-hidden mb-2 last:mb-0',
            borderLeftColor
        )}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                        'h-7 w-7 rounded-full border flex items-center justify-center text-[9px] font-extrabold shrink-0 select-none',
                        column === 'present' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' :
                        column === 'movement' ? 'bg-indigo-50/50 border-indigo-100 text-indigo-700' :
                        column === 'absent' ? 'bg-rose-50/50 border-rose-100 text-rose-700' :
                        'bg-blue-50/50 border-blue-100 text-blue-700'
                    )}>
                        {initials}
                    </div>
                    <div className="min-w-0 leading-tight">
                        <p className="text-xs font-bold text-slate-800 truncate" title={row.name}>
                            {row.name}
                        </p>
                        <p className="text-[9px] font-mono text-slate-400 tracking-wider">
                            {row.employee_id}
                        </p>
                    </div>
                </div>
                {row.designation && (
                    <span className="text-[8px] text-slate-400 max-w-[80px] truncate bg-slate-50 px-1.5 py-0.5 rounded font-medium" title={row.designation}>
                        {row.designation}
                    </span>
                )}
            </div>

            {row.department && (
                <div className="text-[9px] text-slate-500 font-medium border-t border-slate-50 pt-1 flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="truncate">{row.department}</span>
                </div>
            )}

            <div className="border-t border-slate-50/80 pt-1">
                {column === 'present' && (
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px]">
                        {statusTag && (
                            <span className={cn(
                                'rounded px-1 py-px text-[7.5px] font-bold uppercase tracking-wide',
                                row.status === 'late' ? 'bg-amber-100 text-amber-800' :
                                row.status === 'half_day' ? 'bg-orange-100 text-orange-800' :
                                'bg-teal-100 text-teal-800'
                            )}>
                                {statusTag}
                            </span>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-600">
                            {row.check_in ? (
                                <span className="inline-flex items-center gap-0.5">
                                    <Clock className="h-3 w-3 text-emerald-500" />
                                    <span className="font-bold text-emerald-700">IN {row.check_in}</span>
                                </span>
                            ) : (
                                <span className="text-slate-400">No IN</span>
                            )}
                            {row.check_out ? (
                                <span className="inline-flex items-center gap-0.5">
                                    <span className="text-slate-400">OUT</span>
                                    <span className="font-semibold text-slate-700">{row.check_out}</span>
                                </span>
                            ) : row.check_in ? (
                                <span className="text-slate-400 font-medium italic">Active</span>
                            ) : null}
                        </div>
                    </div>
                )}

                {column === 'movement' && (
                    <div className="text-[9px] space-y-0.5">
                        {movement ? (
                            <>
                                <div className="flex items-center gap-1 text-indigo-700 font-bold">
                                    <MapPin className="h-3 w-3 shrink-0 text-indigo-500" />
                                    <span className="truncate" title={movement.destination}>
                                        {movement.destination || 'On duty'}
                                    </span>
                                    {movement.status === 'active' && (
                                        <span className="ml-auto relative flex h-2 w-2 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-[8.5px] text-slate-400 font-mono">
                                    <span>
                                        {movement.from_time ? `IN: ${movement.from_time}` : ''}
                                        {movement.actual_return_time || movement.to_time
                                            ? ` · RTN: ${movement.actual_return_time || movement.to_time}`
                                            : ' · Active'}
                                    </span>
                                    <span className={cn(
                                        'font-bold uppercase tracking-wider text-[8px]',
                                        movement.status === 'completed' ? 'text-emerald-650' : 'text-amber-600'
                                    )}>
                                        {movement.status}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <span className="text-slate-400">Movement details</span>
                        )}
                    </div>
                )}

                {column === 'absent' && (
                    <div className="flex items-center justify-between text-[9px]">
                        <span className="font-semibold text-rose-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-rose-500 shrink-0" />
                            Unexcused Absence
                        </span>
                        <span className="text-[7.5px] bg-rose-50 text-rose-700 border border-rose-100 px-1 py-0.5 rounded uppercase font-bold tracking-wider">
                            No Punch
                        </span>
                    </div>
                )}

                {column === 'leave' && (
                    <div className="flex items-center justify-between text-[9px]">
                        <span className="font-semibold text-blue-700 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-blue-500 shrink-0" />
                            Approved Leave
                        </span>
                        <span className="text-[8.5px] font-bold bg-blue-50 text-blue-800 border border-blue-100 px-1.5 py-0.5 rounded">
                            {row.leave_type || 'Leave'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
export default PortalGridStaffCard;
