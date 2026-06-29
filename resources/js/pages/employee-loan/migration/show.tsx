import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PayrollComboField, PayrollField } from '@/components/payroll/PayrollFilterGrid';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { ArrowLeft, Pencil, RefreshCw, Save } from 'lucide-react';
import axios from 'axios';
import { jsonCsrfHeaders } from '@/lib/csrf';
import { cn } from '@/lib/utils';

type Policy = { id: number; code: string; name: string; label: string };

type Item = {
    id: number;
    employee_label: string;
    loan_policy_id: number;
    policy_name: string | null;
    disbursement_date: string | null;
    disbursement_date_iso: string | null;
    disburse_amount: number;
    installment_amount: number;
    passed_months: number;
    use_manual_terms: boolean;
    service_charge_amount: number | null;
    outstanding_principal: number;
    outstanding_service_charge: number;
    outstanding_total: number;
    loan_number: string | null;
    employee_loan_id: number | null;
    loan_status: string | null;
};

type Batch = {
    id: number;
    migration_number: string;
    closing_date: string | null;
    closing_date_iso: string | null;
    committee_name: string | null;
    created_by: string | null;
    created_at: string | null;
    items: Item[];
};

type RowPreview = {
    installment_amount: number;
    service_charge_amount?: number;
    outstanding_principal: number;
    outstanding_service_charge: number;
    outstanding_total: number;
    total_installments: number;
    remaining_installments: number;
    total_payable: number;
};

type Props = {
    batch: Batch;
    canEdit: boolean;
    policies: Policy[];
};

const fmt = fmtLoanAmount;

type SavePayload = {
    loan_policy_id: number | null;
    use_manual_terms: boolean;
    disbursement_date: string;
    disburse_amount: number;
    service_charge_amount: number | null;
    installment_amount: number;
    passed_months: number;
    outstanding_principal: number;
    outstanding_service_charge: number;
    outstanding_total: number;
};

function buildSavePayload(data: {
    loan_policy_id: string;
    use_manual_terms: boolean;
    disbursement_date: string;
    disburse_amount: string;
    service_charge_amount: string;
    installment_amount: string;
    passed_months: string;
    outstanding_principal: string;
    outstanding_service_charge: string;
    outstanding_total: string;
}, policyId: string): SavePayload {
    return {
        loan_policy_id: policyId ? Number(policyId) : null,
        use_manual_terms: Boolean(data.use_manual_terms),
        disbursement_date: data.disbursement_date,
        disburse_amount: Number(data.disburse_amount),
        service_charge_amount:
            data.use_manual_terms && data.service_charge_amount !== ''
                ? Number(data.service_charge_amount)
                : null,
        installment_amount: Number(data.installment_amount),
        passed_months: Number(data.passed_months) || 0,
        outstanding_principal: Number(data.outstanding_principal),
        outstanding_service_charge: Number(data.outstanding_service_charge),
        outstanding_total: Number(data.outstanding_total),
    };
}

function extractSaveError(err: unknown): string {
    if (!axios.isAxiosError(err) || !err.response) {
        return 'Save ব্যর্থ হয়েছে।';
    }

    if (err.response.status === 419) {
        return 'Session expired — page refresh করুন।';
    }

    const data = err.response.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.errors) {
        const first = Object.values(data.errors).flat()[0];
        if (first) return first;
    }

    if (data?.message && data.message !== 'The given data was invalid.') {
        return data.message;
    }

    return 'Save ব্যর্থ হয়েছে।';
}

function syncOutstandingTotal(pr: string, sc: string): string {
    return String(Math.round(((parseFloat(pr) || 0) + (parseFloat(sc) || 0)) * 100) / 100);
}

const statusBadge = (status: string) => {
    const map: Record<string, string> = {
        active: 'bg-amber-100 text-amber-800 border-amber-200',
        completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        cancelled: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    };
    return map[status] ?? 'bg-zinc-100 text-zinc-600';
};

