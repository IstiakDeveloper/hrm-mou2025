import React, { useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    PayrollBranchSelect,
    PayrollComboField,
    PayrollEmployeeSelect,
    PayrollField,
    PayrollMonthSelect,
    PayrollYearSelect,
} from '@/components/payroll/PayrollFilterGrid';
import { BookOpen, Filter, PenLine, Plus, Save, Search, Wallet, X } from 'lucide-react';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { hasAppPermission } from '@/lib/permissions';
import type { SharedData } from '@/types';
import { formatPfAmount, roundPfAmount } from '@/lib/pf-format';
import { cn } from '@/lib/utils';

type EmployeeRow = {
    id: number;
    pin: string | null;
    name_en: string | null;
    status: string;
    label: string;
    branch: string | null;
    department: string | null;
    own_contribution: number;
    org_contribution: number;
    pf_balance: number;
    pf_enrolled: boolean;
    has_opening: boolean;
    opening_transaction: {
        id: number;
        employee_amount: number;
        employer_amount: number;
        transaction_date: string | null;
        reference_no: string | null;
        notes: string | null;
    } | null;
};

type Props = {
    filters: Record<string, string | boolean>;
    pfList: EmployeeRow[];
    branches: { id: number; name: string; branch_code?: string | null }[];
    departments: { id: number; name: string }[];
    employees: { id: number; pin?: string; name_en?: string }[];
    months: { value: number; label: string }[];
    years: number[];
    defaultPfPeriod: { year: string; month: string };
};

const fmt = formatPfAmount;

const statusLabel = (status: string) => {
    const map: Record<string, string> = {
        active: 'Active',
        on_leave: 'On leave',
        inactive: 'Inactive',
        resigned: 'Resigned',
        terminated: 'Terminated',
    };
    return map[status] ?? status;
};

const defaultOpeningForm = () => ({
    employee_id: '',
    employee_amount: '',
    employer_amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    reference_no: '',
    notes: '',
});

const defaultManualForm = (year: string, month: string) => ({
    employee_id: '',
    employee_amount: '',
    employer_amount: '',
    year,
    month,
    reference_no: '',
    notes: '',
});

