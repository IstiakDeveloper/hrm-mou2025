import { Link, usePage } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    BarChart3,
    Calendar,
    CalendarDays,
    Clock,
    FileSpreadsheet,
    LayoutDashboard,
    MapPin,
    MonitorSmartphone,
    Users,
} from 'lucide-react';

export type SubNavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    exact?: boolean;
    badge?: string | number;
};

export const EMPLOYEE_ATTENDANCE_MOVEMENT_NAV_ITEMS: SubNavItem[] = [
    {
        title: 'Overview',
        href: '/sections/attendance-movement',
        icon: LayoutDashboard,
        exact: true,
    },
    {
        title: 'Daily Attendance',
        href: '/attendance?section=attendance-movement',
        icon: Users,
    },
    {
        title: 'Monthly View',
        href: '/attendance/monthly?section=attendance-movement',
        icon: CalendarDays,
    },
    {
        title: 'Movements Log',
        href: '/movements?section=attendance-movement',
        icon: MapPin,
    },
];

export const ATTENDANCE_MOVEMENT_NAV_ITEMS: SubNavItem[] = [
    {
        title: 'Dashboard',
        href: '/sections/attendance-movement',
        icon: LayoutDashboard,
        exact: true,
    },
    {
        title: 'Daily Attendance',
        href: '/attendance?section=attendance-movement',
        icon: Users,
    },
    {
        title: 'Monthly View',
        href: '/attendance/monthly?section=attendance-movement',
        icon: CalendarDays,
    },
    {
        title: 'Attendance Report',
        href: '/attendance/report?section=attendance-movement',
        icon: BarChart3,
    },
    {
        title: 'Sheet Report',
        href: '/attendance/sheet-report?section=attendance-movement',
        icon: FileSpreadsheet,
    },
    {
        title: 'Movements Log',
        href: '/movements?section=attendance-movement',
        icon: MapPin,
    },
    {
        title: 'Sync Devices',
        href: '/attendance/devices?section=attendance-movement',
        icon: MonitorSmartphone,
    },
];

interface SectionSubNavProps {
    items?: SubNavItem[];
    activeHref?: string;
}

export function SectionSubNav({ items = ATTENDANCE_MOVEMENT_NAV_ITEMS }: SectionSubNavProps) {
    const { url } = usePage();

    const isItemActive = (item: SubNavItem) => {
        const currentUrl = url;

        // Strip section query param or check relative path matching
        const cleanCurrentPath = currentUrl.split('?')[0];
        const cleanTargetPath = item.href.split('?')[0];

        if (item.exact) {
            return cleanCurrentPath === cleanTargetPath;
        }

        return cleanCurrentPath === cleanTargetPath;
    };

    return (
        <nav
            aria-label="Section navigation"
            className="group relative flex w-full overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 p-1 shadow-xs backdrop-blur-sm"
        >
            <style>{`
                .subnav-scroll {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .subnav-scroll::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <div className="subnav-scroll flex w-full items-center gap-1 overflow-x-auto scroll-smooth py-0.5 px-0.5">
                {items.map((item) => {
                    const active = isItemActive(item);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 ${
                                active
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-950'
                            }`}
                        >
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-white' : 'text-zinc-500'}`} />
                            <span className="whitespace-nowrap leading-none">{item.title}</span>
                            {item.badge !== undefined && (
                                <span
                                    className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold leading-tight ${
                                        active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
                                    }`}
                                >
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
