import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Plus, RotateCcw, Search, Trash2, UserRound, Wallet, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { DataTablePagination, PaginationMeta } from '@/components/DataTablePagination';

type Head = {
    id: number;
    name: string;
    name_bn: string | null;
    type: string;
    default_amount_type: string;
    default_amount: string;
    is_active: boolean;
};

type CustomOverride = {
    employee_id: number;
    pin: string;
    name: string;
    branch?: string | null;
    grade?: string | null;
    step?: number | null;
    has_custom_basic: boolean;
    custom_basic?: number | null;
    override_count: number;
    custom_assigned_at?: string | null;
};

type Paginated = { data: Head[]; meta: PaginationMeta; links: any };

function formatDefault(type: string, amount: string | number): string {
    const n = Number(amount);
    if (type === 'percentage') return `${n}% of basic`;
    return formatTakaWithSymbol(n);
}

export default function SalaryHeadIndex({
    heads,
    filters,
    customOverrides = [],
    canResetOverrides = false,
}: {
    heads: Paginated;
    filters: { search?: string; override_search?: string };
    customOverrides?: CustomOverride[];
    canResetOverrides?: boolean;
}) {
    const { flash } = usePage().props as {
        flash?: { success?: string; error?: string; warning?: string };
    };
    const [search, setSearch] = useState(filters.search || '');
    const [overrideSearch, setOverrideSearch] = useState(filters.override_search || '');
    const [resetting, setResetting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const listedIds = useMemo(
        () => customOverrides.map((row) => row.employee_id),
        [customOverrides],
    );

    useEffect(() => {
        setSelectedIds((prev) => prev.filter((id) => listedIds.includes(id)));
    }, [listedIds]);

    const allListedSelected = listedIds.length > 0 && listedIds.every((id) => selectedIds.includes(id));
    const someListedSelected = listedIds.some((id) => selectedIds.includes(id));

    const toggleOne = (employeeId: number, checked: boolean) => {
        setSelectedIds((prev) => {
            if (checked) {
                return prev.includes(employeeId) ? prev : [...prev, employeeId];
            }
            return prev.filter((id) => id !== employeeId);
        });
    };

    const toggleAllListed = (checked: boolean) => {
        if (checked) {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...listedIds])));
            return;
        }
        setSelectedIds((prev) => prev.filter((id) => !listedIds.includes(id)));
    };

    const handleSearch = () =>
        router.get(route('salary-heads.index'), { search, override_search: overrideSearch }, { preserveState: true });

    const handleOverrideSearch = () =>
        router.get(route('salary-heads.index'), { search, override_search: overrideSearch }, { preserveState: true });

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Remove "${name}"? This cannot be undone if unused in structures.`)) {
            router.delete(route('salary-heads.destroy', id));
        }
    };

    const resetOne = (row: CustomOverride) => {
        if (
            !confirm(
                `Reset custom salary for ${row.pin} — ${row.name}?\n\nBasic and component overrides will be cleared. Payroll will use grade/step (or component defaults).`,
            )
        ) {
            return;
        }
        setResetting(true);
        router.post(
            route('salary-heads.custom-overrides.reset', row.employee_id),
            { search, override_search: overrideSearch },
            {
                preserveScroll: true,
                onFinish: () => setResetting(false),
                onSuccess: () => setSelectedIds((prev) => prev.filter((id) => id !== row.employee_id)),
            },
        );
    };

    const resetSelected = () => {
        if (selectedIds.length === 0) return;
        if (
            !confirm(
                `Reset custom salary for ${selectedIds.length} selected employee(s)?\n\nCustom basic and assignment component overrides will be cleared.`,
            )
        ) {
            return;
        }
        setResetting(true);
        router.post(
            route('salary-heads.custom-overrides.reset-selected'),
            { employee_ids: selectedIds, search, override_search: overrideSearch },
            {
                preserveScroll: true,
                onFinish: () => setResetting(false),
                onSuccess: () => setSelectedIds([]),
            },
        );
    };

    const resetAll = () => {
        if (customOverrides.length === 0) return;
        if (
            !confirm(
                `Reset custom salary for all ${customOverrides.length} listed employee(s)?\n\nThis clears custom basic and "Employee salary assignment" component overrides so grade/step applies.`,
            )
        ) {
            return;
        }
        setResetting(true);
        router.post(
            route('salary-heads.custom-overrides.reset-all'),
            { search, override_search: overrideSearch },
            {
                preserveScroll: true,
                onFinish: () => setResetting(false),
                onSuccess: () => setSelectedIds([]),
            },
        );
    };

    const additions = heads.data.filter((h) => h.type === 'earning');
    const deductions = heads.data.filter((h) => h.type === 'deduction');

    return (
        <Layout>
            <Head title="Salary components" />
            <PageSurface>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div className="max-w-xl">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Salary Components</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Building blocks of pay — Basic, allowances, PF, tax, etc.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={() => {
                                        setSearch('');
                                        router.get(route('salary-heads.index'), { search: '', override_search: overrideSearch }, { preserveState: true });
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={handleSearch} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Search
                            </Button>
                            <Link href={route('salary-heads.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Component
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-100 bg-emerald-50/40 text-emerald-900 rounded-xl">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700/90 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.warning && (
                    <Alert className="mb-4 border-amber-100 bg-amber-50/40 text-amber-900 rounded-xl">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-800">Notice</AlertTitle>
                        <AlertDescription className="text-xs text-amber-800/90 mt-1">{flash.warning}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4 rounded-xl">
                        <AlertTitle className="text-xs font-bold uppercase tracking-wider">Error</AlertTitle>
                        <AlertDescription className="text-xs mt-1">{flash.error}</AlertDescription>
                    </Alert>
                )}

                <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <Card className="shadow-sm">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">{heads.meta?.total ?? heads.data.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-emerald-100">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-emerald-700">Additions</p>
                            <p className="text-2xl font-bold text-emerald-800">{additions.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm border-rose-100">
                        <CardContent className="pt-4 pb-3">
                            <p className="text-xs text-rose-700">Deductions</p>
                            <p className="text-2xl font-bold text-rose-800">{deductions.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-6 shadow-sm border-amber-200 rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-amber-50/60 border-b border-amber-100">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base text-amber-950">
                                    <UserRound className="h-5 w-5 text-amber-700" />
                                    Custom / override salary ({customOverrides.length})
                                </CardTitle>
                                <CardDescription className="mt-1 text-amber-900/70">
                                    Employees who have grade &amp; step, but also have custom basic or component overrides
                                    from employee salary assignment. Reset removes those so payroll uses grade/step (or
                                    component defaults).
                                </CardDescription>
                            </div>
                            {canResetOverrides && customOverrides.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={resetting || selectedIds.length === 0}
                                        onClick={resetSelected}
                                        className="h-9 border-amber-300 bg-white text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                                    >
                                        <RotateCcw className="mr-1.5 h-4 w-4" />
                                        Reset selected{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={resetting}
                                        onClick={resetAll}
                                        className="h-9 border-amber-300 bg-white text-amber-900 hover:bg-amber-50"
                                    >
                                        <RotateCcw className="mr-1.5 h-4 w-4" />
                                        Reset all
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Filter by PIN or name..."
                                    value={overrideSearch}
                                    onChange={(e) => setOverrideSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleOverrideSearch()}
                                    className="h-9 rounded-lg border-amber-200 bg-white pl-9 text-sm"
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-9"
                                onClick={handleOverrideSearch}
                            >
                                Filter
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {customOverrides.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                No grade/step employees with custom salary overrides.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-amber-100 bg-amber-50/40">
                                        {canResetOverrides && (
                                            <TableHead className="h-11 w-12 pl-4">
                                                <Checkbox
                                                    checked={
                                                        allListedSelected
                                                            ? true
                                                            : someListedSelected
                                                              ? 'indeterminate'
                                                              : false
                                                    }
                                                    onCheckedChange={(value) => toggleAllListed(value === true)}
                                                    aria-label="Select all listed employees"
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead className="h-11 pl-6 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            PIN
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Employee
                                        </TableHead>
                                        <TableHead className="hidden h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700 md:table-cell">
                                            Branch
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Grade / Step
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Override
                                        </TableHead>
                                        <TableHead className="h-11 w-28 pr-6 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customOverrides.map((row) => (
                                        <TableRow
                                            key={row.employee_id}
                                            className={cn(
                                                'border-b border-slate-100',
                                                selectedIds.includes(row.employee_id) && 'bg-amber-50/40',
                                            )}
                                        >
                                            {canResetOverrides && (
                                                <TableCell className="pl-4">
                                                    <Checkbox
                                                        checked={selectedIds.includes(row.employee_id)}
                                                        onCheckedChange={(value) =>
                                                            toggleOne(row.employee_id, value === true)
                                                        }
                                                        aria-label={`Select ${row.pin}`}
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell className="pl-6 font-mono text-[13px] font-semibold text-slate-800">
                                                {row.pin}
                                            </TableCell>
                                            <TableCell className="text-[13px] text-slate-800">{row.name}</TableCell>
                                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                                                {row.branch || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-700">
                                                {row.grade || '—'}
                                                {row.step != null ? ` / Step ${row.step}` : ''}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {row.has_custom_basic && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            Custom basic
                                                            {row.custom_basic != null
                                                                ? `: ${formatTakaWithSymbol(row.custom_basic)}`
                                                                : ''}
                                                        </Badge>
                                                    )}
                                                    {row.override_count > 0 && (
                                                        <Badge variant="outline" className="font-normal">
                                                            {row.override_count} component
                                                            {row.override_count === 1 ? '' : 's'}
                                                        </Badge>
                                                    )}
                                                    {!row.has_custom_basic && row.override_count === 0 && (
                                                        <Badge variant="outline" className="font-normal">
                                                            Flagged
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                {canResetOverrides ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={resetting}
                                                        onClick={() => resetOne(row)}
                                                        className="h-8 text-amber-800 hover:bg-amber-50 hover:text-amber-950"
                                                    >
                                                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                                        Reset
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">View only</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-white border-b border-slate-200">
                        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                            <Wallet className="h-5 w-5 text-emerald-600" />
                            All components
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {heads.data.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No components yet.{' '}
                                <Link href={route('salary-heads.create')} className="text-violet-700 font-medium underline">
                                    Add your first one
                                </Link>
                                .
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6 w-16">#</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Name</TableHead>
                                        <TableHead className="hidden md:table-cell font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Bangla</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Type</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Default</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6 w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {heads.data.map((h, i) => (
                                        <TableRow key={h.id} className={cn(!h.is_active && 'opacity-50', 'hover:bg-slate-50 transition-colors border-b border-slate-100 group')}>
                                            <TableCell className="pl-6 text-slate-500 text-[13px]">{i + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-[13px] text-slate-800">{h.name}</div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                                {h.name_bn || '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={h.type === 'earning' ? 'default' : 'destructive'}
                                                    className={cn(
                                                        'font-normal',
                                                        h.type === 'earning' && 'bg-emerald-600 hover:bg-emerald-600',
                                                    )}
                                                >
                                                    {h.type === 'earning' ? 'Addition' : 'Deduction'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDefault(h.default_amount_type, h.default_amount)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={h.is_active ? 'secondary' : 'outline'}>
                                                    {h.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex justify-end gap-2 transition-opacity duration-200">
                                                    <Link href={route('salary-heads.edit', h.id)}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" title="Edit">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                                                        title="Delete"
                                                        onClick={() => handleDelete(h.id, h.name)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                        <DataTablePagination
                            meta={heads.meta}
                            links={heads.links}
                            perPage={filters.search ? '10' : '10'}
                            onPerPageChange={() => {
                                router.get(route('salary-heads.index'), { search: filters.search, override_search: overrideSearch }, { preserveState: true });
                            }}
                        />
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