export default function ProvidentFundIndex({
    filters: init,
    pfList: rows,
    branches,
    departments,
    employees,
    months,
    years,
    defaultPfPeriod,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');

    const [filters, setFilters] = useState({
        search: String(init.search || ''),
        branch_id: String(init.branch_id || ''),
        department_id: String(init.department_id || ''),
        employee_id: String(init.employee_id || ''),
        enrolled_only: Boolean(init.enrolled_only),
    });
    const [showFilters, setShowFilters] = useState(true);

    const [openingOpen, setOpeningOpen] = useState(false);
    const [openingEditId, setOpeningEditId] = useState<number | null>(null);
    const [manualOpen, setManualOpen] = useState(false);
    const openingForm = useForm(defaultOpeningForm());
    const manualForm = useForm(defaultManualForm(defaultPfPeriod.year, defaultPfPeriod.month));

    const openingTotal = useMemo(() => {
        const own = roundPfAmount(openingForm.data.employee_amount);
        const org = roundPfAmount(openingForm.data.employer_amount);
        return own + org;
    }, [openingForm.data.employee_amount, openingForm.data.employer_amount]);

    const manualTotal = useMemo(() => {
        const own = roundPfAmount(manualForm.data.employee_amount);
        const org = roundPfAmount(manualForm.data.employer_amount);
        return own + org;
    }, [manualForm.data.employee_amount, manualForm.data.employer_amount]);

    const applyFilters = (next: Partial<typeof filters> = {}) => {
        const merged = { ...filters, ...next };
        setFilters(merged);
        router.get(route('provident-fund.index'), merged, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        applyFilters({
            search: '',
            branch_id: '',
            department_id: '',
            employee_id: '',
            enrolled_only: false,
        });
    };

    const closeOpeningModal = () => {
        setOpeningOpen(false);
        setOpeningEditId(null);
        openingForm.reset();
        openingForm.clearErrors();
    };

    const openInitialModal = (employeeId?: number) => {
        setOpeningEditId(null);
        openingForm.setData({
            ...defaultOpeningForm(),
            employee_id: employeeId ? String(employeeId) : '',
        });
        setOpeningOpen(true);
    };

    const openEditInitialModal = (row: EmployeeRow) => {
        const tx = row.opening_transaction;
        if (!tx) return;
        setOpeningEditId(tx.id);
        openingForm.setData({
            employee_id: String(row.id),
            employee_amount: String(tx.employee_amount),
            employer_amount: String(tx.employer_amount),
            transaction_date: tx.transaction_date || new Date().toISOString().slice(0, 10),
            reference_no: tx.reference_no || '',
            notes: tx.notes || '',
        });
        setOpeningOpen(true);
    };

    const closeManualModal = () => {
        setManualOpen(false);
        manualForm.reset();
        manualForm.clearErrors();
    };

    const openManualModal = (employeeId?: number) => {
        manualForm.setData({
            ...defaultManualForm(defaultPfPeriod.year, defaultPfPeriod.month),
            employee_id: employeeId ? String(employeeId) : '',
            notes: '',
        });
        setManualOpen(true);
    };

    const submitOpening = (e: React.FormEvent) => {
        e.preventDefault();
        if (openingEditId) {
            openingForm.transform((data) => ({
                employee_amount: data.employee_amount,
                employer_amount: data.employer_amount,
                transaction_date: data.transaction_date,
                reference_no: data.reference_no,
                notes: data.notes,
            }));
            openingForm.put(route('provident-fund.transactions.update', openingEditId), {
                onSuccess: () => closeOpeningModal(),
            });
            return;
        }
        openingForm.post(route('provident-fund.opening.store'), {
            onSuccess: () => closeOpeningModal(),
        });
    };

    const submitManual = (e: React.FormEvent) => {
        e.preventDefault();
        manualForm.post(route('provident-fund.manual.store'), {
            onSuccess: () => closeManualModal(),
        });
    };

    const totals = useMemo(
        () =>
            rows.reduce(
                (acc, r) => ({
                    own: acc.own + roundPfAmount(r.own_contribution),
                    org: acc.org + roundPfAmount(r.org_contribution),
                    balance: acc.balance + roundPfAmount(r.pf_balance),
                }),
                { own: 0, org: 0, balance: 0 },
            ),
        [rows],
    );

    const hasActiveFilters =
        Boolean(filters.search || filters.branch_id || filters.department_id || filters.employee_id || filters.enrolled_only);

    return (
        <StaffFundLayout title="PF Register" activeTab="pf-register" description="Provident Fund registry for employees with PF balance greater than zero.">
            {/* Search & Actions Bar - Compact */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                        <Input
                            placeholder="Search PIN, name..."
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters({})}
                            className="h-8 text-xs pl-8 border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white"
                        />
                        {filters.search && (
                            <button
                                type="button"
                                onClick={() => applyFilters({ search: '' })}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                    <Button onClick={() => applyFilters({})} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-3 rounded">
                        Search
                    </Button>
                </div>

                {canEdit && (
                    <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded" onClick={() => openManualModal()}>
                            <PenLine className="mr-1 h-3.5 w-3.5 text-zinc-500" />
                            Manual PF
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs border-zinc-200 bg-white hover:bg-zinc-50 rounded" onClick={() => openInitialModal()}>
                            <Plus className="mr-1 h-3.5 w-3.5 text-zinc-500" />
                            Initial Balance
                        </Button>
                    </div>
                )}
            </div>

            {/* Filter Toggle and Fields */}
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                        Employees Register
                        <span className="ml-1 text-[10px] font-normal text-zinc-400">({rows.length})</span>
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn("h-7 text-[11px] border-zinc-200 bg-white rounded", showFilters && "bg-emerald-50 text-emerald-700 border-emerald-100")}
                            onClick={() => setShowFilters((v) => !v)}
                        >
                            <Filter className="mr-1 h-3.5 w-3.5" />
                            Filters
                        </Button>
                        {hasActiveFilters && (
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-zinc-500 hover:text-zinc-800" onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </CardHeader>
                {showFilters && (
                    <div className="px-3 py-2.5 border-b border-zinc-100 bg-zinc-50/20 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-0.5">
                            <PayrollBranchSelect
                                value={filters.branch_id}
                                onChange={(v) => applyFilters({ branch_id: v })}
                                branches={branches}
                            />
                        </div>
                        <div className="space-y-0.5">
                            <PayrollComboField
                                label="Department"
                                value={filters.department_id}
                                onChange={(v) => applyFilters({ department_id: v })}
                                items={[
                                    { value: '', label: 'All departments' },
                                    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
                                ]}
                                placeholder="All departments"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <PayrollEmployeeSelect
                                value={filters.employee_id}
                                onChange={(v) => applyFilters({ employee_id: v })}
                                employees={employees}
                                forPf
                                branchId={filters.branch_id || undefined}
                            />
                        </div>
                        <div className="flex items-end h-full py-1">
                            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 font-medium">
                                <input
                                    type="checkbox"
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                    checked={filters.enrolled_only}
                                    onChange={(e) => applyFilters({ enrolled_only: e.target.checked })}
                                />
                                PF enrolled only
                            </label>
                        </div>
                    </div>
                )}

                {/* Table - High Density */}
                <CardContent className="p-0">
                    {rows.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-zinc-500">No employees match your search or filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50 border-b border-zinc-200/60">
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider pl-3">PIN</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Employee</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Branch</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Department</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Own Cont.</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Org Cont.</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Total Balance</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Initial Bal.</TableHead>
                                        <TableHead className="w-24 text-right pr-3 font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((e) => (
                                        <TableRow key={e.id} className="hover:bg-emerald-50/10 border-b border-zinc-100/80 transition-colors group">
                                            <TableCell className="pl-3 py-1.5 font-medium text-zinc-700">{e.pin || '—'}</TableCell>
                                            <TableCell className="py-1.5 font-semibold text-zinc-800">{e.name_en || '—'}</TableCell>
                                            <TableCell className="py-1.5">
                                                {e.status === 'active' || e.status === 'on_leave' ? (
                                                    <span className="inline-flex items-center rounded bg-emerald-50 px-1 py-0.2 text-[10px] font-medium text-emerald-800 border border-emerald-100">
                                                        {statusLabel(e.status)}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded bg-zinc-100 px-1 py-0.2 text-[10px] font-medium text-zinc-600 border border-zinc-200">
                                                        {statusLabel(e.status)}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-zinc-500 whitespace-nowrap">{e.branch || '—'}</TableCell>
                                            <TableCell className="py-1.5 text-zinc-500 whitespace-nowrap">{e.department || '—'}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{fmt(e.own_contribution)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{fmt(e.org_contribution)}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums font-bold text-zinc-850">{fmt(e.pf_balance)}</TableCell>
                                            <TableCell className="py-1.5">
                                                {e.has_opening ? (
                                                    <span className="inline-flex items-center rounded bg-emerald-50 px-1 py-0.2 text-[10px] font-medium text-emerald-800 border border-emerald-100">
                                                        Recorded
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-1.5 pr-3 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {canEdit && !e.has_opening && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-transparent hover:border-emerald-100"
                                                            onClick={() => openInitialModal(e.id)}
                                                            title="Record initial balance"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    {canEdit && e.has_opening && e.opening_transaction && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-transparent hover:border-emerald-100"
                                                            onClick={() => openEditInitialModal(e)}
                                                            title="Edit initial PF"
                                                        >
                                                            <PenLine className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    {canEdit && e.pf_balance > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-transparent hover:border-emerald-100"
                                                            asChild
                                                            title="Record withdrawal"
                                                        >
                                                            <Link href={staffFundPath(`/provident-fund/withdrawals?employee_id=${e.id}`)}>
                                                                <Wallet className="h-3 w-3" />
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 rounded border border-transparent hover:border-emerald-100"
                                                        asChild
                                                        title="View Ledger"
                                                    >
                                                        <Link href={route('provident-fund.ledger', e.id)}>
                                                            <BookOpen className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-zinc-50/80 font-bold border-t border-zinc-200">
                                        <TableCell colSpan={5} className="pl-3 py-2 text-zinc-700 uppercase text-[9px] tracking-wider">Total Sum</TableCell>
                                        <TableCell className="text-right py-2 tabular-nums text-zinc-800">{fmt(totals.own)}</TableCell>
                                        <TableCell className="text-right py-2 tabular-nums text-zinc-800">{fmt(totals.org)}</TableCell>
                                        <TableCell className="text-right py-2 tabular-nums text-zinc-900">{fmt(totals.balance)}</TableCell>
                                        <TableCell colSpan={2} />
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog for Initial Balance */}
            <Dialog open={openingOpen} onOpenChange={(open) => !open && closeOpeningModal()}>
                <DialogContent className="sm:max-w-md p-4 gap-3 border-zinc-200 rounded-lg shadow-lg">
                    <DialogHeader className="gap-0.5">
                        <DialogTitle className="text-sm font-bold text-zinc-800 uppercase tracking-wide">
                            {openingEditId ? 'Edit Initial PF' : 'Record Initial PF Balance'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-400">
                            Set employee's initial balance before system startup.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitOpening} className="space-y-3">
                        <PayrollEmployeeSelect
                            label="Employee"
                            value={openingForm.data.employee_id}
                            onChange={(v) => openingForm.setData('employee_id', v)}
                            employees={employees}
                            required
                            allowAll={false}
                            disabled={openingEditId !== null}
                            comboPortal={false}
                            forPf
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Own Cont. (Employee)</label>
                                <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={openingForm.data.employee_amount}
                                    onChange={(e) => openingForm.setData('employee_amount', e.target.value)}
                                    className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                    required
                                />
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Org Cont. (Employer)</label>
                                <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={openingForm.data.employer_amount}
                                    onChange={(e) => openingForm.setData('employer_amount', e.target.value)}
                                    className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] bg-zinc-50 border border-zinc-100 rounded px-2.5 py-1 text-zinc-600">
                            <span>Total Initial Balance:</span>
                            <span className="font-bold text-zinc-800 tabular-nums text-xs">{fmt(openingTotal)}</span>
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">As of Date</label>
                            <Input
                                type="date"
                                value={openingForm.data.transaction_date}
                                onChange={(e) => openingForm.setData('transaction_date', e.target.value)}
                                className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                required
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Reference</label>
                            <Input
                                value={openingForm.data.reference_no}
                                onChange={(e) => openingForm.setData('reference_no', e.target.value)}
                                placeholder="e.g. Opening balance ledger reference #"
                                className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Notes / Remarks</label>
                            <Textarea
                                value={openingForm.data.notes}
                                onChange={(e) => openingForm.setData('notes', e.target.value)}
                                rows={2}
                                placeholder="Notes about opening setup..."
                                className="text-xs border-zinc-200 focus-visible:ring-emerald-500 resize-none p-2 min-h-[50px]"
                            />
                        </div>
                        {(openingForm.errors.employee_amount || openingForm.errors.employee_id) && (
                            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 font-medium">
                                {openingForm.errors.employee_amount || openingForm.errors.employee_id}
                            </p>
                        )}
                        <DialogFooter className="border-t border-zinc-100 pt-2 flex items-center justify-end gap-1.5">
                            <Button type="button" variant="outline" onClick={closeOpeningModal} className="h-8 text-xs px-3 rounded">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={openingForm.processing} className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold">
                                <Save className="mr-1 h-3.5 w-3.5" /> Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog for Manual Entry */}
            <Dialog open={manualOpen} onOpenChange={(open) => !open && closeManualModal()}>
                <DialogContent className="sm:max-w-md p-4 gap-3 border-zinc-200 rounded-lg shadow-lg">
                    <DialogHeader className="gap-0.5">
                        <DialogTitle className="text-sm font-bold text-zinc-800 uppercase tracking-wide">Manual PF Entry</DialogTitle>
                        <DialogDescription className="text-xs text-zinc-400">
                            Post manual contributions outside the automatic salary run.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitManual} className="space-y-3">
                        <PayrollEmployeeSelect
                            label="Employee"
                            value={manualForm.data.employee_id}
                            onChange={(v) => manualForm.setData('employee_id', v)}
                            employees={employees}
                            required
                            allowAll={false}
                            comboPortal={false}
                            forPf
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                            <PayrollYearSelect
                                label="Year"
                                value={manualForm.data.year}
                                onChange={(v) => manualForm.setData('year', v)}
                                years={years}
                                required
                                className="h-8 text-xs"
                            />
                            <PayrollMonthSelect
                                label="Month"
                                value={manualForm.data.month}
                                onChange={(v) => manualForm.setData('month', v)}
                                months={months}
                                required
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Own Cont. (Employee)</label>
                                <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={manualForm.data.employee_amount}
                                    onChange={(e) => manualForm.setData('employee_amount', e.target.value)}
                                    className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                    required
                                />
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Org Cont. (Employer)</label>
                                <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={manualForm.data.employer_amount}
                                    onChange={(e) => manualForm.setData('employer_amount', e.target.value)}
                                    className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] bg-zinc-50 border border-zinc-100 rounded px-2.5 py-1 text-zinc-600">
                            <span>Contribution for Month:</span>
                            <span className="font-bold text-zinc-800 tabular-nums text-xs">{fmt(manualTotal)}</span>
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Reference</label>
                            <Input
                                value={manualForm.data.reference_no}
                                onChange={(e) => manualForm.setData('reference_no', e.target.value)}
                                placeholder="Bank receipt or voucher reference"
                                className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Reason / Notes</label>
                            <Textarea
                                value={manualForm.data.notes}
                                onChange={(e) => manualForm.setData('notes', e.target.value)}
                                rows={2}
                                placeholder="Provide reason..."
                                className="text-xs border-zinc-200 focus-visible:ring-emerald-500 resize-none p-2 min-h-[50px]"
                                required
                            />
                        </div>
                        {(manualForm.errors.employee_amount || manualForm.errors.month || manualForm.errors.notes) && (
                            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 font-medium">
                                {manualForm.errors.employee_amount || manualForm.errors.month || manualForm.errors.notes}
                            </p>
                        )}
                        <DialogFooter className="border-t border-zinc-100 pt-2 flex items-center justify-end gap-1.5">
                            <Button type="button" variant="outline" onClick={closeManualModal} className="h-8 text-xs px-3 rounded">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={manualForm.processing} className="h-8 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold">
                                <Save className="mr-1 h-3.5 w-3.5" /> Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </StaffFundLayout>
    );
}
