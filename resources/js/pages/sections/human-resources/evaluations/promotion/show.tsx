import { useState } from 'react';
import { PageSurface } from '@/components/page-surface';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/layouts/AdminLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { Textarea } from '@/components/ui/textarea';
import { 
    Award, 
    ArrowLeft, 
    Printer, 
    CheckCircle2, 
    Send, 
    RotateCcw,
    ShieldCheck,
    Edit3,
    Trash2,
    Clock,
    AlertTriangle
} from 'lucide-react';
import { evalTranslations } from './evaluation-config';
import OfficialFormDocument from './components/OfficialFormDocument';

export default function PromotionEvaluationShow({ 
    evaluation,
    isSuperAdmin = false,
    currentUserId = null,
    userHasSignature = false,
    canEdit = false,
    canDelete = false,
    canSubmit = false,
    canApprove = false,
    canSendBack = false,
    hasUserSigned = false,
    sentBackReason = null,
    currentStageLabel = '',
}: any) {
    const [lang, setLang] = useState<'bn' | 'en'>(() => {
        return (localStorage.getItem('eval_lang') as 'bn' | 'en') || 'bn';
    });
    const t = evalTranslations[lang];

    interface ShowFormData {
        [key: string]: any;
        comments: string;
        recommendation_status: string;
        consider_after_months: string | number;
        hr_financial_irregularity: boolean;
        hr_disciplinary_action: boolean;
        hr_audit_objection: boolean;
        hr_leave_without_pay: boolean;
        hr_acr_satisfactory: boolean;
        is_approved: boolean;
    }

    const { data, setData, post, processing, reset } = useForm<ShowFormData>({
        comments: '',
        recommendation_status: evaluation.recommendation_status || 'recommended',
        consider_after_months: evaluation.consider_after_months || '',
        hr_financial_irregularity: false,
        hr_disciplinary_action: false,
        hr_audit_objection: false,
        hr_leave_without_pay: false,
        hr_acr_satisfactory: false,
        is_approved: false,
    });
    const [actionType, setActionType] = useState('');

    const handleAction = (e: any, route: string, type: string) => {
        e.preventDefault();
        setActionType(type);

        if (type === 'send_back') {
            const comment = prompt(
                lang === 'bn' 
                    ? 'সংশোধনের জন্য স্রষ্টার কাছে ফেরত পাঠানোর কারণ লিখুন (আবশ্যক):' 
                    : 'Please enter reason for sending back to creator (Required):'
            );
            if (!comment || !comment.trim()) {
                alert(lang === 'bn' ? 'ফেরত পাঠানোর কারণ লেখা আবশ্যক!' : 'Return reason is required!');
                return;
            }
            router.post(`/promotion-evaluations/${evaluation.id}/send-back`, { comments: comment.trim() }, {
                preserveScroll: true,
            });
            return;
        }
        
        const payload: any = {
            ...data,
            comments: data.comments || (evaluation.status === 'draft' ? 'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।' : 'সুপারিশ ও স্বাক্ষরসহ অনুমোদনপূর্বক পরবর্তী স্তরে অগ্রবর্তী করা হলো।'),
            is_approved: type === 'approve',
        };

        router.post(`/promotion-evaluations/${evaluation.id}/${route}`, payload, {
            preserveScroll: true,
            onSuccess: () => reset('comments'),
        });
    };

    const handleDelete = () => {
        if (confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই মূল্যায়নটি মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।' : 'Are you sure you want to delete this promotion evaluation? This cannot be undone.')) {
            router.delete(`/promotion-evaluations/${evaluation.id}`);
        }
    };

    const getStatusBadge = (evaluationStatus: string) => {
        const configs: Record<string, { label: string; bg: string }> = {
            draft: { label: t.statusDraft, bg: 'bg-slate-100 text-slate-700' },
            submitted_to_rm: { label: t.statusSubmittedRm, bg: 'bg-amber-100 text-amber-800 border-amber-300' },
            submitted_to_zm: { label: t.statusSubmittedZm, bg: 'bg-amber-100 text-amber-800 border-amber-300' },
            submitted_to_director: { label: t.statusSubmittedDmf, bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
            submitted_to_director_fa: { label: t.statusSubmittedDfa, bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
            submitted_to_hr: { label: t.statusSubmittedHr, bg: 'bg-purple-100 text-purple-800 border-purple-300' },
            submitted_to_ed: { label: t.statusSubmittedEd, bg: 'bg-blue-100 text-blue-800 border-blue-300' },
            approved: { label: t.statusApproved, bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
            rejected: { label: t.statusRejected, bg: 'bg-rose-100 text-rose-800 border-rose-300' },
            sent_back: { label: t.statusSentBack, bg: 'bg-orange-100 text-orange-800 border-orange-300' },
        };

        const config = configs[evaluationStatus] || { 
            label: evaluationStatus.replace(/_/g, ' ').toUpperCase(), 
            bg: 'bg-slate-100 text-slate-700' 
        };

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.bg}`}>
                {config.label}
            </span>
        );
    };

    const employeeName = lang === 'bn' 
        ? (evaluation.employee?.name_bn || evaluation.employee?.name_en) 
        : (evaluation.employee?.name_en || evaluation.employee?.name_bn);

    const isActionRequired = canApprove;

    return (
        <Layout>
            <Head title={`${employeeName} - ${t.badgeTitle}`} />
            
            <PageSurface className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/promotion-evaluations"
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Award className="h-3.5 w-3.5" /> {t.badgeTitle}
                                </span>
                                {getStatusBadge(evaluation.status)}
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                                {employeeName}
                            </h1>
                            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                                PIN: <span className="font-semibold text-slate-700">{evaluation.employee?.pin}</span> • {evaluation.employee?.designation?.name || 'No Designation'} • {evaluation.employee?.branch?.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
                        {/* Language Switcher */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('bn');
                                    localStorage.setItem('eval_lang', 'bn');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'bn' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('en');
                                    localStorage.setItem('eval_lang', 'en');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'en' 
                                        ? 'bg-emerald-600 text-white shadow-sm' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                English
                            </button>
                        </div>

                        {/* Edit Button */}
                        {canEdit && (
                            <Link href={`/promotion-evaluations/${evaluation.id}/edit`}>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-10 px-3.5 text-xs font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 shadow-sm"
                                >
                                    <Edit3 className="h-4 w-4 text-amber-700" />
                                    <span>{lang === 'bn' ? 'সম্পাদনা করুন' : 'Edit Draft'}</span>
                                </Button>
                            </Link>
                        )}

                        {/* Delete Button */}
                        {canDelete && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleDelete}
                                className="h-10 px-3.5 text-xs font-semibold border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center gap-1.5 shadow-sm"
                            >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                                <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                            </Button>
                        )}

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(`/promotion-evaluations/${evaluation.id}/print`, '_blank')}
                            className="h-10 px-4 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 shadow-sm shrink-0"
                        >
                            <Printer className="h-4 w-4 text-slate-500" />
                            <span>{t.printOfficialForm}</span>
                        </Button>
                    </div>
                </div>

                {/* Sent Back Alert (If Returned to Creator) */}
                {evaluation.status === 'draft' && sentBackReason && (
                    <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/90 text-rose-900 shadow-sm flex items-start gap-3.5">
                        <div className="p-2 rounded-lg bg-rose-200 text-rose-800 shrink-0 mt-0.5">
                            <RotateCcw className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <h4 className="text-sm font-bold text-rose-950">
                                {lang === 'bn' ? '⚠️ মূল্যায়নটি পর্যালোচকের দ্বারা সংশোধনের জন্য ফেরত পাঠানো হয়েছে' : '⚠️ Evaluation Sent Back for Revision'}
                            </h4>
                            <div className="text-xs text-rose-900 bg-white/80 p-2.5 rounded-lg border border-rose-200">
                                <span className="font-bold">{lang === 'bn' ? 'ফেরত পাঠানোর কারণ / মন্তব্য: ' : 'Reason / Comment: '}</span>
                                "{sentBackReason}"
                            </div>
                            <p className="text-[11px] text-rose-800">
                                {lang === 'bn' 
                                    ? 'অনুগ্রহ করে উপরের "সম্পাদনা করুন" বাটনে ক্লিক করে প্রয়োজনীয় সংশোধন সম্পন্ন করুন এবং পুনরায় আঞ্চলিক ব্যবস্থাপক বরাবর দাখিল করুন।' 
                                    : 'Please click "Edit" above to make necessary revisions and re-submit to Regional Manager.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Has User Already Signed Notification */}
                {hasUserSigned && !canApprove && !['approved', 'rejected'].includes(evaluation.status) && (
                    <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/80 text-emerald-900 shadow-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-200/80 text-emerald-800 shrink-0">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-950">
                                    {lang === 'bn' ? '✓ আপনার অনুমোদন ও স্বাক্ষর সম্পন্ন হয়েছে' : '✓ Your Approval Completed'}
                                </p>
                                <p className="text-[11px] text-emerald-800 mt-0.5">
                                    {lang === 'bn'
                                        ? `আপনি ইতিমধ্যে এই মূল্যায়নটিতে আপনার স্বাক্ষর প্রদান করেছেন। এটি বর্তমানে ${currentStageLabel || 'পরবর্তী স্তর'} এ পর্যালোচনায় রয়েছে।`
                                        : `You have signed and forwarded this evaluation. It is currently under review at ${currentStageLabel || 'next stage'}.`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Draft Banner if status is draft */}
                {!userHasSignature && (canSubmit || isActionRequired) && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800 shrink-0">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold">
                                    {lang === 'bn' ? 'ডিজিটাল স্বাক্ষর প্রয়োজন (Digital Signature Required)' : 'Digital Signature Required'}
                                </p>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                    {lang === 'bn' 
                                        ? 'মূল্যায়ন দাখিল বা অনুমোদন করার জন্য আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর থাকা আবশ্যক।' 
                                        : 'A digital signature must be uploaded to your profile before submitting or approving an evaluation.'}
                                </p>
                            </div>
                        </div>
                        <Link href="/settings/profile" className="shrink-0">
                            <Button size="sm" className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                                {lang === 'bn' ? 'স্বাক্ষর আপলোড করুন' : 'Upload Signature'}
                            </Button>
                        </Link>
                    </div>
                )}

                {evaluation.status === 'draft' && (
                    <Card className="border-amber-300 bg-amber-50/50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-amber-100/60 border-b border-amber-200 py-3 px-5">
                            <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-amber-700" />
                                {lang === 'bn' ? 'খসড়া মূল্যায়ন (Draft) — দাখিলের অপেক্ষায়' : 'Draft Evaluation — Pending Submission'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-xs text-amber-900 font-medium">
                                    {lang === 'bn'
                                        ? 'এই মূল্যায়নটি বর্তমানে খসড়া অবস্থায় সংরক্ষিত আছে। আপনি চাইলে এখনো এটি সম্পাদনা বা মুছে ফেলতে পারেন। সবকিছু ঠিক থাকলে আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করুন।'
                                        : 'This evaluation is currently saved as a draft. You can still edit or delete it. When ready, submit it to the Regional Manager.'}
                                </p>
                                <p className="text-[11px] text-amber-700 mt-1 italic">
                                    {lang === 'bn' 
                                        ? '⚠️ দাখিল করার পর স্রষ্টা (Creator) আর কোনো তথ্য সম্পাদনা বা মুছে ফেলতে পারবেন না।' 
                                        : '⚠️ Once submitted, the creator will no longer be able to edit or delete.'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {canEdit && (
                                    <Link href={`/promotion-evaluations/${evaluation.id}/edit`}>
                                        <Button variant="outline" className="text-xs h-9 bg-white border-amber-300 text-amber-900 hover:bg-amber-100">
                                            <Edit3 className="h-3.5 w-3.5 mr-1 text-amber-700" />
                                            {lang === 'bn' ? 'সম্পাদনা করুন' : 'Edit'}
                                        </Button>
                                    </Link>
                                )}
                                {canSubmit && (
                                    <Button 
                                        onClick={e => handleAction(e, 'forward', 'forward')}
                                        disabled={processing}
                                        className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                                    >
                                        <Send className="h-3.5 w-3.5 mr-1" />
                                        {lang === 'bn' ? 'আরএম সমীপে দাখিল করুন' : 'Submit to RM'}
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button 
                                        variant="outline"
                                        onClick={handleDelete}
                                        className="text-xs h-9 border-rose-300 bg-white text-rose-700 hover:bg-rose-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1 text-rose-600" />
                                        {lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Workflow Action Box if awaiting review */}
                {isActionRequired && (
                    <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/40 via-white to-slate-50 shadow-sm overflow-hidden">
                        <CardHeader className="bg-emerald-50/80 border-b border-emerald-100 py-3 px-5">
                            <CardTitle className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                                {t.workflowReviewTitle} — {getStatusBadge(evaluation.status)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">{t.commentsLabel}</label>
                                <Textarea 
                                    placeholder={t.commentsPlaceholder} 
                                    value={data.comments}
                                    onChange={e => setData('comments', e.target.value)}
                                    className="text-xs bg-white"
                                    rows={2}
                                />
                            </div>

                            {/* HR Verification Checklist if at HR Stage */}
                            {evaluation.status === 'submitted_to_hr' && (
                                <div className="space-y-3 p-4 bg-purple-50/70 border border-purple-200 rounded-xl text-xs">
                                    <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                                        <span className="font-bold text-xs text-purple-950">
                                            {t.hrChecklistTitle}
                                        </span>
                                        <span className="text-[10px] text-purple-700 font-semibold px-2 py-0.5 bg-purple-100 rounded-full">
                                            {lang === 'bn' ? 'এইচআর যাচাই' : 'HR Verification'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-purple-800 italic">
                                        {lang === 'bn' ? 'নিচের যেকোনো একটি গত ০২ বছরের মধ্যে হয়েছে কি না?' : 'Has any of the following occurred within the last 02 years?'}
                                    </p>

                                    <div className="overflow-hidden rounded-lg border border-purple-200 bg-white shadow-2xs">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-purple-100/70 text-purple-900 font-semibold text-[11px]">
                                                    <th className="p-2 text-left">{lang === 'bn' ? 'বিষয়' : 'Subject'}</th>
                                                    <th className="p-2 text-center w-16">{lang === 'bn' ? 'হ্যাঁ' : 'Yes'}</th>
                                                    <th className="p-2 text-center w-16">{lang === 'bn' ? 'না' : 'No'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-purple-100 text-[11px]">
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2 text-slate-800">১. {t.hrFinancialIrregularity}</td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_financial_irregularity" 
                                                            checked={data.hr_financial_irregularity === true} 
                                                            onChange={() => setData('hr_financial_irregularity', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_financial_irregularity" 
                                                            checked={data.hr_financial_irregularity === false} 
                                                            onChange={() => setData('hr_financial_irregularity', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2 text-slate-800">২. {t.hrDisciplinaryAction}</td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_disciplinary_action" 
                                                            checked={data.hr_disciplinary_action === true} 
                                                            onChange={() => setData('hr_disciplinary_action', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_disciplinary_action" 
                                                            checked={data.hr_disciplinary_action === false} 
                                                            onChange={() => setData('hr_disciplinary_action', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2 text-slate-800">৩. {t.hrAuditObjection}</td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_audit_objection" 
                                                            checked={data.hr_audit_objection === true} 
                                                            onChange={() => setData('hr_audit_objection', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_audit_objection" 
                                                            checked={data.hr_audit_objection === false} 
                                                            onChange={() => setData('hr_audit_objection', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2 text-slate-800">৪. {t.hrLeaveWithoutPay}</td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_leave_without_pay" 
                                                            checked={data.hr_leave_without_pay === true} 
                                                            onChange={() => setData('hr_leave_without_pay', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_leave_without_pay" 
                                                            checked={data.hr_leave_without_pay === false} 
                                                            onChange={() => setData('hr_leave_without_pay', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-purple-50/30">
                                                    <td className="p-2 text-slate-800">৫. {t.hrAcrSatisfactory}</td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_acr_satisfactory" 
                                                            checked={data.hr_acr_satisfactory === true} 
                                                            onChange={() => setData('hr_acr_satisfactory', true)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <input 
                                                            type="radio" 
                                                            name="show_hr_acr_satisfactory" 
                                                            checked={data.hr_acr_satisfactory === false} 
                                                            onChange={() => setData('hr_acr_satisfactory', false)} 
                                                            className="text-purple-600 focus:ring-purple-500 cursor-pointer" 
                                                        />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <Button 
                                        className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 shadow-sm" 
                                        onClick={e => handleAction(e, 'hr-verify', 'verify')} 
                                        disabled={processing}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                        {lang === 'bn' ? 'এইচআর যাচাই ও স্বাক্ষরসহ ইডি বরাবর অগ্রবর্তী করুন' : t.submitHrVerification}
                                    </Button>
                                </div>
                            )}

                            {/* ED Approval Actions */}
                            {evaluation.status === 'submitted_to_ed' && (
                                <div className="flex gap-3 pt-1">
                                    <Button 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5" 
                                        onClick={e => handleAction(e, 'ed-approve', 'approve')} 
                                        disabled={processing}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> {t.approvePromotion}
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        className="text-xs h-10 px-5" 
                                        onClick={e => handleAction(e, 'ed-approve', 'reject')} 
                                        disabled={processing}
                                    >
                                        {t.rejectPromotion}
                                    </Button>
                                </div>
                            )}

                            {/* Line Manager / Stage Reviewer Forward & Send Back */}
                            {!['submitted_to_hr', 'submitted_to_ed'].includes(evaluation.status) && (
                                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                                    <Button 
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 shadow-sm" 
                                        onClick={e => handleAction(e, 'forward', 'forward')} 
                                        disabled={processing}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> 
                                        {lang === 'bn' ? 'অনুমোদন ও অগ্রবর্তী করুন' : 'Approve & Forward'}
                                    </Button>

                                    {canEdit && (
                                        <Link href={`/promotion-evaluations/${evaluation.id}/edit`}>
                                            <Button 
                                                type="button"
                                                variant="outline" 
                                                className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs h-10 px-4 font-semibold"
                                            >
                                                <Edit3 className="h-3.5 w-3.5 mr-1.5 text-amber-700" /> 
                                                {lang === 'bn' ? 'প্রয়োজনে আগে সম্পাদনা করুন' : 'Edit Before Approval'}
                                            </Button>
                                        </Link>
                                    )}

                                    <Button 
                                        type="button"
                                        variant="outline" 
                                        className="border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs h-10 px-5 font-semibold" 
                                        onClick={e => handleAction(e, 'send-back', 'send_back')} 
                                        disabled={processing}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-rose-600" /> 
                                        {lang === 'bn' ? 'স্রষ্টার কাছে ফেরত পাঠান' : 'Send Back to Creator'}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* The Central Official Document Preview */}
                <div className="bg-slate-100/60 p-2 sm:p-6 rounded-2xl border border-slate-200">
                    <div className="text-center mb-3">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {lang === 'bn' ? 'অফিসিয়াল পদোন্নতি মূল্যায়ন ফরম প্রিভিউ' : 'Official Performance Appraisal Form Preview'}
                        </span>
                    </div>
                    <OfficialFormDocument evaluation={evaluation} lang={lang} />
                </div>
            </PageSurface>
        </Layout>
    );
}
