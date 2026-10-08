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
        if (formType === 'accountant') {
            return [
                {
                    id: 'initiator',
                    key: 'draft',
                    stageMatch: ['initiator'],
                    title_bn: '১ম তত্ত্বাবধায়ক (দাখিল)',
                    title_en: '1st Supervisor',
                    role_bn: 'শাখা ব্যবস্থাপক',
                    role_en: 'Branch Manager',
                },
                {
                    id: 'rm',
                    key: 'submitted_to_rm',
                    stageMatch: ['rm', 'submitted_to_rm'],
                    title_bn: 'আরএম পর্যালোচনা',
                    title_en: 'RM Review',
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
                    stageMatch: ['director_fa', 'submitted_to_director_fa'],
                    title_bn: 'অর্থ ও হিসাব পর্যালোচনা',
                    title_en: 'Finance & Accounts',
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

        // Default: Officer & ABM, BM to ZM
        return [
            {
                id: 'initiator',
                key: 'draft',
                stageMatch: ['initiator'],
                title_bn: '১ম তত্ত্বাবধায়ক (দাখিল)',
                title_en: '1st Supervisor',
                role_bn: formType === 'bm_and_above' ? 'আঞ্চলিক ব্যবস্থাপক' : 'শাখা ব্যবস্থাপক',
                role_en: formType === 'bm_and_above' ? 'Regional Manager' : 'Branch Manager',
            },
            {
                id: 'rm',
                key: 'submitted_to_rm',
                stageMatch: ['rm', 'submitted_to_rm'],
                title_bn: 'আরএম পর্যালোচনা',
                title_en: 'RM Review',
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

    const getStatusIndex = (status: string) => {
        const order = [
            'draft',
            'submitted_to_rm',
            'submitted_to_zm',
            'submitted_to_director',
            'submitted_to_director_fa',
            'submitted_to_hr',
            'submitted_to_ed',
            'approved',
        ];
        return order.indexOf(status);
    };

    const currentIndex = getStatusIndex(currentStatus);

    return (
        <Card className="border border-slate-200/90 shadow-2xs overflow-hidden">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            {lang === 'bn' ? 'অনুমোদন প্রক্রিয়া পর্যায়ক্রম' : 'Approval Workflow Timeline'}
                        </h4>
                    </div>
                    {currentStatus === 'sent_back' && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {lang === 'bn' ? 'সংশোধনে ফেরত পাঠানো হয়েছে' : 'Returned for Revision'}
                        </Badge>
                    )}
                </div>

                {/* Horizontal Stepper */}
                <div className="relative">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {steps.map((step, idx) => {
                            const sig = signatures.find((s: any) => step.stageMatch.includes(s.stage));
                            const isDone = !!sig || (currentStatus === 'approved');
                            const isCurrent = !isDone && (
                                (step.key === currentStatus) || 
                                (idx === 0 && currentStatus === 'draft')
                            );

                            return (
                                <div
                                    key={step.id}
                                    className={`relative p-2.5 rounded-xl border text-xs transition-all ${
                                        isDone
                                            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
                                            : isCurrent
                                            ? 'bg-blue-50/80 border-blue-400 text-blue-950 ring-2 ring-blue-300/40 shadow-xs'
                                            : 'bg-slate-50/50 border-slate-200 text-slate-400'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-[11px]">
                                            {idx + 1}. {lang === 'bn' ? step.title_bn : step.title_en}
                                        </span>
                                        {isDone ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : isCurrent ? (
                                            <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                                        ) : (
                                            <span className="w-2 h-2 rounded-full bg-slate-200" />
                                        )}
                                    </div>

                                    <div className="text-[10px] text-slate-600 font-medium truncate">
                                        {lang === 'bn' ? step.role_bn : step.role_en}
                                    </div>

                                    {sig && (
                                        <div className="mt-1 pt-1 border-t border-emerald-200 text-[9px] text-emerald-800">
                                            <div className="font-semibold truncate">
                                                {sig.user?.name || sig.user?.employee?.name_bn || 'Signed'}
                                            </div>
                                            {sig.signed_at && (
                                                <div className="text-slate-500">
                                                    {format(new Date(sig.signed_at), 'dd MMM yyyy, p')}
                                                </div>
                                            )}
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
