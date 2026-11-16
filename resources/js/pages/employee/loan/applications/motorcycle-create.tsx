import React, { useEffect, useRef, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { FormErrorBanner } from '@/components/employee-loan/FormErrorBanner';
import { MotorcycleLoanApplicationDocument, type MotorcycleLoanFormFields } from '@/components/employee-loan/MotorcycleLoanApplicationDocument';
import { employeeLoanEmployeePath } from '@/lib/employee-loan-employee-nav';
import { csrfJsonPost } from '@/lib/csrf';
import { formatTakaWhole } from '@/lib/taka-format';
import { Printer } from 'lucide-react';

type Policy = { id: number; name: string; total_installments: number; min_amount: number; interest_rate: number };
type Preview = { within_limit: boolean; message: string | null; amount_in_words: string; installments: string; installment_amount: string; max_amount: number };
type SavedDraft = { loan_policy_id: number | null; applied_amount: string; amount_in_words: string; purpose: string; date: string };

type Props = {
    can_apply: boolean;
    can_submit: boolean;
    blockers: string[];
    rank: string;
    max_amount: number;
    limit_label: string;
    first_stage_label: string;
    needs_signature: boolean;
    policies: Policy[];
    draft: MotorcycleLoanFormFields;
    saved_draft: SavedDraft | null;
    active_loan: { id: number; loan_number: string } | null;
    open_application: { id: number; application_number: string; status: string } | null;
};

export default function CreateMotorcycleLoanApplication(props: Props) {
    const saved = props.saved_draft;
    const form = useForm({
        loan_policy_id: String(saved?.loan_policy_id || props.policies[0]?.id || ''),
        applied_amount: saved?.applied_amount || '',
        purpose: saved?.purpose || '',
        date: saved?.date || props.draft.date,
    });
    const [words, setWords] = useState(saved?.amount_in_words || '');
    const [calc, setCalc] = useState<Preview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const wordsDirty = useRef(Boolean(saved?.amount_in_words));
    const requestId = useRef(0);

    useEffect(() => {
        if (!props.can_apply) return;
        const amount = Number(form.data.applied_amount);
        const policyId = Number(form.data.loan_policy_id);
        if (!policyId || !Number.isFinite(amount) || amount <= 0) {
            setCalc(null);
            return;
        }
        const current = ++requestId.current;
        const timer = window.setTimeout(async () => {
            try {
                const data = await csrfJsonPost<Preview>(route('employee.loan.applications.motorcycle.preview'), {
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
                const data = axios.isAxiosError(error) ? error.response?.data as { message?: string } | undefined : undefined;
                setPreviewError(data?.message || 'Could not calculate the installment.');
            }
        }, 300);
        return () => window.clearTimeout(timer);
    }, [props.can_apply, form.data.applied_amount, form.data.loan_policy_id]);

    const fields: MotorcycleLoanFormFields = {
        ...props.draft,
        date: form.data.date,
        amount: form.data.applied_amount,
        amount_in_words: words,
        purpose: form.data.purpose,
    };

    const changeField = (key: 'date' | 'amount' | 'amount_in_words' | 'purpose', value: string) => {
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
        form.setData(key, value);
    };

    const post = (draft: boolean) => {
        form.transform((data) => ({ ...data, amount_in_words: words, save_draft: draft }));
        form.post(route('employee.loan.applications.motorcycle.store'));
    };

    const ready = props.can_submit && calc?.within_limit && words.trim() !== '' && form.data.purpose.trim() !== '';

    return (
        <Layout>
            <Head title="Motorcycle Loan Application" />
            <PageSurface className="px-3 sm:px-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Application</p>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-950">Motorcycle Loan</h1>
                        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
                            {props.limit_label}: সর্বোচ্চ {formatTakaWhole(props.max_amount)} টাকা। জমা দিলে প্রথমে {props.first_stage_label}-এর সুপারিশে যাবে। নির্বাহী পরিচালক অনুমোদনের পর হিসাব বিভাগ প্রদান করবে।
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
                            স্বাক্ষর না থাকলে খসড়া সেভ হবে, জমা যাবে না। <Link href={route('profile.edit')} className="font-semibold underline">Upload signature</Link>
                        </div>
                    )}
                    {props.blockers.length > 0 && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                            {props.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}
                        </div>
                    )}
                    <FormErrorBanner errors={form.errors} />
                    {previewError && <p className="text-sm text-rose-700">{previewError}</p>}
                    {calc?.message && <p className="text-sm text-rose-700">{calc.message}</p>}
                    <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-3">
                        <label className="text-xs font-medium text-zinc-600 sm:col-span-1">
                            Repayment
                            <select
                                className="mt-1 h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
                                value={form.data.loan_policy_id}
                                disabled={!props.can_apply}
                                onChange={(event) => form.setData('loan_policy_id', event.target.value)}
                            >
                                {props.policies.map((policy) => (
                                    <option key={policy.id} value={policy.id}>{policy.name} · {policy.total_installments} installments</option>
                                ))}
                            </select>
                        </label>
                        <div className="text-xs text-zinc-600">
                            <p className="font-medium">সর্বোচ্চ আবেদন</p>
                            <p className="mt-1 text-sm font-semibold text-zinc-900">{formatTakaWhole(props.max_amount)}</p>
                            <p className="mt-1">{props.limit_label}</p>
                        </div>
                        <div className="text-xs text-zinc-600">
                            <p className="font-medium">কিস্তি</p>
                            <p className="mt-1 text-sm font-semibold text-zinc-900">{calc ? `${calc.installment_amount} × ${calc.installments}` : '—'}</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto print:overflow-visible print:border-0">
                    <p className="mb-2 text-center print:hidden">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900">হলুদ ঘরে লিখুন। প্রিন্টে ঘর থাকবে না।</span>
                    </p>
                    <MotorcycleLoanApplicationDocument fields={fields} editing={props.can_apply} onChange={changeField} />
                </div>

                <div className="mx-auto mt-4 flex max-w-[210mm] justify-end gap-2 print:hidden">
                    <Button type="button" variant="outline" disabled={!props.can_apply || form.processing} onClick={() => post(true)}>খসড়া সংরক্ষণ</Button>
                    <Button type="button" className="bg-amber-600 hover:bg-amber-700" disabled={!ready || form.processing} onClick={() => {
                        if (window.confirm('সুপারিশের জন্য পাঠাবেন? জমা দেওয়ার পর এই ফরম আর বদলানো যাবে না।')) post(false);
                    }}>Submit for recommendation</Button>
                </div>
            </PageSurface>
        </Layout>
    );
}
