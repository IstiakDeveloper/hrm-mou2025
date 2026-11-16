import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
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
import {
    calculationMethodItemsForLoan,
    isLegacyFlatPfLoan,
    isModernLoanDisbursement,
    normalizeCalculationMethodForLoan,
} from '@/lib/employee-loan-calculation-method';
import { Save } from 'lucide-react';
import axios from 'axios';
import { jsonCsrfHeaders } from '@/lib/csrf';

export type LoanTermsPolicy = {
    id: number;
    code: string;
    name: string;
    label: string;
    loan_type: string;
    calculation_method: string;
};

export type LoanTermsEditValues = {
    migration_item_id?: number | null;
    loan_id?: number;
    loan_policy_id: number;
    policy_name?: string | null;
    use_manual_terms: boolean;
    calculation_method: string | null;
    disbursement_date_iso: string | null;
    disburse_amount: number;
    installment_amount: number;
    passed_months: number;
    total_installments: number;
    service_charge_amount: number | null;
    outstanding_principal: number;
    outstanding_service_charge: number;
    outstanding_total: number;
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
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    subtitle?: string;
    terms: LoanTermsEditValues | null;
    policies: LoanTermsPolicy[];
    onSaved?: () => void;
};

const fmt = fmtLoanAmount;

type SavePayload = {
    loan_policy_id: number | null;
    use_manual_terms: boolean;
    calculation_method: string | null;
    disbursement_date: string;
    disburse_amount: number;
    service_charge_amount: number | null;
    installment_amount: number;
    passed_months: number;
    total_installments: number;
    outstanding_principal: number;
    outstanding_service_charge: number;
    outstanding_total: number;
};

function policyLoanType(policyId: string, policies: LoanTermsPolicy[]): string | null {
    return policies.find((p) => String(p.id) === policyId)?.loan_type ?? null;
}

function buildSavePayload(
    data: {
        loan_policy_id: string;
        use_manual_terms: boolean;
        calculation_method: string;
        disbursement_date: string;
        disburse_amount: string;
        service_charge_amount: string;
        installment_amount: string;
        passed_months: string;
        total_installments: string;
        outstanding_principal: string;
        outstanding_service_charge: string;
        outstanding_total: string;
    },
    policyId: string,
    policies: LoanTermsPolicy[],
): SavePayload {
    const loanType = policyLoanType(policyId, policies);

    return {
        loan_policy_id: policyId ? Number(policyId) : null,
        use_manual_terms: Boolean(data.use_manual_terms),
        calculation_method: normalizeCalculationMethodForLoan(
            data.calculation_method,
            data.disbursement_date,
            loanType,
        ),
        disbursement_date: data.disbursement_date,
        disburse_amount: Number(data.disburse_amount),
        service_charge_amount: data.use_manual_terms ? Number(data.service_charge_amount || 0) : null,
        installment_amount: Number(data.installment_amount),
        passed_months: Number(data.passed_months) || 0,
        total_installments: Number(data.total_installments) || 0,
        outstanding_principal: Number(data.outstanding_principal),
        outstanding_service_charge: Number(data.outstanding_service_charge || 0),
        outstanding_total: Number(data.outstanding_total),
    };
}

