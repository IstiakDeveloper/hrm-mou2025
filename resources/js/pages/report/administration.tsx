import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { ReportDocumentHeader } from '@/components/reports/ReportDocumentHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Filter, Printer, RefreshCcw, Search } from 'lucide-react';

type UserRow = {
    name: string;
    email: string;
    username?: string | null;
    account_type: string;
    branch_name?: string | null;
    roles: string;
    active_status: boolean;
    is_online?: boolean;
    created_at?: string | null;
};

type RoleRow = {
    name: string;
    description?: string | null;
    users_count: number;
};

type SessionRow = {
    user_name: string;
    email: string;
    ip_address?: string | null;
    device_summary: string;
    last_activity: string;
};

type Option = { id: number; name: string; branch_code?: string | null };

type Filters = {
    search: string;
    session_search: string;
    role_search: string;
    account_type: string;
    active_status: string;
    role_id: string;
    branch_id: string;
    created_from: string;
    created_to: string;
    online_only: boolean;
    show_users: boolean;
    show_roles: boolean;
    show_sessions: boolean;
};

type Props = {
    companyName?: string;
    generatedAt: string;
    filters: Filters;
    filterLabels: string[];
    roleOptions: Option[];
    branchOptions: Option[];
    summary: {
        total_users: number;
        active_accounts: number;
        inactive_accounts: number;
        staff_accounts: number;
        branch_accounts: number;
        total_roles: number;
        active_sessions: number;
        active_session_users: number;
        online_in_results: number;
    };
    users: UserRow[];
    roles: RoleRow[];
    activeSessions: SessionRow[];
};

const ALL = '__all__';

function SummaryTile({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center print:border-black">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">{value.toLocaleString()}</p>
        </div>
    );
}

