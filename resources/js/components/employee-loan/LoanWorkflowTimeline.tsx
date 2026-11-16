import React from 'react';

export type WorkflowStep = {
    key: string;
    label: string;
    state: 'done' | 'current' | 'upcoming' | 'returned' | 'rejected';
    holders: string[];
    actor: string | null;
    at: string | null;
    note: string | null;
};

const dot: Record<WorkflowStep['state'], string> = {
    done: 'bg-emerald-500',
    current: 'bg-amber-500 ring-4 ring-amber-100',
    upcoming: 'bg-zinc-300',
    returned: 'bg-orange-500 ring-4 ring-orange-100',
    rejected: 'bg-rose-500 ring-4 ring-rose-100',
};

export function LoanWorkflowTimeline({ steps }: { steps: WorkflowStep[] }) {
    if (steps.length === 0) return null;
    const current = steps.find((step) => step.state === 'current' || step.state === 'returned');

    return (
        <section className="mb-4 rounded-lg border border-zinc-200 bg-white p-3 print:hidden">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="text-sm font-semibold text-zinc-950">Workflow</h2>
                    <p className="text-xs text-zinc-500">কোন ধাপে আছে, এবং এখন কার কাছে আছে।</p>
                </div>
                {current && (
                    <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
                        <p className="font-semibold">এখন: {current.label}</p>
                        <p className="mt-0.5">{current.holders.length > 0 ? current.holders.join(', ') : 'কারো কাছে নেই'}</p>
                    </div>
                )}
            </div>
            <ol className="flex items-start gap-0 overflow-x-auto pb-1">
                {steps.map((step, index) => (
                    <li key={step.key} className="flex min-w-[7.5rem] flex-1 items-start">
                        <div className={`min-w-0 flex-1 ${step.state === 'upcoming' ? 'opacity-60' : ''}`}>
                            <div className="flex items-center">
                                <span className={`h-3 w-3 shrink-0 rounded-full ${dot[step.state]}`} />
                                {index < steps.length - 1 && <span className="mx-1 h-px min-w-4 flex-1 bg-zinc-200" />}
                            </div>
                            <p className="mt-2 pr-2 text-xs font-semibold leading-4 text-zinc-900">{step.label}</p>
                            {step.state === 'current' && <p className="text-[11px] font-medium text-amber-700">Pending</p>}
                            {step.state === 'returned' && <p className="text-[11px] font-medium text-orange-700">ফেরত</p>}
                            {step.state === 'done' && step.actor && (
                                <p className="pr-2 text-[11px] leading-4 text-zinc-600">{step.actor}</p>
                            )}
                            {(step.state === 'current' || step.state === 'upcoming' || step.state === 'returned') && step.holders.length > 0 && (
                                <p className="pr-2 text-[11px] leading-4 text-zinc-700">{step.holders.join(', ')}</p>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}