function snapshotPreviewMeta(
    passedMonths: number,
    installmentAmount: number,
    outstandingTotal: number,
    totalInstallmentsOverride?: number | null,
): Pick<RowPreview, 'remaining_installments' | 'total_installments' | 'total_payable'> {
    const remainingFromBalance = Math.max(1, Math.ceil(outstandingTotal / Math.max(installmentAmount, 1)));
    const total =
        totalInstallmentsOverride != null && totalInstallmentsOverride > 0
            ? Math.max(totalInstallmentsOverride, passedMonths + 1)
            : passedMonths + remainingFromBalance;
    const remaining = Math.max(1, total - passedMonths);

    return {
        remaining_installments: remaining,
        total_installments: total,
        total_payable: passedMonths * installmentAmount + outstandingTotal,
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

function policyDefaultMethodLabel(policyId: string, policies: LoanTermsPolicy[]): string {
    const policy = policies.find((p) => String(p.id) === policyId);
    if (!policy) {
        return 'Policy default';
    }

    const label = policy.calculation_method === 'flat' ? 'Flat' : 'Reducing';

    return `Policy default (${label})`;
}

function termsToFormData(terms: LoanTermsEditValues) {
    return {
        loan_policy_id: terms.loan_policy_id != null ? String(terms.loan_policy_id) : '',
        use_manual_terms: terms.use_manual_terms,
        calculation_method: terms.calculation_method ?? '',
        disbursement_date: terms.disbursement_date_iso || '',
        disburse_amount: String(terms.disburse_amount),
        service_charge_amount: terms.service_charge_amount != null ? String(terms.service_charge_amount) : '',
        installment_amount: String(terms.installment_amount),
        passed_months: String(terms.passed_months),
        total_installments: String(terms.total_installments || ''),
        outstanding_principal: String(terms.outstanding_principal),
        outstanding_service_charge: String(terms.outstanding_service_charge),
        outstanding_total: String(terms.outstanding_total),
    };
}

export function LoanTermsEditDialog({
    open,
    onOpenChange,
    title = 'Edit loan terms',
    subtitle,
    terms,
    policies,
    onSaved,
}: Props) {
    const [calcLoading, setCalcLoading] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [previewMeta, setPreviewMeta] = useState<Pick<RowPreview, 'remaining_installments' | 'total_installments' | 'total_payable'> | null>(null);
    const calcGeneration = useRef(0);

    const itemForm = useForm({
        loan_policy_id: '',
        use_manual_terms: false,
        calculation_method: '',
        disbursement_date: '',
        disburse_amount: '',
        service_charge_amount: '',
        installment_amount: '',
        passed_months: '',
        total_installments: '',
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

            return terms?.loan_policy_id != null ? String(terms.loan_policy_id) : '';
        },
        [terms],
    );

    useEffect(() => {
        if (!open || !terms) return;

        calcGeneration.current += 1;
        setCalcError(null);
        setSaveError(null);

        const formData = termsToFormData(terms);
        itemFormDataRef.current = formData;
        itemForm.setData(formData);
        itemForm.clearErrors();

        setPreviewMeta(
            snapshotPreviewMeta(
                terms.passed_months,
                terms.installment_amount,
                terms.outstanding_total,
                terms.total_installments,
            ),
        );
    }, [open, terms]);

    const policyItems = useMemo(() => {
        const base = policies.map((p) => ({ value: String(p.id), label: p.label, keywords: p.code }));

        if (terms?.loan_policy_id) {
            const id = String(terms.loan_policy_id);
            if (!base.some((p) => p.value === id)) {
                base.unshift({
                    value: id,
                    label: terms.policy_name ? `${terms.policy_name}` : `Policy #${id}`,
                    keywords: '',
                });
            }
        }

        return base;
    }, [policies, terms]);

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
                total_installments: String(preview.total_installments),
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

    const calculationMethodComboItems = useMemo(() => {
        const data = itemFormDataRef.current;
        const policyId = resolvePolicyId(data);
        const loanType = policyLoanType(policyId, policies);
        const methodItems = calculationMethodItemsForLoan(data.disbursement_date, loanType);

        if (isLegacyFlatPfLoan(data.disbursement_date, loanType)) {
            return methodItems;
        }

        return [
            { value: '', label: policyDefaultMethodLabel(policyId, policies), keywords: 'default policy' },
            ...methodItems,
        ];
    }, [policies, itemForm.data.loan_policy_id, itemForm.data.calculation_method, itemForm.data.disbursement_date, resolvePolicyId]);

    const recalculateFromPolicy = useCallback(
        async (options?: {
            useManual?: boolean;
            forcePolicy?: boolean;
            data?: Partial<typeof itemForm.data>;
        }): Promise<boolean> => {
            const data = { ...itemFormDataRef.current, ...options?.data };
            const policyId = resolvePolicyId(data);
            const amount = parseFloat(data.disburse_amount);
            const passed = parseInt(data.passed_months, 10) || 0;
            const useManual = options?.useManual ?? Boolean(data.use_manual_terms);
            const forcePolicy = options?.forcePolicy ?? false;

            if (!policyId || !Number.isFinite(amount) || amount <= 0) {
                setCalcError(null);
                setPreviewMeta(null);
                return false;
            }

            const install = parseFloat(data.installment_amount);
            if (useManual && (!Number.isFinite(install) || install <= 0)) {
                setCalcError('Manual mode: installment amount দিন।');
                return false;
            }

            if (!forcePolicy && Number.isFinite(install) && install > 0) {
                const outTotal = parseFloat(data.outstanding_total);
                const totalInstallments = parseInt(data.total_installments, 10) || 0;
                if (Number.isFinite(outTotal) && outTotal > 0) {
                    setPreviewMeta(
                        snapshotPreviewMeta(passed, install, outTotal, totalInstallments > 0 ? totalInstallments : null),
                    );
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
                force_policy: forcePolicy,
                installment_amount: install,
                outstanding_principal: parseFloat(data.outstanding_principal) || 0,
                outstanding_service_charge: parseFloat(data.outstanding_service_charge) || 0,
                outstanding_total: parseFloat(data.outstanding_total) || 0,
            };

            const totalInstallments = parseInt(data.total_installments, 10);
            if (Number.isFinite(totalInstallments) && totalInstallments > 0) {
                payload.total_installments = totalInstallments;
            }

            const method = normalizeCalculationMethodForLoan(
                data.calculation_method,
                data.disbursement_date,
                policyLoanType(policyId, policies),
            );
            if (method === 'reducing' || method === 'flat') {
                payload.calculation_method = method;
            }

            if (useManual) {
                payload.service_charge_amount = parseFloat(data.service_charge_amount) || 0;
            }

            try {
                const { data: preview } = await axios.post(route('loan-migration.calculate-preview'), payload);

                if (calcGeneration.current !== generation) {
                    return false;
                }

                if (forcePolicy) {
                    applyPreview(preview as RowPreview);
                } else {
                    setPreviewMeta({
                        remaining_installments: (preview as RowPreview).remaining_installments,
                        total_installments: (preview as RowPreview).total_installments,
                        total_payable: (preview as RowPreview).total_payable,
                    });
                }

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

    const triggerPolicyRecalc = useCallback(() => {
        const useManual = Boolean(itemFormDataRef.current.use_manual_terms);
        void recalculateFromPolicy({ useManual, forcePolicy: true });
    }, [recalculateFromPolicy]);

    const closeDialog = () => {
        if (saveLoading) return;
        calcGeneration.current += 1;
        setCalcError(null);
        setSaveError(null);
        setPreviewMeta(null);
        itemForm.reset();
        itemForm.clearErrors();
        onOpenChange(false);
    };

    const submitItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!terms || saveLoading || calcLoading) return;

        // Ref is the source of truth for typed fields; Inertia form state can lag a render behind.
        const merged = { ...itemForm.data, ...itemFormDataRef.current };
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
            const install = parseFloat(merged.installment_amount);
            if (!Number.isFinite(install) || install <= 0) {
                setSaveError('Manual mode: installment amount দিন।');
                return;
            }
        }

        const totalInstallments = parseInt(merged.total_installments, 10);
        const passedMonths = parseInt(merged.passed_months, 10) || 0;
        if (!Number.isFinite(totalInstallments) || totalInstallments < 1) {
            setSaveError('Total installments দিন।');
            return;
        }
        if (totalInstallments <= passedMonths) {
            setSaveError('Total installments passed months-এর থেকে বেশি হতে হবে।');
            return;
        }

        const outPr = parseFloat(merged.outstanding_principal);
        const outSc = parseFloat(merged.outstanding_service_charge || '0');
        const outTotal = parseFloat(merged.outstanding_total);
        if (!Number.isFinite(outTotal) || outTotal <= 0 || Math.abs(outPr + outSc - outTotal) > 0.02) {
            setSaveError('Outstanding: Out total = Out PR + Out SC হতে হবে।');
            return;
        }

        const payload = buildSavePayload(merged, policyId, policies);

        setSaveLoading(true);

        const saveUrl = terms.migration_item_id
            ? route('loan-migration.items.update', terms.migration_item_id)
            : route('employee-loans.ledger-terms.update', terms.loan_id);

        try {
            await axios.put(saveUrl, payload, {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...jsonCsrfHeaders(),
                },
            });

            closeDialog();
            if (onSaved) {
                onSaved();
            } else {
                router.reload({ preserveScroll: true });
            }
        } catch (err: unknown) {
            setSaveError(extractSaveError(err));
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && closeDialog()}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {terms && (
                    <form onSubmit={submitItem} className="space-y-3">
                        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}

                        {itemForm.data.use_manual_terms ? (
                            <PayrollComboField
                                label="Loan policy"
                                value={resolvePolicyId(itemForm.data)}
                                onChange={(v) => patchItemForm({ loan_policy_id: v })}
                                items={policyItems}
                                placeholder="Select policy"
                                required
                            />
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

                        <PayrollComboField
                            label="Calculation method"
                            value={itemForm.data.calculation_method}
                            onChange={(v) => {
                                patchItemForm({ calculation_method: v });
                                if (!itemFormDataRef.current.use_manual_terms) {
                                    void recalculateFromPolicy({
                                        useManual: false,
                                        data: { calculation_method: v },
                                    });
                                }
                            }}
                            items={calculationMethodComboItems}
                            placeholder="Policy default"
                        />
                        <p className="-mt-1 text-[10px] text-zinc-500">
                            ২০২৫-এর আগের PF loan শুধু flat। ২০২৫ ও পরে কোনো loan flat হবে না — reducing/policy default।
                        </p>

                        <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
                            <Checkbox
                                id="ledger_use_manual_terms"
                                checked={itemForm.data.use_manual_terms}
                                onCheckedChange={(checked) => {
                                    const enabled = checked === true;
                                    const policyId = resolvePolicyId(itemFormDataRef.current);
                                    patchItemForm({
                                        use_manual_terms: enabled,
                                        loan_policy_id: policyId,
                                        service_charge_amount:
                                            enabled && itemFormDataRef.current.service_charge_amount === ''
                                                ? '0'
                                                : itemFormDataRef.current.service_charge_amount,
                                    });
                                }}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="ledger_use_manual_terms" className="text-xs font-semibold text-zinc-800">
                                    Manual legacy terms
                                </Label>
                                <p className="text-[10px] leading-relaxed text-zinc-600">
                                    পুরনো loan-এর মোট service charge (PF loan-এ যেমন ৳32,208; motorcycle-এ ০) ও
                                    installment (যেমন ৳3,000) নিজে দিন। Check করলে policy rate override হবে না।
                                </p>
                            </div>
                        </div>

                        <PayrollField label="Disbursement date" error={itemForm.errors.disbursement_date}>
                            <Input
                                type="date"
                                value={itemForm.data.disbursement_date}
                                onChange={(e) => {
                                    const disbursementDate = e.target.value;
                                    const policyId = resolvePolicyId(itemFormDataRef.current);
                                    const loanType = policyLoanType(policyId, policies);
                                    const method = normalizeCalculationMethodForLoan(
                                        itemFormDataRef.current.calculation_method,
                                        disbursementDate,
                                        loanType,
                                    );
                                    patchItemForm({
                                        disbursement_date: disbursementDate,
                                        calculation_method: method ?? '',
                                    });
                                }}
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
                                        placeholder="0 for motorcycle"
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
                                        placeholder="e.g. 3000"
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
                                        className="tabular-nums"
                                        value={itemForm.data.installment_amount}
                                        onChange={(e) =>
                                            patchItemForm({
                                                installment_amount: e.target.value.replace(/[^\d.]/g, ''),
                                            })
                                        }
                                        placeholder="e.g. 3000"
                                    />
                                </PayrollField>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <PayrollField label="Passed months" error={itemForm.errors.passed_months}>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    className="tabular-nums"
                                    value={itemForm.data.passed_months}
                                    onChange={(e) => {
                                        const passed = e.target.value.replace(/\D/g, '');
                                        const total = parseInt(itemFormDataRef.current.total_installments, 10) || 0;
                                        const install = parseFloat(itemFormDataRef.current.installment_amount) || 0;
                                        const outTotal = parseFloat(itemFormDataRef.current.outstanding_total) || 0;
                                        patchItemForm({ passed_months: passed });
                                        if (install > 0 && outTotal > 0) {
                                            setPreviewMeta(
                                                snapshotPreviewMeta(
                                                    parseInt(passed, 10) || 0,
                                                    install,
                                                    outTotal,
                                                    total > 0 ? total : null,
                                                ),
                                            );
                                        }
                                    }}
                                />
                                <p className="mt-1 text-[10px] text-zinc-500">
                                    Disburse-এর পর কত মাস installment paid — প্রথম N টা installment paid mark হবে।
                                </p>
                            </PayrollField>
                            <PayrollField label="Total installments" error={itemForm.errors.total_installments}>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    className="tabular-nums"
                                    value={itemForm.data.total_installments}
                                    onChange={(e) => {
                                        const total = e.target.value.replace(/\D/g, '');
                                        const passed = parseInt(itemFormDataRef.current.passed_months, 10) || 0;
                                        const install = parseFloat(itemFormDataRef.current.installment_amount) || 0;
                                        const outTotal = parseFloat(itemFormDataRef.current.outstanding_total) || 0;
                                        patchItemForm({ total_installments: total });
                                        if (install > 0 && outTotal > 0) {
                                            setPreviewMeta(
                                                snapshotPreviewMeta(
                                                    passed,
                                                    install,
                                                    outTotal,
                                                    parseInt(total, 10) || null,
                                                ),
                                            );
                                        }
                                    }}
                                    placeholder="e.g. 30"
                                />
                                <p className="mt-1 text-[10px] text-zinc-500">
                                    Policy default override — যেমন motorcycle ৫০ এর জায়গায় এই employee-এর ৩০।
                                </p>
                            </PayrollField>
                        </div>

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
                                    onClick={triggerPolicyRecalc}
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
                                        className="tabular-nums"
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
                                        className="tabular-nums"
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
                                        className="font-semibold tabular-nums"
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
                                    ? 'Manual: সব field edit করা যাবে। Motorcycle loan-এ service charge ০ দিন। Save করলে loan schedule এই snapshot থেকে rebuild হবে।'
                                    : 'সব field edit করা যাবে। Policy থেকে auto-fill চাইলে Recalculate from policy চাপুন। Save করলে form-এর values অনুযায়ী loan schedule rebuild হবে।'}
                            </p>
                        </div>

                        <p className="text-[11px] text-amber-800">
                            Saving will refresh the loan schedule and ledger from this snapshot.
                        </p>
                        {(saveError || calcError) && (
                            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                {saveError ?? calcError}
                            </p>
                        )}
                        <DialogFooter>
                            <Button type="submit" disabled={saveLoading || calcLoading}>
                                <Save className="mr-2 h-4 w-4" />
                                {saveLoading ? 'Saving…' : calcLoading ? 'Calculating…' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
