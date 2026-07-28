import React, { useCallback, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    Plus,
    Save,
    Trash2,
    Users,
} from 'lucide-react';

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    department_id: number | null;
    designation_id: number | null;
    current_branch_id: number | null;
    department?: { id: number; name: string } | null;
    designation?: { id: number; name: string } | null;
}

interface Branch {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

interface Designation {
    id: number;
    name: string;
}

interface BulkTransferProps {
    employees: Employee[];
    branches: Branch[];
    departments: Department[];
    designations: Designation[];
    suggestedOrderNo?: string;
}

type TransferRow = {
    id: string;
    employeeId: string;
    effectiveDate: string;
    transferOrderNo: string;
    toDepartmentId: string;
    toDesignationId: string;
    expanded: boolean;
};

let rowSeq = 0;

function newRowId() {
    rowSeq += 1;
    return `transfer-row-${rowSeq}`;
}

function generateOrderNo(): string {
    const date = format(new Date(), 'yyyyMMdd');
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `TRF-${date}-${rand}`;
}

function todayIso(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

export default function BulkTransfer({
    employees,
    branches,
    departments,
    designations,
    suggestedOrderNo,
}: BulkTransferProps) {
    const branchItems = useMemo(() => branchComboSelectItems(branches), [branches]);
    const employeeItems = useMemo(
        () =>
            employees.map((e) => ({
                value: e.id,
                label: `${e.employee_id} — ${employeeDisplayName(e)}`.trim(),
                keywords: `${e.employee_id} ${employeeDisplayName(e)}`,
            })),
        [employees],
    );

    const departmentItems = useMemo(
        () => [
            { value: 'same', label: 'Same as current' },
            ...departments.map((d) => ({
                value: String(d.id),
                label: d.name,
                keywords: d.name,
            })),
        ],
        [departments],
    );

    const designationItems = useMemo(
        () => [
            { value: 'same', label: 'Same as current' },
            ...designations.map((d) => ({
                value: String(d.id),
                label: d.name,
                keywords: d.name,
            })),
        ],
        [designations],
    );

    const [toBranchId, setToBranchId] = useState('');
    const [reason, setReason] = useState('');
    const [rows, setRows] = useState<TransferRow[]>([
        {
            id: newRowId(),
            employeeId: '',
            effectiveDate: todayIso(),
            transferOrderNo: suggestedOrderNo ?? generateOrderNo(),
            toDepartmentId: 'same',
            toDesignationId: 'same',
            expanded: false,
        },
    ]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const employeesById = useMemo(
        () => new Map(employees.map((e) => [String(e.id), e])),
        [employees],
    );

    const branchesById = useMemo(
        () => new Map(branches.map((b) => [String(b.id), b])),
        [branches],
    );

    const usedEmployeeIds = useMemo(
        () => new Set(rows.map((r) => r.employeeId).filter(Boolean)),
        [rows],
    );

    const updateRow = useCallback((id: string, patch: Partial<TransferRow>) => {
        setRows((current) =>
            current.map((row) => {
                if (row.id !== id) {
                    return row;
                }

                const next = { ...row, ...patch };

                if (patch.employeeId !== undefined && patch.employeeId && !row.transferOrderNo) {
                    next.transferOrderNo = generateOrderNo();
                }

                if (patch.employeeId !== undefined && patch.employeeId && !row.effectiveDate) {
                    next.effectiveDate = todayIso();
                }

                return next;
            }),
        );
    }, []);

    const addRow = () => {
        setRows((current) => [
            ...current,
            {
                id: newRowId(),
                employeeId: '',
                effectiveDate: todayIso(),
                transferOrderNo: generateOrderNo(),
                toDepartmentId: 'same',
                toDesignationId: 'same',
                expanded: false,
            },
        ]);
    };

    const removeRow = (id: string) => {
        setRows((current) => (current.length <= 1 ? current : current.filter((r) => r.id !== id)));
    };

    const toggleExpanded = (id: string) => {
        setRows((current) =>
            current.map((row) => (row.id === id ? { ...row, expanded: !row.expanded } : row)),
        );
    };

    const validate = () => {
        const nextErrors: Record<string, string> = {};

        if (!toBranchId) {
            nextErrors.to_branch_id = 'Destination branch is required';
        }

        if (!reason.trim()) {
            nextErrors.reason = 'Reason is required';
        }

        const filledRows = rows.filter((r) => r.employeeId);
        if (filledRows.length === 0) {
            nextErrors.rows = 'Add at least one employee';
        }

        filledRows.forEach((row, index) => {
            if (!row.effectiveDate) {
                nextErrors[`rows.${index}.effective_date`] = 'Effective date is required';
            }

            const employee = employeesById.get(row.employeeId);
            if (employee?.current_branch_id?.toString() === toBranchId) {
                nextErrors[`rows.${index}.employee_id`] = 'Destination must differ from current branch';
            }
        });

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            return;
        }

        setSubmitting(true);

        router.post(
            route('transfers.bulk.store'),
            {
                to_branch_id: toBranchId,
                reason,
                rows: rows
                    .filter((r) => r.employeeId)
                    .map((r) => ({
                        employee_id: r.employeeId,
                        effective_date: r.effectiveDate,
                        transfer_order_no: r.transferOrderNo || null,
                        to_department_id: r.toDepartmentId === 'same' ? null : r.toDepartmentId,
                        to_designation_id: r.toDesignationId === 'same' ? null : r.toDesignationId,
                    })),
            },
            {
                onError: (errs) => {
                    setErrors(errs as Record<string, string>);
                    setSubmitting(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const filledCount = rows.filter((r) => r.employeeId).length;

    return (
        <Layout>
            <Head title="Bulk Transfer" />

            <div className="container mx-auto py-6">
                <div className="mb-4">
                    <Link href={route('transfers.index')} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Transfers
                    </Link>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bulk Transfer</h1>
                        <p className="text-sm text-gray-500">Transfer multiple employees in one submission</p>
                    </div>
                    <Link href={route('transfers.create')}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                            Single transfer
                        </Button>
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Common details</CardTitle>
                            <CardDescription className="text-xs">
                                Destination branch and reason apply to all rows. Department and designation stay the same unless expanded per employee.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Destination branch</Label>
                                <ComboSelect<string>
                                    value={toBranchId || null}
                                    onChange={(v) => setToBranchId(v ?? '')}
                                    placeholder="Select destination branch…"
                                    items={branchItems}
                                />
                                {errors.to_branch_id && (
                                    <p className="text-xs font-medium text-red-500">{errors.to_branch_id}</p>
                                )}
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-xs">Reason for transfer</Label>
                                <Textarea
                                    rows={2}
                                    className="text-sm"
                                    placeholder="Provide the reason for these transfers"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                                {errors.reason && (
                                    <p className="text-xs font-medium text-red-500">{errors.reason}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>{filledCount} employee{filledCount === 1 ? '' : 's'} selected</span>
                        </div>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={addRow}>
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add row
                        </Button>
                    </div>

                    {errors.rows && <p className="text-xs font-medium text-red-500">{errors.rows}</p>}

                    <Card className="overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                        <TableHead className="w-10 text-xs">#</TableHead>
                                        <TableHead className="min-w-[220px] text-xs">Employee</TableHead>
                                        <TableHead className="min-w-[140px] text-xs">Current branch</TableHead>
                                        <TableHead className="min-w-[120px] text-xs">Department</TableHead>
                                        <TableHead className="min-w-[120px] text-xs">Designation</TableHead>
                                        <TableHead className="min-w-[130px] text-xs">Effective date</TableHead>
                                        <TableHead className="min-w-[150px] text-xs">Order no.</TableHead>
                                        <TableHead className="w-20 text-xs text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((row, index) => {
                                        const employee = row.employeeId ? employeesById.get(row.employeeId) : undefined;
                                        const currentBranch = employee?.current_branch_id
                                            ? branchesById.get(String(employee.current_branch_id))
                                            : undefined;
                                        const rowEmployeeItems = employeeItems.filter(
                                            (item) =>
                                                String(item.value) === row.employeeId ||
                                                !usedEmployeeIds.has(String(item.value)),
                                        );

                                        return (
                                            <React.Fragment key={row.id}>
                                                <TableRow className="align-top">
                                                    <TableCell className="py-2 text-xs text-gray-500">{index + 1}</TableCell>
                                                    <TableCell className="py-2">
                                                        <ComboSelect<number>
                                                            value={row.employeeId ? Number(row.employeeId) : null}
                                                            onChange={(v) => updateRow(row.id, { employeeId: v ? String(v) : '' })}
                                                            placeholder="Search employee…"
                                                            items={rowEmployeeItems}
                                                        />
                                                        {errors[`rows.${index}.employee_id`] && (
                                                            <p className="mt-1 text-[11px] text-red-500">
                                                                {errors[`rows.${index}.employee_id`]}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-gray-700">
                                                        {currentBranch?.name ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-gray-700">
                                                        {employee?.department?.name ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-gray-700">
                                                        {employee?.designation?.name ?? '—'}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Input
                                                            type="date"
                                                            className="h-8 text-xs"
                                                            value={row.effectiveDate}
                                                            onChange={(e) => updateRow(row.id, { effectiveDate: e.target.value })}
                                                        />
                                                        {errors[`rows.${index}.effective_date`] && (
                                                            <p className="mt-1 text-[11px] text-red-500">
                                                                {errors[`rows.${index}.effective_date`]}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Input
                                                            className="h-8 text-xs"
                                                            value={row.transferOrderNo}
                                                            onChange={(e) => updateRow(row.id, { transferOrderNo: e.target.value })}
                                                            placeholder="Auto-generated"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0"
                                                                onClick={() => toggleExpanded(row.id)}
                                                                title={row.expanded ? 'Hide overrides' : 'Change department/designation'}
                                                            >
                                                                {row.expanded ? (
                                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 text-rose-600"
                                                                onClick={() => removeRow(row.id)}
                                                                disabled={rows.length <= 1}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>

                                                {row.expanded && (
                                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                                        <TableCell />
                                                        <TableCell colSpan={7} className="py-3">
                                                            <div className="grid gap-3 sm:grid-cols-2">
                                                                <div className="space-y-1">
                                                                    <Label className="text-[11px] text-gray-500">Destination department</Label>
                                                                    <ComboSelect<string>
                                                                        value={row.toDepartmentId}
                                                                        onChange={(v) => updateRow(row.id, { toDepartmentId: v ?? 'same' })}
                                                                        items={departmentItems}
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[11px] text-gray-500">Destination designation</Label>
                                                                    <ComboSelect<string>
                                                                        value={row.toDesignationId}
                                                                        onChange={(v) => updateRow(row.id, { toDesignationId: v ?? 'same' })}
                                                                        items={designationItems}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Alert className="border-blue-200 bg-blue-50">
                        <AlertDescription className="text-xs text-blue-700">
                            Each row gets its own effective date and transfer order number. Transfers are approved on creation; past or today&apos;s dates apply immediately, future dates complete automatically.
                        </AlertDescription>
                    </Alert>

                    <div className="flex justify-end gap-2">
                        <Link href={route('transfers.index')}>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={submitting || filledCount === 0} className="bg-emerald-600 hover:bg-emerald-700">
                            <Save className="mr-2 h-4 w-4" />
                            {submitting ? 'Saving…' : `Create ${filledCount || ''} transfer${filledCount === 1 ? '' : 's'}`}
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
