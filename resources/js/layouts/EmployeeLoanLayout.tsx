import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { ChevronRight, HandCoins } from 'lucide-react';
import { EMPLOYEE_LOAN_LAYOUT_SECTIONS, employeeLoanPath } from '@/lib/employee-loan-nav';
import { cn } from '@/lib/utils';

interface EmployeeLoanLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
    activeTab?: string;
}

export default function EmployeeLoanLayout({ children, title, description, activeTab }: EmployeeLoanLayoutProps) {
    return (
        <Layout>
            <Head title={title} />
            <PageSurface className="max-w-7xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5 flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500">
                            <Link href={employeeLoanPath('/sections/employee-loan')} className="hover:text-zinc-800">
                                Employee Loan
                            </Link>
                            <ChevronRight className="h-3 w-3" />
                            <span className="font-medium text-zinc-700">{title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10">
                                <HandCoins className="h-4 w-4" />
                            </span>
                            <div>
                                <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">{title}</h1>
                                {description && <p className="mt-0.5 text-xs text-zinc-600">{description}</p>}
                            </div>
                        </div>
                    </div>
                    <Link
                        href={employeeLoanPath('/sections/employee-loan')}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                    >
                        ← Dashboard
                    </Link>
                </div>

                <div className="mb-5 space-y-2 rounded-lg border border-zinc-200/90 bg-white p-2 shadow-sm">
                    {EMPLOYEE_LOAN_LAYOUT_SECTIONS.map((section) => (
                        <div key={section.label} className="flex flex-wrap items-center gap-1.5">
                            <span className="w-16 shrink-0 px-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                {section.label}
                            </span>
                            {section.items.map((item) => (
                                <Link
                                    key={item.id}
                                    href={employeeLoanPath(item.href)}
                                    className={cn(
                                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                        activeTab === item.id
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>

                {children}
            </PageSurface>
        </Layout>
    );
}
