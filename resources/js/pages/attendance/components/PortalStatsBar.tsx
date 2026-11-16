import React from 'react';
import { PortalStats } from './types';
import { PORTAL_GRID_COLUMNS } from './helpers';
import { Users, UserCheck, MapPin, UserX, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PortalStatsBar({ stats, compact = false }: { stats: PortalStats; compact?: boolean }) {
    if (compact) {
        return (
            <div className="grid grid-cols-5 gap-1">
                {PORTAL_GRID_COLUMNS.map((col) => {
                    const value =
                        col.key === 'present'
                            ? stats.presentOnly
                            : col.key === 'movement'
                              ? stats.movementCount
                              : col.key === 'absent'
                                ? stats.absent
                                : stats.leave;
                    return (
                        <div
                            key={col.key}
                            className={cn('rounded-lg border text-center print-color-exact px-1.5 py-1 bg-slate-50 border-slate-200')}
                        >
                            <p className="font-bold text-slate-700 text-[8px] leading-tight">{col.label}</p>
                            <p className="font-black tabular-nums leading-tight text-slate-900 text-base">{value}</p>
                        </div>
                    );
                })}
                <div className="rounded-lg border border-slate-200 bg-slate-50 text-center print-color-exact px-1.5 py-1">
                    <p className="font-bold text-slate-700 text-[8px] leading-tight">Total</p>
                    <p className="font-black tabular-nums leading-tight text-slate-900 text-base">{stats.workingTotal}</p>
                </div>
            </div>
        );
    }

    const cards = [
        {
            key: 'total',
            label: 'Scheduled Staff',
            value: stats.workingTotal,
            icon: <Users className="h-4.5 w-4.5" />,
            bg: 'from-slate-50 to-white border-slate-200/70',
            iconBg: 'bg-slate-100 text-slate-600',
            valueColor: 'text-slate-900',
            desc: 'attendance scheduled'
        },
        {
            key: 'present',
            label: 'Present (Checked In)',
            value: stats.presentOnly,
            icon: <UserCheck className="h-4.5 w-4.5" />,
            bg: 'from-emerald-50/40 to-white border-emerald-100',
            iconBg: 'bg-emerald-100/60 text-emerald-600',
            valueColor: 'text-emerald-700',
            desc: 'checked in today'
        },
        {
            key: 'movement',
            label: 'On Duty / Movement',
            value: stats.movementCount,
            icon: <MapPin className="h-4.5 w-4.5" />,
            bg: 'from-indigo-50/40 to-white border-indigo-100',
            iconBg: 'bg-indigo-100/60 text-indigo-650',
            valueColor: 'text-indigo-700',
            desc: 'where staff went on duty'
        },
        {
            key: 'absent',
            label: 'Unexcused Absences',
            value: stats.absent,
            icon: <UserX className="h-4.5 w-4.5" />,
            bg: stats.absent > 0 ? 'from-rose-50/40 to-white border-rose-100' : 'from-slate-50/20 to-white border-slate-200/50',
            iconBg: stats.absent > 0 ? 'bg-rose-100/60 text-rose-600' : 'bg-slate-100 text-slate-400',
            valueColor: stats.absent > 0 ? 'text-rose-600' : 'text-slate-905',
            desc: 'unexcused absences'
        },
        {
            key: 'leave',
            label: 'Approved Leaves',
            value: stats.leave,
            icon: <CalendarDays className="h-4.5 w-4.5" />,
            bg: 'from-blue-50/40 to-white border-blue-100',
            iconBg: 'bg-blue-100/60 text-blue-600',
            valueColor: 'text-blue-700',
            desc: 'excused leave today'
        }
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
            {cards.map((c) => (
                <div
                    key={c.key}
                    className={cn(
                        'relative bg-gradient-to-br border p-3 rounded-2xl shadow-xs flex items-center justify-between group hover:shadow-sm transition-all duration-200 overflow-hidden',
                        c.bg
                    )}
                >
                    <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block truncate">
                            {c.label}
                        </span>
                        <div className={cn('text-xl md:text-2xl font-black tracking-tight mt-1 leading-none', c.valueColor)}>
                            {c.value}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium truncate">
                            {c.desc}
                        </p>
                    </div>
                    <div className={cn('p-2 rounded-xl transition-all duration-300 group-hover:scale-105 shrink-0', c.iconBg)}>
                        {c.icon}
                    </div>
                </div>
            ))}
        </div>
    );
}
export default PortalStatsBar;
