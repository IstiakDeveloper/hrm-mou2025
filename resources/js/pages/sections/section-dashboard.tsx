import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { ADMIN_SECTIONS, type AdminSectionId } from '@/lib/admin-sections';
import { FIXED_ASSET_DASHBOARD_LINKS } from '@/lib/fixed-asset-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Shield, User } from 'lucide-react';

type Props = {
    sectionId: AdminSectionId;
    mode: 'admin' | 'employee';
};

export default function SectionDashboard({ sectionId, mode }: Props) {
    const { auth } = usePage().props as any;
    const section = ADMIN_SECTIONS.find((s) => s.id === sectionId);

    const title = section?.title ?? 'SECTION';
    const subtitle =
        mode === 'admin'
            ? 'Admin overview and shortcuts for this module'
            : 'Employee overview and shortcuts for this module';

    const quickLinks: Array<{ label: string; href: string }> = (() => {
        switch (sectionId) {
            case 'human-resources':
                return mode === 'admin'
                    ? [
                        { label: 'HR dashboard', href: '/sections/human-resources' },
                        { label: 'Employees', href: '/employees' },
                        { label: 'Organization Setup', href: '/branches' },
                        { label: 'Transfers', href: '/transfers' },
                        { label: 'Holidays', href: '/holidays' },
                        { label: 'Employee report', href: '/reports/employee' },
                    ]
                    : [
                        { label: 'My Profile', href: '/profile' },
                        { label: 'My Leaves', href: '/employee/leaves' },
                        { label: 'My Movements', href: '/employee/movements' },
                        { label: 'My Notices', href: '/my-notices' },
                    ];
            case 'attendance-movement':
                return mode === 'admin'
                    ? [
                        { label: 'Attendance & movement dashboard', href: '/sections/attendance-movement' },
                        { label: 'Daily Attendance', href: '/attendance' },
                        { label: 'Monthly View', href: '/attendance/monthly' },
                        { label: 'Attendance Report', href: '/attendance/report' },
                        { label: 'Attendance sheet report', href: '/attendance/sheet-report' },
                        { label: 'Movements', href: '/movements' },
                    ]
                    : [
                        { label: 'My Attendance', href: '/employee/dashboard' },
                        { label: 'My Movements', href: '/employee/movements' },
                    ];
            case 'leave':
                return mode === 'admin'
                    ? [
                        { label: 'Leave dashboard', href: '/sections/leave' },
                        { label: 'Leave Applications', href: '/leave/applications' },
                        { label: 'Leave Report', href: '/leave/applications/report' },
                        { label: 'Leave summary report', href: '/reports/leave' },
                    ]
                    : [
                        { label: 'My Leaves', href: '/employee/leaves' },
                        { label: 'Apply Leave', href: '/leave/applications/create' },
                    ];
            case 'administration':
                return [
                    { label: 'Administration dashboard', href: '/sections/administration' },
                    { label: 'Users', href: '/admin/users' },
                    { label: 'Roles', href: '/admin/roles' },
                    { label: 'Reports overview', href: '/reports' },
                ];
            case 'staff-fund':
                return [
                    { label: 'Staff Fund dashboard', href: '/sections/staff-fund' },
                    { label: 'PF Register', href: '/provident-fund' },
                    { label: 'Gratuity entitlements', href: '/gratuity' },
                    { label: 'Gratuity payments', href: '/gratuity/payments' },
                ];
            case 'employee-loan':
                return [];
            case 'payroll':
                return [
                    { label: 'Payroll dashboard', href: '/sections/payroll' },
                    { label: 'Payscales', href: '/payscales' },
                    { label: 'Grades', href: '/salary-grades' },
                    { label: 'Steps', href: '/salary-steps' },
                    { label: 'Salary Heads', href: '/salary-heads' },
                    { label: 'Salary Structure (manual)', href: '/salary-structures/manual' },
                    { label: 'Branch Wise Bank', href: '/branch-payroll-banks' },
                    { label: 'Probation Salary', href: '/probation-salary' },
                    { label: 'Fixed Salary', href: '/fixed-salary' },
                    { label: 'Head Modification', href: '/salary-head-modifications' },
                    { label: 'Salary Process', href: '/salary-process' },
                ];
            case 'fixed-asset':
                return [
                    { label: 'Fixed Asset dashboard', href: '/sections/fixed-asset' },
                    ...FIXED_ASSET_DASHBOARD_LINKS.slice(0, 12).map((link) => ({
                        label: link.label,
                        href: link.href,
                    })),
                ];
            default:
                return [];
        }
    })();

    return (
        <Layout>
            <Head title={`${title} - Overview`} />

            <PageSurface>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 sm:px-3 sm:py-1">
                                {mode === 'admin' ? (
                                    <Shield className="h-3.5 w-3.5 text-green-700" />
                                ) : (
                                    <User className="h-3.5 w-3.5 text-green-700" />
                                )}
                                <span className="text-[10px] sm:text-xs font-semibold text-green-800">
                                    {mode === 'admin' ? 'Admin' : 'Employee'} Dashboard
                                </span>
                            </div>
                        </div>
                        <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                            {title}
                        </h1>
                        <p className="mt-1 text-xs sm:text-sm text-gray-600">
                            {subtitle}
                        </p>
                        <p className="mt-1.5 text-[10px] sm:text-[11px] text-gray-500">
                            Signed in as <span className="font-semibold text-gray-700">{auth?.user?.name}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="h-8 px-3 text-[10px] sm:text-xs">
                            <Link href="/sections">Change section</Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {quickLinks.length > 0 ? (
                        quickLinks.map((q) => (
                            <Card key={q.href} className="border-gray-200 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-gray-900">
                                        {q.label}
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Open {q.label.toLowerCase()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild className="w-full text-xs bg-green-600 hover:bg-green-700">
                                        <Link href={`${q.href}?section=${sectionId}`}>
                                            Open <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold text-gray-900">Coming soon</CardTitle>
                                <CardDescription className="text-xs">
                                    This section dashboard is not configured yet.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild variant="outline" className="w-full text-xs">
                                    <Link href="/sections">Back to sections</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </PageSurface>
        </Layout>
    );
}