export default function AdministrationReport({
    companyName,
    generatedAt,
    filters: serverFilters,
    filterLabels,
    roleOptions,
    branchOptions,
    summary,
    users,
    roles,
    activeSessions,
}: Props) {
    const [filters, setFilters] = useState(serverFilters);

    const setField = <K extends keyof Filters>(key: K, value: Filters[K]) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        router.get(
            route('reports.administration'),
            {
                ...filters,
                section: 'administration',
                role_id: filters.role_id || undefined,
                branch_id: filters.branch_id || undefined,
                online_only: filters.online_only ? 1 : 0,
                show_users: filters.show_users ? 1 : 0,
                show_roles: filters.show_roles ? 1 : 0,
                show_sessions: filters.show_sessions ? 1 : 0,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const resetFilters = () => {
        router.get(route('reports.administration'), { section: 'administration' });
    };

    const printReport = () => window.print();

    return (
        <Layout>
            <Head title="Administration Summary Report" />

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-area { display: block !important; }
                    body { background: white !important; }
                }
            `}</style>

            <PageSurface className="max-w-6xl">
                <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Link
                            href="/sections/administration"
                            className="mb-2 inline-flex items-center text-sm text-zinc-500 hover:text-zinc-800"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Administration
                        </Link>
                        <h1 className="text-2xl font-bold text-zinc-900">Administration Summary</h1>
                        <p className="text-sm text-zinc-500">Filter users, roles and active sessions — then print</p>
                    </div>
                    <Button onClick={printReport} className="bg-violet-600 hover:bg-violet-700">
                        <Printer className="mr-2 h-4 w-4" />
                        Print report
                    </Button>
                </div>

                <Card className="no-print mb-6 border-zinc-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Filter className="h-4 w-4 text-violet-600" />
                            Filters
                        </CardTitle>
                        <CardDescription>Search and narrow the report before printing</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2 lg:col-span-2">
                                <Label htmlFor="search">Search users</Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                        id="search"
                                        value={filters.search}
                                        onChange={(e) => setField('search', e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                        placeholder="Name, email or username…"
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Account status</Label>
                                <Select
                                    value={filters.active_status}
                                    onValueChange={(v) => setField('active_status', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="active">Active only</SelectItem>
                                        <SelectItem value="inactive">Inactive only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Account type</Label>
                                <Select
                                    value={filters.account_type}
                                    onValueChange={(v) => setField('account_type', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="branch">Branch</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                    value={filters.role_id || ALL}
                                    onValueChange={(v) => setField('role_id', v === ALL ? '' : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All roles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All roles</SelectItem>
                                        {roleOptions.map((role) => (
                                            <SelectItem key={role.id} value={String(role.id)}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Branch</Label>
                                <Select
                                    value={filters.branch_id || ALL}
                                    onValueChange={(v) => setField('branch_id', v === ALL ? '' : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All branches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ALL}>All branches</SelectItem>
                                        {branchOptions.map((branch) => (
                                            <SelectItem key={branch.id} value={String(branch.id)}>
                                                {branch.name}
                                                {branch.branch_code ? ` (${branch.branch_code})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="created_from">Created from</Label>
                                <Input
                                    id="created_from"
                                    type="date"
                                    value={filters.created_from}
                                    onChange={(e) => setField('created_from', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="created_to">Created to</Label>
                                <Input
                                    id="created_to"
                                    type="date"
                                    value={filters.created_to}
                                    onChange={(e) => setField('created_to', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 lg:col-span-2">
                                <Label htmlFor="session_search">Search active sessions</Label>
                                <Input
                                    id="session_search"
                                    value={filters.session_search}
                                    onChange={(e) => setField('session_search', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    placeholder="User, email, IP or device…"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role_search">Search roles</Label>
                                <Input
                                    id="role_search"
                                    value={filters.role_search}
                                    onChange={(e) => setField('role_search', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    placeholder="Role name or description…"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 border-t border-zinc-100 pt-4">
                            <label className="flex items-center gap-2 text-sm text-zinc-700">
                                <Checkbox
                                    checked={filters.online_only}
                                    onCheckedChange={(c) => setField('online_only', c === true)}
                                />
                                Online users only
                            </label>
                            <label className="flex items-center gap-2 text-sm text-zinc-700">
                                <Checkbox
                                    checked={filters.show_users}
                                    onCheckedChange={(c) => setField('show_users', c === true)}
                                />
                                Include users table
                            </label>
                            <label className="flex items-center gap-2 text-sm text-zinc-700">
                                <Checkbox
                                    checked={filters.show_roles}
                                    onCheckedChange={(c) => setField('show_roles', c === true)}
                                />
                                Include roles table
                            </label>
                            <label className="flex items-center gap-2 text-sm text-zinc-700">
                                <Checkbox
                                    checked={filters.show_sessions}
                                    onCheckedChange={(c) => setField('show_sessions', c === true)}
                                />
                                Include sessions table
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={applyFilters} className="bg-violet-600 hover:bg-violet-700">
                                <Search className="mr-2 h-4 w-4" />
                                Apply filters
                            </Button>
                            <Button variant="outline" onClick={resetFilters}>
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="print-area rounded-lg border border-zinc-200 bg-white p-4 shadow-sm print:border-black print:shadow-none sm:p-6">
                    <ReportDocumentHeader
                        title="Administration Summary Report"
                        periodLabel={`Generated: ${generatedAt}`}
                        companyName={companyName}
                        rowCount={users.length}
                    />

                    {filterLabels.length > 0 && (
                        <p className="mb-4 text-[10px] text-zinc-600 print:text-black">
                            <span className="font-semibold">Filters: </span>
                            {filterLabels.join(' · ')}
                        </p>
                    )}

                    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                        <SummaryTile label="Users (filtered)" value={summary.total_users} />
                        <SummaryTile label="Active accounts" value={summary.active_accounts} />
                        <SummaryTile label="Inactive" value={summary.inactive_accounts} />
                        <SummaryTile label="Online in list" value={summary.online_in_results} />
                        <SummaryTile label="Sessions (filtered)" value={summary.active_sessions} />
                    </div>

                    {filters.show_users && (
                        <section className="mb-6">
                            <h2 className="mb-2 border-b border-zinc-200 pb-1 text-sm font-bold uppercase tracking-wide text-zinc-800 print:border-black">
                                User accounts ({users.length})
                            </h2>
                            {users.length === 0 ? (
                                <p className="text-sm text-zinc-500">No users match the current filters.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[780px] border-collapse text-[11px] text-black">
                                        <thead>
                                            <tr className="border-b border-black bg-zinc-50">
                                                <th className="p-2 text-left">Name</th>
                                                <th className="p-2 text-left">Email</th>
                                                <th className="p-2 text-left">Username</th>
                                                <th className="p-2 text-left">Type</th>
                                                <th className="p-2 text-left">Branch</th>
                                                <th className="p-2 text-left">Roles</th>
                                                <th className="p-2 text-center">Status</th>
                                                <th className="p-2 text-center">Online</th>
                                                <th className="p-2 text-left">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user, index) => (
                                                <tr key={index} className="border-b border-zinc-200">
                                                    <td className="p-2 font-medium">{user.name}</td>
                                                    <td className="p-2">{user.email}</td>
                                                    <td className="p-2">{user.username || '—'}</td>
                                                    <td className="p-2 capitalize">{user.account_type}</td>
                                                    <td className="p-2">{user.branch_name || '—'}</td>
                                                    <td className="p-2">{user.roles || '—'}</td>
                                                    <td className="p-2 text-center">
                                                        {user.active_status ? 'Active' : 'Inactive'}
                                                    </td>
                                                    <td className="p-2 text-center">{user.is_online ? 'Yes' : '—'}</td>
                                                    <td className="p-2">{user.created_at || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {filters.show_roles && (
                        <section className="mb-6">
                            <h2 className="mb-2 border-b border-zinc-200 pb-1 text-sm font-bold uppercase tracking-wide text-zinc-800 print:border-black">
                                Roles ({roles.length})
                            </h2>
                            {roles.length === 0 ? (
                                <p className="text-sm text-zinc-500">No roles match the current filters.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-[11px] text-black">
                                        <thead>
                                            <tr className="border-b border-black bg-zinc-50">
                                                <th className="p-2 text-left">Role</th>
                                                <th className="p-2 text-left">Description</th>
                                                <th className="p-2 text-right">Users</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roles.map((role, index) => (
                                                <tr key={index} className="border-b border-zinc-200">
                                                    <td className="p-2 font-medium">{role.name}</td>
                                                    <td className="p-2">{role.description || '—'}</td>
                                                    <td className="p-2 text-right tabular-nums">{role.users_count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {filters.show_sessions && (
                        <section>
                            <h2 className="mb-2 border-b border-zinc-200 pb-1 text-sm font-bold uppercase tracking-wide text-zinc-800 print:border-black">
                                Active login sessions ({activeSessions.length})
                            </h2>
                            {activeSessions.length === 0 ? (
                                <p className="text-sm text-zinc-500">No active sessions match the current filters.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[640px] border-collapse text-[11px] text-black">
                                        <thead>
                                            <tr className="border-b border-black bg-zinc-50">
                                                <th className="p-2 text-left">User</th>
                                                <th className="p-2 text-left">Email</th>
                                                <th className="p-2 text-left">Device</th>
                                                <th className="p-2 text-left">IP</th>
                                                <th className="p-2 text-left">Last active</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeSessions.map((session, index) => (
                                                <tr key={index} className="border-b border-zinc-200">
                                                    <td className="p-2 font-medium">{session.user_name}</td>
                                                    <td className="p-2">{session.email}</td>
                                                    <td className="p-2">{session.device_summary}</td>
                                                    <td className="p-2">{session.ip_address || '—'}</td>
                                                    <td className="p-2">{session.last_activity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </PageSurface>
        </Layout>
    );
}
