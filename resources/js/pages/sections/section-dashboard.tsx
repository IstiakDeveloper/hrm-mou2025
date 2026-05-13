import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { ADMIN_SECTIONS, type AdminSectionId } from '@/lib/admin-sections';
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
                        { label: 'My Profile', href: '/profile' },
                        { label: 'My Leaves', href: '/employee/leaves' },
                        { label: 'My Movements', href: '/employee/movements' },
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
                        { label: 'Notices', href: '/my-notices' },
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
                        { label: 'Notices', href: '/my-notices' },
                    ];
            case 'administration':
                return [
                    { label: 'Administration dashboard', href: '/sections/administration' },
                    { label: 'Users', href: '/admin/users' },
                    { label: 'Roles', href: '/admin/roles' },
                    { label: 'Reports overview', href: '/reports' },
                ];
            default:
                return [];
        }
    })();

    return (
        <Layout>
            <Head title={`${title} - Overview`} />

            <PageSurface>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1">
                                {mode === 'admin' ? (
                                    <Shield className="h-4 w-4 text-green-700" />
                                ) : (
                                    <User className="h-4 w-4 text-green-700" />
                                )}
                                <span className="text-xs font-semibold text-green-800">
                                    {mode === 'admin' ? 'Admin' : 'Employee'} Dashboard
                                </span>
                            </div>
                        </div>
                        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                            {title}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            {subtitle}
                        </p>
                        <p className="mt-2 text-[11px] text-gray-500">
                            Signed in as <span className="font-semibold text-gray-700">{auth?.user?.name}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="text-xs">
                            <Link href="/sections">Change section</Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

