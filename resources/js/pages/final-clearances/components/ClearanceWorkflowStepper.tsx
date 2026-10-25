import { WorkflowStepComment } from '@/components/appraisal/WorkflowStepComment';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import React from 'react';

type Signature = {
    id?: number;
    stage: string;
    action: string;
    comments?: string | null;
    comment_updated_by_name?: string | null;
    signed_at?: string | null;
    user_name?: string | null;
};

type Step = {
    id: string;
    key: string;
    stageMatch: string[];
    title: string;
    role: string;
};

const STEPS: Step[] = [
    { id: 'field', key: 'draft', stageMatch: ['field'], title: 'Field', role: 'Preparer' },
    { id: 'hr', key: 'submitted_to_hr', stageMatch: ['hr'], title: 'HR', role: 'Manager (HR)' },
    { id: 'accounts', key: 'submitted_to_accounts', stageMatch: ['accounts'], title: 'Accounts', role: 'Accounts' },
    { id: 'director_fa', key: 'submitted_to_director_fa', stageMatch: ['director_fa'], title: 'Director (F&A)', role: 'Director (Finance & Accounts)' },
    { id: 'ed', key: 'submitted_to_ed', stageMatch: ['ed'], title: 'Executive Director', role: 'Executive Director' },
];

export default function ClearanceWorkflowStepper({
    status,
    signatures = [],
    canCorrectComment = false,
    clearanceId,
}: {
    status: string;
    signatures?: Signature[];
    canCorrectComment?: boolean;
    clearanceId?: number;
}) {
    const currentStepIndex = status === 'approved' || status === 'rejected'
        ? STEPS.length
        : Math.max(0, STEPS.findIndex((step) => step.key === status));

    const sentBack = [...signatures].reverse().find((sig) => sig.action === 'sent_back');
    const commentUrl = (signatureId: number) => `/final-clearances/${clearanceId}/signatures/${signatureId}/comment`;

    return (
        <div className="w-full space-y-4 print:hidden">
            {sentBack && status === 'draft' && (
                <div className="flex items-start gap-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900">
                    <div className="mt-0.5 shrink-0 rounded-lg bg-amber-500/20 p-2 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">Sent back for revision</span>
                            {sentBack.signed_at && (
                                <Badge variant="outline" className="border-amber-300 bg-amber-100 text-xs text-amber-800">
                                    {format(new Date(sentBack.signed_at), 'dd/MM/yyyy')}
                                </Badge>
                            )}
                        </div>
                        {sentBack.user_name && <p className="mt-1 font-medium text-amber-800">{sentBack.user_name}</p>}
                        {sentBack.comments && (
                            <p className="mt-0.5 rounded-lg border border-amber-200 bg-white/70 p-2.5 text-slate-700 italic">"{sentBack.comments}"</p>
                        )}
                        <WorkflowStepComment
                            signature={sentBack}
                            url={sentBack.id ? commentUrl(sentBack.id) : null}
                            canEdit={canCorrectComment}
                            showText={false}
                        />
                    </div>
                </div>
            )}

            <Card className="border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" />
                            <h3 className="text-sm font-bold text-slate-900 sm:text-base">Approval Workflow & Progress Tracker</h3>
                        </div>
                        <Badge
                            variant="secondary"
                            className={`px-2.5 py-0.5 text-xs font-semibold ${
                                status === 'approved'
                                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                    : status === 'rejected'
                                      ? 'border-rose-300 bg-rose-100 text-rose-800'
                                      : status === 'draft'
                                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                                        : 'border-blue-300 bg-blue-100 text-blue-800'
                            }`}
                        >
                            {status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : status === 'draft' ? 'Draft Stage' : 'In Progress'}
                        </Badge>
                    </div>

                    <div className="hidden md:block">
                        <div className="relative grid grid-cols-5 gap-2">
                            {STEPS.map((step, idx) => {
                                const isPassed = status === 'approved' || idx < currentStepIndex;
                                const isCurrent = status !== 'approved' && status !== 'rejected' && idx === currentStepIndex;
                                const signature = [...signatures].reverse().find((sig) => step.stageMatch.includes(sig.stage) && sig.action !== 'sent_back' && sig.action !== 'rejected');

                                return (
                                    <div key={step.id} className="relative flex flex-col items-center text-center">
                                        {idx < STEPS.length - 1 && (
                                            <div className={`absolute top-5 left-1/2 -z-0 h-[3px] w-full ${idx < currentStepIndex || status === 'approved' ? 'bg-blue-600' : 'bg-slate-200'}`} />
                                        )}
                                        <div className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${
                                            isPassed
                                                ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                                : isCurrent
                                                  ? 'animate-pulse border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-500/20'
                                                  : 'border-slate-300 bg-white text-slate-400'
                                        }`}>
                                            {isPassed ? <CheckCircle2 className="h-5 w-5" /> : isCurrent ? <Clock className="h-5 w-5 text-amber-600" /> : <span>{idx + 1}</span>}
                                        </div>
                                        <div className="mt-2.5 w-full px-1">
                                            <p className={`truncate text-xs font-bold ${isCurrent ? 'text-amber-700' : isPassed ? 'text-slate-900' : 'text-slate-500'}`}>{step.title}</p>
                                            <p className="mt-0.5 truncate text-[11px] text-slate-500">{step.role}</p>
                                            {signature ? (
                                                <div className="mt-1.5 rounded border border-slate-200/60 bg-slate-100/70 p-1 text-[10px] text-slate-600">
                                                    <p className="truncate font-semibold">{signature.user_name}</p>
                                                    <p className="text-[9px] text-slate-500">{signature.signed_at ? format(new Date(signature.signed_at), 'dd/MM/yy') : ''}</p>
                                                    <WorkflowStepComment
                                                        signature={signature}
                                                        url={signature.id ? commentUrl(signature.id) : null}
                                                        canEdit={canCorrectComment}
                                                        compact
                                                    />
                                                </div>
                                            ) : isCurrent ? (
                                                <div className="mt-1.5">
                                                    <Badge variant="outline" className="border-amber-300 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700">Pending</Badge>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="block space-y-2 md:hidden">
                        {STEPS.map((step, idx) => {
                            const isPassed = status === 'approved' || idx < currentStepIndex;
                            const isCurrent = status !== 'approved' && status !== 'rejected' && idx === currentStepIndex;
                            const signature = [...signatures].reverse().find((sig) => step.stageMatch.includes(sig.stage) && sig.action !== 'sent_back' && sig.action !== 'rejected');

                            return (
                                <div key={step.id} className={`flex items-start gap-3 rounded-xl border p-3 ${
                                    isCurrent ? 'border-amber-300 bg-amber-50/70 ring-2 ring-amber-500/20' : isPassed ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200/80 bg-white opacity-60'
                                }`}>
                                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        isPassed ? 'bg-blue-600 text-white' : isCurrent ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {isPassed ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <Clock className="h-4 w-4" /> : <span>{idx + 1}</span>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-xs font-bold ${isCurrent ? 'text-amber-900' : isPassed ? 'text-slate-900' : 'text-slate-500'}`}>{step.title}</p>
                                            {isCurrent ? <Badge className="bg-amber-500 px-1.5 py-0 text-[10px] text-white">Pending</Badge> : isPassed ? <Badge className="bg-blue-600 px-1.5 py-0 text-[10px] text-white">Done</Badge> : null}
                                        </div>
                                        <p className="text-[11px] text-slate-500">{step.role}</p>
                                        {signature && (
                                            <>
                                                <p className="mt-1 text-[11px] font-semibold text-slate-600">{signature.user_name}</p>
                                                <WorkflowStepComment
                                                    signature={signature}
                                                    url={signature.id ? commentUrl(signature.id) : null}
                                                    canEdit={canCorrectComment}
                                                    compact
                                                />
                                            </>
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
