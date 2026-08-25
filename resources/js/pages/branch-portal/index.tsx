import React from 'react';
import { Head, Link } from '@inertiajs/react';
import BranchPortalLayout from '@/layouts/BranchPortalLayout';
import { CalendarDays, ChevronRight, MapPin, Package, Wallet } from 'lucide-react';

interface Props {
    branch: {
        id: number;
        name: string;
        branch_code?: string | null;
    } | null;
}

export default function BranchPortalIndex({ branch }: Props) {
    return (
        <BranchPortalLayout branch={branch}>
            <Head title="Branch Portal" />

            <main className="container mx-auto max-w-lg px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-slate-900">Modules</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Choose a module for <span className="font-medium text-slate-700">{branch?.name ?? 'your branch'}</span>
                    </p>
                </div>

                <Link
                    href={route('branch.portal.attendance')}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                        <CalendarDays className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-slate-900">Attendance &amp; Movement</h2>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Today&apos;s staff status, official movements, absences and leave — explained for this branch only.
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-600 shrink-0" />
                </Link>

                <Link
                    href={route('branch.portal.inventory')}
                    className="mt-3 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition-all group"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-100">
                        <Package className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-slate-900">Inventory</h2>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Stock in, disburse to staff, and branch stock reports — your branch only.
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-sky-600 shrink-0" />
                </Link>

                <Link
                    href="/sections/payroll?section=payroll"
                    className="mt-3 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-violet-300 hover:shadow-md transition-all group"
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 group-hover:bg-violet-100">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-slate-900">Payroll</h2>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Branch payroll dashboard, posted and unposted salary sheets — your branch only.
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-violet-600 shrink-0" />
                </Link>

                <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-400 flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>More modules will appear here as they are enabled for branch users.</span>
                </div>
            </main>
        </BranchPortalLayout>
    );
}
