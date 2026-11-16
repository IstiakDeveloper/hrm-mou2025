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
import { PageSurface } from '@/components/page-surface';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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
    filters: { context?: string; is_active?: string; per_page?: string };
    canEdit: boolean;
}) {
    const [contextFilter, setContextFilter] = useState(filters.context ?? '');
    const [activeFilter, setActiveFilter] = useState(filters.is_active ?? '');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    const filterQuery = () => ({
        context: contextFilter || undefined,
        is_active: activeFilter === '' ? undefined : activeFilter,
        per_page: perPage,
    });

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('leave.settings.index'), {
            context: contextFilter || undefined,
            is_active: activeFilter === '' ? undefined : activeFilter,
            per_page: value,
        }, { preserveState: true });
    };

    const applyFilters = () => {
        router.get(route('leave.settings.index'), filterQuery(), { preserveState: true });
    };

    const resetFilters = () => {
        setContextFilter('');
        setActiveFilter('');
        setPerPage('15');
        router.get(route('leave.settings.index'), { per_page: '15' }, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (!confirm('Delete this tier?')) return;
        router.delete(route('leave.settings.destroy', id));
    };

    const hasPagination = tiers.meta.last_page > 1;

    return (
        <Layout>
            <Head title="Leave settings" />

            <PageSurface>
                <div className="mb-6 flex flex-col gap-4 md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leave Approval Tiers</h1>
                        <p className="mt-1 max-w-3xl text-sm text-slate-500">
                            <strong>Head office:</strong> one list of steps — e.g. up to 3 days → department head, higher
                            max → executive director. <strong>Branch:</strong> separate list — e.g. up to 1 day → branch
                            manager, up to 3 → regional manager. For each
                            request we use the <em>smallest</em> max that still covers the leave length.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <Select
                            value={contextFilter || '__all__'}
                            onValueChange={(v) => setContextFilter(v === '__all__' ? '' : v)}
                        >
                            <SelectTrigger className="h-9 w-full sm:w-36 text-sm bg-white">
                                <SelectValue placeholder="Where" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All Locations</SelectItem>
                                <SelectItem value="head_office">Head office</SelectItem>
                                <SelectItem value="branch">Branch</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={activeFilter || '__all__'}
                            onValueChange={(v) => setActiveFilter(v === '__all__' ? '' : v)}
                        >
                            <SelectTrigger className="h-9 w-full sm:w-32 text-sm bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">All Status</SelectItem>
                                <SelectItem value="1">Active</SelectItem>
                                <SelectItem value="0">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {(contextFilter || activeFilter !== '') && (
                                <Button onClick={resetFilters} variant="ghost" size="sm" className="h-9 px-2 text-slate-500">
                                    Clear
                                </Button>
                            )}
                            <Button onClick={applyFilters} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Apply
                            </Button>
                            {canEdit && (
                                <Link href={route('leave.settings.create')} className="w-full sm:w-auto">
                                    <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                        <Plus className="mr-1 h-4 w-4" />
                                        Add Tier
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Where</TableHead>
                                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Up to (days)</TableHead>
                                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Approver</TableHead>
                                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Active</TableHead>
                                    {canEdit && <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tiers.data?.length ? (
                                    tiers.data.map((row) => (
                                        <TableRow key={row.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                            <TableCell className="font-medium text-[13px] pl-6 text-slate-800">
                                                {CONTEXT_LABEL[row.context] ?? row.context}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">≤ {row.max_leave_days}</Badge>
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
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" 
                                                            title="Edit"
                                                            onClick={() => router.get(route('leave.settings.edit', row.id))}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                                                            title="Delete"
                                                            onClick={() => handleDelete(row.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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
                        </div>
                    </CardContent>
                </Card>

                {tiers.meta && tiers.meta.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl mt-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                <span className="hidden sm:inline">Rows per page:</span>
                                <Select
                                    value={perPage}
                                    onValueChange={handlePerPageChange}
                                >
                                    <SelectTrigger className="h-8 w-[70px] text-[13px] bg-white border-slate-200">
                                        <SelectValue placeholder="15" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="15">15</SelectItem>
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
                                    Showing <span className="font-semibold text-slate-700">{tiers.meta.total > 0 ? (tiers.meta.current_page - 1) * tiers.meta.per_page + 1 : 0}</span> to{' '}
                                    <span className="font-semibold text-slate-700">
                                        {Math.min(tiers.meta.current_page * tiers.meta.per_page, tiers.meta.total)}
                                    </span>{' '}
                                    of <span className="font-semibold text-slate-700">{tiers.meta.total}</span> entries
                                </p>
                            </div>
                        </div>

                        {tiers.meta.last_page > 1 && (
                            <div className="flex items-center justify-end">
                                <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                                    {tiers.meta.current_page > 1 && tiers.links?.prev && (
                                        <Link
                                            href={tiers.links.prev}
                                            preserveState
                                            className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                        </Link>
                                    )}

                                    {tiers.meta.links && tiers.meta.links.slice(1, -1).map((link, i) => {
                                        const isActive = link.active;
                                        const isDots = link.label === '...';

                                        if (isDots) {
                                            return (
                                                <span key={i} className="relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-medium text-slate-400">
                                                    ...
                                                </span>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                preserveState
                                                className={`relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-semibold rounded-lg transition-all duration-200 shadow-sm ${isActive
                                                        ? 'z-10 bg-emerald-600 text-white shadow-sm border border-emerald-600'
                                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 focus:z-20'
                                                    }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    })}

                                    {tiers.meta.current_page < tiers.meta.last_page && tiers.links?.next && (
                                        <Link
                                            href={tiers.links.next}
                                            preserveState
                                            className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                        >
                                            <span className="sr-only">Next</span>
                                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                        </Link>
                                    )}
                                </nav>
                            </div>
                        )}
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
