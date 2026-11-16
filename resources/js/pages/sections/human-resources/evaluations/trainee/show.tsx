import React, { useState, useEffect } from 'react';
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
import { AppraisalApprovalDialog } from '@/components/appraisal/AppraisalApprovalDialog';
import { MissingFieldsAlert, scrollToMissingFields } from '@/components/appraisal/MissingFieldsAlert';
import { savedInitiatorGaps, type FieldGap } from '@/lib/appraisal-required';
import { AppraisalDeleteDialog } from '@/components/appraisal/AppraisalDeleteDialog';
import { AppraisalWorkflowResetDialog } from '@/components/appraisal/AppraisalWorkflowResetDialog';
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

    const [approvalOpen, setApprovalOpen] = useState(false);
    const [draftGaps, setDraftGaps] = useState<FieldGap[]>([]);

    useEffect(() => {
        if (evaluation.status === 'draft' || canSubmit) {
            const gaps = savedInitiatorGaps('trainee', evaluation, lang);
            if (gaps.length > 0) {
                setDraftGaps(gaps);
            }
        }
    }, [evaluation, canSubmit, lang]);

    const openApproval = () => {
        if (!userHasSignature) {
            alert(lang === 'bn'
                ? 'অনুমোদন বা স্বাক্ষর করার পূর্বে আপনার প্রোফাইলে ডিজিটাল স্বাক্ষর (Signature) আপলোড করা আবশ্যক।'
                : 'Digital signature is required before signing/approving.');
            window.location.href = '/settings/profile';
            return;
        }
        setApprovalOpen(true);
    };

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
        
        const isSubmitStage = evaluation.status === 'draft' || canSubmit;
        if (isSubmitStage && route === 'forward') {
            const gaps = savedInitiatorGaps('trainee', evaluation, lang);
            setDraftGaps(gaps);
            if (gaps.length > 0) {
                scrollToMissingFields();
                alert(lang === 'bn' 
                    ? `নিম্নোক্ত আবশ্যক তথ্য পূরণ না থাকায় দাখিল করা যাচ্ছে না:\n\n• ${gaps.map(g => g.message).join('\n• ')}\n\nঅনুগ্রহ করে 'সম্পাদনা' বাটনে ক্লিক করে তথ্যগুলো পূরণ করুন।` 
                    : `Cannot submit because the following required fields are missing:\n\n• ${gaps.map(g => g.message).join('\n• ')}`);
                return;
            }
        }

        const isBmorRmStuck = evaluation.form_type === 'bm_and_above' || evaluation.status === 'submitted_to_rm';
        const defaultSubmitComment = isBmorRmStuck
            ? 'মূল্যায়নটি জোনাল ম্যানেজার (ZM) বরাবর দাখিল করা হয়েছে।'
            : 'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।';

        const payload: any = {
            ...data,
            comments: data.comments || (isSubmitStage ? defaultSubmitComment : 'সুপারিশ ও স্বাক্ষরসহ অনুমোদনপূর্বক পরবর্তী স্তরে অগ্রবর্তী করা হলো।'),
            is_approved: type === 'approve',
        };

        router.post(`/trainee-evaluations/${evaluation.id}/${route}`, payload, {
            preserveScroll: true,
            onSuccess: () => reset('comments'),
            onError: (errors: Record<string, string | string[]>) => {
                const serverGaps: FieldGap[] = Object.entries(errors).map(([key, msg]) => ({
                    key,
                    message: Array.isArray(msg) ? msg.join(', ') : String(msg),
                }));
                if (serverGaps.length > 0) {
                    setDraftGaps(serverGaps);
                    scrollToMissingFields();
                    alert(lang === 'bn' 
                        ? `দাখিল ব্যর্থ হয়েছে! নিম্নোক্ত তথ্য পূরণ করা প্রয়োজন:\n\n• ${serverGaps.map(g => g.message).join('\n• ')}`
                        : `Submission failed! Please complete required fields:\n\n• ${serverGaps.map(g => g.message).join('\n• ')}`);
                }
            },
        });
    };

    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    const [resetOpen, setResetOpen] = useState(false);
    const handleDelete = () => {
        setDeleteUrl(`/trainee-evaluations/${evaluation.id}`);
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

                        {isSuperAdmin && evaluation.status !== 'draft' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResetOpen(true)}
                                className="h-9 text-xs gap-1.5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{lang === 'bn' ? 'ওয়ার্কফ্লো রিসেট' : 'Reset workflow'}</span>
                            </Button>
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
                <WorkflowTimelineStepper evaluation={evaluation} lang={lang} canCorrectComment={isSuperAdmin} />

                {canSubmit && (
                    <Card className="border-2 border-emerald-400 bg-emerald-50/20 shadow-sm">
                        <CardHeader className="border-b border-emerald-100 pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                <CardTitle className="text-sm font-bold text-emerald-950">
                                    {lang === 'bn' ? (evaluation.form_type === 'bm_and_above' || evaluation.status === 'submitted_to_rm' ? 'জেডএম সমীপে দাখিল করুন' : 'খসড়া দাখিল করুন') : 'Submit Draft Evaluation'}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 p-4 sm:p-5">
                            <MissingFieldsAlert gaps={draftGaps} lang={lang} editUrl={canEdit ? `/trainee-evaluations/${evaluation.id}/edit` : undefined} />
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-800">
                                    {lang === 'bn' ? 'আপনার মন্তব্য বা সুপারিশ (যদি থাকে):' : 'Remarks / Comments:'}
                                </label>
                                <Textarea
                                    placeholder={lang === 'bn' ? 'দাখিলের মন্তব্য লিখুন...' : 'Enter your remarks...'}
                                    value={data.comments}
                                    onChange={e => setData('comments', e.target.value)}
                                    className="border-slate-300 bg-white text-xs"
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end border-t border-emerald-100 pt-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={processing}
                                    onClick={(e) => handleAction(e, 'forward', 'forward')}
                                    className="h-9 bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                                >
                                    <Send className="mr-1.5 h-3.5 w-3.5" />
                                    {processing
                                        ? (lang === 'bn' ? 'দাখিল হচ্ছে...' : 'Submitting...')
                                        : (lang === 'bn' ? (evaluation.form_type === 'bm_and_above' || evaluation.status === 'submitted_to_rm' ? 'জেডএম সমীপে দাখিল করুন' : 'মূল্যায়ন দাখিল করুন') : 'Submit Evaluation')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {canApprove && (
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={openApproval}
                            className="w-full sm:w-auto h-10 bg-emerald-600 px-5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 flex items-center justify-center"
                        >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            {lang === 'bn' ? 'অনুমোদন' : 'Approve'}
                        </Button>
                    </div>
                )}

                <AppraisalApprovalDialog
                    kind="trainee"
                    lang={lang}
                    evaluation={approvalOpen ? { ...evaluation, current_stage_label: evaluation.current_stage_label || currentStageLabel } : null}
                    canSendBack={canSendBack}
                    onClose={() => setApprovalOpen(false)}
                />

                {/* Printable Official Paper Document Container */}
                <div className="bg-slate-100/60 p-2 sm:p-6 rounded-2xl border border-slate-200 overflow-x-auto">
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mb-3 sm:hidden flex items-center gap-1.5 font-medium">
                        <span>👉</span>
                        <span>{lang === 'bn' ? 'বামে-ডানে স্ক্রল করে পুরো ফরমটি দেখতে পারবেন' : 'Scroll horizontally to view the full document'}</span>
                    </div>
                    <div className="min-w-[760px] sm:min-w-0">
                        <TraineeOfficialFormDocument evaluation={evaluation} lang={lang} />
                    </div>
                </div>
            </PageSurface>
            <AppraisalWorkflowResetDialog
                open={resetOpen}
                onOpenChange={setResetOpen}
                url={`/trainee-evaluations/${evaluation.id}/reset-workflow`}
                lang={lang}
            />
            <AppraisalDeleteDialog
                open={deleteUrl !== null}
                onOpenChange={(open) => { if (!open) setDeleteUrl(null); }}
                url={deleteUrl}
                lang={lang}
            />
        </Layout>
    );
}
