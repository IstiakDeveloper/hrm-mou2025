import React from 'react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Building2, LogOut } from 'lucide-react';

interface BranchPortalLayoutProps {
    branch?: {
        id: number;
        name: string;
        branch_code?: string | null;
    } | null;
    children: React.ReactNode;
}

export default function BranchPortalLayout({ branch, children }: BranchPortalLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2 text-slate-800 min-w-0">
                    <Building2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-sm truncate">
                        {branch?.name ?? 'Branch'}
                        {branch?.branch_code ? ` (${branch.branch_code})` : ''}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href={route('branch.portal')}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
                    >
                        Modules
                    </Link>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => router.post(route('logout'))}
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </header>
            <div className="flex-1">{children}</div>
        </div>
    );
}
