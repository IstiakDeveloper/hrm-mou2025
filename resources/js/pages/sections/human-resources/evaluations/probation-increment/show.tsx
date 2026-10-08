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
import ProbationIncrementOfficialFormDocument from './components/ProbationIncrementOfficialFormDocument';
import WorkflowTimelineStepper from './components/WorkflowTimelineStepper';

interface ShowProps {
    evaluation: any;
    isSuperAdmin?: boolean;
    currentUserId?: number | null;
    userHasSignature?: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSubmit: boolean;
    canApprove: boolean;
    canSendBack: boolean;
    hasUserSigned: boolean;
    sentBackReason?: string;
    currentStageLabel: string;
}

export default function ProbationIncrementEvaluationShow({ 
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
}: ShowProps) {
    const [lang, setLang] = useState<'bn' | 'en'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('prob_inc_eval_lang') as 'bn' | 'en') || 'bn';
        }
        return 'bn';
    });

    const { data, setData, post, processing, reset } = useForm({
        comments: '',
        supervisor_recommendation: evaluation.supervisor_recommendation || 'recommend_increment',
        is_approved: false,
    });
    const [actionType, setActionType] = useState('');

    const handleAction = (e: any, route: string, type: string) => {
        e.preventDefault();
        setActionType(type);

        if (!userHasSignature && type !== 'send_back') {
            alert(lang === 'bn' 
                ? 'অনুমোদন বা স্বাক্ষর করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।' 
                : 'Digital signature is required before signing/approving.');
            window.location.href = '/settings/profile';
            return;
        }

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
            router.post(`/probation-increment-evaluations/${evaluation.id}/send-back`, { comments: comment.trim() }, {
                preserveScroll: true,
            });
            return;
        }
        
        const payload: any = {
            ...data,
            comments: data.comments || (evaluation.status === 'draft' ? 'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।' : 'সুপারিশ ও স্বাক্ষরসহ অনুমোদনপূর্বক পরবর্তী স্তরে অগ্রবর্তী করা হলো।'),
            is_approved: type === 'approve',
        };

        router.post(`/probation-increment-evaluations/${evaluation.id}/${route}`, payload, {
            preserveScroll: true,
            onSuccess: () => reset('comments'),
        });
    };

    const handleDelete = () => {
        if (confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই মূল্যায়নটি মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।' : 'Are you sure you want to delete this evaluation?')) {
            router.delete(`/probation-increment-evaluations/${evaluation.id}`);
        }
    };

    const getStatusBadge = (evaluationStatus: string) => {
        const configs: Record<string, { label: string; bg: string }> = {
            draft: { label: lang === 'bn' ? 'খসড়া' : 'Draft', bg: 'bg-slate-100 text-slate-700' },
            submitted_to_rm: { label: lang === 'bn' ? 'আরএম পর্যালোচনা' : 'RM Review', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
            submitted_to_zm: { label: lang === 'bn' ? 'জেডএম পর্যালোচনা' : 'ZM Review', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
            submitted_to_director: { label: lang === 'bn' ? 'পরিচালক পর্যালোচনা' : 'Director Review', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
            submitted_to_director_fa: { label: lang === 'bn' ? 'পরিচালক (অর্থ) পর্যালোচনা' : 'Director FA Review', bg: 'bg-teal-100 text-teal-800 border-teal-300' },
            submitted_to_hr: { label: lang === 'bn' ? 'এইচআর যাচাই' : 'HR Verification', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
            submitted_to_ed: { label: lang === 'bn' ? 'ইডি অনুমোদন' : 'ED Approval', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
            approved: { label: lang === 'bn' ? 'চূড়ান্ত অনুমোদিত' : 'Approved', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
            rejected: { label: lang === 'bn' ? 'নামঞ্জুরকৃত' : 'Rejected', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
            sent_back: { label: lang === 'bn' ? 'ফেরত পাঠানো' : 'Sent Back', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
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
            <Head title={`${employeeName} - ${lang === 'bn' ? 'শিক্ষানবিস ২য় ধাপে বেতন বৃদ্ধি মূল্যায়ন' : 'Probation Increment Evaluation'}`} />
            
            <PageSurface className="space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/probation-increment-evaluations"
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Award className="h-3.5 w-3.5" />
                                    {lang === 'bn' ? 'শিক্ষানবিসকালীন ২য় ধাপে বেতন বৃদ্ধি মূল্যায়ন' : 'Probation Increment Evaluation'}
                                </span>
                                {getStatusBadge(evaluation.status)}
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                                {employeeName}
                            </h1>
                            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                                PIN: <span className="font-semibold text-slate-700">{evaluation.employee?.pin}</span> • {evaluation.employee?.designation?.name || '-'} • {evaluation.employee?.branch?.name || '-'}
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
                                    localStorage.setItem('prob_inc_eval_lang', 'bn');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'bn' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLang('en');
                                    localStorage.setItem('prob_inc_eval_lang', 'en');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    lang === 'en' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                English
                            </button>
                        </div>

                        {/* Edit Button */}
                        {canEdit && (
                            <Link href={`/probation-increment-evaluations/${evaluation.id}/edit`}>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-10 px-3.5 text-xs font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 shadow-xs"
                                >
                                    <Edit3 className="h-4 w-4 text-amber-700" />
                                    <span>{lang === 'bn' ? 'সম্পাদনা করুন' : 'Edit'}</span>
                                </Button>
                            </Link>
                        )}

                        {/* Delete Button */}
                        {canDelete && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleDelete}
                                className="h-10 px-3.5 text-xs font-semibold border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center gap-1.5 shadow-xs"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                            </Button>
                        )}

                        {/* Print Button */}
                        <Link href={`/probation-increment-evaluations/${evaluation.id}/print`} target="_blank">
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="h-10 px-4 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-xs"
                            >
                                <Printer className="h-4 w-4 text-slate-600" />
                                <span>{lang === 'bn' ? 'প্রিন্ট / পিডিএফ' : 'Print / PDF'}</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Sent Back Notification Banner */}
                {sentBackReason && evaluation.status === 'draft' && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-900">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold">{lang === 'bn' ? 'সংশোধনের জন্য ফেরত পাঠানোর কারণ:' : 'Reason for Revision:'}</h4>
                            <p className="text-xs italic mt-0.5 font-medium">"{sentBackReason}"</p>
                        </div>
                    </div>
                )}

                {/* Workflow Stepper */}
                <WorkflowTimelineStepper evaluation={evaluation} lang={lang} />

                {/* Action Card: Submit Draft or Forward / Approve */}
                {(canSubmit || isActionRequired) && (
                    <Card className="border-2 border-emerald-400 bg-emerald-50/20 shadow-sm">
                        <CardHeader className="pb-3 border-b border-emerald-100">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                <CardTitle className="text-sm font-bold text-emerald-950">
                                    {canSubmit 
                                        ? (lang === 'bn' ? 'খসড়া দাখিল করুন' : 'Submit Draft Evaluation')
                                        : (lang === 'bn' ? 'মূল্যায়ন পর্যালোচনা ও অনুমোদন ব্যবস্থা' : 'Review & Approval Actions')}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-800">
                                    {lang === 'bn' ? 'আপনার মন্তব্য বা সুপারিশ (যদি থাকে):' : 'Remarks / Comments:'}
                                </label>
                                <Textarea 
                                    placeholder={lang === 'bn' ? 'অনুমোদন বা পর্যালোচনার মন্তব্য লিখুন...' : 'Enter your remarks...'}
                                    value={data.comments}
                                    onChange={e => setData('comments', e.target.value)}
                                    className="bg-white border-slate-300 text-xs"
                                    rows={2}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5 justify-end pt-2 border-t border-emerald-100">
                                {canSendBack && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={processing}
                                        onClick={(e) => handleAction(e, 'send-back', 'send_back')}
                                        className="border-amber-300 text-amber-800 hover:bg-amber-100 text-xs h-9 font-semibold"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1 text-amber-700" />
                                        {lang === 'bn' ? 'সংশোধনে ফেরত পাঠান' : 'Send Back for Revision'}
                                    </Button>
                                )}

                                {canSubmit && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={processing}
                                        onClick={(e) => handleAction(e, 'forward', 'forward')}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 font-bold shadow-xs"
                                    >
                                        <Send className="h-3.5 w-3.5 mr-1.5" />
                                        {processing ? (lang === 'bn' ? 'দাখিল হচ্ছে...' : 'Submitting...') : (lang === 'bn' ? 'মূল্যায়ন দাখিল করুন' : 'Submit Evaluation')}
                                    </Button>
                                )}

                                {canApprove && (
                                    <>
                                        {evaluation.status === 'submitted_to_hr' ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={processing}
                                                onClick={(e) => handleAction(e, 'hr-verify', 'approve')}
                                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 px-5 font-bold shadow-xs"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                {lang === 'bn' ? 'এইচআর যাচাই ও পরবর্তী স্তরে পাঠান' : 'Verify HR Records & Forward'}
                                            </Button>
                                        ) : evaluation.status === 'submitted_to_ed' ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={processing}
                                                onClick={(e) => handleAction(e, 'ed-approve', 'approve')}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 font-bold shadow-xs"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                {lang === 'bn' ? 'চূড়ান্ত অনুমোদন প্রদান করুন (ED)' : 'Grant Final Approval (ED)'}
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={processing}
                                                onClick={(e) => handleAction(e, 'forward', 'forward')}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 font-bold shadow-xs"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                {lang === 'bn' ? 'সুপারিশ ও স্বাক্ষরপূর্বক অনুমোদন' : 'Recommend, Sign & Forward'}
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Printable Official Paper Document Container */}
                <div className="bg-slate-100/60 p-2 sm:p-6 rounded-2xl border border-slate-200">
                    <ProbationIncrementOfficialFormDocument evaluation={evaluation} lang={lang} />
                </div>
            </PageSurface>
        </Layout>
    );
}
