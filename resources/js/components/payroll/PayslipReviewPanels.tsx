import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown, HandCoins } from 'lucide-react';

export type PayslipLineRow = {
    id: number;
    salary_head_id: number | null;
    head_name: string;
    type: string;
    amount_type: string;
    input_value: number;
    computed_amount: number;
    sort_order: number;
    is_loan?: boolean;
};

export type PayslipRow = {
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
    loan_deductions?: { head_name: string; amount: number }[];
    bonus_review?: {
        line_id: number | null;
        configuration_name: string;
        bonus_type_name?: string | null;
        basic_percentage: number;
        bonus_amount: number;
    };
};

export function previewTotals(payslip: PayslipRow, amounts: Record<number, string>) {
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

export function buildAmountsMap(payslips: PayslipRow[], isBonus: boolean): Record<number, string> {
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
        <div
            className={cn(
                'flex items-center justify-between gap-4 rounded-lg border px-3.5 py-2.5 transition-colors',
                line.is_loan 
                    ? 'border-amber-100 bg-amber-50/30 hover:bg-amber-50/50' 
                    : 'border-slate-100 bg-slate-50/40 hover:bg-slate-50/70',
            )}
        >
            <div className="min-w-0">
                <p className={cn('text-xs font-semibold tracking-tight', line.is_loan ? 'text-amber-900' : 'text-slate-800')}>{line.head_name}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{line.is_loan ? 'Loan installment' : typeHint}</p>
            </div>
            {canEdit ? (
                <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8.5 w-28 pl-6 text-right font-mono text-xs shadow-xs focus:ring-1 focus:ring-slate-300"
                        value={value}
                        onChange={(e) => onChange(line.id, e.target.value)}
                    />
                </div>
            ) : (
                <span className="text-xs font-semibold font-mono text-slate-800">৳{Number(value).toLocaleString()}</span>
            )}
        </div>
    );
}

export function BonusPayslipEmployeeCard({
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
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-slate-100/90 bg-white shadow-xs overflow-hidden transition-all duration-200">
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/50 cursor-pointer">
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] tracking-wider text-slate-400 font-semibold uppercase">{payslip.pin}</span>
                        <span className="text-sm font-semibold text-slate-800">{payslip.name}</span>
                        {payslip.is_withheld && <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-50">On hold</Badge>}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400/90 font-medium">
                        Basic ৳{payslip.basic.toLocaleString()} · {review.basic_percentage}% → bonus
                    </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-emerald-700">৳{net.toLocaleString()}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t border-slate-100/60 px-5 py-5 bg-slate-50/20">
                    <div className="rounded-xl border border-violet-100/80 bg-violet-50/20 p-5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Bonus configuration</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{review.configuration_name}</p>
                        {review.bonus_type_name && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{review.bonus_type_name}</p>}
                        <div className="mt-5 grid gap-4 sm:grid-cols-3 border-t border-violet-100/60 pt-4">
                            <div>
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">Basic salary</p>
                                <p className="text-xs font-semibold font-mono text-slate-700 mt-1">৳{payslip.basic.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">Rate</p>
                                <p className="text-xs font-semibold text-slate-700 mt-1">{review.basic_percentage}% of basic</p>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Bonus amount</p>
                                {canEdit && review.line_id ? (
                                    <div className="relative flex items-center max-w-[12rem]">
                                        <span className="absolute left-2.5 text-xs text-slate-400 font-medium">৳</span>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            className="h-8.5 pl-6 text-right font-mono text-xs bg-white"
                                            value={amount}
                                            onChange={(e) => onAmountChange(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <p className="text-xs font-bold font-mono text-emerald-700 mt-1">৳{review.bonus_amount.toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function PayslipEmployeeCard({
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
    const loanDeductions = payslip.loan_deductions?.length
        ? payslip.loan_deductions
        : deductions.filter((l) => l.is_loan).map((l) => ({ head_name: l.head_name, amount: l.computed_amount }));

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-slate-100/90 bg-white shadow-xs overflow-hidden transition-all duration-200">
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/50 cursor-pointer">
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] tracking-wider text-slate-400 font-semibold uppercase">{payslip.pin}</span>
                        <span className="text-sm font-semibold text-slate-800">{payslip.name}</span>
                        {payslip.is_withheld && <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-50">On hold</Badge>}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400/90 font-medium">
                        {payslip.grade ?? '—'} · Step {payslip.step ?? '—'}
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-4 text-right text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium"><span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-0.5">Gross</span> <span className="font-mono">৳{preview.gross.toLocaleString()}</span></span>
                    <span className="text-slate-500 font-medium"><span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-0.5">Ded.</span> <span className="font-mono">৳{preview.deduction.toLocaleString()}</span></span>
                    <span className="font-bold text-emerald-700 font-mono">Net ৳{preview.net.toLocaleString()}</span>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t border-slate-100/60 px-5 pb-5 pt-4 bg-slate-50/20">
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Earnings</p>
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
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-red-700">Deductions</p>
                            {loanDeductions.length > 0 && (
                                <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50/30 px-3.5 py-3">
                                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                                        <HandCoins className="h-3.5 w-3.5 text-amber-600" />
                                        Loan installments this month
                                    </div>
                                    <div className="space-y-1.5">
                                        {loanDeductions.map((loan) => (
                                            <div key={loan.head_name} className="flex justify-between gap-2 text-xs">
                                                <span className="text-amber-800 font-medium">{loan.head_name}</span>
                                                <span className="font-semibold font-mono text-amber-900">৳{loan.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {deductions.length === 0 ? (
                                <p className="text-[11px] text-slate-400 font-medium">No deductions</p>
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
