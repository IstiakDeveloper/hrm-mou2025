import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { FormErrorBanner } from '@/components/employee-loan/FormErrorBanner';
import { PfLoanApplicationDocument, type PfLoanFormFields } from '@/components/employee-loan/PfLoanApplicationDocument';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';
import { csrfJsonPost } from '@/lib/csrf';
import { formatTakaWhole } from '@/lib/taka-format';
import { Printer } from 'lucide-react';

type Policy = {
    id: number;
    code: string;
    name: string;
    total_installments: number;
    min_amount: number;
    max_amount: number;
    interest_rate: number;
};

type Preview = {
    within_limit: boolean;
    message: string | null;
    amount_in_words: string;
    installments: string;
    installment_amount: string;
    service_charge: string;
    total_payable: string;
    max_amount: number;
};

type SavedDraft = {
    id: number;
    application_number: string;
    loan_policy_id: number | null;
    applied_amount: string;
    amount_in_words: string;
    reason: string;
    address: string;
    previous_details: string;
    previous_settled: string;
    previous_last_paid_on: string;
    previous_remaining: string;
};

type Props = {
    can_apply: boolean;
    can_submit: boolean;
    blockers: string[];
    service_years_required: number;
    max_percent: number;
    pf_balance: number;
    max_amount: number;
    confirmation_date: string | null;
    eligible_from: string | null;
    needs_signature: boolean;
    saved_draft: SavedDraft | null;
    active_loan: { id: number; loan_number: string } | null;
    open_application: { id: number; application_number: string; status: string } | null;
    policies: Policy[];
    draft: PfLoanFormFields;
};

