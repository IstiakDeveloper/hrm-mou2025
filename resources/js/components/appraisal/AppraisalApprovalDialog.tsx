import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { router } from '@inertiajs/react';
import { AlertCircle, Award, CheckCircle2, RotateCcw, Send, XCircle } from 'lucide-react';
import { reviewerGaps } from '@/lib/appraisal-required';
import { MissingFieldsAlert, scrollToMissingFields } from '@/components/appraisal/MissingFieldsAlert';

export type AppraisalKind = 'promotion' | 'confirmation' | 'probation' | 'trainee';

type Props = {
    kind: AppraisalKind;
    lang: 'bn' | 'en';
    evaluation: any | null;
    canSendBack?: boolean;
    onClose: () => void;
};

const PATHS: Record<AppraisalKind, string> = {
    promotion: '/promotion-evaluations',
    confirmation: '/confirmation-evaluations',
    probation: '/probation-increment-evaluations',
    trainee: '/trainee-evaluations',
};

function employeeLabel(evaluation: any, lang: 'bn' | 'en') {
    const name = evaluation?.candidate_name
        || (lang === 'bn'
            ? (evaluation?.employee?.name_bn || evaluation?.employee?.name_en)
            : (evaluation?.employee?.name_en || evaluation?.employee?.name_bn))
        || '';
    const pin = evaluation?.candidate_pin || evaluation?.pin || evaluation?.employee?.pin || '';
    return { name, pin };
}

