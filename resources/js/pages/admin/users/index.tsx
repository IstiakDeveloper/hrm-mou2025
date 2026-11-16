import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    RefreshCw,
    UserPlus,
    Edit,
    Trash,
    Check,
    X,
    User,
    Mail,
    Building2,
    Shield
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import BulkEmailButton from '@/components/BulkEmailButton';
import { PageSurface } from '@/components/page-surface';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Role {
    id: number;
    name: string;
}

interface UserData {
    id: number;
    name: string;
    username?: string | null;
    email: string;
    active_status: boolean;
    roles: Role[];
    employee: (EmployeeNameFields & {
        employee_id: string;
    }) | null;
    branch: {
        name: string;
    } | null;
}

interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    from: number | null;
    last_page: number;
    links: PaginationLinks[];
    path: string;
    per_page: number;
    to: number | null;
    total: number;
}

interface UsersResponse {
    data: UserData[];
    links?: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta?: PaginationMeta;
}

interface UsersIndexProps {
    users: UsersResponse;
    filters: {
        search?: string;
        per_page?: string;
    };
    success?: string;
}

export default function UsersIndex({ users, filters, success }: UsersIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');
    const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
    const [isSyncingBranches, setIsSyncingBranches] = useState(false);

    const handleSearch = () => {
        router.get(route('admin.users.index'), { search, per_page: perPage }, { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('admin.users.index'), { search, per_page: value }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const resetFilters = () => {
        setSearch('');
        setPerPage('10');
        router.get(route('admin.users.index'), { per_page: '10' }, { preserveState: true });
    };

    const handleStatusChange = (user: UserData, status: boolean) => {
        router.put(
            route('admin.users.update', user.id),
            { active_status: status },
            {
                preserveScroll: true,
                preserveState: true,
            }
        );
    };

    const handleDeleteUser = () => {
        if (!userToDelete) return;

        router.delete(route('admin.users.destroy', userToDelete.id), {
            preserveScroll: true,
            onSuccess: () => setUserToDelete(null),
        });
    };

    const handleSyncBranches = () => {
        if (isSyncingBranches) return;

        router.post(
            route('admin.users.sync-branches'),
            {},
            {
                preserveScroll: true,
                onStart: () => setIsSyncingBranches(true),
                onFinish: () => setIsSyncingBranches(false),
            }
        );
    };

    const getUserFullName = (user: UserData) => {
        if (user.employee) {
            return employeeDisplayName(user.employee, user.name);
        }
        return user.name;
    };

    const renderUserRoles = (roles: Role[]) => {
        if (!roles || roles.length === 0) {
            return <span className="text-[13px] text-slate-400 italic">—</span>;
        }

        if (roles.length > 2) {
            return (
                <div className="flex flex-wrap gap-1">
                    {roles.slice(0, 2).map((role) => (
                        <Badge
                            key={role.id}
                            className={
                                role.name === 'Super Admin'
                                    ? 'border-0 bg-emerald-100 font-medium text-emerald-800 hover:bg-emerald-100'
                                    : role.name === 'HR Admin'
                                      ? 'border-slate-200 bg-slate-100 font-medium text-slate-800 hover:bg-slate-100'
                                      : 'border-slate-200 bg-white font-medium text-slate-700'
                            }
                        >
                            {role.name}
                        </Badge>
                    ))}
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 font-medium text-slate-600">
                        +{roles.length - 2} more
                    </Badge>
                </div>
            );
        }

        return (
            <div className="flex flex-wrap gap-1">
                {roles.map((role) => (
                    <Badge
                        key={role.id}
                        className={
                            role.name === 'Super Admin'
                                ? 'border-0 bg-emerald-100 font-medium text-emerald-800 hover:bg-emerald-100'
                                : role.name === 'HR Admin'
                                  ? 'border-slate-200 bg-slate-100 font-medium text-slate-800 hover:bg-slate-100'
                                  : 'border-slate-200 bg-white font-medium text-slate-700'
                        }
                    >
                        {role.name}
                    </Badge>
                ))}
            </div>
        );
    };

    const hasPagination = Boolean(users.meta && users.links);

    return (
        <Layout>
            <Head title="User Management" />

            <PageSurface>
                <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage system users, roles, and branch access
                        </p>
                    </div>

                    <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search users..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm transition-all focus-visible:ring-emerald-500"
                            />
                            {search ? (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            ) : null}
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                            <Button
                                type="button"
                                onClick={handleSearch}
                                size="sm"
                                className="h-9 w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
                            >
                                Search
                            </Button>
                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleSyncBranches}
                                    disabled={isSyncingBranches}
                                    className="h-9 w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto"
                                >
                                    <RefreshCw
                                        className={`mr-1 h-4 w-4 ${isSyncingBranches ? 'animate-spin' : ''}`}
                                    />
                                    {isSyncingBranches ? 'Syncing...' : 'Sync Branch'}
                                </Button>
                                <BulkEmailButton />
                                <Link href={route('admin.users.create')} className="w-full sm:w-auto">
                                    <Button
                                        size="sm"
                                        className="h-9 w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
                                    >
                                        <UserPlus className="mr-1 h-4 w-4" />
                                        Add User
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {success ? (
                    <Alert className="mb-6 border-emerald-200 bg-emerald-50">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-emerald-800">{success}</AlertDescription>
                    </Alert>
                ) : null}

                <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-200 bg-slate-50/80">
                                        <TableHead className="h-11 pl-6 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Name
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Username
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Email
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Roles
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Branch
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Status
                                        </TableHead>
                                        <TableHead className="h-11 pr-6 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length > 0 ? (
                                        users.data.map((user) => (
                                            <TableRow
                                                key={user.id}
                                                className="group border-b border-slate-100 transition-colors hover:bg-slate-50"
                                            >
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center">
                                                        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                                            <User className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex min-w-0 flex-col">
                                                            <Link
                                                                href={route('admin.users.edit', user.id)}
                                                                className="truncate text-[13px] font-semibold text-slate-800 transition-colors hover:text-emerald-600"
                                                            >
                                                                {getUserFullName(user)}
                                                            </Link>
                                                            {user.employee ? (
                                                                <span className="text-xs text-slate-500">
                                                                    ID: {user.employee.employee_id}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-[13px] font-medium text-slate-600">
                                                        {user.username?.trim() ? user.username : '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex max-w-xs items-center text-[13px] text-slate-600">
                                                        <Mail className="mr-1.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                                                        <span className="truncate">{user.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{renderUserRoles(user.roles)}</TableCell>
                                                <TableCell>
                                                    {user.branch ? (
                                                        <div className="flex items-center text-[13px] text-slate-600">
                                                            <Building2 className="mr-1.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                                                            <span className="truncate">{user.branch.name}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[13px] text-slate-400 italic">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={user.active_status}
                                                            onCheckedChange={(checked) =>
                                                                handleStatusChange(user, checked)
                                                            }
                                                            aria-label="Toggle active status"
                                                        />
                                                        <span
                                                            className={
                                                                user.active_status
                                                                    ? 'text-[13px] font-medium text-emerald-600'
                                                                    : 'text-[13px] text-slate-500'
                                                            }
                                                        >
                                                            {user.active_status ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                                                            title="Edit user"
                                                            onClick={() =>
                                                                router.get(route('admin.users.edit', user.id))
                                                            }
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                                            title="Delete user"
                                                            onClick={() => setUserToDelete(user)}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <Shield className="h-8 w-8 text-slate-300" />
                                                    <h3 className="mt-2 text-sm font-semibold text-slate-800">
                                                        No users found
                                                    </h3>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {filters.search
                                                            ? 'Try a different search term'
                                                            : 'Get started by adding a new user'}
                                                    </p>
                                                    {filters.search ? (
                                                        <Button
                                                            variant="link"
                                                            onClick={resetFilters}
                                                            className="mt-1 px-2 font-normal text-emerald-600"
                                                        >
                                                            Clear filters
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {hasPagination && users.meta ? (
                            <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                        <span className="hidden sm:inline">Rows per page:</span>
                                        <Select value={perPage} onValueChange={handlePerPageChange}>
                                            <SelectTrigger className="h-8 w-[70px] border-slate-200 bg-white text-[13px]">
                                                <SelectValue placeholder="10" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                                <SelectItem value="200">200</SelectItem>
                                                <SelectItem value="500">500</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[13px] text-slate-500">
                                            Showing{' '}
                                            <span className="font-semibold text-slate-700">
                                                {users.meta.total > 0
                                                    ? (users.meta.current_page - 1) * users.meta.per_page + 1
                                                    : 0}
                                            </span>{' '}
                                            to{' '}
                                            <span className="font-semibold text-slate-700">
                                                {Math.min(
                                                    users.meta.current_page * users.meta.per_page,
                                                    users.meta.total
                                                )}
                                            </span>{' '}
                                            of{' '}
                                            <span className="font-semibold text-slate-700">{users.meta.total}</span>{' '}
                                            entries
                                        </p>
                                    </div>
                                </div>

                                {users.meta.last_page > 1 ? (
                                    <div className="flex items-center justify-end">
                                        <nav
                                            className="isolate inline-flex gap-1.5"
                                            aria-label="Pagination"
                                        >
                                            {users.meta.current_page > 1 && users.links?.prev ? (
                                                <Link
                                                    href={users.links.prev}
                                                    preserveState
                                                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            ) : null}

                                            {users.meta.links
                                                ? users.meta.links.slice(1, -1).map((link, i) => {
                                                      const isActive = link.active;
                                                      const isDots = link.label === '...';

                                                      if (isDots) {
                                                          return (
                                                              <span
                                                                  key={i}
                                                                  className="relative inline-flex h-8 w-8 items-center justify-center text-[13px] font-medium text-slate-400"
                                                              >
                                                                  ...
                                                              </span>
                                                          );
                                                      }

                                                      return (
                                                          <Link
                                                              key={i}
                                                              href={link.url || '#'}
                                                              preserveState
                                                              className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold shadow-sm transition-all duration-200 ${
                                                                  isActive
                                                                      ? 'z-10 border border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                                                      : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20'
                                                              }`}
                                                              dangerouslySetInnerHTML={{ __html: link.label }}
                                                          />
                                                      );
                                                  })
                                                : null}

                                            {users.meta.current_page < users.meta.last_page && users.links?.next ? (
                                                <Link
                                                    href={users.links.next}
                                                    preserveState
                                                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            ) : null}
                                        </nav>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </PageSurface>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the user account for{' '}
                            <span className="font-medium text-gray-900">
                                {userToDelete?.name || userToDelete?.email}
                            </span>
                            . This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
