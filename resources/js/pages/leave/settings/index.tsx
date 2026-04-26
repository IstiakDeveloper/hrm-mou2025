import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, MoreHorizontal, Plus, Trash2 } from 'lucide-react';

interface Designation {
    id: number;
    name: string;
}

interface LeaveApprovalTierRow {
    id: number;
    context: string;
    max_leave_days: number;
    approver_type: string;
    designation_id: number | null;
    is_active: boolean;
    designation?: Designation | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface TiersPayload {
    data: LeaveApprovalTierRow[];
    meta: {
        current_page: number;
        from: number | null;
        last_page: number;
        links: PaginationLink[];
        path: string;
        per_page: number;
        to: number | null;
        total: number;
    };
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
}

const CONTEXT_LABEL: Record<string, string> = {
    head_office: 'Head office',
    branch: 'Branch',
};

const APPROVER_LABEL: Record<string, string> = {
    department_head: 'Department head',
    executive_director: 'Executive director',
    branch_manager: 'Branch manager (permission)',
    branch_head: 'Branch head',
    designation: 'By designation',
};

export default function LeaveSettingsIndex({
    tiers,
    filters,
    canEdit,
}: {
    tiers: TiersPayload;
    filters: { context?: string; is_active?: string };
    canEdit: boolean;
}) {
    const [contextFilter, setContextFilter] = useState(filters.context ?? '');
    const [activeFilter, setActiveFilter] = useState(filters.is_active ?? '');

    const filterQuery = () => ({
        context: contextFilter || undefined,
        is_active: activeFilter === '' ? undefined : activeFilter,
    });

    const applyFilters = () => {
        router.get(route('leave.settings.index'), filterQuery(), { preserveState: true });
    };

    const resetFilters = () => {
        setContextFilter('');
        setActiveFilter('');
        router.get(route('leave.settings.index'));
    };

    const handleDelete = (id: number) => {
        if (!confirm('Delete this tier?')) return;
        router.delete(route('leave.settings.destroy', id));
    };

    const hasPagination = tiers.meta.last_page > 1;

    return (
        <Layout>
            <Head title="Leave settings" />

            <div className="container mx-auto py-8">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Leave approval tiers</h1>
                        <p className="mt-1 max-w-3xl text-gray-600">
                            <strong>Head office:</strong> one list of steps — e.g. up to 3 days → department head, higher
                            max → executive director. <strong>Branch:</strong> separate list — e.g. up to 1 day → branch
                            manager, up to 3 → regional manager (pick “By designation” and choose that role). For each
                            request we use the <em>smallest</em> max that still covers the leave length.
                        </p>
                    </div>
                    {canEdit && (
                        <Link href={route('leave.settings.create')}>
                            <Button className="flex items-center">
                                <Plus className="mr-1 h-4 w-4" />
                                Add tier
                            </Button>
                        </Link>
                    )}
                </div>

                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle>Filters</CardTitle>
                        <CardDescription>Head office vs branch tiers</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
                        <div className="flex-1 space-y-2">
                            <span className="text-sm font-medium">Where</span>
                            <Select
                                value={contextFilter || '__all__'}
                                onValueChange={(v) => setContextFilter(v === '__all__' ? '' : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All</SelectItem>
                                    <SelectItem value="head_office">Head office</SelectItem>
                                    <SelectItem value="branch">Branch</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                            <span className="text-sm font-medium">Status</span>
                            <Select
                                value={activeFilter || '__all__'}
                                onValueChange={(v) => setActiveFilter(v === '__all__' ? '' : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">All</SelectItem>
                                    <SelectItem value="1">Active</SelectItem>
                                    <SelectItem value="0">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={resetFilters}>
                                Reset
                            </Button>
                            <Button type="button" onClick={applyFilters}>
                                Apply
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Where</TableHead>
                                    <TableHead>Up to (days)</TableHead>
                                    <TableHead>Approver</TableHead>
                                    <TableHead>Active</TableHead>
                                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tiers.data?.length ? (
                                    tiers.data.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">
                                                {CONTEXT_LABEL[row.context] ?? row.context}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">≤ {row.max_leave_days}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {APPROVER_LABEL[row.approver_type] ?? row.approver_type}
                                                    {row.approver_type === 'designation' && row.designation && (
                                                        <div className="text-muted-foreground">{row.designation.name}</div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {row.is_active ? (
                                                    <Badge className="bg-green-600">Yes</Badge>
                                                ) : (
                                                    <Badge variant="secondary">No</Badge>
                                                )}
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() =>
                                                                    router.get(route('leave.settings.edit', row.id))
                                                                }
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer text-red-600 focus:text-red-600"
                                                                onClick={() => handleDelete(row.id)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={canEdit ? 5 : 4} className="h-24 text-center text-muted-foreground">
                                            No tiers yet. Example: Head office — 3 / Department head, 366 / Executive director.
                                            Branch — 1 / Branch manager, 3 / Regional manager (designation).
                                            {canEdit && (
                                                <>
                                                    {' '}
                                                    <Link href={route('leave.settings.create')} className="text-primary underline">
                                                        Add tier
                                                    </Link>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {hasPagination && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                {tiers.meta.current_page > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={tiers.links.prev || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (tiers.links.prev) {
                                                    router.get(tiers.links.prev, filterQuery(), { preserveState: true });
                                                }
                                            }}
                                        />
                                    </PaginationItem>
                                )}

                                {tiers.meta.links
                                    .filter((l) => !l.label.includes('&laquo;') && !l.label.includes('&raquo;'))
                                    .map((link, i) => {
                                        const isNum = !Number.isNaN(Number(link.label));
                                        if (!isNum && link.label === '...') {
                                            return (
                                                <PaginationItem key={i}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            );
                                        }
                                        return (
                                            <PaginationItem key={i}>
                                                <PaginationLink
                                                    href={link.url || '#'}
                                                    isActive={link.active}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (link.url) {
                                                            router.get(link.url, filterQuery(), { preserveState: true });
                                                        }
                                                    }}
                                                >
                                                    {link.label}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    })}

                                {tiers.meta.current_page < tiers.meta.last_page && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={tiers.links.next || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (tiers.links.next) {
                                                    router.get(tiers.links.next, filterQuery(), { preserveState: true });
                                                }
                                            }}
                                        />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </div>
        </Layout>
    );
}
