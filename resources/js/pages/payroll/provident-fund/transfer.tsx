import React, { useMemo } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PayrollEmployeeSelect } from '@/components/payroll/PayrollFilterGrid';
import { ArrowLeft, ArrowRightLeft, BookOpen } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { formatPfAmount } from '@/lib/pf-format';
import { staffFundPath } from '@/lib/staff-fund-nav';
import type { SharedData } from '@/types';

type Filters = {
    from_employee_id: string;
    to_employee_id: string;
};

type Line = {
    id: number;
    transaction_type: string;
    transaction_type_label: string;
    transaction_date: string | null;
    employee_contribution: number;
    employer_contribution: number;
    credit_amount: number;
    debit_amount: number;
    balance_after: number;
    notes: string | null;
    reference_no: string | null;
    has_payslip: boolean;
};

type Party = {
    id: number;
    label: string;
    pf_balance: number;
    pf_enrolled: boolean;
    line_count: number;
};

type Preview = {
    from: Party;
    to: Party;
    blockers: string[];
    lines: Line[];
    totals: {
        line_count: number;
        credit: number;
        debit: number;
        balance: number;
        own: number;
        org: number;
    };
};

type HistoryRow = {
    id: number;
    transfer_number: string;
    to_employee_id: number;
    from_label: string;
    to_label: string;
    transaction_count: number;
    amount: number;
    own_amount: number;
    org_amount: number;
    reason: string;
    created_by: string | null;
    created_at: string | null;
};

type Props = {
    filters: Filters;
    preview: Preview | null;
    history: HistoryRow[];
};

const fmt = formatPfAmount;

