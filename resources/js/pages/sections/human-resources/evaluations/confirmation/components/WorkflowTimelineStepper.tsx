import React from 'react';
import { format } from 'date-fns';
import { 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface WorkflowTimelineStepperProps {
    evaluation: any;
    lang?: 'bn' | 'en';
}

interface StepConfig {
    id: string;
    key: string;
    stageMatch: string[];
    title_bn: string;
    title_en: string;
    role_bn: string;
    role_en: string;
}

export default function WorkflowTimelineStepper({
    evaluation,
    lang = 'bn',
}: WorkflowTimelineStepperProps) {
    const formType = evaluation?.form_type;
    const currentStatus = evaluation?.status || 'draft';
    const signatures = evaluation?.signatures || [];

    // Define steps sequence based on form type
    const steps: StepConfig[] = React.useMemo(() => {
        if (formType === 'bm_and_above' || formType === 'bm_above') {
            return [
                {
                    id: 'initiator',
                    key: 'draft',
                    stageMatch: ['initiator'],
                    title_bn: 'দাখিলকারী (RM)',
                    title_en: 'Initiator (RM)',
                    role_bn: 'আঞ্চলিক ব্যবস্থাপক',
                    role_en: 'Regional Manager',
                },
                {
                    id: 'zm',
                    key: 'submitted_to_zm',
                    stageMatch: ['zm', 'submitted_to_zm'],
                    title_bn: 'জেডএম পর্যালোচনা',
                    title_en: 'ZM Review',
                    role_bn: 'জোনাল ম্যানেজার',
                    role_en: 'Zonal Manager',
                },
                {
                    id: 'director',
                    key: 'submitted_to_director',
                    stageMatch: ['director', 'submitted_to_director', 'director_mf'],
                    title_bn: 'পরিচালক পর্যালোচনা',
                    title_en: 'Director Review',
                    role_bn: 'পরিচালক (মাইক্রোফাইন্যান্স)',
                    role_en: 'Director (Microfinance)',
                },
                {
                    id: 'hr',
                    key: 'submitted_to_hr',
                    stageMatch: ['hr', 'submitted_to_hr'],
                    title_bn: 'এইচআর যাচাইকরণ',
                    title_en: 'HR Verification',
                    role_bn: 'মানবসম্পদ বিভাগ',
                    role_en: 'Human Resources',
                },
                {
                    id: 'ed',
                    key: 'submitted_to_ed',
                    stageMatch: ['ed', 'submitted_to_ed', 'approved'],
                    title_bn: 'চূড়ান্ত অনুমোদন (ED)',
                    title_en: 'Final Approval (ED)',
                    role_bn: 'নির্বাহী পরিচালক',
                    role_en: 'Executive Director',
                },
            ];
        }

        if (formType === 'accountant') {
            return [
                {
                    id: 'initiator',
                    key: 'draft',
                    stageMatch: ['initiator'],
                    title_bn: 'শাখা পর্যায় (দাখিল)',
                    title_en: 'Branch Level',
                    role_bn: 'শাখা ব্যবস্থাপক',
                    role_en: 'Branch Manager',
                },
                {
                    id: 'rm',
                    key: 'submitted_to_rm',
                    stageMatch: ['rm', 'submitted_to_rm'],
                    title_bn: 'আরএম সুপারিশ',
                    title_en: 'RM Recommendation',
                    role_bn: 'আঞ্চলিক ব্যবস্থাপক',
                    role_en: 'Regional Manager',
                },
                {
                    id: 'zm',
                    key: 'submitted_to_zm',
                    stageMatch: ['zm', 'submitted_to_zm'],
                    title_bn: 'জেডএম পর্যালোচনা',
                    title_en: 'ZM Review',
                    role_bn: 'জোনাল ম্যানেজার',
                    role_en: 'Zonal Manager',
                },
                {
                    id: 'director_fa',
                    key: 'submitted_to_director_fa',
                    stageMatch: ['director_fa', 'submitted_to_director_fa', 'director'],
                    title_bn: 'পরিচালক পর্যালোচনা',
                    title_en: 'Director Review',
                    role_bn: 'পরিচালক (অর্থ ও হিসাব)',
                    role_en: 'Director (Finance & Accounts)',
                },
                {
                    id: 'hr',
                    key: 'submitted_to_hr',
                    stageMatch: ['hr', 'submitted_to_hr'],
                    title_bn: 'এইচআর যাচাইকরণ',
                    title_en: 'HR Verification',
                    role_bn: 'মানবসম্পদ বিভাগ',
                    role_en: 'Human Resources',
                },
                {
                    id: 'ed',
                    key: 'submitted_to_ed',
                    stageMatch: ['ed', 'submitted_to_ed', 'approved'],
                    title_bn: 'চূড়ান্ত অনুমোদন (ED)',
                    title_en: 'Final Approval (ED)',
                    role_bn: 'নির্বাহী পরিচালক',
                    role_en: 'Executive Director',
                },
            ];
        }

        // Default: Officer and ABM (Form A)
        return [
            {
                id: 'initiator',
                key: 'draft',
                stageMatch: ['initiator'],
                title_bn: 'শাখা পর্যায় (দাখিল)',
                title_en: 'Branch Level',
                role_bn: 'শাখা ব্যবস্থাপক',
                role_en: 'Branch Manager',
            },
            {
                id: 'rm',
                key: 'submitted_to_rm',
                stageMatch: ['rm', 'submitted_to_rm'],
                title_bn: 'আরএম সুপারিশ',
                title_en: 'RM Recommendation',
                role_bn: 'আঞ্চলিক ব্যবস্থাপক',
                role_en: 'Regional Manager',
            },
            {
                id: 'zm',
                key: 'submitted_to_zm',
                stageMatch: ['zm', 'submitted_to_zm'],
                title_bn: 'জেডএম পর্যালোচনা',
                title_en: 'ZM Review',
                role_bn: 'জোনাল ম্যানেজার',
                role_en: 'Zonal Manager',
            },
            {
                id: 'director',
                key: 'submitted_to_director',
                stageMatch: ['director', 'submitted_to_director', 'director_mf'],
                title_bn: 'পরিচালক পর্যালোচনা',
                title_en: 'Director Review',
                role_bn: 'পরিচালক (মাইক্রোফাইন্যান্স)',
                role_en: 'Director (Microfinance)',
            },
            {
                id: 'hr',
                key: 'submitted_to_hr',
                stageMatch: ['hr', 'submitted_to_hr'],
                title_bn: 'এইচআর যাচাইকরণ',
                title_en: 'HR Verification',
                role_bn: 'মানবসম্পদ বিভাগ',
                role_en: 'Human Resources',
            },
            {
                id: 'ed',
                key: 'submitted_to_ed',
                stageMatch: ['ed', 'submitted_to_ed', 'approved'],
                title_bn: 'চূড়ান্ত অনুমোদন (ED)',
                title_en: 'Final Approval (ED)',
                role_bn: 'নির্বাহী পরিচালক',
                role_en: 'Executive Director',
            },
        ];
    }, [formType]);

    // Find if there is a sent-back event
    const sentBackSignature = signatures.slice().reverse().find((s: any) => s.action === 'sent_back');

    // Determine the status rank/index
    const getCurrentStepIndex = () => {
        if (currentStatus === 'approved') return steps.length;
        if (currentStatus === 'rejected') return steps.length;
        if (currentStatus === 'draft') return 0;

        const idx = steps.findIndex(s => s.key === currentStatus);
        return idx !== -1 ? idx : 0;
    };

    const currentStepIndex = getCurrentStepIndex();

    return (
        <div className="w-full space-y-4 print:hidden">
            {/* Sent Back Alert Callout (If currently sent back to draft) */}
            {sentBackSignature && currentStatus === 'draft' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-amber-900 dark:text-amber-200">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">
                                {lang === 'bn' ? 'সংশোধনের জন্য ফেরত পাঠানো হয়েছে' : 'Sent Back for Revision'}
                            </span>
                            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200">
                                {sentBackSignature.signed_at ? format(new Date(sentBackSignature.signed_at), 'dd/MM/yyyy hh:mm a') : ''}
                            </Badge>
                        </div>
                        <p className="mt-1 font-medium text-amber-800 dark:text-amber-300">
                            {sentBackSignature.user?.name} ({sentBackSignature.user?.employee?.designation?.name || 'Reviewer'}):
                        </p>
                        <p className="mt-0.5 italic text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                            "{sentBackSignature.comments}"
                        </p>
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                            {lang === 'bn' 
                                ? 'অনুগ্রহ করে উপরের মন্তব্য অনুযায়ী মূল্যায়ন ফরমটি সংশোধন করুন এবং পুনরায় দাখিল করুন।' 
                                : 'Please edit the evaluation as per comments above and submit again.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Stepper Card */}
            <Card className="border border-slate-200/80 shadow-sm bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950">
                <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                                {lang === 'bn' ? 'অনুমোদন প্রক্রিয়া ও ওয়ার্কফ্লো ট্র্যাকার' : 'Approval Workflow & Progress Tracker'}
                            </h3>
                        </div>
                        <Badge 
                            variant="secondary"
                            className={`text-xs font-semibold px-2.5 py-0.5 ${
                                currentStatus === 'approved' 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                    : currentStatus === 'rejected'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                                    : currentStatus === 'draft'
                                    ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                        >
                            {currentStatus === 'approved' 
                                ? (lang === 'bn' ? 'চূড়ান্ত অনুমোদিত' : 'Approved') 
                                : currentStatus === 'rejected'
                                ? (lang === 'bn' ? 'নামঞ্জুরকৃত' : 'Rejected')
                                : currentStatus === 'draft'
                                ? (lang === 'bn' ? 'খসড়া পর্যায়' : 'Draft Stage')
                                : (lang === 'bn' ? 'চলমান পর্যায়' : 'In Progress')}
                        </Badge>
                    </div>

                    {/* Desktop / Tablet Stepper (Horizontal) */}
                    <div className="hidden md:block">
                        <div className="grid grid-cols-6 gap-2 relative">
                            {steps.map((step, idx) => {
                                const isPassed = currentStatus === 'approved' || idx < currentStepIndex;
                                const isCurrent = currentStatus !== 'approved' && currentStatus !== 'rejected' && idx === currentStepIndex;

                                // Match signature
                                const signature = signatures.find((s: any) => 
                                    step.stageMatch.includes(s.stage) && s.action !== 'sent_back'
                                );

                                return (
                                    <div key={step.id} className="relative flex flex-col items-center text-center">
                                        {/* Connector line */}
                                        {idx < steps.length - 1 && (
                                            <div 
                                                className={`absolute top-5 left-1/2 w-full h-[3px] -z-0 transition-all ${
                                                    idx < currentStepIndex || currentStatus === 'approved'
                                                        ? 'bg-blue-600'
                                                        : 'bg-slate-200 dark:bg-slate-800'
                                                }`}
                                            />
                                        )}

                                        {/* Step Circle */}
                                        <div 
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all border-2 ${
                                                isPassed
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20'
                                                    : isCurrent
                                                    ? 'bg-amber-50 border-amber-500 text-amber-700 ring-4 ring-amber-500/20 animate-pulse dark:bg-amber-950 dark:text-amber-300'
                                                    : 'bg-white border-slate-300 text-slate-400 dark:bg-slate-900 dark:border-slate-700'
                                            }`}
                                        >
                                            {isPassed ? (
                                                <CheckCircle2 className="h-5 w-5" />
                                            ) : isCurrent ? (
                                                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                            ) : (
                                                <span>{idx + 1}</span>
                                            )}
                                        </div>

                                        {/* Step Content */}
                                        <div className="mt-2.5 px-1 w-full">
                                            <p className={`text-xs font-bold truncate ${
                                                isCurrent 
                                                    ? 'text-amber-700 dark:text-amber-400' 
                                                    : isPassed 
                                                    ? 'text-slate-900 dark:text-slate-100' 
                                                    : 'text-slate-500 dark:text-slate-500'
                                            }`}>
                                                {lang === 'bn' ? step.title_bn : step.title_en}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {lang === 'bn' ? step.role_bn : step.role_en}
                                            </p>

                                            {/* Signature Info */}
                                            {signature ? (
                                                <div className="mt-1.5 p-1 rounded bg-slate-100/70 dark:bg-slate-800/60 text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50">
                                                    <p className="font-semibold truncate">{signature.user?.name}</p>
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400">
                                                        {signature.signed_at ? format(new Date(signature.signed_at), 'dd/MM/yy') : ''}
                                                    </p>
                                                </div>
                                            ) : isCurrent ? (
                                                <div className="mt-1.5">
                                                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 py-0 px-1.5">
                                                        {lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}
                                                    </Badge>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mobile Stepper (Vertical Stacked Cards) */}
                    <div className="block md:hidden space-y-2">
                        {steps.map((step, idx) => {
                            const isPassed = currentStatus === 'approved' || idx < currentStepIndex;
                            const isCurrent = currentStatus !== 'approved' && currentStatus !== 'rejected' && idx === currentStepIndex;

                            const signature = signatures.find((s: any) => 
                                step.stageMatch.includes(s.stage) && s.action !== 'sent_back'
                            );

                            return (
                                <div 
                                    key={step.id} 
                                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                                        isCurrent
                                            ? 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800/60 ring-2 ring-amber-500/20'
                                            : isPassed
                                            ? 'bg-blue-50/40 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40'
                                            : 'bg-white border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 opacity-60'
                                    }`}
                                >
                                    <div 
                                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                            isPassed
                                                ? 'bg-blue-600 text-white'
                                                : isCurrent
                                                ? 'bg-amber-500 text-white'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        {isPassed ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : isCurrent ? (
                                            <Clock className="h-4 w-4" />
                                        ) : (
                                            <span>{idx + 1}</span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-xs font-bold ${
                                                isCurrent 
                                                    ? 'text-amber-900 dark:text-amber-200' 
                                                    : isPassed 
                                                    ? 'text-slate-900 dark:text-slate-100' 
                                                    : 'text-slate-500 dark:text-slate-400'
                                            }`}>
                                                {lang === 'bn' ? step.title_bn : step.title_en}
                                            </p>
                                            {isCurrent ? (
                                                <Badge className="text-[10px] bg-amber-500 text-white px-1.5 py-0">
                                                    {lang === 'bn' ? 'চলমান' : 'Current'}
                                                </Badge>
                                            ) : isPassed ? (
                                                <Badge className="text-[10px] bg-blue-600 text-white px-1.5 py-0">
                                                    {lang === 'bn' ? 'সম্পন্ন' : 'Done'}
                                                </Badge>
                                            ) : null}
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {lang === 'bn' ? step.role_bn : step.role_en}
                                        </p>

                                        {signature && (
                                            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                                                <span className="font-semibold">{signature.user?.name}</span>
                                                {signature.signed_at && (
                                                    <span className="text-slate-400 ml-1.5">
                                                        ({format(new Date(signature.signed_at), 'dd/MM/yyyy')})
                                                    </span>
                                                )}
                                                {signature.comments && (
                                                    <p className="mt-0.5 text-[10px] italic text-slate-500 dark:text-slate-400 line-clamp-1">
                                                        "{signature.comments}"
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
