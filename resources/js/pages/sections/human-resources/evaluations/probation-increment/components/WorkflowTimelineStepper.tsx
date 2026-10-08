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
                    id: 'director',
                    key: 'submitted_to_director',
                    stageMatch: ['director', 'submitted_to_director', 'director_fa'],
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

        // Default Form A: officer_abm
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

    // Map status index to active index
    const activeStepIndex = React.useMemo(() => {
        if (currentStatus === 'approved') return steps.length;
        if (currentStatus === 'draft') return 0;
        if (currentStatus === 'submitted_to_rm') {
            return steps.findIndex((s) => s.id === 'rm');
        }
        if (currentStatus === 'submitted_to_zm') {
            return steps.findIndex((s) => s.id === 'zm');
        }
        if (currentStatus === 'submitted_to_director') {
            return steps.findIndex((s) => s.id === 'director');
        }
        if (currentStatus === 'submitted_to_hr') {
            return steps.findIndex((s) => s.id === 'hr');
        }
        if (currentStatus === 'submitted_to_ed') {
            return steps.findIndex((s) => s.id === 'ed');
        }
        return 0;
    }, [currentStatus, steps]);

    const isRejected = currentStatus === 'rejected';

    return (
        <Card className="border-slate-200/80 shadow-xs dark:bg-slate-900 dark:border-slate-800 mb-6 overflow-hidden">
            <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800 gap-2">
                    <div>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            {lang === 'bn' ? 'অনুমোদন প্রক্রিয়া ও অগ্রগতি' : 'Approval Workflow & Progress'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {lang === 'bn' 
                                ? 'শিক্ষানবিস বেতন বৃদ্ধির মূল্যায়নের প্রতিটি স্তরের অনুমোদন বিবরণ' 
                                : 'Multi-tier approval verification trail'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {isRejected ? (
                            <Badge variant="destructive" className="px-3 py-1 text-xs">
                                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                {lang === 'bn' ? 'প্রত্যাখ্যাত / বাতিল' : 'Rejected / Cancelled'}
                            </Badge>
                        ) : currentStatus === 'approved' ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                {lang === 'bn' ? 'চূড়ান্ত অনুমোদিত' : 'Fully Approved'}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 px-3 py-1 text-xs">
                                <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                {lang === 'bn' ? 'অনুমোদন প্রক্রিয়াধীন' : 'In Progress'}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Steps Visual Layout */}
                <div className="relative">
                    <div className="hidden lg:block absolute top-6 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 relative z-10">
                        {steps.map((step, idx) => {
                            const isCompleted = activeStepIndex > idx || currentStatus === 'approved';
                            const isCurrent = activeStepIndex === idx && !isRejected && currentStatus !== 'approved';
                            const matchedSig = signatures.find((sig: any) => 
                                step.stageMatch.includes(sig.stage)
                            );

                            return (
                                <div 
                                    key={step.id} 
                                    className={`relative p-3 rounded-xl border transition-all ${
                                        isCurrent 
                                            ? 'border-emerald-500 bg-emerald-50/40 shadow-xs dark:bg-emerald-950/20 dark:border-emerald-700' 
                                            : isCompleted 
                                            ? 'border-slate-200 bg-slate-50/60 dark:bg-slate-800/40 dark:border-slate-700' 
                                            : 'border-slate-100 bg-white opacity-60 dark:bg-slate-900 dark:border-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                            isCompleted
                                                ? 'bg-emerald-600 text-white'
                                                : isCurrent
                                                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950 animate-pulse'
                                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}>
                                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {lang === 'bn' ? step.title_bn : step.title_en}
                                            </h5>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {lang === 'bn' ? step.role_bn : step.role_en}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Signatory info if signed */}
                                    {matchedSig ? (
                                        <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 text-[10.5px]">
                                            <p className="font-semibold text-emerald-800 dark:text-emerald-400 truncate">
                                                {matchedSig.user?.name || '-'}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                {matchedSig.signed_at 
                                                    ? format(new Date(matchedSig.signed_at), 'dd MMM yyyy, hh:mm a')
                                                    : '-'}
                                            </p>
                                            {matchedSig.comments && (
                                                <p className="text-[10px] text-slate-600 italic line-clamp-2 mt-1 bg-white/70 dark:bg-slate-800/80 p-1 rounded border border-slate-100 dark:border-slate-700">
                                                    &ldquo;{matchedSig.comments}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10.5px] text-slate-400 italic">
                                            {isCurrent ? (lang === 'bn' ? 'অপেক্ষমান...' : 'Pending review...') : (lang === 'bn' ? 'পরবর্তী ধাপ' : 'Upcoming')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
