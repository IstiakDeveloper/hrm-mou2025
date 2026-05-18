import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { ADMIN_SECTIONS, type AdminSectionId, storeSection } from '@/lib/admin-sections';
import { CheckCircle2, Lock, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import NotificationDropdown from '@/components/notification-dropdown';
import { hasAppPermission } from '@/lib/permissions';

export default function SectionsIndex() {
    const { auth } = usePage().props as any;
    const handleSelect = (sectionId: AdminSectionId) => {
        storeSection(sectionId);
    };

    const employee = auth?.employee;
    const photoUrl = employee?.photo ? `/storage/${employee.photo}` : null;
    const name = auth?.user?.name || 'User';
    const email = auth?.user?.email || '';
    const getInitials = (fullName: string) =>
        String(fullName || '')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase();

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-50 via-white to-white flex flex-col">
            <Head title="Modules" />

            {/* Top Bar */}
            <header className="bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
                <div className="w-full px-4">
                    <div className="h-14 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <img src="/logo.png" alt="Logo" className="h-9 w-9 rounded-xl" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">Mousumi ERP</p>
                                <p className="text-[11px] text-gray-600 leading-tight">Select a section to continue</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <NotificationDropdown />
                            <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Avatar className="h-9 w-9 border border-green-200">
                                            <AvatarImage src={photoUrl || ''} alt={name} />
                                            <AvatarFallback className="bg-green-600 text-white text-xs font-semibold">
                                                {getInitials(name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-gray-900 text-white">
                                        <p className="text-xs font-semibold">{name}</p>
                                        {email && <p className="text-[11px] text-gray-300">{email}</p>}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <Link
                                href="/logout"
                                method="post"
                                as="button"
                                className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/40 active:translate-y-[1px]"
                            >
                                Logout
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Centered Grid */}
            <main className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-5xl grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-5 place-items-center">
                    {ADMIN_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const moduleActive = Boolean(section.href);
                        const hasAccess = (() => {
                            // Minimal, user-facing gating for section picker
                            switch (section.id) {
                                case 'human-resources':
                                    return (
                                        hasAppPermission(auth, 'employees.view') ||
                                        hasAppPermission(auth, 'transfers.view') ||
                                        hasAppPermission(auth, 'holidays.view') ||
                                        hasAppPermission(auth, 'branches.view') ||
                                        hasAppPermission(auth, 'departments.view') ||
                                        hasAppPermission(auth, 'designations.view') ||
                                        hasAppPermission(auth, 'attendance.admin') ||
                                        hasAppPermission(auth, 'employees.admin') ||
                                        hasAppPermission(auth, 'admin.access')
                                    );
                                case 'attendance-movement':
                                    return hasAppPermission(auth, 'attendance.view') || hasAppPermission(auth, 'movements.view');
                                case 'leave':
                                    return hasAppPermission(auth, 'leave-applications.view') || hasAppPermission(auth, 'leaves.view');
                                case 'administration':
                                    return (
                                        hasAppPermission(auth, 'admin.access') ||
                                        hasAppPermission(auth, 'users.view') ||
                                        hasAppPermission(auth, 'roles.view') ||
                                        hasAppPermission(auth, 'reports.view')
                                    );
                                case 'payroll':
                                    return (
                                        hasAppPermission(auth, 'payroll.view') ||
                                        hasAppPermission(auth, 'admin.access')
                                    );
                                case 'fixed-asset':
                                    return (
                                        hasAppPermission(auth, 'fixed-assets.view') ||
                                        hasAppPermission(auth, 'fixed-assets.create') ||
                                        hasAppPermission(auth, 'fixed-assets.edit') ||
                                        hasAppPermission(auth, 'admin.access')
                                    );
                                default:
                                    // Future modules: show as locked unless backend enables them
                                    return false;
                            }
                        })();
                        const enabled = moduleActive && hasAccess;
                        const commonClasses =
                            'group relative select-none rounded-2xl border bg-white/90 p-3 sm:p-4 shadow-sm transition-all will-change-transform';

                        return enabled ? (
                            <Link
                                key={section.id}
                                href={`${section.href}?section=${section.id}`}
                                onClick={() => handleSelect(section.id)}
                                className={`${commonClasses} border-gray-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-green-200 focus:outline-none focus:ring-2 focus:ring-green-500/40 active:translate-y-0`}
                            >
                                <div className="absolute -top-2 -right-2">
                                    <span className="inline-flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-green-200">
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    </span>
                                </div>
                                <div className="flex flex-col items-center justify-center text-center gap-2">
                                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-b from-green-50 to-white text-green-700 grid place-items-center border border-green-100 group-hover:from-green-100/70 transition-colors">
                                        <Icon className="h-11 w-11 sm:h-14 sm:w-14" />
                                    </div>
                                    <p className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight line-clamp-2">
                                        {section.title}
                                    </p>
                                </div>
                            </Link>
                        ) : moduleActive && !hasAccess ? (
                            <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            key={section.id}
                                            className={`${commonClasses} border-green-200 opacity-85 cursor-not-allowed`}
                                            aria-disabled="true"
                                        >
                                            <div className="absolute -top-2 -right-2">
                                                <span className="inline-flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-amber-200">
                                                    <Lock className="h-6 w-6 text-amber-600" />
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center text-center gap-2">
                                                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-b from-green-50 to-white text-green-700 grid place-items-center border border-green-100">
                                                    <Icon className="h-11 w-11 sm:h-14 sm:w-14 opacity-90" />
                                                </div>
                                                <p className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight line-clamp-2">
                                                    {section.title}
                                                </p>
                                                <p className="text-[10px] text-amber-700 font-semibold">No access</p>
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-gray-900 text-white">
                                        <p className="text-xs font-semibold">Permission required</p>
                                        <p className="text-[11px] text-gray-300">Ask your admin to enable access for this module.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <div
                                key={section.id}
                                className={`${commonClasses} border-gray-200 opacity-80`}
                                aria-disabled="true"
                            >
                                <div className="absolute -top-2 -right-2">
                                    <span className="inline-flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-red-200">
                                        <XCircle className="h-6 w-6 text-red-500" />
                                    </span>
                                </div>
                                <div className="flex flex-col items-center justify-center text-center gap-2">
                                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gray-50 text-gray-600 grid place-items-center border border-gray-200">
                                        <Icon className="h-11 w-11 sm:h-14 sm:w-14" />
                                    </div>
                                    <p className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight line-clamp-2">
                                        {section.title}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

