import React from 'react';
import { format, parseISO } from 'date-fns';
import { 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    FileText, 
    ShieldCheck, 
    UserCheck, 
    RotateCcw,
    XCircle,
    ChevronRight,
    MessageSquareQuote
} from 'lucide-react';
import { WorkflowStepComment } from '@/components/appraisal/WorkflowStepComment';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface StepConfig {
    id: string;
    key: string;
    stageMatch: string[];
    title_bn: string;
    role_bn: string;
}

interface WorkflowTimelineStepperProps {
    application: any;
    canCorrectComment?: boolean;
}

export default function WorkflowTimelineStepper({
    application,
    canCorrectComment = false,
}: WorkflowTimelineStepperProps) {
    const currentStatus = application?.status || 'draft';
    const signatures = application?.signatures || [];
    const commentUrl = (signatureId: number) => `/resignation-applications/${application.id}/signatures/${signatureId}/comment`;

    const isHeadOffice = Boolean(application?.is_head_office);

    const steps: StepConfig[] = isHeadOffice
        ? [
            {
                id: 'applicant',
                key: 'draft',
                stageMatch: ['applicant'],
                title_bn: 'আবেদনকারী দাখিল',
                role_bn: 'আবেদনকারী কর্মী',
            },
            {
                id: 'director',
                key: 'submitted_to_director',
                stageMatch: ['director', 'submitted_to_director'],
                title_bn: 'বিভাগীয় প্রধান সুপারিশ',
                role_bn: 'বিভাগীয় প্রধান / পরিচালক',
            },
            {
                id: 'hr',
                key: 'submitted_to_hr',
                stageMatch: ['hr', 'submitted_to_hr'],
                title_bn: 'এইচআর যাচাইকরণ',
                role_bn: 'মানবসম্পদ বিভাগ',
            },
            {
                id: 'ed',
                key: 'submitted_to_ed',
                stageMatch: ['ed', 'submitted_to_ed', 'approved'],
                title_bn: 'চূড়ান্ত অনুমোদন (ED)',
                role_bn: 'নির্বাহী পরিচালক',
            },
        ]
        : [
            {
                id: 'applicant',
                key: 'draft',
                stageMatch: ['applicant'],
                title_bn: 'আবেদনকারী দাখিল',
                role_bn: 'আবেদনকারী কর্মী',
            },
            {
                id: 'supervisor',
                key: 'submitted_to_supervisor',
                stageMatch: ['supervisor', 'submitted_to_supervisor'],
                title_bn: '১ম তত্ত্বাবধায়ক সুপারিশ',
                role_bn: 'শাখা ব্যবস্থাপক / সুপারভাইজার',
            },
            {
                id: 'rm',
                key: 'submitted_to_rm',
                stageMatch: ['rm', 'submitted_to_rm'],
                title_bn: 'আরএম সুপারিশ',
                role_bn: 'আঞ্চলিক ব্যবস্থাপক',
            },
            {
                id: 'zm',
                key: 'submitted_to_zm',
                stageMatch: ['zm', 'submitted_to_zm'],
                title_bn: 'জেডএম সুপারিশ',
                role_bn: 'জোনাল ম্যানেজার',
            },
            {
                id: 'director',
                key: 'submitted_to_director',
                stageMatch: ['director', 'submitted_to_director'],
                title_bn: 'বিভাগীয় প্রধান সুপারিশ',
                role_bn: 'পরিচালক / বিভাগীয় প্রধান',
            },
            {
                id: 'hr',
                key: 'submitted_to_hr',
                stageMatch: ['hr', 'submitted_to_hr'],
                title_bn: 'এইচআর যাচাইকরণ',
                role_bn: 'মানবসম্পদ বিভাগ',
            },
            {
                id: 'ed',
                key: 'submitted_to_ed',
                stageMatch: ['ed', 'submitted_to_ed', 'approved'],
                title_bn: 'চূড়ান্ত অনুমোদন (ED)',
                role_bn: 'নির্বাহী পরিচালক',
            },
        ];

    const getStatusIndex = (status: string): number => {
        if (isHeadOffice) {
            switch (status) {
                case 'draft':
                case 'sent_back':
                    return 0;
                case 'submitted_to_director':
                    return 1;
                case 'submitted_to_hr':
                    return 2;
                case 'submitted_to_ed':
                    return 3;
                case 'approved':
                    return 4;
                case 'rejected':
                    return 3;
                default:
                    return 0;
            }
        }

        switch (status) {
            case 'draft':
            case 'sent_back':
                return 0;
            case 'submitted_to_supervisor':
                return 1;
            case 'submitted_to_rm':
                return 2;
            case 'submitted_to_zm':
                return 3;
            case 'submitted_to_director':
                return 4;
            case 'submitted_to_hr':
                return 5;
            case 'submitted_to_ed':
                return 6;
            case 'approved':
                return 7;
            case 'rejected':
                return 6;
            default:
                return 0;
        }
    };

    const currentIndex = getStatusIndex(currentStatus);

    const getStepState = (idx: number, step: StepConfig) => {
        const sig = signatures.find((s: any) => step.stageMatch.includes(s.stage));

        if (sig && sig.action === 'sent_back') {
            return { status: 'sent_back', label: 'সংশোধনে ফেরত', icon: RotateCcw, color: 'text-amber-600 bg-amber-50 border-amber-300' };
        }
        if (sig && sig.action === 'rejected') {
            return { status: 'rejected', label: 'প্রত্যাখ্যাত', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-300' };
        }
        if (sig && (sig.action === 'approved' || sig.action === 'forwarded' || sig.action === 'submitted')) {
            return { status: 'completed', label: 'সম্পন্ন', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-300' };
        }

        if (idx === currentIndex) {
            return { status: 'current', label: 'চলমান', icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-400 ring-2 ring-blue-200' };
        }
        if (idx < currentIndex) {
            return { status: 'completed', label: 'সম্পন্ন', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-300' };
        }
        return { status: 'upcoming', label: 'অপেক্ষমাণ', icon: Clock, color: 'text-slate-400 bg-slate-50 border-slate-200' };
    };

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white mb-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <span className="font-semibold text-sm">
                        {isHeadOffice ? 'প্রধান কার্যালয় অনুমোদন ওয়ার্কফ্লো (বিভাগীয় প্রধান পর্যায়)' : 'মাঠপর্যায় ৬-স্তরের অনুমোদন ওয়ার্কফ্লো পরিক্রমা'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs">
                        {currentStatus === 'approved' && 'চূড়ান্ত অনুমোদিত'}
                        {currentStatus === 'rejected' && 'প্রত্যাখ্যাত'}
                        {currentStatus === 'sent_back' && 'সংশোধনের জন্য প্রেরিত'}
                        {!['approved', 'rejected', 'sent_back'].includes(currentStatus) && 'পর্যালোচনা চলমান'}
                    </Badge>
                </div>
            </div>

            <CardContent className="p-5">
                {/* Horizontal Desktop View */}
                <div className={`hidden lg:grid ${isHeadOffice ? 'grid-cols-4 max-w-3xl mx-auto' : 'grid-cols-7'} gap-2 relative`}>
                    {steps.map((step, idx) => {
                        const state = getStepState(idx, step);
                        const Icon = state.icon;
                        const sig = signatures.find((s: any) => step.stageMatch.includes(s.stage));

                        return (
                            <div key={step.id} className="flex flex-col items-center text-center relative group">
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${state.color} mb-2`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className="text-[12px] font-bold text-slate-800 line-clamp-1">{step.title_bn}</span>
                                <span className="text-[10px] text-slate-500 line-clamp-1">{step.role_bn}</span>

                                {sig?.signed_at && (
                                    <span className="text-[9.5px] font-mono text-emerald-700 mt-1">
                                        {format(parseISO(sig.signed_at), 'dd/MM/yy')}
                                    </span>
                                )}

                                {idx < steps.length - 1 && (
                                    <div className="absolute top-5 left-[60%] w-[80%] h-0.5 bg-slate-200 -z-0" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Mobile / Compact List View */}
                <div className="lg:hidden space-y-3">
                    {steps.map((step, idx) => {
                        const state = getStepState(idx, step);
                        const Icon = state.icon;
                        const sig = signatures.find((s: any) => step.stageMatch.includes(s.stage));

                        return (
                            <div key={step.id} className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                                <div className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center ${state.color}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-slate-800">{step.title_bn}</p>
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            {state.label}
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-slate-500">{step.role_bn}</p>
                                    {sig?.comments && (
                                        <p className="text-xs text-slate-700 italic mt-1 bg-white p-2 rounded border border-slate-200">
                                            "{sig.comments}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Reviewer Comments & History Cards */}
                {signatures.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                            <MessageSquareQuote className="h-4 w-4 text-emerald-600" />
                            <span>অনুমোদকদের মন্তব্য ও সুপারিশের বিবরণী ({signatures.length}):</span>
                        </div>
                        <div className="space-y-2.5">
                            {signatures.map((sig: any) => (
                                <div key={sig.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="font-semibold text-slate-900">
                                            {sig.user?.name || 'ব্যবহারকারী'} 
                                            <span className="text-slate-500 font-normal ml-1">
                                                ({sig.user?.employee?.designation?.name || sig.stage})
                                            </span>
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-500">
                                            {format(parseISO(sig.signed_at), 'dd MMM yyyy, hh:mm a')}
                                        </span>
                                    </div>
                                    {sig.recommended_date && (
                                        <p className="text-[11px] font-medium text-emerald-700 mb-1">
                                            সুপারিশকৃত কার্যকরের তারিখ: {format(parseISO(sig.recommended_date), 'dd/MM/yyyy')}
                                        </p>
                                    )}
                                    <p className="text-slate-700 italic">
                                        {sig.comments ? `"${sig.comments}"` : 'কোনো মন্তব্য প্রদান করা হয়নি।'}
                                    </p>
                                    <WorkflowStepComment
                                        signature={sig}
                                        url={commentUrl(sig.id)}
                                        canEdit={canCorrectComment}
                                        showText={false}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