export default function ProvidentFundTransfer({ filters, preview, history }: Props) {
    const { auth, flash } = usePage<SharedData & { flash?: { success?: string } }>().props;
    const canEdit = hasAppPermission(auth, 'payroll.edit');

    const form = useForm({
        from_employee_id: filters.from_employee_id || '',
        to_employee_id: filters.to_employee_id || '',
        reason: '',
        password: '',
    });

    const loadPreview = (fromId: string, toId: string) => {
        router.get(
            route('provident-fund.transfer.index'),
            {
                from_employee_id: fromId,
                to_employee_id: toId,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const blocked = (preview?.blockers.length ?? 0) > 0;
    const ready = Boolean(preview && preview.lines.length > 0 && !blocked);
    const canSubmit = canEdit && ready && form.data.reason.trim() !== '' && form.data.password.trim() !== '' && !form.processing;

    const totals = preview?.totals;
    const samePerson = form.data.from_employee_id !== '' && form.data.from_employee_id === form.data.to_employee_id;

    const warning = useMemo(() => {
        if (samePerson) return 'Choose two different employees.';
        return null;
    }, [samePerson]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;

        form.post(route('provident-fund.transfer.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.setData('reason', '');
                form.setData('password', '');
            },
            onError: () => form.setData('password', ''),
        });
    };

    return (
        <StaffFundLayout
            title="Transfer PF account"
            activeTab="pf-transfer"
            description="Move every PF ledger line from one employee to another. The receiver must have an empty PF account."
        >
            <div className="mb-2 flex items-center gap-2">
                <Link
                    href={staffFundPath('/provident-fund')}
                    className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50"
                >
                    <ArrowLeft className="h-3 w-3" /> Back to Register
                </Link>
            </div>

            {flash?.success && (
                <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    {flash.success}
                </div>
            )}

            <Card className="mb-3 overflow-hidden rounded-lg border-zinc-200/80 bg-white shadow-2xs">
                <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 px-3 py-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide text-zinc-800">Transfer whole PF account</CardTitle>
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                        Opening, salary PF, interest, withdrawal and adjustment lines all move together. Amounts and dates stay the same. Salary payslips stay with the employee who was paid. Your password is required.
                    </p>
                </CardHeader>
                <CardContent className="p-3">
                    {!canEdit ? (
                        <p className="rounded border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                            You can view this screen, but transferring a PF account needs edit permission.
                        </p>
                    ) : (
                        <form onSubmit={submit} className="space-y-3">
                            <div className="grid gap-3 lg:grid-cols-2">
                                <PayrollEmployeeSelect
                                    label="From employee"
                                    value={form.data.from_employee_id}
                                    onChange={(value) => {
                                        form.setData('from_employee_id', value);
                                        form.clearErrors();
                                        loadPreview(value, form.data.to_employee_id);
                                    }}
                                    employees={[]}
                                    required
                                    allowAll={false}
                                    showPfBalance
                                    pfWithLedger
                                />
                                <PayrollEmployeeSelect
                                    label="To employee (must have no PF)"
                                    value={form.data.to_employee_id}
                                    onChange={(value) => {
                                        form.setData('to_employee_id', value);
                                        form.clearErrors();
                                        loadPreview(form.data.from_employee_id, value);
                                    }}
                                    employees={[]}
                                    required
                                    allowAll={false}
                                    showPfBalance
                                    anyStatus
                                />
                            </div>

                            {warning && (
                                <p className="rounded border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700">{warning}</p>
                            )}

                            {preview && (
                                <div className="space-y-2">
                                    <div className="grid gap-2 sm:grid-cols-4">
                                        <Summary label="Lines" value={String(totals?.line_count ?? 0)} />
                                        <Summary label="Own" value={`৳ ${fmt(totals?.own ?? 0)}`} />
                                        <Summary label="Org" value={`৳ ${fmt(totals?.org ?? 0)}`} />
                                        <Summary label="Balance to move" value={`৳ ${fmt(totals?.balance ?? 0)}`} />
                                    </div>
                                    <p className="text-[11px] text-zinc-500">
                                        From {preview.from.label} ({preview.from.line_count} lines) to {preview.to.label}
                                        {preview.to.pf_enrolled ? '' : ' — not currently PF enrolled'}. Enrollment is not changed.
                                    </p>
                                    {preview.blockers.map((blocker) => (
                                        <p key={blocker} className="rounded border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700">
                                            {blocker}
                                        </p>
                                    ))}
                                    {form.errors.from_employee_id && (
                                        <p className="text-xs font-medium text-rose-600">{form.errors.from_employee_id}</p>
                                    )}
                                    {form.errors.to_employee_id && (
                                        <p className="text-xs font-medium text-rose-600">{form.errors.to_employee_id}</p>
                                    )}
                                </div>
                            )}

                            {preview && preview.lines.length > 0 && (
                                <div className="max-h-80 overflow-auto rounded-md border border-zinc-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-[10px]">Date</TableHead>
                                                <TableHead className="text-[10px]">Type</TableHead>
                                                <TableHead className="text-right text-[10px]">Own</TableHead>
                                                <TableHead className="text-right text-[10px]">Org</TableHead>
                                                <TableHead className="text-right text-[10px]">Credit</TableHead>
                                                <TableHead className="text-right text-[10px]">Debit</TableHead>
                                                <TableHead className="text-right text-[10px]">Balance</TableHead>
                                                <TableHead className="text-[10px]">Note</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.lines.map((line) => (
                                                <TableRow key={line.id}>
                                                    <TableCell className="py-1 text-[11px]">{line.transaction_date}</TableCell>
                                                    <TableCell className="py-1 text-[11px]">
                                                        {line.transaction_type_label}
                                                        {line.has_payslip ? ' · payslip' : ''}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-right text-[11px] tabular-nums">{fmt(line.employee_contribution)}</TableCell>
                                                    <TableCell className="py-1 text-right text-[11px] tabular-nums">{fmt(line.employer_contribution)}</TableCell>
                                                    <TableCell className="py-1 text-right text-[11px] tabular-nums">{fmt(line.credit_amount)}</TableCell>
                                                    <TableCell className="py-1 text-right text-[11px] tabular-nums">{fmt(line.debit_amount)}</TableCell>
                                                    <TableCell className="py-1 text-right text-[11px] tabular-nums">{fmt(line.balance_after)}</TableCell>
                                                    <TableCell className="max-w-[180px] truncate py-1 text-[11px] text-zinc-500">{line.notes || line.reference_no || '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            <div className="grid gap-2.5 sm:grid-cols-2">
                                <div className="space-y-0.5 sm:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-zinc-500">Reason</label>
                                    <Textarea
                                        value={form.data.reason}
                                        onChange={(event) => form.setData('reason', event.target.value)}
                                        placeholder="Example: PF was recorded on the wrong employee"
                                        className="min-h-16 text-xs"
                                        required
                                    />
                                    {form.errors.reason && <p className="text-xs font-medium text-rose-600">{form.errors.reason}</p>}
                                </div>
                                <div className="space-y-0.5">
                                    <label htmlFor="pf-transfer-password" className="text-[10px] font-bold uppercase text-zinc-500">Your password</label>
                                    <Input
                                        id="pf-transfer-password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={form.data.password}
                                        onChange={(event) => form.setData('password', event.target.value)}
                                        className="h-8 text-xs"
                                        required
                                    />
                                    {form.errors.password && <p className="text-xs font-medium text-rose-600">{form.errors.password}</p>}
                                </div>
                                <div className="flex items-end">
                                    <Button type="submit" disabled={!canSubmit} className="h-8 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700">
                                        <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                                        {form.processing ? 'Transferring…' : 'Transfer whole PF'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-lg border-zinc-200/80 bg-white shadow-2xs">
                <CardHeader className="border-b border-zinc-100 px-3 py-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wide text-zinc-800">Recent transfers</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {history.length === 0 ? (
                        <p className="px-3 py-4 text-xs text-zinc-500">No PF account has been transferred yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-[10px]">When</TableHead>
                                    <TableHead className="text-[10px]">From</TableHead>
                                    <TableHead className="text-[10px]">To</TableHead>
                                    <TableHead className="text-right text-[10px]">Lines</TableHead>
                                    <TableHead className="text-right text-[10px]">Balance</TableHead>
                                    <TableHead className="text-[10px]">By</TableHead>
                                    <TableHead className="text-[10px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="py-1.5 text-[11px]">
                                            <div>{row.created_at}</div>
                                            <div className="text-[10px] text-zinc-400">{row.transfer_number}</div>
                                        </TableCell>
                                        <TableCell className="py-1.5 text-[11px]">{row.from_label}</TableCell>
                                        <TableCell className="py-1.5 text-[11px]">{row.to_label}</TableCell>
                                        <TableCell className="py-1.5 text-right text-[11px] tabular-nums">{row.transaction_count}</TableCell>
                                        <TableCell className="py-1.5 text-right text-[11px] tabular-nums">{fmt(row.amount)}</TableCell>
                                        <TableCell className="py-1.5 text-[11px]">{row.created_by || '—'}</TableCell>
                                        <TableCell className="py-1.5 text-right">
                                            <Link href={route('provident-fund.ledger', row.to_employee_id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                                <BookOpen className="h-3 w-3" /> Ledger
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </StaffFundLayout>
    );
}

function Summary({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md border border-zinc-200 bg-zinc-50/60 px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-zinc-800">{value}</p>
        </div>
    );
}
