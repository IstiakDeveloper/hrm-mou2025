import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Check, AlertCircle, ChevronDown } from 'lucide-react';
import InputError from '@/components/input-error';
import { isValidImportDate, parseImportDate } from '@/lib/import-date';

type Status = 'active' | 'inactive';

interface Option {
    id: number;
    name: string;
}

interface PreviewRow {
    source_row: number;
    pin: string;
    name_en: string;
    name_bn?: string;
    employee_type: string;
    email: string;
    mobile_personal: string;
    joining_date: string;
    department: string;
    joining_designation: string;
    last_designation: string;
    current_branch: string;
    last_branch: string;
    status: string;
}

interface FormRow {
    source_row: number;
    pin: string;
    name_en: string;
    email: string;
    mobile_personal: string;
    employee_type_id: string;
    joining_date: string;
    department_id: string;
    joining_designation_id: string;
    last_designation_id: string;
    current_branch_id: string;
    last_branch_id: string;
    status: Status;
}

interface ImportReviewProps {
    importId: string;
    rows: PreviewRow[];
    existingPins?: string[];
    existingEmails?: string[];
    existingMobiles?: string[];
    commitErrorsByRow?: Record<string, string[]>;
    departments: Option[];
    designations: Option[];
    branches: Option[];
    employeeTypes: Option[];
    statuses: Status[];
    errors?: Record<string, string>;
}

function asIdOrEmpty(raw: string): string {
    const v = (raw || '').trim();
    return /^\d+$/.test(v) ? v : '';
}

function resolveOptionId(raw: string, options: Option[]): string {
    const v = (raw || '').trim();
    if (!v) return '';
    if (/^\d+$/.test(v)) return v;
    const lower = v.toLowerCase();
    const match = options.find((o) => o.name.trim().toLowerCase() === lower);
    return match ? String(match.id) : '';
}