export default function LoanMigrationShow({ batch, canEdit, policies }: Props) {
    const [batchEditOpen, setBatchEditOpen] = useState(false);
    const [editItem, setEditItem] = useState<Item | null>(null);
    const [calcLoading, setCalcLoading] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [recalcItemId, setRecalcItemId] = useState<number | null>(null);
    const [recalcError, setRecalcError] = useState<string | null>(null);
    const [previewMeta, setPreviewMeta] = useState<Pick<RowPreview, 'remaining_installments' | 'total_installments' | 'total_payable'> | null>(null);
    const calcGeneration = useRef(0);

    const policyItems = useMemo(() => {
        const base = policies.map((p) => ({ value: String(p.id), label: p.label, keywords: p.code }));

        if (editItem?.loan_policy_id) {
            const id = String(editItem.loan_policy_id);
            if (!base.some((p) => p.value === id)) {
                base.unshift({
                    value: id,
                    label: editItem.policy_name ? `${editItem.policy_name}` : `Policy #${id}`,
                    keywords: '',
                });
            }
        }

        return base;
    }, [policies, editItem]);

    const batchForm = useForm({
        closing_date: batch.closing_date_iso || '',
    });

    const itemForm = useForm({
        loan_policy_id: '',
        use_manual_terms: false,
        disbursement_date: '',
        disburse_amount: '',
        service_charge_amount: '',
        installment_amount: '',
        passed_months: '',
        outstanding_principal: '',
        outstanding_service_charge: '',
        outstanding_total: '',
    });

    const itemFormDataRef = useRef(itemForm.data);

    const patchItemForm = useCallback(
        (patch: Partial<typeof itemForm.data>) => {
            const next = { ...itemFormDataRef.current, ...patch };
            itemFormDataRef.current = next;
            itemForm.setData(next);
        },
        [itemForm],
    );

    const resolvePolicyId = useCallback(
        (data: typeof itemForm.data): string => {
            if (data.loan_policy_id && data.loan_policy_id !== 'null' && data.loan_policy_id !== 'undefined') {
                return data.loan_policy_id;
            }

            return editItem?.loan_policy_id != null ? String(editItem.loan_policy_id) : '';
        },
        [editItem],
    );

    const manualTotalPayable = useMemo(() => {
        const disburse = parseFloat(itemForm.data.disburse_amount) || 0;
        const sc = parseFloat(itemForm.data.service_charge_amount) || 0;
        if (!itemForm.data.use_manual_terms || disburse <= 0) return null;
        return disburse + sc;
    }, [itemForm.data.disburse_amount, itemForm.data.service_charge_amount, itemForm.data.use_manual_terms]);

    const applyPreview = useCallback(
        (preview: RowPreview) => {
            const updates: Partial<typeof itemForm.data> = {
                installment_amount: String(preview.installment_amount),
                outstanding_principal: String(preview.outstanding_principal),
                outstanding_service_charge: String(preview.outstanding_service_charge),
                outstanding_total: String(preview.outstanding_total),
            };

            if (preview.service_charge_amount != null) {
                updates.service_charge_amount = String(preview.service_charge_amount);
            }

            patchItemForm(updates);
            setPreviewMeta({
                remaining_installments: preview.remaining_installments,
                total_installments: preview.total_installments,
                total_payable: preview.total_payable,
            });
        },
        [patchItemForm],
    );

    const recalculateFromPolicy = useCallback(
        async (options?: { useManual?: boolean; data?: Partial<typeof itemForm.data> }): Promise<boolean> => {
            const data = { ...itemFormDataRef.current, ...options?.data };
            const policyId = resolvePolicyId(data);
            const amount = parseFloat(data.disburse_amount);
            const passed = parseInt(data.passed_months, 10) || 0;
            const useManual = options?.useManual ?? Boolean(data.use_manual_terms);

            if (!policyId || !Number.isFinite(amount) || amount <= 0) {
                setCalcError(null);
                setPreviewMeta(null);
                return false;
            }

            if (useManual) {
                const sc = parseFloat(data.service_charge_amount);
                const install = parseFloat(data.installment_amount);
                if (!Number.isFinite(sc) || sc <= 0 || !Number.isFinite(install) || install <= 0) {
                    setCalcError('Manual mode: enter total service charge and installment amount.');
                    return false;
                }
            }

            const generation = calcGeneration.current + 1;
            calcGeneration.current = generation;
            setCalcLoading(true);
            setCalcError(null);

            const payload: Record<string, string | number | boolean> = {
                loan_policy_id: policyId,
                disburse_amount: amount,
                passed_months: passed,
                use_manual_terms: useManual,
            };

            if (useManual) {
                payload.service_charge_amount = parseFloat(data.service_charge_amount);
                payload.installment_amount = parseFloat(data.installment_amount);
            }

            try {
                const { data: preview } = await axios.post(route('loan-migration.calculate-preview'), payload);

                if (calcGeneration.current !== generation) {
                    return false;
                }

                applyPreview(preview as RowPreview);

                return true;
            } catch (err: unknown) {
                if (calcGeneration.current !== generation) {
                    return false;
                }

                const message =
                    axios.isAxiosError(err) && err.response?.data?.message
                        ? String(err.response.data.message)
                        : 'Could not calculate from policy.';
                setCalcError(message);
                setPreviewMeta(null);

                return false;
            } finally {
                if (calcGeneration.current === generation) {
                    setCalcLoading(false);
                }
            }
        },
        [applyPreview, resolvePolicyId],
    );

    const triggerRecalc = useCallback(() => {
        const useManual = Boolean(itemFormDataRef.current.use_manual_terms);
        void recalculateFromPolicy({ useManual });
    }, [recalculateFromPolicy]);

    const openBatchEdit = () => {
        batchForm.setData({ closing_date: batch.closing_date_iso || '' });
        batchForm.clearErrors();
        setBatchEditOpen(true);
    };

    const openItemEdit = (row: Item) => {
        calcGeneration.current += 1;
        setCalcError(null);
        setSaveError(null);
        setPreviewMeta(null);
        setEditItem(row);

        const formData = {
            loan_policy_id: row.loan_policy_id != null ? String(row.loan_policy_id) : '',
            use_manual_terms: row.use_manual_terms,
            disbursement_date: row.disbursement_date_iso || '',
            disburse_amount: String(row.disburse_amount),
            service_charge_amount: row.service_charge_amount != null ? String(row.service_charge_amount) : '',
            installment_amount: String(row.installment_amount),
            passed_months: String(row.passed_months),
            outstanding_principal: String(row.outstanding_principal),
            outstanding_service_charge: String(row.outstanding_service_charge),
            outstanding_total: String(row.outstanding_total),
        };

        itemFormDataRef.current = formData;
        itemForm.setData(formData);
        itemForm.clearErrors();

        void recalculateFromPolicy({ useManual: row.use_manual_terms, data: formData });
    };

    const closeItemEdit = () => {
        calcGeneration.current += 1;
        setEditItem(null);
        setCalcError(null);
        setSaveError(null);
        setPreviewMeta(null);
        itemForm.reset();
        itemForm.clearErrors();
    };

    const submitBatch = (e: React.FormEvent) => {
        e.preventDefault();
        batchForm.put(route('loan-migration.update', batch.id), {
            onSuccess: () => setBatchEditOpen(false),
        });
    };

    const recalculateRow = async (row: Item) => {
        if (row.use_manual_terms) {
            setRecalcError('Manual legacy terms — Edit দিয়ে হাতে ঠিক করুন।');
            return;
        }

        if (
            !confirm(
                'Policy অনুযায়ী installment ও outstanding আবার calculate হবে (policy-র reducing/declining method)। Linked loan schedule refresh হবে। Continue?',
            )
        ) {
            return;
        }

        setRecalcItemId(row.id);
        setRecalcError(null);

        try {
            const { data } = await axios.post(
                route('loan-migration.items.recalculate', row.id),
                {},
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        ...jsonCsrfHeaders(),
                    },
                },
            );

            setSaveSuccess(data.message ?? 'Recalculated from policy.');
            router.reload({ only: ['batch'], preserveScroll: true });
        } catch (err: unknown) {
            setRecalcError(extractSaveError(err));
        } finally {
            setRecalcItemId(null);
        }
    };

    const submitItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem || saveLoading || calcLoading) return;

        const merged = { ...itemFormDataRef.current, ...itemForm.data };
        const policyId = resolvePolicyId(merged);
        if (!policyId) {
            setSaveError('Loan policy নির্বাচন করুন।');
            return;
        }

        merged.loan_policy_id = policyId;
        patchItemForm(merged);
        setSaveError(null);

        const disburse = parseFloat(merged.disburse_amount);
        if (!Number.isFinite(disburse) || disburse <= 0) {
            setSaveError('Disburse amount দিন।');
            return;
        }

        if (merged.use_manual_terms) {
            const sc = parseFloat(merged.service_charge_amount);
            const install = parseFloat(merged.installment_amount);
            if (!Number.isFinite(sc) || sc <= 0 || !Number.isFinite(install) || install <= 0) {
                setSaveError('Manual mode: service charge ও installment দিন।');
                return;
            }

            await recalculateFromPolicy({ useManual: true, data: merged });
        }

        const current = itemFormDataRef.current;
        const payload = buildSavePayload(current, resolvePolicyId(current));

        setSaveLoading(true);

        try {
            await axios.put(route('loan-migration.items.update', editItem.id), payload, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...jsonCsrfHeaders(),
                },
            });

            setSaveSuccess('Migration row saved.');
            closeItemEdit();
            router.reload({ only: ['batch'], preserveScroll: true });
        } catch (err: unknown) {
            setSaveError(extractSaveError(err));
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <EmployeeLoanLayout
            title={batch.migration_number}
            activeTab="migration"
            description="Migrated loans at closing date"
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <Link
                    href={employeeLoanPath(route('loan-migration.index'))}
                    className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900"
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Migration list
                </Link>
                {canEdit && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openBatchEdit}>
                        <Pencil className="mr-1 h-3 w-3" /> Edit closing date
                    </Button>
                )}
            </div>

            {saveSuccess && (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    {saveSuccess}
                </div>
            )}

            {recalcError && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {recalcError}
                </div>
            )}

            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Closing date</p>
                        <p className="text-sm font-semibold">{batch.closing_date ?? '—'}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Committee</p>
                        <p className="text-sm font-semibold">{batch.committee_name ?? '—'}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Loans migrated</p>
                        <p className="text-lg font-bold tabular-nums">{batch.items.length}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-2xs">
                    <CardContent className="p-3">
                        <p className="text-[10px] font-bold uppercase text-zinc-500">Saved</p>
                        <p className="text-sm font-medium">{batch.created_at ?? '—'}</p>
                        <p className="text-[10px] text-zinc-500">{batch.created_by ?? '—'}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white shadow-2xs overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/80">
                            <TableHead className="text-xs">Employee</TableHead>
                            <TableHead className="text-xs">Policy</TableHead>
                            <TableHead className="text-xs">Disbursed</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                            <TableHead className="text-xs text-right">Install/mo</TableHead>
                            <TableHead className="text-xs text-center">Passed</TableHead>
                            <TableHead className="text-xs text-right">Out PR</TableHead>
                            <TableHead className="text-xs text-right">Out SC</TableHead>
                            <TableHead className="text-xs text-right">Out total</TableHead>
                            <TableHead className="text-xs">Loan no</TableHead>
                            <TableHead className="text-xs w-36" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {batch.items.map((row) => (
                            <TableRow key={row.id} className="hover:bg-amber-50/30">
                                <TableCell className="text-xs font-medium">{row.employee_label}</TableCell>
                                <TableCell className="text-xs">{row.policy_name}</TableCell>
                                <TableCell className="text-xs">{row.disbursement_date}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{fmt(row.disburse_amount)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{fmt(row.installment_amount)}</TableCell>
                                <TableCell className="text-xs text-center tabular-nums">{row.passed_months}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{fmt(row.outstanding_principal)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums">{fmt(row.outstanding_service_charge)}</TableCell>
                                <TableCell className="text-xs text-right tabular-nums font-semibold text-amber-800">
                                    {fmt(row.outstanding_total)}
                                </TableCell>
                                <TableCell className="text-xs font-mono">{row.loan_number ?? '—'}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {canEdit && (
                                            <>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-1.5 text-[10px]"
                                                    onClick={() => openItemEdit(row)}
                                                >
                                                    <Pencil className="mr-0.5 h-3 w-3" /> Edit
                                                </Button>
                                                {!row.use_manual_terms && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 px-1.5 text-[10px] text-amber-800 hover:text-amber-900"
                                                        onClick={() => recalculateRow(row)}
                                                        disabled={recalcItemId === row.id}
                                                    >
                                                        <RefreshCw
                                                            className={cn(
                                                                'mr-0.5 h-3 w-3',
                                                                recalcItemId === row.id && 'animate-spin',
                                                            )}
                                                        />
                                                        {recalcItemId === row.id ? '…' : 'Recalculate'}
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        {row.employee_loan_id && (
                                            <Link
                                                href={employeeLoanPath(route('employee-loans.show', row.employee_loan_id))}
                                                className="inline-flex items-center rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50"
                                            >
                                                View
                                            </Link>
                                        )}
                                        {row.loan_status && (
                                            <Badge variant="outline" className={cn('text-[10px] capitalize', statusBadge(row.loan_status))}>
                                                {row.loan_status}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={batchEditOpen} onOpenChange={setBatchEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit migration closing date</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitBatch} className="space-y-3">
                        <PayrollField label="Closing date" error={batchForm.errors.closing_date}>
                            <Input
                                type="date"
                                value={batchForm.data.closing_date}
                                onChange={(e) => batchForm.setData('closing_date', e.target.value)}
                            />
                        </PayrollField>
                        <DialogFooter>
                            <Button type="submit" disabled={batchForm.processing}>
                                <Save className="mr-2 h-4 w-4" /> Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editItem} onOpenChange={(open) => !open && !saveLoading && closeItemEdit()}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit migration row</DialogTitle>
                    </DialogHeader>
                    {editItem && (
                        <form onSubmit={submitItem} className="space-y-3">
                            <p className="text-xs text-zinc-500">{editItem.employee_label}</p>

                            {itemForm.data.use_manual_terms ? (
                                <PayrollField label="Loan policy">
                                    <Input
                                        readOnly
                                        tabIndex={-1}
                                        className="bg-zinc-50 text-xs"
                                        value={
                                            policyItems.find((p) => p.value === resolvePolicyId(itemForm.data))
                                                ?.label ??
                                            editItem.policy_name ??
                                            (editItem.loan_policy_id ? `Policy #${editItem.loan_policy_id}` : '—')
                                        }
                                    />
                                    <p className="mt-1 text-[10px] text-zinc-500">
                                        Manual terms — policy একই থাকবে; শুধু service charge ও installment custom।
                                    </p>
                                </PayrollField>
                            ) : (
                                <PayrollComboField
                                    label="Loan policy"
                                    value={resolvePolicyId(itemForm.data)}
                                    onChange={(v) => {
                                        patchItemForm({ loan_policy_id: v });
                                        if (!itemFormDataRef.current.use_manual_terms) {
                                            void recalculateFromPolicy({ useManual: false, data: { loan_policy_id: v } });
                                        }
                                    }}
                                    items={policyItems}
                                    placeholder="Select policy"
                                    required
                                />
                            )}

                            <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
                                <Checkbox
                                    id="use_manual_terms"
                                    checked={itemForm.data.use_manual_terms}
                                    onCheckedChange={(checked) => {
                                        const enabled = checked === true;
                                        const policyId = resolvePolicyId(itemFormDataRef.current);
                                        patchItemForm({
                                            use_manual_terms: enabled,
                                            loan_policy_id: policyId,
                                        });
                                        void recalculateFromPolicy({
                                            useManual: enabled,
                                            data: { use_manual_terms: enabled, loan_policy_id: policyId },
                                        });
                                    }}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="use_manual_terms" className="text-xs font-semibold text-zinc-800">
                                        Manual legacy terms
                                    </Label>
                                    <p className="text-[10px] leading-relaxed text-zinc-600">
                                        পুরনো loan-এর মোট service charge (যেমন ৳32,208) ও installment (যেমন ৳10,925)
                                        নিজে দিন। Check করলে policy ৭% override হবে না — save-এ এই values যাবে।
                                    </p>
                                </div>
                            </div>

                            <PayrollField label="Disbursement date" error={itemForm.errors.disbursement_date}>
                                <Input
                                    type="date"
                                    value={itemForm.data.disbursement_date}
                                    onChange={(e) => patchItemForm({ disbursement_date: e.target.value })}
                                />
                            </PayrollField>

                            <PayrollField label="Disburse amount (principal)" error={itemForm.errors.disburse_amount}>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    className="tabular-nums"
                                    value={itemForm.data.disburse_amount}
                                    onChange={(e) =>
                                        patchItemForm({
                                            disburse_amount: e.target.value.replace(/[^\d.]/g, ''),
                                        })
                                    }
                                    onBlur={triggerRecalc}
                                    placeholder="e.g. 230000"
                                />
                            </PayrollField>

                            {itemForm.data.use_manual_terms ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <PayrollField
                                        label="Service charge (total loan)"
                                        error={itemForm.errors.service_charge_amount}
                                    >
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="tabular-nums"
                                            value={itemForm.data.service_charge_amount}
                                            onChange={(e) =>
                                                patchItemForm({
                                                    service_charge_amount: e.target.value.replace(/[^\d.]/g, ''),
                                                })
                                            }
                                            onBlur={triggerRecalc}
                                            placeholder="e.g. 32208"
                                        />
                                    </PayrollField>
                                    <PayrollField label="Installment / month" error={itemForm.errors.installment_amount}>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="tabular-nums"
                                            value={itemForm.data.installment_amount}
                                            onChange={(e) =>
                                                patchItemForm({
                                                    installment_amount: e.target.value.replace(/[^\d.]/g, ''),
                                                })
                                            }
                                            onBlur={triggerRecalc}
                                            placeholder="e.g. 10925"
                                        />
                                    </PayrollField>
                                    <div className="sm:col-span-2">
                                        <PayrollField label="Total payable">
                                            <Input
                                                readOnly
                                                tabIndex={-1}
                                                className="bg-zinc-50 font-semibold tabular-nums"
                                                value={
                                                    manualTotalPayable != null
                                                        ? fmt(manualTotalPayable)
                                                        : previewMeta
                                                          ? fmt(previewMeta.total_payable)
                                                          : ''
                                                }
                                                placeholder="Disburse + service charge"
                                            />
                                        </PayrollField>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <PayrollField label="Installment / month" error={itemForm.errors.installment_amount}>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            readOnly
                                            tabIndex={-1}
                                            className={cn('bg-zinc-50 tabular-nums', calcLoading && 'animate-pulse')}
                                            value={itemForm.data.installment_amount}
                                            placeholder="Auto from policy"
                                        />
                                    </PayrollField>
                                </div>
                            )}

                            <PayrollField label="Passed months" error={itemForm.errors.passed_months}>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    className="tabular-nums"
                                    value={itemForm.data.passed_months}
                                    onChange={(e) =>
                                        patchItemForm({ passed_months: e.target.value.replace(/\D/g, '') })
                                    }
                                    onBlur={triggerRecalc}
                                />
                                <p className="mt-1 text-[10px] text-zinc-500">
                                    Disburse-এর পর কত মাস installment paid — প্রথম N টা installment paid mark হবে।
                                </p>
                            </PayrollField>

                            <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-semibold text-amber-900">Outstanding at closing</p>
                                        {previewMeta && !calcLoading && (
                                            <p className="mt-0.5 text-[10px] text-amber-800/80">
                                                {previewMeta.remaining_installments} month(s) remaining of{' '}
                                                {previewMeta.total_installments}
                                                {itemForm.data.use_manual_terms
                                                    ? ` · total payable ${fmt(previewMeta.total_payable)}`
                                                    : ''}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px]"
                                        onClick={triggerRecalc}
                                        disabled={calcLoading}
                                    >
                                        {calcLoading ? 'Calculating…' : 'Recalculate from policy'}
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <PayrollField label="Out PR" error={itemForm.errors.outstanding_principal}>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            readOnly={!itemForm.data.use_manual_terms}
                                            tabIndex={itemForm.data.use_manual_terms ? 0 : -1}
                                            className={cn(
                                                'tabular-nums',
                                                calcLoading && 'animate-pulse',
                                                !itemForm.data.use_manual_terms && 'bg-white',
                                            )}
                                            value={itemForm.data.outstanding_principal}
                                            onChange={(e) => {
                                                const pr = e.target.value.replace(/[^\d.]/g, '');
                                                patchItemForm({
                                                    outstanding_principal: pr,
                                                    outstanding_total: syncOutstandingTotal(
                                                        pr,
                                                        itemFormDataRef.current.outstanding_service_charge,
                                                    ),
                                                });
                                            }}
                                        />
                                    </PayrollField>
                                    <PayrollField label="Out SC" error={itemForm.errors.outstanding_service_charge}>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            readOnly={!itemForm.data.use_manual_terms}
                                            tabIndex={itemForm.data.use_manual_terms ? 0 : -1}
                                            className={cn(
                                                'tabular-nums',
                                                calcLoading && 'animate-pulse',
                                                !itemForm.data.use_manual_terms && 'bg-white',
                                            )}
                                            value={itemForm.data.outstanding_service_charge}
                                            onChange={(e) => {
                                                const sc = e.target.value.replace(/[^\d.]/g, '');
                                                patchItemForm({
                                                    outstanding_service_charge: sc,
                                                    outstanding_total: syncOutstandingTotal(
                                                        itemFormDataRef.current.outstanding_principal,
                                                        sc,
                                                    ),
                                                });
                                            }}
                                        />
                                    </PayrollField>
                                    <PayrollField label="Out total" error={itemForm.errors.outstanding_total}>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            readOnly={!itemForm.data.use_manual_terms}
                                            tabIndex={itemForm.data.use_manual_terms ? 0 : -1}
                                            className={cn(
                                                'font-semibold tabular-nums',
                                                calcLoading && 'animate-pulse',
                                                !itemForm.data.use_manual_terms && 'bg-white',
                                            )}
                                            value={itemForm.data.outstanding_total}
                                            onChange={(e) =>
                                                patchItemForm({
                                                    outstanding_total: e.target.value.replace(/[^\d.]/g, ''),
                                                })
                                            }
                                        />
                                    </PayrollField>
                                </div>
                                {calcError && <p className="mt-2 text-xs text-rose-600">{calcError}</p>}
                                <p className="mt-2 text-[10px] text-amber-800/80">
                                    {itemForm.data.use_manual_terms
                                        ? 'Manual: total payable − (passed × installment) থেকে Out PR/SC auto হবে। প্রয়োজনে Out SC/PR হাতে ঠিক করুন।'
                                        : 'Policy থেকে auto calculate — Recalculate from policy চাপুন বা disburse/passed months বদলান। Save করলেও policy অনুযায়ী আবার calculate হবে।'}
                                </p>
                            </div>

                            {editItem.employee_loan_id && (
                                <p className="text-[11px] text-amber-800">
                                    Saving will refresh the linked loan schedule and ledger from this snapshot.
                                </p>
                            )}
                            {(saveError || calcError) && (
                                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                    {saveError ?? calcError}
                                </p>
                            )}
                            <DialogFooter>
                                <Button type="submit" disabled={saveLoading || calcLoading}>
                                    <Save className="mr-2 h-4 w-4" />{' '}
                                    {saveLoading ? 'Saving…' : calcLoading ? 'Calculating…' : 'Save row'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </EmployeeLoanLayout>
    );
}
