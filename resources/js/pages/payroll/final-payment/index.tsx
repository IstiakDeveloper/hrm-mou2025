import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import { DataTablePagination, type PaginationMeta } from '@/components/DataTablePagination';
import { PayrollBranchSelect } from '@/components/payroll/PayrollFilterGrid';
import { PayrollEmptyState, PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Layout from '@/layouts/AdminLayout';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatTakaWhole } from '@/lib/taka-format';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { Eye, HandCoins, Plus, RotateCcw, Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    branch?: { name: string } | null;
    last_branch?: { name: string } | null;
};

type FinalPaymentRow = {
    id: number;
    status: 'pending' | 'paid';
    pf_balance: number;
    gratuity_amount: number;
    loan_outstanding: number;
    net_payable: number;
    payment_date: string | null;
    employee: Employee;
    separation: { id: number; separation_date: string; reason: string | null };
};

type Paginated<T> = {
    data: T[];
    links?: { first: string; last: string; prev: string | null; next: string | null };
    meta?: PaginationMeta;
};

type Props = {
    records: Paginated<FinalPaymentRow>;
    pendingCount: number;
    filters: Record<string, string>;
    branches: { id: number; name: string; branch_code?: string | null }[];
    canGenerate: boolean;
};

type InactiveEmployeeOption = EmployeeNameFields & {
    id: number;
    pin?: string | null;
    employee_id?: string | null;
    status: 'inactive';
    separation_date?: string | null;
};

function statusBadge(status: FinalPaymentRow['status']) {
    if (status === 'paid') {
        return <Badge className="border-0 bg-emerald-600 text-white">Paid</Badge>;
    }

    return <Badge className="border-0 bg-amber-500 text-white">Pending</Badge>;
}

