import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, HandCoins, Printer, Trash2 } from 'lucide-react';
import ClearanceDeleteDialog from './components/ClearanceDeleteDialog';
import React from 'react';
import ClearanceFormDocument, { type ClearanceRecord } from './components/ClearanceFormDocument';
import ClearanceWorkflowStepper from './components/ClearanceWorkflowStepper';

type Clearance = ClearanceRecord & {
    id: number;
    status: string;
    status_label: string;
    rejected_reason?: string | null;
};

function statusClass(status: string) {
    const styles: Record<string, string> = {
        draft: 'bg-slate-100 text-slate-700 border-slate-200',
        submitted_to_hr: 'bg-purple-50 text-purple-800 border-purple-200',
        submitted_to_accounts: 'bg-amber-50 text-amber-800 border-amber-200',
        submitted_to_director_fa: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        submitted_to_ed: 'bg-sky-50 text-sky-800 border-sky-200',
        approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        rejected: 'bg-rose-50 text-rose-800 border-rose-200',
    };
    return styles[status] ?? styles.draft;
}

function yesNo(name: string, value: boolean | null | undefined, set: (value: boolean) => void, required = false) {
    const unanswered = value !== true && value !== false;
    return (
        <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
                <input type="radio" name={name} required={required && unanswered} checked={value === true} onChange={() => set(true)} /> Yes
            </label>
            <label className="flex items-center gap-1.5">
                <input type="radio" name={name} required={required && unanswered} checked={value === false} onChange={() => set(false)} /> No
            </label>
        </div>
    );
}