function isValidEmail(email: string): boolean {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function computeIssuesByRow(
    rows: FormRow[],
    existing: { pins: Set<string>; emails: Set<string>; mobiles: Set<string> },
): Record<number, string[]> {
    const pinCounts = new Map<string, number>();
    const emailCounts = new Map<string, number>();
    const mobileCounts = new Map<string, number>();

    for (const r of rows) {
        const pin = r.pin.trim().toLowerCase();
        const email = r.email.trim().toLowerCase();
        const mobile = r.mobile_personal.trim();
        if (pin) pinCounts.set(pin, (pinCounts.get(pin) ?? 0) + 1);
        if (email) emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
        if (mobile) mobileCounts.set(mobile, (mobileCounts.get(mobile) ?? 0) + 1);
    }

    const issuesByRow: Record<number, string[]> = {};

    for (const r of rows) {
        const issues: string[] = [];
        const pin = r.pin.trim();
        const pinKey = pin.toLowerCase();
        const email = r.email.trim();
        const emailKey = email.toLowerCase();
        const mobile = r.mobile_personal.trim();

        if (!pin) issues.push('PIN');
        if (!r.name_en.trim()) issues.push('Name');
        if (!mobile) issues.push('Mobile');
        if (!r.joining_date.trim()) issues.push('Join date');
        if (!r.employee_type_id) issues.push('Emp. type');
        if (!r.department_id) issues.push('Dept');
        if (!r.joining_designation_id) issues.push('Open desig.');
        if (!r.last_designation_id) issues.push('Last desig.');
        if (!r.current_branch_id) issues.push('Branch');
        if (!r.status) issues.push('Status');
        if (email && !isValidEmail(email)) issues.push('Bad email');
        if (r.joining_date.trim() && !isValidImportDate(r.joining_date)) issues.push('Bad date');
        if (pin && existing.pins.has(pin)) issues.push('PIN in system');
        if (email && existing.emails.has(emailKey)) issues.push('Email in system');
        if (mobile && existing.mobiles.has(mobile)) issues.push('Mobile in system');
        if (pin && (pinCounts.get(pinKey) ?? 0) > 1) issues.push('Dup PIN');
        if (email && (emailCounts.get(emailKey) ?? 0) > 1) issues.push('Dup email');
        if (mobile && (mobileCounts.get(mobile) ?? 0) > 1) issues.push('Dup mobile');

        issuesByRow[r.source_row] = issues;
    }

    return issuesByRow;
}

const compactInput = 'h-8 text-xs';
const compactSelect = 'h-8 text-xs';

export default function ImportReview({
    importId,
    rows,
    existingPins = [],
    existingEmails = [],
    existingMobiles = [],
    commitErrorsByRow = {},
    departments,
    designations,
    branches,
    employeeTypes,
    statuses,
}: ImportReviewProps) {
    const sortedBranches = useMemo(() => sortPayrollBranches(branches), [branches]);

    const existing = useMemo(
        () => ({
            pins: new Set(existingPins),
            emails: new Set(existingEmails.map((e) => e.toLowerCase())),
            mobiles: new Set(existingMobiles),
        }),
        [existingPins, existingEmails, existingMobiles],
    );

    const initial = useMemo(() => {
        return rows.map((r) => {
            const deptId = resolveOptionId(r.department, departments);
            const joinDesigId = resolveOptionId(r.joining_designation, designations);
            const lastDesigId = resolveOptionId(r.last_designation, designations) || joinDesigId;
            const currentBranchId = resolveOptionId(r.current_branch, branches);
            const lastBranchId = resolveOptionId(r.last_branch, branches);
            const employeeTypeId = resolveOptionId(r.employee_type, employeeTypes);

            return {
                source_row: r.source_row,
                pin: r.pin || '',
                name_en: r.name_en || '',
                email: r.email || '',
                mobile_personal: r.mobile_personal || '',
                employee_type_id: employeeTypeId || asIdOrEmpty(r.employee_type),
                joining_date: parseImportDate(r.joining_date),
                department_id: deptId || asIdOrEmpty(r.department),
                joining_designation_id: joinDesigId || asIdOrEmpty(r.joining_designation),
                last_designation_id: lastDesigId || asIdOrEmpty(r.last_designation) || asIdOrEmpty(r.joining_designation),
                current_branch_id: currentBranchId || asIdOrEmpty(r.current_branch),
                last_branch_id: lastBranchId || asIdOrEmpty(r.last_branch),
                status: ((r.status || 'active').toLowerCase() as Status) || 'active',
            };
        });
    }, [rows, departments, designations, branches, employeeTypes]);

    const form = useForm<{ importId: string; rows: FormRow[] }>({
        importId,
        rows: initial,
    });

    useEffect(() => {
        form.setData({ importId, rows: initial });
    }, [importId, initial]);

    const inertiaPage = usePage() as { props?: { flash?: { error?: string; success?: string } } };
    const flashError = inertiaPage?.props?.flash?.error;
    const flashSuccess = inertiaPage?.props?.flash?.success;

    const liveIssuesByRow = useMemo(
        () => computeIssuesByRow(form.data.rows, existing),
        [form.data.rows, existing],
    );

    const [clearedCommitRows, setClearedCommitRows] = useState<Set<number>>(() => new Set());

    const displayIssuesByRow = useMemo(() => {
        const merged: Record<number, string[]> = { ...liveIssuesByRow };
        for (const [rowKey, errs] of Object.entries(commitErrorsByRow)) {
            const sr = Number(rowKey);
            if (clearedCommitRows.has(sr)) {
                continue;
            }
            const existingIssues = merged[sr] ?? [];
            const combined = [...existingIssues];
            for (const err of errs) {
                if (!combined.includes(err)) {
                    combined.push(err);
                }
            }
            merged[sr] = combined;
        }
        return merged;
    }, [liveIssuesByRow, commitErrorsByRow, clearedCommitRows]);

    const validationMessages = useMemo(() => {
        const msgs: string[] = [];
        for (const [key, value] of Object.entries(form.errors)) {
            if (!value) continue;
            if (key === 'importId' || key === 'rows') {
                msgs.push(String(value));
            } else if (key.startsWith('rows.')) {
                msgs.push(String(value));
            }
        }
        return msgs;
    }, [form.errors]);

    const rowStats = useMemo(() => {
        let ready = 0;
        let needsFix = 0;
        for (const r of form.data.rows) {
            const issues = liveIssuesByRow[r.source_row] ?? [];
            if (issues.length === 0) ready++;
            else needsFix++;
        }
        return { total: form.data.rows.length, ready, needsFix };
    }, [form.data.rows, liveIssuesByRow]);

    const [onlyIncomplete, setOnlyIncomplete] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [pageNum, setPageNum] = useState(1);
    const pageSize = 50;

    const visibleRows = useMemo(() => {
        if (!onlyIncomplete) return form.data.rows;
        return form.data.rows.filter((r) => (displayIssuesByRow[r.source_row] ?? []).length > 0);
    }, [form.data.rows, onlyIncomplete, displayIssuesByRow]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(visibleRows.length / pageSize)), [visibleRows.length]);
    const currentPage = Math.min(pageNum, totalPages);

    const pagedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return visibleRows.slice(start, start + pageSize);
    }, [visibleRows, currentPage]);

    const [bulkState, setBulkState] = useState({
        employee_type_id: '',
        department_id: '',
        joining_designation_id: '',
        last_designation_id: '',
        current_branch_id: '',
        last_branch_id: '',
        status: '' as '' | Status,
    });

    const applyBulk = () => {
        const next = form.data.rows.map((r) => ({
            ...r,
            employee_type_id: bulkState.employee_type_id || r.employee_type_id,
            department_id: bulkState.department_id || r.department_id,
            joining_designation_id: bulkState.joining_designation_id || r.joining_designation_id,
            last_designation_id: bulkState.last_designation_id || r.last_designation_id,
            current_branch_id: bulkState.current_branch_id || r.current_branch_id,
            last_branch_id: bulkState.last_branch_id || r.last_branch_id,
            status: (bulkState.status || r.status) as Status,
        }));
        form.setData('rows', next);
    };

    const updateRow = (sourceRow: number, patch: Partial<FormRow>) => {
        setClearedCommitRows((prev) => new Set(prev).add(sourceRow));
        const next = form.data.rows.map((r) => (r.source_row === sourceRow ? { ...r, ...patch } : r));
        form.setData('rows', next);
    };

    const canConfirm = rowStats.needsFix === 0 && !form.processing;

    return (
        <Layout>
            <Head title="Import Review" />

            <div className="container mx-auto max-w-[1600px] space-y-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-semibold">Import Review</h1>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{rowStats.total} rows</span>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">{rowStats.ready} ready</span>
                        {rowStats.needsFix > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{rowStats.needsFix} to fix</span>
                        )}
                    </div>
                    <Link href={route('employees.index')} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        Back
                    </Link>
                </div>

                {(flashError || flashSuccess || validationMessages.length > 0) && (
                    <div
                        className={`rounded-md border px-3 py-2 text-xs ${
                            flashError || validationMessages.length > 0
                                ? 'border-red-200 bg-red-50 text-red-800'
                                : 'border-green-200 bg-green-50 text-green-800'
                        }`}
                    >
                        {flashSuccess && <p>{flashSuccess}</p>}
                        {flashError && <p>{flashError}</p>}
                        {validationMessages.map((msg) => (
                            <p key={msg}>{msg}</p>
                        ))}
                    </div>
                )}

                <div
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                        canConfirm ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                >
                    {canConfirm ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                    <span>
                        {canConfirm
                            ? 'All rows are valid. You can confirm import.'
                            : 'Fix highlighted rows below — issues update as you edit.'}
                    </span>
                </div>

                <Collapsible open={bulkOpen} onOpenChange={setBulkOpen}>
                    <Card className="shadow-none">
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium hover:bg-muted/40"
                            >
                                Bulk defaults (optional)
                                <ChevronDown className={`h-4 w-4 transition-transform ${bulkOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="space-y-3 border-t px-4 pb-4 pt-3">
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Emp. Type</Label>
                                        <Select value={bulkState.employee_type_id || 'none'} onValueChange={(v) => setBulkState((s) => ({ ...s, employee_type_id: v === 'none' ? '' : v }))}>
                                            <SelectTrigger className={compactSelect}><SelectValue placeholder="—" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">—</SelectItem>
                                                {employeeTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Department</Label>
                                        <Select value={bulkState.department_id || 'none'} onValueChange={(v) => setBulkState((s) => ({ ...s, department_id: v === 'none' ? '' : v }))}>
                                            <SelectTrigger className={compactSelect}><SelectValue placeholder="—" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">—</SelectItem>
                                                {departments.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Branch</Label>
                                        <Select value={bulkState.current_branch_id || 'none'} onValueChange={(v) => setBulkState((s) => ({ ...s, current_branch_id: v === 'none' ? '' : v }))}>
                                            <SelectTrigger className={compactSelect}><SelectValue placeholder="—" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">—</SelectItem>
                                                {sortedBranches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{formatBranchSelectLabel(b)}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Open Desig.</Label>
                                        <Select value={bulkState.joining_designation_id || 'none'} onValueChange={(v) => setBulkState((s) => ({ ...s, joining_designation_id: v === 'none' ? '' : v }))}>
                                            <SelectTrigger className={compactSelect}><SelectValue placeholder="—" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">—</SelectItem>
                                                {designations.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Last Desig.</Label>
                                        <Select value={bulkState.last_designation_id || 'none'} onValueChange={(v) => setBulkState((s) => ({ ...s, last_designation_id: v === 'none' ? '' : v }))}>
                                            <SelectTrigger className={compactSelect}><SelectValue placeholder="—" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">—</SelectItem>
                                                {designations.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Status</Label>
                                        <Select value={bulkState.status || 'none'} onValueChange={(v) => setBulkState((s) => ({ ...s, status: v === 'none' ? '' : (v as Status) }))}>
                                            <SelectTrigger className={compactSelect}><SelectValue placeholder="—" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">—</SelectItem>
                                                {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-end">
                                        <Button type="button" variant="outline" size="sm" className="h-8 w-full text-xs" onClick={applyBulk}>
                                            Apply all
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>

                <Card className="shadow-none">
                    <CardContent className="p-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
                            <label className="flex items-center gap-1.5">
                                <input type="checkbox" className="rounded" checked={onlyIncomplete} onChange={(e) => { setOnlyIncomplete(e.target.checked); setPageNum(1); }} />
                                Only rows with issues
                            </label>
                            <div className="flex items-center gap-2">
                                <span>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, visibleRows.length)} of {visibleRows.length}</span>
                                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Prev</Button>
                                <span>{currentPage}/{totalPages}</span>
                                <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</Button>
                            </div>
                        </div>

                        <div className="max-h-[calc(100vh-280px)] overflow-auto">
                            <table className="w-full min-w-[1100px] text-xs">
                                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                                    <tr className="border-b text-left">
                                        <th className="px-2 py-1.5 font-medium">#</th>
                                        <th className="px-2 py-1.5 font-medium">Issues</th>
                                        <th className="px-2 py-1.5 font-medium">PIN</th>
                                        <th className="px-2 py-1.5 font-medium">Name</th>
                                        <th className="px-2 py-1.5 font-medium">Mobile</th>
                                        <th className="px-2 py-1.5 font-medium">Join</th>
                                        <th className="px-2 py-1.5 font-medium">Type</th>
                                        <th className="px-2 py-1.5 font-medium">Dept</th>
                                        <th className="px-2 py-1.5 font-medium">Open</th>
                                        <th className="px-2 py-1.5 font-medium">Last</th>
                                        <th className="px-2 py-1.5 font-medium">Branch</th>
                                        <th className="px-2 py-1.5 font-medium">St</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedRows.map((row) => {
                                        const issues = displayIssuesByRow[row.source_row] ?? [];
                                        const hasIssues = issues.length > 0;

                                        return (
                                            <tr key={row.source_row} className={`border-b ${hasIssues ? 'bg-amber-50/60' : 'hover:bg-muted/30'}`}>
                                                <td className="px-2 py-1 font-medium text-muted-foreground">{row.source_row}</td>
                                                <td className="px-2 py-1">
                                                    {hasIssues ? (
                                                        <div className="flex max-w-[140px] flex-wrap gap-0.5">
                                                            {issues.map((issue) => (
                                                                <span key={issue} className="rounded bg-red-100 px-1 py-0.5 text-[10px] leading-tight text-red-800">
                                                                    {issue}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                                    )}
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Input value={row.pin} onChange={(e) => updateRow(row.source_row, { pin: e.target.value })} className={`${compactInput} w-[72px]`} />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Input value={row.name_en} onChange={(e) => updateRow(row.source_row, { name_en: e.target.value })} className={`${compactInput} w-[120px]`} />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Input value={row.mobile_personal} onChange={(e) => updateRow(row.source_row, { mobile_personal: e.target.value })} className={`${compactInput} w-[100px]`} />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Input type="date" value={row.joining_date} onChange={(e) => updateRow(row.source_row, { joining_date: e.target.value })} className={`${compactInput} w-[118px]`} />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Select value={row.employee_type_id || 'none'} onValueChange={(v) => updateRow(row.source_row, { employee_type_id: v === 'none' ? '' : v })}>
                                                        <SelectTrigger className={`${compactSelect} w-[100px]`}><SelectValue placeholder="—" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">—</SelectItem>
                                                            {employeeTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Select value={row.department_id || 'none'} onValueChange={(v) => updateRow(row.source_row, { department_id: v === 'none' ? '' : v })}>
                                                        <SelectTrigger className={`${compactSelect} w-[100px]`}><SelectValue placeholder="—" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">—</SelectItem>
                                                            {departments.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Select
                                                        value={row.joining_designation_id || 'none'}
                                                        onValueChange={(v) => {
                                                            const val = v === 'none' ? '' : v;
                                                            updateRow(row.source_row, {
                                                                joining_designation_id: val,
                                                                last_designation_id: row.last_designation_id || val,
                                                            });
                                                        }}
                                                    >
                                                        <SelectTrigger className={`${compactSelect} w-[100px]`}><SelectValue placeholder="—" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">—</SelectItem>
                                                            {designations.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Select value={row.last_designation_id || 'none'} onValueChange={(v) => updateRow(row.source_row, { last_designation_id: v === 'none' ? '' : v })}>
                                                        <SelectTrigger className={`${compactSelect} w-[100px]`}><SelectValue placeholder="—" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">—</SelectItem>
                                                            {designations.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Select value={row.current_branch_id || 'none'} onValueChange={(v) => updateRow(row.source_row, { current_branch_id: v === 'none' ? '' : v })}>
                                                        <SelectTrigger className={`${compactSelect} w-[110px]`}><SelectValue placeholder="—" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">—</SelectItem>
                                                            {sortedBranches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{formatBranchSelectLabel(b)}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Select value={row.status || 'active'} onValueChange={(v) => updateRow(row.source_row, { status: v as Status })}>
                                                        <SelectTrigger className={`${compactSelect} w-[76px]`}><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                            <InputError message={form.errors.importId as string} />
                            <InputError message={form.errors.rows as string} />
                            <div className="ml-auto flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => { window.location.href = route('employees.index'); }}>
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={!canConfirm}
                                    onClick={() => form.post(route('employees.import.commit'), { preserveScroll: true })}
                                >
                                    {form.processing ? 'Importing…' : `Confirm (${rowStats.ready})`}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