export default function FinalPaymentIndex({ records, pendingCount, filters: init, branches, canGenerate }: Props) {
    const [status, setStatus] = useState(init.status || 'all');
    const [branchId, setBranchId] = useState(init.branch_id || '');
    const [search, setSearch] = useState(init.search || '');
    const [perPage, setPerPage] = useState(init.per_page || '10');
    const [generateOpen, setGenerateOpen] = useState(false);
    const [employeeQuery, setEmployeeQuery] = useState('');
    const [inactiveEmployees, setInactiveEmployees] = useState<InactiveEmployeeOption[]>([]);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const generateForm = useForm({ employee_id: '' });

    useEffect(() => {
        if (!generateOpen) {
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setLookupLoading(true);
            setLookupError('');

            try {
                const response = await fetch(
                    route('final-payments.employees.lookup', {
                        q: employeeQuery.trim() || undefined,
                        limit: 50,
                    }),
                    {
                        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                        credentials: 'same-origin',
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error(`Employee lookup failed (${response.status})`);
                }

                setInactiveEmployees((await response.json()) as InactiveEmployeeOption[]);
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setInactiveEmployees([]);
                    setLookupError('Employee list could not be loaded. Please try again.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLookupLoading(false);
                }
            }
        }, 300);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [employeeQuery, generateOpen]);

    const inactiveEmployeeItems = useMemo<ComboSelectItem<string>[]>(
        () =>
            inactiveEmployees.map((employee) => {
                const pin = employee.pin || employee.employee_id || `#${employee.id}`;
                const name = employeeDisplayName(employee, 'Unnamed employee');
                const date = employee.separation_date ? ` · Left ${format(new Date(employee.separation_date), 'dd MMM yyyy')}` : '';

                return {
                    value: String(employee.id),
                    label: `${pin} — ${name}${date}`,
                    keywords: `${pin} ${employee.employee_id ?? ''} ${employee.name_en ?? ''} ${employee.name_bn ?? ''}`,
                };
            }),
        [inactiveEmployees],
    );

    const apply = () =>
        router.get(
            route('final-payments.index'),
            {
                status,
                branch_id: branchId,
                search: search.trim(),
                per_page: perPage,
            },
            { preserveState: true, replace: true },
        );

    const resetFilters = () => {
        setStatus('all');
        setBranchId('');
        setSearch('');
        router.get(route('final-payments.index'), { status: 'all', per_page: perPage }, { preserveState: true, replace: true });
    };

    const changePerPage = (value: string) => {
        setPerPage(value);
        router.get(
            route('final-payments.index'),
            {
                status,
                branch_id: branchId,
                search: search.trim(),
                per_page: value,
            },
            { preserveState: true, replace: true },
        );
    };

    const submitGenerate = (event: React.FormEvent) => {
        event.preventDefault();
        generateForm.post(route('final-payments.generate'), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const setGenerateDialogOpen = (open: boolean) => {
        setGenerateOpen(open);
        if (!open) {
            generateForm.reset();
            generateForm.clearErrors();
            setEmployeeQuery('');
            setInactiveEmployees([]);
            setLookupError('');
        }
    };

    return (
        <Layout>
            <Head title="Final Payment" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={HandCoins}
                    title="Final Payment"
                    description="Separation settlement — PF refund, gratuity eligibility, outstanding loans, and net payable."
                >
                    {canGenerate && (
                        <Button size="sm" onClick={() => setGenerateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="mr-1.5 h-4 w-4" />
                            Generate
                        </Button>
                    )}
                </PayrollPageHeader>

                {pendingCount > 0 && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {pendingCount} separation{pendingCount === 1 ? '' : 's'} awaiting final payment.
                    </div>
                )}

                <PayrollSectionCard title="Filters" className="mb-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">Status</label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <PayrollBranchSelect value={branchId} onChange={setBranchId} branches={branches} allowAll />
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">Search</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Name, PIN, or employee ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && apply()}
                                    />
                                </div>
                                <Button onClick={apply} className="bg-emerald-600 hover:bg-emerald-700">
                                    Apply
                                </Button>
                                <Button variant="outline" size="icon" onClick={resetFilters} title="Reset filters">
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="Settlement queue" description="Created automatically when a separation is completed.">
                    {records.data.length === 0 ? (
                        <PayrollEmptyState message="No final payment records found." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Separation</TableHead>
                                    <TableHead className="text-right">PF</TableHead>
                                    <TableHead className="text-right">Gratuity</TableHead>
                                    <TableHead className="text-right">Loan (−)</TableHead>
                                    <TableHead className="text-right">Net payable</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{employeeDisplayName(row.employee)}</div>
                                            <div className="text-xs text-slate-500">
                                                {row.employee.employee_id}
                                                {(row.employee.branch?.name || row.employee.last_branch?.name) && (
                                                    <> · {row.employee.branch?.name || row.employee.last_branch?.name}</>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {format(new Date(row.separation.separation_date), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm">৳{formatTakaWhole(row.pf_balance)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">৳{formatTakaWhole(row.gratuity_amount)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm text-rose-700">
                                            ৳{formatTakaWhole(row.loan_outstanding)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-semibold">
                                            ৳{formatTakaWhole(row.net_payable)}
                                        </TableCell>
                                        <TableCell>{statusBadge(row.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={route('final-payments.show', row.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    <div className="-mx-4 mt-4 -mb-4">
                        <DataTablePagination meta={records.meta} links={records.links} perPage={perPage} onPerPageChange={changePerPage} />
                    </div>
                </PayrollSectionCard>

                <Dialog open={generateOpen} onOpenChange={setGenerateDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <form onSubmit={submitGenerate}>
                            <DialogHeader>
                                <DialogTitle>Generate final payment</DialogTitle>
                                <DialogDescription>
                                    Search and select an inactive employee by name, PIN, or employee ID. PF, gratuity, and active loan balances will
                                    be calculated automatically.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-5">
                                <label className="mb-1.5 block text-xs font-medium text-slate-600">Inactive employee</label>
                                <ComboSelect
                                    value={generateForm.data.employee_id || null}
                                    onChange={(value) => {
                                        generateForm.setData('employee_id', value ?? '');
                                        generateForm.clearErrors('employee_id');
                                    }}
                                    items={inactiveEmployeeItems}
                                    placeholder={lookupLoading ? 'Loading employees...' : 'Search by name, PIN, or employee ID'}
                                    portal={false}
                                    onQueryChange={setEmployeeQuery}
                                />
                                {lookupLoading && <p className="mt-1.5 text-xs text-slate-500">Searching inactive employees...</p>}
                                {lookupError && <p className="mt-1.5 text-xs text-red-600">{lookupError}</p>}
                                {generateForm.errors.employee_id && <p className="mt-1.5 text-xs text-red-600">{generateForm.errors.employee_id}</p>}
                                <p className="mt-2 text-xs text-slate-500">
                                    Only inactive employees are listed. Active employees must complete the regular separation process first.
                                </p>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={generateForm.processing || generateForm.data.employee_id === ''}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {generateForm.processing ? 'Generating...' : 'Generate payment'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </PayrollPage>
        </Layout>
    );
}