export function AppraisalApprovalDialog({ kind, lang, evaluation, canSendBack, onClose }: Props) {
    const [mode, setMode] = useState<'approve' | 'send_back'>('approve');
    const [comments, setComments] = useState('');
    const [recommendation, setRecommendation] = useState('');
    const [months, setMonths] = useState('3');
    const [hrFinancial, setHrFinancial] = useState<boolean | null>(null);
    const [hrDisciplinary, setHrDisciplinary] = useState<boolean | null>(null);
    const [hrAudit, setHrAudit] = useState<boolean | null>(null);
    const [hrLeave, setHrLeave] = useState<boolean | null>(null);
    const [hrAcr, setHrAcr] = useState<boolean | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [attempted, setAttempted] = useState(false);

    useEffect(() => {
        if (!evaluation) {
            return;
        }
        const tri = (value: unknown): boolean | null => {
            if (value === true || value === 1 || value === '1') return true;
            if (value === false || value === 0 || value === '0') return false;
            return null;
        };
        setMode('approve');
        setSubmitting(false);
        setAttempted(false);
        setHrFinancial(tri(evaluation.hr_financial_irregularity));
        setHrDisciplinary(tri(evaluation.hr_disciplinary_action));
        setHrAudit(tri(evaluation.hr_audit_objection));
        setHrLeave(tri(evaluation.hr_leave_without_pay));
        setHrAcr(tri(evaluation.hr_acr_satisfactory));
        setComments('');

        if (kind === 'promotion') {
            setRecommendation(evaluation.recommendation_status || 'recommended');
            setMonths(String(evaluation.consider_after_months || ''));
        } else if (kind === 'confirmation') {
            setRecommendation(evaluation.recommendation_status || 'recommended');
            setMonths(String(evaluation.extend_months || '3'));
        } else if (kind === 'probation') {
            setRecommendation(evaluation.supervisor_recommendation || 'recommend_increment');
        } else {
            setRecommendation(evaluation.recommendation_type || evaluation.supervisor_recommendation || 'recommend_appointment');
            setMonths(String(evaluation.extension_days || ''));
        }
    }, [evaluation?.id, evaluation?.status, kind]);

    if (!evaluation) {
        return null;
    }

    const status = evaluation.status as string;
    const isHr = status === 'submitted_to_hr';
    const isEd = status === 'submitted_to_ed';
    const allowReject = isEd;
    const showRecommendation = !isHr && !isEd;
    const allowSendBack = canSendBack ?? evaluation.can_send_back !== false;
    const person = employeeLabel(evaluation, lang);
    const base = PATHS[kind];

    const finish = (ok: boolean) => {
        setSubmitting(false);
        if (ok) {
            onClose();
        }
    };

    const post = (url: string, payload: Record<string, unknown>) => {
        setSubmitting(true);
        router.post(url, payload, {
            preserveScroll: true,
            onSuccess: () => finish(true),
            onError: () => finish(false),
            onFinish: () => setSubmitting(false),
        });
    };

    const approvalGaps = reviewerGaps({
        kind,
        lang,
        status,
        comments,
        recommendation,
        months,
        hr: {
            hr_financial_irregularity: hrFinancial,
            hr_disciplinary_action: hrDisciplinary,
            hr_audit_objection: hrAudit,
            hr_leave_without_pay: hrLeave,
            hr_acr_satisfactory: hrAcr,
        },
    });
    const shownGaps = attempted && mode === 'approve' ? approvalGaps : [];

    const submitApproval = (approved: boolean) => {
        setAttempted(true);
        if (approvalGaps.length > 0) {
            scrollToMissingFields();
            return;
        }
        const trimmed = comments.trim();
        if (isHr) {
            const payload: Record<string, unknown> = { comments: trimmed };
            if (kind !== 'trainee') {
                payload.hr_financial_irregularity = hrFinancial;
                payload.hr_disciplinary_action = hrDisciplinary;
                payload.hr_audit_objection = hrAudit;
                payload.hr_leave_without_pay = hrLeave;
            }
            if (kind === 'promotion') {
                payload.hr_acr_satisfactory = hrAcr;
            }
            post(`${base}/${evaluation.id}/hr-verify`, payload);
            return;
        }

        if (isEd) {
            post(`${base}/${evaluation.id}/ed-approve`, {
                comments: trimmed,
                is_approved: approved,
            });
            return;
        }

        if (kind === 'promotion') {
            post(`${base}/${evaluation.id}/forward`, {
                comments: trimmed,
                recommendation_status: recommendation,
                consider_after_months: recommendation === 'consider_later' ? (months || null) : null,
            });
            return;
        }

        if (kind === 'confirmation') {
            post(`${base}/${evaluation.id}/forward`, {
                comments: trimmed,
                recommendation_status: recommendation,
                extend_months: recommendation === 'extend_probation' ? parseInt(months, 10) : null,
            });
            return;
        }

        if (kind === 'trainee') {
            post(`${base}/${evaluation.id}/forward`, {
                comments: trimmed,
                recommendation_type: recommendation,
                supervisor_recommendation: recommendation,
                extension_days: recommendation === 'extend_probation' ? parseInt(months, 10) : null,
            });
            return;
        }

        post(`${base}/${evaluation.id}/forward`, {
            comments: trimmed,
            recommendation_status: recommendation,
            supervisor_recommendation: recommendation,
        });
    };

    const submitSendBack = () => {
        if (!comments.trim()) {
            alert(lang === 'bn' ? 'সংশোধনের জন্য ফেরত পাঠানোর কারণ উল্লেখ করা আবশ্যক!' : 'Return reason is required!');
            return;
        }
        post(`${base}/${evaluation.id}/send-back`, { comments: comments.trim() });
    };

    const hrItems = kind === 'probation'
        ? [
            { key: 'hr_financial_irregularity', label: 'প্রমাণিত কোনো আর্থিক অনিয়ম/অর্থ আত্মসাৎ', value: hrFinancial, set: setHrFinancial },
            { key: 'hr_disciplinary_action', label: 'যেকোনো শাস্তিমূলক ব্যবস্থার আওতায় দেওয়া কোনো চিঠিপত্র', value: hrDisciplinary, set: setHrDisciplinary },
            { key: 'hr_audit_objection', label: 'সর্বশেষ অডিটে গুরুতর আপত্তি', value: hrAudit, set: setHrAudit },
            { key: 'hr_leave_without_pay', label: 'বিনা বেতনে ছুটি ভোগ', value: hrLeave, set: setHrLeave },
        ]
        : [
            { key: 'hr_financial_irregularity', label: 'প্রমাণিত কোনো আর্থিক অনিয়ম/অর্থ আত্মসাৎ', value: hrFinancial, set: setHrFinancial },
            { key: 'hr_disciplinary_action', label: 'প্রমাণিত শৃঙ্খলামূলক কোনো ব্যবস্থা', value: hrDisciplinary, set: setHrDisciplinary },
            { key: 'hr_audit_objection', label: 'নিরীক্ষা আপত্তি', value: hrAudit, set: setHrAudit },
            { key: 'hr_leave_without_pay', label: 'বিনাবেতনে ছুটি', value: hrLeave, set: setHrLeave },
            ...(kind === 'promotion'
                ? [{ key: 'hr_acr_satisfactory', label: 'এসিআর সন্তোষজনক', value: hrAcr, set: setHrAcr }]
                : []),
        ];

    const recommendationOptions = kind === 'promotion'
        ? [
            { value: 'recommended', label: lang === 'bn' ? 'সুপারিশকৃত' : 'Recommended' },
            { value: 'consider_later', label: lang === 'bn' ? 'পরবর্তীতে বিবেচনা' : 'Consider Later' },
            { value: 'not_suitable', label: lang === 'bn' ? 'উপযুক্ত নহে' : 'Not Suitable' },
        ]
        : kind === 'confirmation'
            ? [
                { value: 'recommended', label: lang === 'bn' ? 'স্থায়ীকরণ যোগ্য' : 'Recommend Confirmation' },
                { value: 'extend_probation', label: lang === 'bn' ? 'শিক্ষানবিশকাল বৃদ্ধি' : 'Extend Probation' },
                { value: 'not_suitable', label: lang === 'bn' ? 'অনুপযুক্ত / অব্যাহতি' : 'Not Suitable' },
            ]
            : kind === 'probation'
                ? [
                    { value: 'recommend_increment', label: 'বেতন বৃদ্ধির জন্য সুপারিশ করা হলো' },
                    { value: 'defer_increment', label: 'বেতন বৃদ্ধি স্থগিত রেখে পুনমূল্যায়ন করা হোক' },
                    { value: 'not_suitable', label: 'বেতন বৃদ্ধির উপযুক্ত নয়, অব্যাহতি প্রদান করা যেতে পারে' },
                ]
                : [
                    { value: 'recommend_appointment', label: 'নিয়োগের জন্য সুপারিশ করা হলো' },
                    { value: 'extend_probation', label: 'প্রশিক্ষণকাল বৃদ্ধি করে পুনর্মূল্যায়ন করা হোক' },
                    { value: 'not_satisfactory', label: 'প্রশিক্ষণ সন্তোষজনক নয়, প্রশিক্ষণকাল সমাপ্ত করা যেতে পারে' },
                ];

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="flex max-h-[min(92dvh,920px)] w-[calc(100%-1rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
                <DialogHeader className="space-y-1 px-4 pt-4 pr-10 text-left sm:px-5">
                    <DialogTitle className="flex items-start gap-2 text-sm leading-snug font-bold sm:text-base">
                        {mode === 'send_back' ? (
                            <>
                                <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                                <span>{lang === 'bn' ? 'সংশোধনের জন্য স্রষ্টার কাছে ফেরত পাঠান' : 'Send Back to Creator'}</span>
                            </>
                        ) : isEd ? (
                            <>
                                <Award className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                <span>{lang === 'bn' ? 'নির্বাহী পরিচালকের চূড়ান্ত অনুমোদন' : 'Executive Director Final Decision'}</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{lang === 'bn' ? 'অনুমোদন ও অগ্রবর্তীকরণ' : 'Approve & Forward'}</span>
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                        {mode === 'send_back'
                            ? (lang === 'bn' ? 'কারণ লিখে খসড়ায় ফেরত পাঠান।' : 'Return this evaluation to draft with a reason.')
                            : (lang === 'bn' ? 'মন্তব্য ও স্বাক্ষর দিয়ে পরবর্তী ধাপে পাঠান।' : 'Add remarks and forward with your signature.')}
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5">
                    <MissingFieldsAlert gaps={shownGaps} lang={lang} />
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                        <div className="font-bold text-slate-900">{person.name || '—'}</div>
                        <div className="mt-0.5 text-[11px] break-words text-slate-500">
                            {person.pin ? `PIN: ${person.pin}` : ''}
                            {evaluation.employee?.designation?.name ? ` • ${evaluation.employee.designation.name}` : ''}
                            {evaluation.employee?.branch?.name ? ` • ${evaluation.employee.branch.name}` : ''}
                        </div>
                        {evaluation.current_stage_label && (
                            <div className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
                                {lang === 'bn' ? 'বর্তমান পর্যায়:' : 'Current stage:'}{' '}
                                <strong className="text-slate-800">{evaluation.current_stage_label}</strong>
                            </div>
                        )}
                    </div>

                    {mode === 'approve' ? (
                        <>
                            {isHr && kind !== 'trainee' && (
                                <div className="space-y-2 rounded-xl border border-purple-200 bg-purple-50/70 p-3">
                                    <p className="text-xs font-bold text-purple-950">
                                        {lang === 'bn' ? 'ব্যক্তিগত ফাইল পর্যবেক্ষণ' : 'Personal file review'}
                                    </p>
                                    <div className="space-y-2">
                                        {hrItems.map((item) => (
                                            <div key={item.key} data-req={item.key} className="flex flex-col gap-1.5 rounded-lg border border-purple-100 bg-white px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
                                                <span className="text-[11px] leading-snug text-slate-800 sm:text-xs">{item.label}</span>
                                                <span className="flex shrink-0 gap-3 text-[11px]">
                                                    <label className="inline-flex items-center gap-1">
                                                        <input type="radio" checked={item.value === true} onChange={() => item.set(true)} />
                                                        {lang === 'bn' ? 'হ্যাঁ' : 'Yes'}
                                                    </label>
                                                    <label className="inline-flex items-center gap-1">
                                                        <input type="radio" checked={item.value === false} onChange={() => item.set(false)} />
                                                        {lang === 'bn' ? 'না' : 'No'}
                                                    </label>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showRecommendation && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-800">
                                        {lang === 'bn' ? 'সুপারিশ' : 'Recommendation'}
                                    </label>
                                    <div data-req="recommendation" className="grid grid-cols-1 gap-2">
                                        {recommendationOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setRecommendation(option.value)}
                                                className={`rounded-lg border px-3 py-2 text-left text-xs leading-snug ${
                                                    recommendation === option.value
                                                        ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900 ring-1 ring-emerald-500'
                                                        : 'border-slate-200 bg-white text-slate-700'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                    {kind === 'confirmation' && recommendation === 'extend_probation' && (
                                        <label className="flex flex-col gap-1 text-xs font-semibold text-amber-800 sm:flex-row sm:items-center">
                                            {lang === 'bn' ? 'কত মাসের জন্য বৃদ্ধি' : 'Extension period'}
                                            <select
                                                data-req="extend_months"
                                                value={months}
                                                onChange={(event) => setMonths(event.target.value)}
                                                className="h-9 rounded-md border border-amber-300 bg-white px-2 text-xs"
                                            >
                                                <option value="3">{lang === 'bn' ? '০৩ মাস' : '03 months'}</option>
                                                <option value="6">{lang === 'bn' ? '০৬ মাস' : '06 months'}</option>
                                            </select>
                                        </label>
                                    )}
                                    {kind === 'trainee' && recommendation === 'extend_probation' && (
                                        <label className="flex flex-col gap-1 text-xs font-semibold text-amber-800 sm:flex-row sm:items-center">
                                            {lang === 'bn' ? 'কত দিনের জন্য বৃদ্ধি' : 'Extension days'}
                                            <input
                                                data-req="extension_days"
                                                type="number"
                                                min={1}
                                                value={months}
                                                onChange={(event) => setMonths(event.target.value)}
                                                className="h-9 w-full rounded-md border border-amber-300 px-2 text-xs sm:w-28"
                                            />
                                        </label>
                                    )}
                                    {kind === 'promotion' && recommendation === 'consider_later' && (
                                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700 sm:flex-row sm:items-center">
                                            {lang === 'bn' ? 'কত মাস পর বিবেচনা' : 'Consider after (months)'}
                                            <input
                                                data-req="consider_after_months"
                                                type="number"
                                                min={1}
                                                value={months}
                                                onChange={(event) => setMonths(event.target.value)}
                                                className="h-9 w-full rounded-md border border-slate-300 px-2 text-xs sm:w-28"
                                            />
                                        </label>
                                    )}
                                </div>
                            )}

                            <label className="block space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">
                                    {lang === 'bn' ? 'মন্তব্য' : 'Comments'}
                                </span>
                                <textarea
                                    data-req="comments"
                                    value={comments}
                                    onChange={(event) => setComments(event.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
                                    placeholder={lang === 'bn' ? 'আপনার মন্তব্য লিখুন' : 'Write your comments'}
                                />
                            </label>
                        </>
                    ) : (
                        <>
                            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>
                                    {lang === 'bn'
                                        ? 'মূল্যায়নটি খসড়ায় ফিরে যাবে। কী সংশোধন করতে হবে তা লিখুন।'
                                        : 'This returns to draft. Write what must be corrected.'}
                                </span>
                            </div>
                            <textarea
                                value={comments}
                                onChange={(event) => setComments(event.target.value)}
                                rows={4}
                                className="w-full rounded-lg border border-rose-300 p-2.5 text-xs"
                                placeholder={lang === 'bn' ? 'ফেরত পাঠানোর কারণ' : 'Reason for return'}
                            />
                        </>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    {mode === 'approve' ? (
                        <>
                            {allowSendBack ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-full text-xs text-rose-700 sm:w-auto"
                                    onClick={() => {
                                        setMode('send_back');
                                        setComments('');
                                    }}
                                >
                                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                    {lang === 'bn' ? 'ফেরত পাঠান' : 'Send Back'}
                                </Button>
                            ) : <span className="hidden sm:block" />}
                            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                                <Button type="button" variant="outline" size="sm" className="h-9 w-full text-xs sm:w-auto" onClick={onClose}>
                                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                </Button>
                                {allowReject && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={submitting}
                                        onClick={() => submitApproval(false)}
                                        className="h-9 w-full bg-rose-600 text-xs text-white hover:bg-rose-700 sm:w-auto"
                                    >
                                        <XCircle className="mr-1 h-3.5 w-3.5" />
                                        {lang === 'bn' ? 'নামঞ্জুর' : 'Reject'}
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={submitting}
                                    onClick={() => submitApproval(true)}
                                    className="h-9 w-full bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 sm:w-auto"
                                >
                                    <Send className="mr-1 h-3.5 w-3.5" />
                                    {submitting
                                        ? (lang === 'bn' ? 'প্রক্রিয়াধীন...' : 'Processing...')
                                        : isEd
                                            ? (lang === 'bn' ? 'চূড়ান্ত অনুমোদন' : 'Final Approve')
                                            : (lang === 'bn' ? 'অনুমোদন ও অগ্রবর্তী' : 'Approve & Forward')}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="ghost" size="sm" className="h-9 w-full text-xs sm:w-auto" onClick={() => setMode('approve')}>
                                {lang === 'bn' ? '← অনুমোদনে ফিরে যান' : '← Back to Approve'}
                            </Button>
                            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                                <Button type="button" variant="outline" size="sm" className="h-9 w-full text-xs sm:w-auto" onClick={onClose}>
                                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={submitting || !comments.trim()}
                                    onClick={submitSendBack}
                                    className="h-9 w-full bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 sm:w-auto"
                                >
                                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                    {submitting ? (lang === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...') : (lang === 'bn' ? 'ফেরত পাঠান' : 'Send Back')}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