function Req() {
    return <span className="text-rose-600"> *</span>;
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

const SIGNATURE_REQUIRED = 'চূড়ান্ত ছাড়পত্রের কোনো কাজ করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক। অনুগ্রহ করে প্রথমে স্বাক্ষর আপলোড করুন।';

function blockWithoutSignature(userHasSignature: boolean) {
    if (userHasSignature) return false;
    alert(SIGNATURE_REQUIRED);
    window.location.href = '/settings/profile';
    return true;
}

export default function FinalClearanceShow({
    clearance,
    canAct,
    userHasSignature = false,
    isSuperAdmin = false,
}: {
    clearance: Clearance;
    canAct: boolean;
    userHasSignature?: boolean;
    isSuperAdmin?: boolean;
}) {
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const field = useForm({
        id_card_returned: clearance.id_card_returned,
        sim_returned: clearance.sim_returned,
        member_loan_outstanding: clearance.member_loan_outstanding ?? '',
        savings_outstanding: clearance.savings_outstanding ?? '',
        total_member: clearance.total_member ?? '',
        total_borrower: clearance.total_borrower ?? '',
        preparer_comments: clearance.preparer_comments ?? '',
    });
    const hr = useForm({
        joining_date: clearance.joining_date ?? '',
        confirmation_date: clearance.confirmation_date ?? '',
        dropout_date: clearance.dropout_date ?? '',
        leave_balance: clearance.leave_balance ?? '',
        hr_issue: clearance.hr_issue,
        hr_issue_note: clearance.hr_issue_note ?? '',
        comments: '',
    });
    const accounts = useForm({
        unpaid_salary: clearance.unpaid_salary ?? 0,
        unpaid_salary_remarks: clearance.unpaid_salary_remarks ?? '',
        pf_amount: clearance.pf_amount ?? 0,
        pf_remarks: clearance.pf_remarks ?? '',
        gratuity_amount: clearance.gratuity_amount ?? 0,
        gratuity_remarks: clearance.gratuity_remarks ?? '',
        staff_security: clearance.staff_security ?? 0,
        staff_security_remarks: clearance.staff_security_remarks ?? '',
        other_payable: clearance.other_payable ?? 0,
        other_payable_remarks: clearance.other_payable_remarks ?? '',
        pf_loan: clearance.pf_loan ?? 0,
        pf_loan_remarks: clearance.pf_loan_remarks ?? '',
        motorcycle_loan: clearance.motorcycle_loan ?? 0,
        motorcycle_loan_remarks: clearance.motorcycle_loan_remarks ?? '',
        laptop_loan: clearance.laptop_loan ?? 0,
        laptop_loan_remarks: clearance.laptop_loan_remarks ?? '',
        other_loan: clearance.other_loan ?? 0,
        other_loan_remarks: clearance.other_loan_remarks ?? '',
        advance_received: clearance.advance_received ?? 0,
        advance_remarks: clearance.advance_remarks ?? '',
        accounts_comments: clearance.accounts_comments ?? '',
        comments: '',
    });
    const decision = useForm({ comments: '' });

    const postDecision = (url: string) => {
        if (blockWithoutSignature(userHasSignature)) return;
        if (decision.data.comments.trim() === '') {
            decision.setError('comments', 'Comment is required before submit.');
            return;
        }
        decision.clearErrors('comments');
        decision.post(url);
    };

    const moneyFields: { key: keyof typeof accounts.data; label: string; remarks: keyof typeof accounts.data }[] = [
        { key: 'unpaid_salary', label: 'Unpaid salary and other benefits', remarks: 'unpaid_salary_remarks' },
        { key: 'pf_amount', label: 'Provident fund', remarks: 'pf_remarks' },
        { key: 'gratuity_amount', label: 'Gratuity', remarks: 'gratuity_remarks' },
        { key: 'staff_security', label: 'Staff security', remarks: 'staff_security_remarks' },
        { key: 'other_payable', label: 'Other payable', remarks: 'other_payable_remarks' },
        { key: 'pf_loan', label: 'PF loan', remarks: 'pf_loan_remarks' },
        { key: 'motorcycle_loan', label: 'Motorcycle loan', remarks: 'motorcycle_loan_remarks' },
        { key: 'laptop_loan', label: 'Laptop loan', remarks: 'laptop_loan_remarks' },
        { key: 'other_loan', label: 'Other loan', remarks: 'other_loan_remarks' },
        { key: 'advance_received', label: 'Advance received', remarks: 'advance_remarks' },
    ];

    return (
        <Layout>
            <Head title={`${clearance.employee_name || 'Clearance'} - Final Payment & Clearance`} />
            <div className="w-full space-y-3.5">
                <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                        <Link href="/final-clearances" className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                    <HandCoins className="h-3.5 w-3.5" />
                                    Final Payment & Clearance
                                </span>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClass(clearance.status)}`}>
                                    {clearance.status_label}
                                </span>
                            </div>
                            <h1 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">{clearance.employee_name}</h1>
                            <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                                Staff ID: <span className="font-semibold text-slate-700">{clearance.staff_id || '—'}</span>
                                {' · '}{clearance.designation_name || '—'}
                                {' · '}{clearance.workplace || '—'}
                            </p>
                        </div>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        {isSuperAdmin && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 flex-1 border-rose-300 bg-rose-50 px-4 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-100 sm:flex-initial"
                                onClick={() => setDeleteOpen(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 flex-1 border-slate-300 px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 sm:flex-initial"
                            onClick={() => window.open(`/final-clearances/${clearance.id}/print`, '_blank')}
                        >
                            <Printer className="h-4 w-4 text-slate-600" />
                            Print / PDF
                        </Button>
                    </div>
                </div>

                {clearance.rejected_reason && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {clearance.rejected_reason}
                    </div>
                )}

                <ClearanceWorkflowStepper
                    status={clearance.status}
                    signatures={clearance.signatures}
                    canCorrectComment={isSuperAdmin}
                    clearanceId={clearance.id}
                />

                {canAct && !userHasSignature && (
                    <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold">ডিজিটাল স্বাক্ষর প্রয়োজন (Digital Signature Required)</p>
                                <p className="mt-0.5 text-[11px] text-amber-800">{SIGNATURE_REQUIRED}</p>
                            </div>
                        </div>
                        <Button type="button" variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100" onClick={() => { window.location.href = '/settings/profile'; }}>
                            Upload signature
                        </Button>
                    </div>
                )}

                {canAct && clearance.status === 'draft' && (
                    <Card className="border-slate-200 bg-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Field information</CardTitle>
                            <p className="text-xs text-slate-500">Submit করতে হলে এই অংশের সব ঘর পূরণ করতে হবে। ০ বসানো যাবে, খালি রাখা যাবে না।</p>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (blockWithoutSignature(userHasSignature)) return;
                                    field.post(`/final-clearances/${clearance.id}/submit`);
                                }}
                            >
                                <div>
                                    <div className="mb-1.5 text-xs font-semibold text-slate-700">ID card returned<Req /></div>
                                    {yesNo('id_card', field.data.id_card_returned, (value) => field.setData('id_card_returned', value), true)}
                                    <FieldError message={field.errors.id_card_returned} />
                                </div>
                                <div>
                                    <div className="mb-1.5 text-xs font-semibold text-slate-700">SIM returned<Req /></div>
                                    {yesNo('sim', field.data.sim_returned, (value) => field.setData('sim_returned', value), true)}
                                    <FieldError message={field.errors.sim_returned} />
                                </div>
                                <label className="text-xs font-semibold text-slate-700">Member loan outstanding<Req />
                                    <Input required className="mt-1 h-9 font-normal" value={field.data.member_loan_outstanding} onChange={(e) => field.setData('member_loan_outstanding', e.target.value)} />
                                    <FieldError message={field.errors.member_loan_outstanding} />
                                </label>
                                <label className="text-xs font-semibold text-slate-700">Savings outstanding<Req />
                                    <Input required className="mt-1 h-9 font-normal" value={field.data.savings_outstanding} onChange={(e) => field.setData('savings_outstanding', e.target.value)} />
                                    <FieldError message={field.errors.savings_outstanding} />
                                </label>
                                <label className="text-xs font-semibold text-slate-700">Total member<Req />
                                    <Input required className="mt-1 h-9 font-normal" value={field.data.total_member} onChange={(e) => field.setData('total_member', e.target.value)} />
                                    <FieldError message={field.errors.total_member} />
                                </label>
                                <label className="text-xs font-semibold text-slate-700">Total borrower<Req />
                                    <Input required className="mt-1 h-9 font-normal" value={field.data.total_borrower} onChange={(e) => field.setData('total_borrower', e.target.value)} />
                                    <FieldError message={field.errors.total_borrower} />
                                </label>
                                <label className="text-xs font-semibold text-slate-700 md:col-span-2">Preparer's comments<Req />
                                    <Textarea required className="mt-1 font-normal" rows={3} value={field.data.preparer_comments} onChange={(e) => field.setData('preparer_comments', e.target.value)} />
                                    <FieldError message={field.errors.preparer_comments} />
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:col-span-2">
                                    <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={field.processing} onClick={() => { if (!blockWithoutSignature(userHasSignature)) field.put(`/final-clearances/${clearance.id}`); }}>Save draft</Button>
                                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" disabled={field.processing}>Submit to HR</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {canAct && clearance.status === 'submitted_to_hr' && (
                    <Card className="border-slate-200 bg-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">HR</CardTitle>
                            <p className="text-xs text-slate-500">Submit করতে হলে এই অংশের সব ঘর পূরণ করতে হবে। ০ বসানো যাবে, খালি রাখা যাবে না।</p>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3 md:grid-cols-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (blockWithoutSignature(userHasSignature)) return;
                                    hr.post(`/final-clearances/${clearance.id}/forward`);
                                }}
                            >
                                <label className="text-xs font-semibold text-slate-700">Joining date<Req />
                                    <Input required type="date" className="mt-1 h-9 font-normal" value={hr.data.joining_date} onChange={(e) => hr.setData('joining_date', e.target.value)} />
                                    <FieldError message={hr.errors.joining_date} />
                                </label>
                                <label className="text-xs font-semibold text-slate-700">Confirmation date<Req />
                                    <Input required type="date" className="mt-1 h-9 font-normal" value={hr.data.confirmation_date} onChange={(e) => hr.setData('confirmation_date', e.target.value)} />
                                    <FieldError message={hr.errors.confirmation_date} />
                                </label>
                                <label className="text-xs font-semibold text-slate-700">Dropout date<Req />
                                    <Input required type="date" className="mt-1 h-9 font-normal" value={hr.data.dropout_date} onChange={(e) => hr.setData('dropout_date', e.target.value)} />
                                    <FieldError message={hr.errors.dropout_date} />
                                </label>
                                <label className="text-xs font-semibold text-slate-700">Leave balance from joining<Req />
                                    <Input required className="mt-1 h-9 font-normal" value={hr.data.leave_balance} onChange={(e) => hr.setData('leave_balance', e.target.value)} />
                                    <FieldError message={hr.errors.leave_balance} />
                                </label>
                                <div>
                                    <div className="mb-1.5 text-xs font-semibold text-slate-700">Any HR issue<Req /></div>
                                    {yesNo('hr_issue', hr.data.hr_issue, (value) => hr.setData('hr_issue', value), true)}
                                    <FieldError message={hr.errors.hr_issue} />
                                </div>
                                <label className="text-xs font-semibold text-slate-700 md:col-span-2">HR note<Req />
                                    <Textarea required className="mt-1 font-normal" rows={2} value={hr.data.hr_issue_note} onChange={(e) => hr.setData('hr_issue_note', e.target.value)} />
                                    <FieldError message={hr.errors.hr_issue_note} />
                                </label>
                                <label className="text-xs font-semibold text-slate-700 md:col-span-2">Comment for accounts
                                    <Textarea className="mt-1 font-normal" rows={2} value={hr.data.comments} onChange={(e) => hr.setData('comments', e.target.value)} />
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:col-span-2">
                                    <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={hr.processing} onClick={() => { if (!blockWithoutSignature(userHasSignature)) hr.put(`/final-clearances/${clearance.id}`); }}>Save</Button>
                                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" disabled={hr.processing}>Submit to Accounts</Button>
                                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => postDecision(`/final-clearances/${clearance.id}/send-back`)}>Send back</Button>
                                </div>
                                <label className="text-xs font-semibold text-slate-700 md:col-span-2">Send-back comment<Req />
                                    <Textarea className="mt-1 font-normal" rows={2} value={decision.data.comments} onChange={(e) => decision.setData('comments', e.target.value)} />
                                    {decision.errors.comments && <p className="mt-1 text-xs text-rose-600">{decision.errors.comments}</p>}
                                </label>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {canAct && clearance.status === 'submitted_to_accounts' && (
                    <Card className="border-slate-200 bg-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Accounts</CardTitle>
                            <p className="text-xs text-slate-500">Submit করতে হলে প্রতিটি পরিমাণ ও রিমার্কস পূরণ করতে হবে। পরিমাণ ০ হলেও রিমার্কস লিখতে হবে।</p>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="grid gap-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (blockWithoutSignature(userHasSignature)) return;
                                    accounts.post(`/final-clearances/${clearance.id}/forward`);
                                }}
                            >
                                {moneyFields.map((item) => (
                                    <div key={item.key} className="grid gap-2 md:grid-cols-2">
                                        <label className="text-xs font-semibold text-slate-700">{item.label}<Req />
                                            <Input required className="mt-1 h-9 font-normal" value={accounts.data[item.key] as string | number} onChange={(e) => accounts.setData(item.key, e.target.value)} />
                                            <FieldError message={accounts.errors[item.key]} />
                                        </label>
                                        <label className="text-xs font-semibold text-slate-700">Remarks<Req />
                                            <Input required className="mt-1 h-9 font-normal" value={accounts.data[item.remarks] as string} onChange={(e) => accounts.setData(item.remarks, e.target.value)} />
                                            <FieldError message={accounts.errors[item.remarks]} />
                                        </label>
                                    </div>
                                ))}
                                <label className="text-xs font-semibold text-slate-700">Accounts comments<Req />
                                    <Textarea required className="mt-1 font-normal" rows={3} value={accounts.data.accounts_comments} onChange={(e) => accounts.setData('accounts_comments', e.target.value)} />
                                    <FieldError message={accounts.errors.accounts_comments} />
                                </label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                    <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={accounts.processing} onClick={() => { if (!blockWithoutSignature(userHasSignature)) accounts.put(`/final-clearances/${clearance.id}`); }}>Save</Button>
                                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" disabled={accounts.processing}>Submit to Director Finance</Button>
                                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => postDecision(`/final-clearances/${clearance.id}/send-back`)}>Send back</Button>
                                </div>
                                <label className="text-xs font-semibold text-slate-700">Send-back comment<Req />
                                    <Textarea className="mt-1 font-normal" rows={2} value={decision.data.comments} onChange={(e) => decision.setData('comments', e.target.value)} />
                                    {decision.errors.comments && <p className="mt-1 text-xs text-rose-600">{decision.errors.comments}</p>}
                                </label>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {canAct && (clearance.status === 'submitted_to_director_fa' || clearance.status === 'submitted_to_ed') && (
                    <Card className="border-slate-200 bg-white shadow-xs">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{clearance.status === 'submitted_to_ed' ? 'Executive Director' : 'Director Finance & Accounts'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={(event) => event.preventDefault()}>
                                <label className="text-xs font-semibold text-slate-700">Comment<Req />
                                    <Textarea required className="mt-1 font-normal" rows={3} value={decision.data.comments} onChange={(e) => decision.setData('comments', e.target.value)} />
                                    <FieldError message={decision.errors.comments} />
                                </label>
                                <p className="mt-1 text-xs text-slate-500">Approve, send back, বা reject করতে কমেন্ট লিখতে হবে।</p>
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                    <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto" disabled={decision.processing} onClick={() => postDecision(`/final-clearances/${clearance.id}/approve`)}>
                                        {clearance.status === 'submitted_to_ed' ? 'Approve and close' : 'Approve'}
                                    </Button>
                                    <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={decision.processing} onClick={() => postDecision(`/final-clearances/${clearance.id}/send-back`)}>Send back</Button>
                                    <Button type="button" variant="outline" className="w-full border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 sm:w-auto" disabled={decision.processing} onClick={() => postDecision(`/final-clearances/${clearance.id}/reject`)}>Reject</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-2xs md:hidden">
                    <span className="font-semibold text-slate-700">📄 অফিশিয়াল ডকুমেন্ট প্রিভিউ (A4 Format)</span>
                    <span className="text-[11px] font-medium text-emerald-700">স্ক্রল করুন 👉</span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/60 p-2 sm:p-6">
                    <div className="min-w-[760px] sm:min-w-0">
                        <ClearanceFormDocument clearance={clearance} />
                    </div>
                </div>
            </div>
            {isSuperAdmin && (
                <ClearanceDeleteDialog
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                    clearanceId={clearance.id}
                    employeeName={clearance.employee_name}
                />
            )}
        </Layout>
    );
}
