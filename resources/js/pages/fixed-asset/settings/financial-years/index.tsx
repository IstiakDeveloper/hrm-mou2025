import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { CalendarRange, Check, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { formatDisplayDate } from '@/lib/display-date';
import type { SharedData } from '@/types';

type YearRow = {
    id: number;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_closed: boolean;
};

export default function AssetFinancialYearIndex({
    financialYears,
    filters,
    currentYear,
}: {
    financialYears: { data: YearRow[] };
    filters: { search?: string };
    currentYear: { id: number; label: string; start_date: string; end_date: string } | null;
}) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');
    const canCreate = hasAppPermission(auth, 'fixed-assets.create');
    const canEdit = hasAppPermission(auth, 'fixed-assets.edit');
    const canDelete = hasAppPermission(auth, 'fixed-assets.delete');

    const handleSearch = () =>
        router.get(route('fixed-asset.settings.financial-years.index'), { search }, { preserveState: true });

    const handleDelete = (id: number) => {
        if (!confirm('Delete this financial year?')) return;
        router.delete(route('fixed-asset.settings.financial-years.destroy', id));
    };

    const handleActivate = (id: number) => {
        router.post(route('fixed-asset.settings.financial-years.activate', id));
    };

    return (
        <Layout>
            <Head title="Financial Years" />
            <AssetPage>
                <AssetPageHeader
                    icon={CalendarRange}
                    title="Financial Years"
                    description="Bangladesh financial year (July 1 – June 30). Depreciation calculation and reports use the active year."
                >
                    {canCreate && (
                        <Link href={route('fixed-asset.settings.financial-years.create')}>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-8.5 rounded-lg cursor-pointer">
                                <Plus className="mr-2 h-4 w-4" /> Add Year
                            </Button>
                        </Link>
                    )}
                </AssetPageHeader>

                {currentYear && (
                    <Alert className="mb-4 border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Active Financial Year</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">
                            {currentYear.label} ({formatDisplayDate(currentYear.start_date)} – {formatDisplayDate(currentYear.end_date)})
                        </AlertDescription>
                    </Alert>
                )}

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4 rounded-xl shadow-2xs">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-rose-800">Error</AlertTitle>
                        <AlertDescription className="text-xs text-rose-700 mt-1">{flash.error}</AlertDescription>
                    </Alert>
                )}

                <AssetSectionCard title="Filters" className="mb-1">
                    <div className="flex items-end gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Search</label>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Label (e.g. 2025-26)…"
                                className="h-9 border-zinc-200 w-64"
                            />
                        </div>
                        <Button className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs cursor-pointer px-3.5" onClick={handleSearch}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </AssetSectionCard>

                <AssetSectionCard title="All Financial Years" noPadding className="mt-4">
                    <Table>
                        <TableHeader className="bg-zinc-50/50">
                            <TableRow className="hover:bg-transparent border-zinc-100">
                                <TableHead className="font-semibold text-zinc-700 py-3.5 pl-6">Label</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Start Date</TableHead>
                                <TableHead className="font-semibold text-zinc-700">End Date</TableHead>
                                <TableHead className="font-semibold text-zinc-700">Status</TableHead>
                                <TableHead className="py-3.5 pr-6 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {financialYears.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-12 text-center text-zinc-400 font-medium">
                                        No financial years registered yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                financialYears.data.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-zinc-50/40 border-zinc-100 group transition-colors">
                                        <TableCell className="font-semibold text-zinc-900 py-3.5 pl-6">{row.label}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{formatDisplayDate(row.start_date)}</TableCell>
                                        <TableCell className="text-zinc-600 text-xs">{formatDisplayDate(row.end_date)}</TableCell>
                                        <TableCell>
                                            {row.is_active && (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">Active</Badge>
                                            )}
                                            {row.is_closed && (
                                                <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-100">Closed</Badge>
                                            )}
                                            {!row.is_active && !row.is_closed && (
                                                <Badge className="bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-50">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right py-3.5 pr-6 space-x-1.5">
                                            {canEdit && !row.is_active && !row.is_closed && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Activate Year"
                                                    onClick={() => handleActivate(row.id)}
                                                    className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canEdit && (
                                                <Link href={route('fixed-asset.settings.financial-years.edit', row.id)}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Edit Year"
                                                        className="h-8 w-8 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            )}
                                            {canDelete && !row.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Delete Year"
                                                    onClick={() => handleDelete(row.id)}
                                                    className="h-8 w-8 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </AssetSectionCard>
            </AssetPage>
        </Layout>
    );
}
