import { Head, Link, router, usePage } from '@inertiajs/react';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { toFormDisplayDate } from '@/lib/display-date';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';

type OrderRow = {
    id: number;
    order_no: string;
    increment_date: string;
    effective_date: string;
    status: 'scheduled' | 'pending' | 'approved' | 'applied' | 'cancelled' | 'rolled_back';
    arrear_months: number;
    lines_count: number;
    grant_count: number;
    stop_count: number;
    increment_total: string | number | null;
    arrear_total: string | number | null;
    branch?: { name: string } | null;
};

type Paginator = {
    data: OrderRow[];
    links?: { prev: string | null; next: string | null };
    meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links?: { url: string | null; label: string; active: boolean }[];
    };
};

type Props = {
    orders: Paginator;
    filters: { status: string; search: string };
    canCreate: boolean;
};

function statusBadge(status: OrderRow['status']) {
    if (status === 'scheduled' || status === 'pending' || status === 'approved') {
        return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">Scheduled</Badge>;
    }
    if (status === 'applied') {
        return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">Applied</Badge>;
    }
    if (status === 'rolled_back') {
        return <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Rolled back</Badge>;
    }
    if (status === 'cancelled') {
        return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Cancelled</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
}

export default function SalaryIncrementIndex({ orders, filters, canCreate }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [status, setStatus] = useState(filters.status || 'all');
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = () => {
        router.get(route('salary-increments.index'), {
            status: status !== 'all' ? status : '',
            search: search.trim(),
        }, { preserveState: true, replace: true });
    };

    return (
        <Layout>
            <Head title="Annual Increment" />
            <PageSurface>
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Annual Increment</h1>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                            One office order moves permanent staff up the published steps of the same grade. A later effective date stays scheduled. The whole order can be rolled back.
                        </p>
                    </div>
                    {canCreate && (
                        <Link href={route('salary-increments.create')}>
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-1.5 h-4 w-4" />
                                New increment order
                            </Button>
                        </Link>
                    )}
                </div>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert className="mb-4 border-red-200 bg-red-50 text-red-900">
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                <Card className="mb-4 border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                placeholder="Search order number"
                                className="pl-9"
                            />
                        </div>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="rolled_back">Rolled back</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={applyFilters} variant="outline">Search</Button>
                        {(filters.search || filters.status !== 'all') && (
                            <Button
                                variant="ghost"
                                onClick={() => router.get(route('salary-increments.index'))}
                            >
                                <X className="mr-1 h-4 w-4" />
                                Clear
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Order</TableHead>
                                    <TableHead>Effective</TableHead>
                                    <TableHead>Staff</TableHead>
                                    <TableHead className="text-right">Monthly increment</TableHead>
                                    <TableHead className="text-right">Arrear</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-28 text-center text-sm text-slate-500">
                                            No increment orders yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {orders.data.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{order.order_no}</div>
                                            <div className="text-xs text-slate-500">
                                                Order date {toFormDisplayDate(order.increment_date)}
                                                {order.branch?.name ? ` · ${order.branch.name}` : ''}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{toFormDisplayDate(order.effective_date)}</TableCell>
                                        <TableCell className="text-sm">
                                            {order.grant_count} granted
                                            {order.stop_count > 0 ? ` · ${order.stop_count} withheld` : ''}
                                        </TableCell>
                                        <TableCell className="text-right text-sm font-medium">
                                            {formatTakaWithSymbol(order.increment_total)}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {formatTakaWithSymbol(order.arrear_total)}
                                        </TableCell>
                                        <TableCell>{statusBadge(order.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Link href={route('salary-increments.show', order.id)}>
                                                <Button size="sm" variant="outline">Open</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {orders.meta && orders.meta.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
                            <span>
                                Page {orders.meta.current_page} of {orders.meta.last_page}
                            </span>
                            <div className="flex gap-2">
                                {orders.links?.prev && (
                                    <Link href={orders.links.prev} preserveState className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Link>
                                )}
                                {orders.links?.next && (
                                    <Link href={orders.links.next} preserveState className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200">
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </PageSurface>
        </Layout>
    );
}
