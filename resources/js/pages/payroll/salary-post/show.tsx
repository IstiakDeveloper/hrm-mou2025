import React, { useCallback, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { cn } from '@/lib/utils';
import { payrollPostLabels, payrollPostRoutes, type PayrollPostContext } from '@/lib/payroll-post-routes';
import { ArrowLeft, CheckCircle2, ChevronDown, Save } from 'lucide-react';

type PayslipLineRow = {
    id: number;
    salary_head_id: number | null;
    head_name: string;
    type: string;
    amount_type: string;
    input_value: number;
    computed_amount: number;
    sort_order: number;
};

type BonusReviewRow = {
    line_id: number | null;
    configuration_name: string;
    bonus_type_name?: string | null;
    basic_percentage: number;
    bonus_amount: number;
};

type PayslipRow = {
    id: number;
    pin: string;
    name: string;
    grade: string | null;
    step: number | null;
    basic: number;
    gross: number;
    deduction: number;
    net: number;
    is_withheld: boolean;
    lines: PayslipLineRow[];
    bonus_review?: BonusReviewRow;
};

type BonusConfigInfo = {
    name: string;
    type_name?: string | null;
    basic_percentage: number;
};

type RunInfo = {
    id: number;
    year: number;
    month: number;
    salary_type: string;
    bonus_label?: string | null;
    branch: string | null;
    status: string;
    employee_count: number;
    total_gross: number;
    total_deduction: number;
    total_net: number;
    processed_at: string | null;
};

type Props = {
    run: RunInfo;
    payslips: PayslipRow[];
    canEdit: boolean;
    pageContext?: PayrollPostContext;
    bonusConfig?: BonusConfigInfo | null;
};

const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function previewTotals(payslip: PayslipRow, amounts: Record<number, string>) {
    let gross = 0;
    let deduction = 0;
    let basic = 0;

    for (const line of payslip.lines) {
        const raw = amounts[line.id] ?? String(line.computed_amount);
        const amt = Number(raw);
        if (!Number.isFinite(amt)) continue;
        if (line.type === 'earning') {
            gross += amt;
            if (line.head_name === 'Basic' || line.salary_head_id === null) {
                basic = amt;
            }
        } else {
            deduction += amt;
        }
    }

    const net = payslip.is_withheld ? 0 : Math.round((gross - deduction) * 100) / 100;

    return { basic, gross, deduction, net };
}

function BonusPayslipEmployeeCard({
    payslip,
    canEdit,
    amount,
    onAmountChange,
    defaultOpen,
    expandAll,
}: {
    payslip: PayslipRow;
    canEdit: boolean;
    amount: string;
    onAmountChange: (value: string) => void;
    defaultOpen?: boolean;
    expandAll?: boolean | null;
}) {
    const review = payslip.bonus_review!;
    const [open, setOpen] = useState(defaultOpen ?? false);

    React.useEffect(() => {
        if (expandAll === true) setOpen(true);
        if (expandAll === false) setOpen(false);
    }, [expandAll]);

    const bonusAmount = Number(amount);
    const net = payslip.is_withheld ? 0 : (Number.isFinite(bonusAmount) ? bonusAmount : review.bonus_amount);

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-slate-200 bg-white">
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80">
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-600">{payslip.pin}</span>
                        <span className="text-sm font-semibold text-slate-900">{payslip.name}</span>
                        {payslip.is_withheld && <Badge variant="outline" className="text-[10px]">On hold</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Basic ৳{payslip.basic.toLocaleString()} · {review.basic_percentage}% → bonus
                    </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-800">
                    ৳{net.toLocaleString()}
                </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t border-slate-100 px-4 py-4">
                    <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-violet-800">Bonus configuration</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{review.configuration_name}</p>
                        {review.bonus_type_name && (
                            <p className="text-xs text-muted-foreground">{review.bonus_type_name}</p>
                        )}
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground">Basic salary</p>
                                <p className="text-sm font-medium tabular-nums">৳{payslip.basic.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground">Rate</p>
                                <p className="text-sm font-medium tabular-nums">{review.basic_percentage}% of basic</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground">Bonus amount</p>
                                {canEdit && review.line_id ? (
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="mt-1 h-9 tabular-nums"
                                        value={amount}
                                        onChange={(e) => onAmountChange(e.target.value)}
                                    />
                                ) : (
                                    <p className="text-sm font-semibold tabular-nums text-emerald-800">৳{review.bonus_amount.toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function PayslipEmployeeCard({
    payslip,
    canEdit,
    amounts,
    onAmountChange,
    defaultOpen,
    expandAll,
}: {
    payslip: PayslipRow;
    canEdit: boolean;
    amounts: Record<number, string>;
    onAmountChange: (lineId: number, value: string) => void;
    defaultOpen?: boolean;
    expandAll?: boolean | null;
}) {
    const [open, setOpen] = useState(defaultOpen ?? false);

    React.useEffect(() => {
        if (expandAll === true) setOpen(true);
        if (expandAll === false) setOpen(false);
    }, [expandAll]);
    const preview = useMemo(() => previewTotals(payslip, amounts), [payslip, amounts]);

    const earnings = payslip.lines.filter((l) => l.type === 'earning');
    const deductions = payslip.lines.filter((l) => l.type === 'deduction');

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-slate-200 bg-white">
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80">
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-600">{payslip.pin}</span>
                        <span className="text-sm font-semibold text-slate-900">{payslip.name}</span>
                        {payslip.is_withheld && <Badge variant="outline" className="text-[10px]">On hold</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {payslip.grade ?? '—'} · Step {payslip.step ?? '—'}
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3 text-right text-xs tabular-nums sm:text-sm">
                    <span>
                        <span className="text-muted-foreground">Gross </span>
                        <span className="font-medium">{preview.gross.toLocaleString()}</span>
                    </span>
                    <span>
                        <span className="text-muted-foreground">Ded. </span>
                        <span className="font-medium">{preview.deduction.toLocaleString()}</span>
                    </span>
                    <span className="font-semibold text-emerald-800">
                        Net ৳{preview.net.toLocaleString()}
                    </span>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">Earnings</p>
                            <div className="space-y-2">
                                {earnings.map((line) => (
                                    <ComponentRow
                                        key={line.id}
                                        line={line}
                                        canEdit={canEdit}
                                        value={amounts[line.id] ?? String(line.computed_amount)}
                                        onChange={onAmountChange}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-800">Deductions</p>
                            {deductions.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No deductions</p>
                            ) : (
                                <div className="space-y-2">
                                    {deductions.map((line) => (
                                        <ComponentRow
                                            key={line.id}
                                            line={line}
                                            canEdit={canEdit}
                                            value={amounts[line.id] ?? String(line.computed_amount)}
                                            onChange={onAmountChange}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function ComponentRow({
    line,
    canEdit,
    value,
    onChange,
}: {
    line: PayslipLineRow;
    canEdit: boolean;
    value: string;
    onChange: (lineId: number, value: string) => void;
}) {
    const typeHint = line.amount_type === 'percentage' ? `% of basic (${line.input_value})` : 'Fixed';

    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2">
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{line.head_name}</p>
                <p className="text-[10px] text-muted-foreground">{typeHint}</p>
            </div>
            {canEdit ? (
                <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-9 w-28 text-right tabular-nums"
                    value={value}
                    onChange={(e) => onChange(line.id, e.target.value)}
                />
            ) : (
                <span className="text-sm font-medium tabular-nums">৳{Number(value).toLocaleString()}</span>
            )}
        </div>
    );
}

function buildAmountsMap(payslips: PayslipRow[], isBonus: boolean): Record<number, string> {
    const map: Record<number, string> = {};
    for (const p of payslips) {
        if (isBonus && p.bonus_review?.line_id) {
            map[p.bonus_review.line_id] = String(p.bonus_review.bonus_amount);
            continue;
        }
        for (const line of p.lines) {
            map[line.id] = String(line.computed_amount);
        }
    }
    return map;
}

export default function SalaryPostShow({
    run: initialRun,
    payslips: initialPayslips,
    canEdit,
    pageContext = 'salary',
    bonusConfig,
}: Props) {
    const isBonus = pageContext === 'bonus';
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const routes = payrollPostRoutes(pageContext);
    const copy = payrollPostLabels(pageContext);
    const [run, setRun] = useState(initialRun);
    const [payslips, setPayslips] = useState(initialPayslips);
    const [saving, setSaving] = useState(false);
    const [posting, setPosting] = useState(false);
    const [dirty, setDirty] = useState(false);

    const isPosted = run.status === 'posted';

    const [amounts, setAmounts] = useState<Record<number, string>>(() => buildAmountsMap(initialPayslips, isBonus));

    React.useEffect(() => {
        setRun(initialRun);
        setPayslips(initialPayslips);
        setAmounts(buildAmountsMap(initialPayslips, isBonus));
        setDirty(false);
    }, [initialRun, initialPayslips, isBonus]);

    const onAmountChange = useCallback((lineId: number, value: string) => {
        setAmounts((prev) => ({ ...prev, [lineId]: value }));
        setDirty(true);
    }, []);

    const saveLines = () => {
        const lineIds = isBonus
            ? initialPayslips.map((p) => p.bonus_review?.line_id).filter((id): id is number => id != null)
            : null;

        const lines = Object.entries(amounts)
            .filter(([id]) => !lineIds || lineIds.includes(Number(id)))
            .map(([id, computed_amount]) => ({
                id: Number(id),
                computed_amount: Number(computed_amount),
            }));

        setSaving(true);
        router.put(
            routes.updatePayslips(run.id),
            { lines },
            {
                preserveScroll: true,
                onSuccess: () => setDirty(false),
                onFinish: () => setSaving(false),
            },
        );
    };

    const post = () => {
        if (dirty && !confirm('You have unsaved amount changes. Save first or continue posting without saving?')) {
            return;
        }
        if (!confirm(pageContext === 'bonus' ? 'Finalize this bonus payroll? The period will be locked.' : 'Finalize this payroll? The period will be locked.')) return;
        setPosting(true);
        router.post(routes.post(run.id), {}, { onFinish: () => setPosting(false) });
    };

    const [expandAll, setExpandAll] = useState<boolean | null>(null);

    return (
        <Layout>
            <Head title={copy.reviewTitle} />
            <PayrollPage>
                <PayrollPageHeader
                    title={`${monthNames[run.month] ?? run.month} ${run.year} — ${run.branch ?? 'Branch'}`}
                    description={`${run.bonus_label ?? run.salary_type} · Calculated ${run.processed_at ?? ''}${canEdit ? copy.reviewDescriptionSuffix : ''}`}
                >
                    <Button asChild variant="outline" size="sm">
                        <Link href={routes.index()}><ArrowLeft className="mr-2 h-4 w-4" /> {copy.backLabel}</Link>
                    </Button>
                    {canEdit && (
                        <>
                            <Button variant="outline" size="sm" onClick={saveLines} disabled={saving || !dirty}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Saving…' : 'Save amounts'}
                            </Button>
                            <Button onClick={post} disabled={posting}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                {posting ? copy.postingButton : copy.finalizeButton}
                            </Button>
                        </>
                    )}
                    {isPosted && <Badge className="h-9 px-3 text-sm">Posted</Badge>}
                </PayrollPageHeader>

                {flash?.success && (
                    <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-950">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}

                {isBonus && bonusConfig && (
                    <Alert className="mb-6 border-violet-200 bg-violet-50/80 text-violet-950">
                        <AlertTitle>Bonus configuration</AlertTitle>
                        <AlertDescription>
                            {bonusConfig.type_name ? `${bonusConfig.type_name} — ` : ''}
                            <span className="font-semibold">{bonusConfig.name}</span>
                            {' · '}
                            {bonusConfig.basic_percentage}% of each employee&apos;s basic salary
                        </AlertDescription>
                    </Alert>
                )}

                <div className={cn('mb-6 grid gap-3', isBonus ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
                    {(isBonus
                        ? [
                              { label: 'Employees', value: run.employee_count.toLocaleString() },
                              { label: 'Total bonus (৳)', value: run.total_net.toLocaleString(), highlight: true },
                          ]
                        : [
                              { label: 'Employees', value: run.employee_count.toLocaleString() },
                              { label: 'Gross (৳)', value: run.total_gross.toLocaleString() },
                              { label: 'Deductions (৳)', value: run.total_deduction.toLocaleString() },
                              { label: 'Net payable (৳)', value: run.total_net.toLocaleString(), highlight: true },
                          ]
                    ).map((s) => (
                        <div
                            key={s.label}
                            className={cn(
                                'rounded-xl border px-4 py-3',
                                s.highlight ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white',
                            )}
                        >
                            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                            <p
                                className={cn(
                                    'mt-1 text-lg font-bold tabular-nums',
                                    s.highlight ? 'text-emerald-800' : 'text-slate-900',
                                )}
                            >
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                <PayrollSectionCard
                    title={isBonus ? 'Employee bonus breakdown' : 'Employee salary breakdown'}
                    description={
                        isBonus
                            ? canEdit
                                ? 'Each row shows basic salary and the bonus from configuration. Adjust bonus amounts, then Save before finalize.'
                                : 'Each row shows basic salary and bonus amount from the selected configuration.'
                            : canEdit
                              ? 'Expand each employee to see every salary component. Change amounts, then Save amounts before finalize.'
                              : 'Expand each employee to see every salary component.'
                    }
                >
                    <div className="mb-4 flex justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandAll((v) => (v === true ? false : true))}
                        >
                            {expandAll === true ? 'Collapse all' : 'Expand all'}
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {payslips.map((p, idx) =>
                            isBonus && p.bonus_review ? (
                                <BonusPayslipEmployeeCard
                                    key={p.id}
                                    payslip={p}
                                    canEdit={canEdit}
                                    amount={
                                        p.bonus_review.line_id
                                            ? amounts[p.bonus_review.line_id] ?? String(p.bonus_review.bonus_amount)
                                            : String(p.bonus_review.bonus_amount)
                                    }
                                    onAmountChange={(value) => {
                                        if (p.bonus_review?.line_id) {
                                            onAmountChange(p.bonus_review.line_id, value);
                                        }
                                    }}
                                    defaultOpen={idx === 0}
                                    expandAll={expandAll}
                                />
                            ) : (
                                <PayslipEmployeeCard
                                    key={p.id}
                                    payslip={p}
                                    canEdit={canEdit}
                                    amounts={amounts}
                                    onAmountChange={onAmountChange}
                                    defaultOpen={idx === 0}
                                    expandAll={expandAll}
                                />
                            ),
                        )}
                    </div>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
