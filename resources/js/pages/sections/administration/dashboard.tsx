import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Shield, Users, Building2 } from 'lucide-react';

type Props = {
    userCount: number;
    employeeCount: number;
    branchCount: number;
    userRole: string;
};

function AdminTile({
    title,
    value,
    href,
    icon,
}: {
    title: string;
    value: number;
    href: string;
    icon: React.ReactNode;
}) {
    return (
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
                <Link href={href} className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30">
                    <div className="flex items-center gap-4 p-5">
                        <div className="h-12 w-12 rounded-2xl bg-green-50 border border-green-100 grid place-items-center text-green-700">
                            {icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-gray-500 tracking-wide">{title}</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">{Number(value || 0).toLocaleString()}</p>
                        </div>
                        <div className="ml-auto text-green-700">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                    </div>
                </Link>
            </CardContent>
        </Card>
    );
}

export default function AdministrationDashboard({ userCount, employeeCount, branchCount, userRole }: Props) {
    const { auth } = usePage().props as any;

    return (
        <Layout>
            <Head title="Administration" />

            <PageSurface>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-2 py-1">
                                ADMINISTRATION
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-1">
                                {userRole || 'Admin'}
                            </Badge>
                        </div>
                        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                            Administration Overview
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Users, roles, permissions and system operations.
                        </p>
                        <p className="mt-2 text-[11px] text-gray-500">
                            Signed in as <span className="font-semibold text-gray-700">{auth?.user?.name}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="text-xs">
                            <Link href="/sections">Change section</Link>
                        </Button>
                        <Button asChild className="text-xs bg-green-600 hover:bg-green-700">
                            <Link href="/admin/users/create?section=administration">Add user</Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <AdminTile
                        title="TOTAL USERS"
                        value={userCount}
                        href="/admin/users?section=administration"
                        icon={<Users className="h-6 w-6" />}
                    />
                    <AdminTile
                        title="TOTAL EMPLOYEES"
                        value={employeeCount}
                        href="/employees?section=human-resources"
                        icon={<Building2 className="h-6 w-6" />}
                    />
                    <AdminTile
                        title="TOTAL BRANCHES"
                        value={branchCount}
                        href="/branches?section=human-resources"
                        icon={<Shield className="h-6 w-6" />}
                    />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="border-gray-200 shadow-sm lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">Quick actions</CardTitle>
                            <CardDescription className="text-xs">Common administration tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button asChild variant="outline" className="justify-between text-xs">
                                <Link href="/admin/users?section=administration">
                                    Manage users <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="justify-between text-xs">
                                <Link href="/admin/roles?section=administration">
                                    Roles & permissions <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="justify-between text-xs">
                                <Link href="/admin/notices?section=administration">
                                    Notices <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="justify-between text-xs">
                                <Link href="/reports?section=administration">
                                    Reports <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900">System</CardTitle>
                            <CardDescription className="text-xs">Configuration shortcuts</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/settings?section=administration">
                                    Settings <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-between text-xs">
                                <Link href="/settings/notifications?section=administration">
                                    Notifications <ArrowUpRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </PageSurface>
        </Layout>
    );
}