export default function CreatePfLoanApplication(props: Props) {
    const { draft, policies, can_apply: canApply, saved_draft: saved } = props;
    const form = useForm({
        loan_policy_id: String(saved?.loan_policy_id || policies[0]?.id || ''),
        applied_amount: saved?.applied_amount || '',
        reason: saved?.reason || draft.reason,
        address: saved?.address || draft.address,
        previous_details: saved?.previous_details || draft.previous_details,
        previous_settled: saved?.previous_settled || draft.previous_settled,
        previous_last_paid_on: saved?.previous_last_paid_on || draft.previous_last_paid_on,
        previous_remaining: saved?.previous_remaining || draft.previous_remaining,
    });
    const [words, setWords] = useState(saved?.amount_in_words || '');
    const [calc, setCalc] = useState<Preview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const wordsDirty = useRef(Boolean(saved?.amount_in_words));
    const requestId = useRef(0);

    useEffect(() => {
        if (!canApply) return;
        const amount = Number(form.data.applied_amount);
        const policyId = Number(form.data.loan_policy_id);
        if (!policyId || !Number.isFinite(amount) || amount <= 0) {
            setCalc(null);
            setPreviewError(null);
            return;
        }

        const current = ++requestId.current;
        const timer = window.setTimeout(async () => {
            try {
                const data = await csrfJsonPost<Preview>(route('employee.loan.applications.preview'), {
                    loan_policy_id: policyId,
                    applied_amount: amount,
                });
                if (current !== requestId.current) return;
                setCalc(data);
                setPreviewError(null);
                if (!wordsDirty.current) setWords(data.amount_in_words);
            } catch (error) {
                if (current !== requestId.current) return;
                setCalc(null);
                if (axios.isAxiosError(error)) {
                    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
                    setPreviewError(data?.errors?.applied_amount?.[0] || data?.errors?.loan_policy_id?.[0] || data?.message || 'Could not calculate the installment.');
                } else {
                    setPreviewError('Could not calculate the installment.');
                }
            }
        }, 300);

        return () => window.clearTimeout(timer);
    }, [canApply, form.data.applied_amount, form.data.loan_policy_id]);

    const selected = policies.find((policy) => String(policy.id) === form.data.loan_policy_id);
    const fields: PfLoanFormFields = {
        ...draft,
        amount: form.data.applied_amount,
        amount_in_words: words,
        reason: form.data.reason,
        address: form.data.address,
        previous_details: form.data.previous_details,
        previous_settled: form.data.previous_settled,
        previous_last_paid_on: form.data.previous_last_paid_on,
        previous_remaining: form.data.previous_remaining,
        installments: calc?.installments || (selected ? String(selected.total_installments) : ''),
        installment_amount: calc?.installment_amount || '',
    };

    const changeField = (key: keyof PfLoanFormFields, value: string) => {
        if (key === 'amount') {
            wordsDirty.current = false;
            form.setData('applied_amount', value.replace(/[^\d.]/g, ''));
            return;
        }
        if (key === 'amount_in_words') {
            wordsDirty.current = true;
            setWords(value);
            return;
        }
        if (key in form.data) {
            form.setData(key as 'reason', value);
        }
    };

    const saveDraft = () => {
        form.transform((data) => ({ ...data, amount_in_words: words, save_draft: true }));
        form.post(route('employee.loan.applications.store'));
    };

    const submit = () => {
        if (!window.confirm('এই পিএফ ঋণের আবেদন Accounts-এ জমা হবে। জমা দেওয়ার পর আর সংশোধন করা যাবে না। জমা দেবেন?')) {
            return;
        }
        form.transform((data) => ({ ...data, amount_in_words: words, save_draft: false }));
        form.post(route('employee.loan.applications.store'));
    };

    const ready = canApply && props.can_submit && calc?.within_limit && words.trim() !== '' && form.data.reason.trim() !== '' && form.data.address.trim() !== '';

    return (
        <Layout>
            <Head title="PF Loan Application" />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Application</p>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-950">PF Loan Application</h1>
                        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                            Confirmation থেকে {props.service_years_required} বছর পূর্ণ হলে মোট পিএফ ব্যালেন্সের (নিজ অংশ + প্রতিষ্ঠান) {props.max_percent}% পর্যন্ত আবেদন করা যায়। খসড়া সেভ করে পরে জমা দেওয়া যাবে।
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="h-9 text-xs">
                            <Link href={employeeLoanEmployeePath(route('employee.loan.applications.index'))}>My applications</Link>
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => window.print()}>
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                        </Button>
                    </div>
                </div>

                <div className="mb-4 space-y-3 print:hidden">
                    {props.needs_signature && props.blockers.length === 0 && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            প্রোফাইলে ডিজিটাল স্বাক্ষর নেই। খসড়া সেভ করা যাবে, জমা দেওয়ার আগে স্বাক্ষর আপলোড করুন।{' '}
                            <Link href={route('profile.edit')} className="font-semibold underline">Upload signature</Link>
                        </div>
                    )}

                    {props.blockers.length > 0 && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                            {props.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}
                            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                                {props.needs_signature && <Link href={route('profile.edit')} className="underline">Upload signature</Link>}
                                {props.open_application && (
                                    <Link href={employeeLoanEmployeePath(route('employee.loan.applications.show', props.open_application.id))} className="underline">
                                        Open {props.open_application.application_number}
                                    </Link>
                                )}
                                {props.active_loan && (
                                    <Link href={employeeLoanEmployeePath(`/employee/loan/${props.active_loan.id}`)} className="underline">
                                        Open loan {props.active_loan.loan_number}
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    <FormErrorBanner errors={form.errors} />
                    {previewError && <p className="text-sm text-rose-700">{previewError}</p>}
                    {calc?.message && <p className="text-sm text-rose-700">{calc.message}</p>}

                    <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-4">
                        <label className="text-xs font-medium text-zinc-600 sm:col-span-2">
                            Repayment
                            <select
                                className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900"
                                value={form.data.loan_policy_id}
                                disabled={!canApply}
                                onChange={(event) => form.setData('loan_policy_id', event.target.value)}
                            >
                                {policies.length === 0 && <option value="">No PF policy</option>}
                                {policies.map((policy) => (
                                    <option key={policy.id} value={policy.id}>
                                        {policy.name} · {policy.total_installments} installments · {policy.interest_rate}%
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="text-xs text-zinc-600">
                            <p className="font-medium">মোট পিএফ ব্যালেন্স (নিজ + প্রতিষ্ঠান)</p>
                            <p className="mt-1 text-sm font-semibold text-zinc-900">{formatTakaWhole(props.pf_balance)}</p>
                            {props.confirmation_date && <p className="mt-1">Confirmed {props.confirmation_date}</p>}
                        </div>
                        <div className="text-xs text-zinc-600">
                            <p className="font-medium">আবেদনের সর্বোচ্চ ({props.max_percent}% of total)</p>
                            <p className="mt-1 text-sm font-semibold text-zinc-900">{formatTakaWhole(props.max_amount)}</p>
                            {calc && <p className="mt-1">Payable {calc.total_payable} · SC {calc.service_charge}</p>}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50/50 p-2 sm:p-4 print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none">
                    <div className="mb-2 text-center print:hidden">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">
                            হলুদ ঘরে ক্লিক করে লিখুন। প্রিন্টে ঘর ও রং থাকবে না।
                        </span>
                    </div>
                    <PfLoanApplicationDocument fields={fields} editing={canApply} onChange={changeField} />
                </div>

                <div className="mx-auto mt-4 flex max-w-[210mm] flex-col gap-3 print:hidden">
                    <p className="text-xs text-zinc-500">
                        নাম, পিন, পদবী, বেতন, পিএফ ব্যালেন্স ও স্বাক্ষর প্রোফাইল থেকে আসে। ঠিকানা স্থায়ী ঠিকানা থেকে আসে। হলুদ ঘরে অঙ্ক, কথায়, কারণ ও পূর্বের ঋণের বিবরণ লেখা যাবে।
                    </p>
                    <div className="flex flex-wrap items-center justify-end gap-2.5">
                        <Button type="button" variant="outline" className="border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100" disabled={!canApply || form.processing} onClick={saveDraft}>
                            {form.processing ? 'Saving…' : 'খসড়া সংরক্ষণ'}
                        </Button>
                        <Button type="button" className="bg-amber-600 hover:bg-amber-700" disabled={!ready || form.processing} onClick={submit}>
                            {form.processing ? 'Submitting…' : 'Submit to Accounts'}
                        </Button>
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}
