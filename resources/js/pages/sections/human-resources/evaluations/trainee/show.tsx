import React, { useState } from 'react';
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
    AlertTriangle,
    XCircle
} from 'lucide-react';
import TraineeOfficialFormDocument from './components/TraineeOfficialFormDocument';
import WorkflowTimelineStepper from './components/WorkflowTimelineStepper';
import { TRAINEE_FORM_CONFIGS, calculateTraineeGrade } from './trainee-config';

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

export default function TraineeEvaluationShow({ 
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
    const [lang, setLang] = useState<'bn' | 'en'>('bn');

    const formType = evaluation.form_type || 'officer_abm';
    const config = TRAINEE_FORM_CONFIGS[formType] || TRAINEE_FORM_CONFIGS.officer_abm;
    const grade = calculateTraineeGrade(evaluation.total_score || 0);

    const { data, setData, post, processing, reset } = useForm({
        comments: '',
        recommendation_type: evaluation.recommendation_type || 'recommend_appointment',
        extension_days: evaluation.extension_days || '',
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
                    ? 'সংশোধনের জন্য প্রস্তুতকারীর কাছে ফেরত পাঠানোর কারণ লিখুন (আবশ্যক):' 
                    : 'Please enter reason for sending back to creator (Required):'
            );
            if (!comment || !comment.trim()) {
                alert(lang === 'bn' ? 'ফেরত পাঠানোর কারণ লেখা আবশ্যক!' : 'Return reason is required!');
                return;
            }
            router.post(`/trainee-evaluations/${evaluation.id}/send-back`, { comments: comment.trim() }, {
                preserveScroll: true,
            });
            return;
        }
        
        const payload: any = {
            ...data,
            comments: data.comments || (evaluation.status === 'draft' ? 'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।' : 'সুপারিশ ও স্বাক্ষরসহ অনুমোদনপূর্বক পরবর্তী স্তরে অগ্রবর্তী করা হলো।'),
            is_approved: type === 'approve',
        };

        router.post(`/trainee-evaluations/${evaluation.id}/${route}`, payload, {
            preserveScroll: true,
            onSuccess: () => reset('comments'),
        });
    };

    const handleDelete = () => {
        if (confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে এই মূল্যায়নটি মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।' : 'Are you sure you want to delete this evaluation?')) {
            router.delete(`/trainee-evaluations/${evaluation.id}`);
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

        const cfg = configs[evaluationStatus] || { 
            label: evaluationStatus.replace(/_/g, ' ').toUpperCase(), 
            bg: 'bg-slate-100 text-slate-700' 
        };

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg}`}>
                {cfg.label}
            </span>
        );
    };

    const isActionRequired = canApprove;

    return (
        <Layout>
            <Head title={`${evaluation.candidate_name} - ${lang === 'bn' ? 'প্রশিক্ষণার্থী মূল্যায়ন' : 'Trainee Evaluation'}`} />
            
            <PageSurface className="space-y-6 max-w-6xl mx-auto pb-16">
                {/* Header Action Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <Link href="/trainee-evaluations">
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs bg-white border-slate-300">
                                <ArrowLeft className="w-4 h-4" />
                                {lang === 'bn' ? 'তালিকায় ফিরে যান' : 'Back'}
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                                    {evaluation.candidate_name}
                                </h1>
                                {getStatusBadge(evaluation.status)}
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${grade.badgeVariant}`}>
                                    {grade.labelBn}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {evaluation.designation_name} • {evaluation.branch_name || 'শাখা নির্ধারিত নেই'} • {config.labelBn}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Print Button */}
                        <Link href={`/trainee-evaluations/${evaluation.id}/print`}>
                            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
                                <Printer className="w-4 h-4 text-slate-600" />
                                <span>{lang === 'bn' ? 'অফিসিয়াল ফরম প্রিন্ট' : 'Print Form'}</span>
                            </Button>
                        </Link>

                        {/* Edit Button */}
                        {canEdit && (
                            <Link href={`/trainee-evaluations/${evaluation.id}/edit`}>
                                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold">
                                    <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{lang === 'bn' ? 'সম্পাদনা' : 'Edit'}</span>
                                </Button>
                            </Link>
                        )}

                        {/* Delete Button */}
                        {canDelete && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleDelete}
                                className="h-9 text-xs gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</span>
                            </Button>
                        )}

                        {/* Language Switcher */}
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setLang('bn')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'bn' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                                }`}
                            >
                                বাংলা
                            </button>
                            <button
                                type="button"
                                onClick={() => setLang('en')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                    lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                                }`}
                            >
                                English
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sent Back Alert */}
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
                    <Card className="border-2 border-emerald-400 bg-emerald-50/20 shadow-xs">
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
                                    {lang === 'bn' ? 'আপনার মন্তব্য বা সুপারিশ:' : 'Remarks / Comments:'}
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
                                        {evaluation.status === 'submitted_to_ed' ? (
                                            /* Executive Director Final Approval Buttons */
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={processing}
                                                    onClick={(e) => handleAction(e, 'ed-approve', 'reject')}
                                                    className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs h-9 font-bold"
                                                >
                                                    <XCircle className="h-4 w-4 mr-1 text-rose-600" />
                                                    {lang === 'bn' ? 'নামঞ্জুর (Reject)' : 'Reject'}
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={processing}
                                                    onClick={(e) => handleAction(e, 'ed-approve', 'approve')}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 font-bold shadow-xs"
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                                    {lang === 'bn' ? 'চূড়ান্ত অনুমোদন (Final Approve)' : 'Final Approve'}
                                                </Button>
                                            </div>
                                        ) : (
                                            /* Intermediate Workflow Approvers */
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
                    <TraineeOfficialFormDocument evaluation={evaluation} lang={lang} />
                </div>
            </PageSurface>
        </Layout>
    );
}
