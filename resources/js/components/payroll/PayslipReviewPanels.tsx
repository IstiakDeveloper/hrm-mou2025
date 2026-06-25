import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ChevronDown, HandCoins, UserX } from 'lucide-react';

export type PayslipLineRow = {
    id: number;
    salary_head_id: number | null;
    head_name: string;
    head_label?: string | null;
    type: string;
    amount_type: string;
    input_value: number;
    computed_amount: number;
    sort_order: number;
    is_loan?: boolean;
    loan_head_type?: string | null;
    loan_type_label?: string | null;
};

export type PayslipRow = {
    id: number;
    pin: string;
    name: string;
    designation?: string | null;
    grade: string | null;
    step: number | null;
    basic: number;
    gross: number;
    deduction: number;
    net: number;
    is_withheld: boolean;
    payable_days?: number | null;
    days_in_month?: number | null;
    payroll_remark?: string | null;
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

type HeadColumn = {
    columnKey: string;
    head_name: string;
    type: 'earning' | 'deduction';
    sort_order: number;
    is_loan?: boolean;
    is_others_earning?: boolean;
    loan_head_type?: string | null;
};

const LOAN_TYPE_ORDER = ['pf_loan', 'motorcycle_loan', 'laptop_loan', 'other'];
const OTHERS_EARNING_HEADS = new Set(['Fixed Salary', 'Probation Salary']);
const OTHERS_EARNING_COLUMN_KEY = 'earn:others';

function isOthersEarningHead(headName: string): boolean {
    return OTHERS_EARNING_HEADS.has(headName);
}

function lineHeadDisplayLabel(line: PayslipLineRow): string {
    return line.head_label?.trim() || line.head_name;
}

function loanTypeSortIndex(loanType: string): number {
    const index = LOAN_TYPE_ORDER.indexOf(loanType);
    return index === -1 ? LOAN_TYPE_ORDER.length : index;
}

function collectHeadColumns(payslips: PayslipRow[]): { earnings: HeadColumn[]; deductions: HeadColumn[] } {
    const earningsMap = new Map<string, HeadColumn>();
    const deductionsMap = new Map<string, HeadColumn>();

    for (const payslip of payslips) {
        for (const line of payslip.lines) {
            if (line.type === 'earning') {
                if (isOthersEarningHead(line.head_name)) {
                    const existing = earningsMap.get(OTHERS_EARNING_COLUMN_KEY);
                    if (!existing || line.sort_order < existing.sort_order) {
                        earningsMap.set(OTHERS_EARNING_COLUMN_KEY, {
                            columnKey: OTHERS_EARNING_COLUMN_KEY,
                            head_name: 'Others',
                            type: 'earning',
                            sort_order: line.sort_order,
                            is_others_earning: true,
                        });
                    }
                    continue;
                }

                const columnKey = `earn:${line.head_name}`;
                const existing = earningsMap.get(columnKey);
                if (!existing || line.sort_order < existing.sort_order) {
                    earningsMap.set(columnKey, {
                        columnKey,
                        head_name: lineHeadDisplayLabel(line),
                        type: 'earning',
                        sort_order: line.sort_order,
                    });
                }
                continue;
            }

            if (line.is_loan) {
                const loanType = line.loan_head_type ?? 'other';
                const columnKey = `loan:${loanType}`;
                const label = line.loan_type_label ?? line.head_name.split(' — ')[0] ?? 'Loan';
                const existing = deductionsMap.get(columnKey);
                if (!existing || line.sort_order < existing.sort_order) {
                    deductionsMap.set(columnKey, {
                        columnKey,
                        head_name: label,
                        type: 'deduction',
                        sort_order: line.sort_order,
                        is_loan: true,
                        loan_head_type: loanType,
                    });
                }
                continue;
            }

            const columnKey = `ded:${line.head_name}`;
            const existing = deductionsMap.get(columnKey);
            if (!existing || line.sort_order < existing.sort_order) {
                deductionsMap.set(columnKey, {
                    columnKey,
                    head_name: lineHeadDisplayLabel(line),
                    type: 'deduction',
                    sort_order: line.sort_order,
                    is_loan: false,
                });
            }
        }
    }

    const sortEarnings = (a: HeadColumn, b: HeadColumn) => a.sort_order - b.sort_order || a.head_name.localeCompare(b.head_name);
    const sortDeductions = (a: HeadColumn, b: HeadColumn) => {
        if (a.is_loan && b.is_loan) {
            const typeOrder = loanTypeSortIndex(a.loan_head_type ?? 'other') - loanTypeSortIndex(b.loan_head_type ?? 'other');
            if (typeOrder !== 0) return typeOrder;
        }
        if (a.is_loan !== b.is_loan) {
            return a.is_loan ? 1 : -1;
        }
        return a.sort_order - b.sort_order || a.head_name.localeCompare(b.head_name);
    };

    return {
        earnings: [...earningsMap.values()].sort(sortEarnings),
        deductions: [...deductionsMap.values()].sort(sortDeductions),
    };
}

function linesForEarningColumn(payslip: PayslipRow, column: HeadColumn): PayslipLineRow[] {
    if (column.is_others_earning) {
        return payslip.lines.filter((line) => line.type === 'earning' && isOthersEarningHead(line.head_name));
    }

    // column.head_name is the display label (head_label); match via stable columnKey from line.head_name
    const headName = column.columnKey.startsWith('earn:') ? column.columnKey.slice(5) : column.head_name;

    return payslip.lines.filter((line) => line.type === 'earning' && line.head_name === headName);
}

function linesForDeductionColumn(payslip: PayslipRow, column: HeadColumn): PayslipLineRow[] {
    if (column.loan_head_type) {
        return payslip.lines.filter(
            (line) =>
                line.type === 'deduction' &&
                line.is_loan &&
                (line.loan_head_type ?? 'other') === column.loan_head_type,
        );
    }

    // column.head_name is the display label (head_label); match via stable columnKey from line.head_name
    const headName = column.columnKey.startsWith('ded:') ? column.columnKey.slice(4) : column.head_name;

    return payslip.lines.filter(
        (line) => line.type === 'deduction' && !line.is_loan && line.head_name === headName,
    );
}

function sumLineAmounts(lines: PayslipLineRow[], amounts: Record<number, string>): number {
    return lines.reduce((sum, line) => {
        const raw = amounts[line.id] ?? String(line.computed_amount);
        const amt = Number(raw);
        return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);
}

function GroupedAmountCell({
    lines,
    canEdit,
    amounts,
    onChange,
    compact,
    isLoan,
}: {
    lines: PayslipLineRow[];
    canEdit: boolean;
    amounts: Record<number, string>;
    onChange?: (lineId: number, value: string) => void;
    compact?: boolean;
    isLoan?: boolean;
}) {
    if (lines.length === 0) {
        return <span className="text-[11px] text-slate-300 font-mono">—</span>;
    }

    const total = sumLineAmounts(lines, amounts);
    const breakdown = lines
        .map((line) => {
            const raw = amounts[line.id] ?? String(line.computed_amount);
            return `${line.head_name}: ৳${Number(raw).toLocaleString()}`;
        })
        .join('\n');

    if (canEdit && onChange && lines.length === 1) {
        const line = lines[0];
        return (
            <Input
                type="number"
                min={0}
                step="0.01"
                title={breakdown}
                className={cn(
                    'h-7 px-1.5 text-center font-mono text-[11px] shadow-none border-slate-200 mx-auto',
                    compact ? 'w-[4.5rem]' : 'w-24',
                    isLoan && 'border-amber-200 bg-amber-50/40',
                )}
                value={amounts[line.id] ?? String(line.computed_amount)}
                onChange={(e) => onChange(line.id, e.target.value)}
            />
        );
    }

    if (canEdit && onChange && lines.length > 1) {
        return (
            <div className="flex flex-col items-center gap-1" title={breakdown}>
                {lines.map((line) => (
                    <Input
                        key={line.id}
                        type="number"
                        min={0}
                        step="0.01"
                        className={cn(
                            'h-7 px-1.5 text-center font-mono text-[11px] shadow-none border-slate-200',
                            compact ? 'w-[4.5rem]' : 'w-24',
                            isLoan && 'border-amber-200 bg-amber-50/40',
                        )}
                        value={amounts[line.id] ?? String(line.computed_amount)}
                        onChange={(e) => onChange(line.id, e.target.value)}
                    />
                ))}
            </div>
        );
    }

    return (
        <span
            className={cn('inline-block text-[11px] font-mono font-semibold text-slate-700 text-center', isLoan && 'text-amber-800')}
            title={lines.length > 1 ? breakdown : undefined}
        >
            ৳{total.toLocaleString()}
        </span>
    );
}

function AmountCell({
    line,
    canEdit,
    value,
    onChange,
    compact,
}: {
    line?: PayslipLineRow;
    canEdit: boolean;
    value: string;
    onChange?: (lineId: number, value: string) => void;
    compact?: boolean;
}) {
    if (!line) {
        return <span className="text-[11px] text-slate-300 font-mono text-center">—</span>;
    }

    if (canEdit && onChange) {
        return (
            <Input
                type="number"
                min={0}
                step="0.01"
                className={cn(
                    'h-7 px-1.5 text-center font-mono text-[11px] shadow-none border-slate-200 mx-auto',
                    compact ? 'w-[4.5rem]' : 'w-24',
                    line.is_loan && 'border-amber-200 bg-amber-50/40',
                )}
                value={value}
                onChange={(e) => onChange(line.id, e.target.value)}
            />
        );
    }

    return (
        <span className={cn('inline-block text-[11px] font-mono font-semibold text-slate-700 text-center', line.is_loan && 'text-amber-800')}>
            ৳{Number(value).toLocaleString()}
        </span>
    );
}

const stickyCell = 'sticky z-10 bg-white group-hover:bg-slate-50/80';
const moneyCell = 'text-center align-middle font-mono text-[11px]';
const amountCell = 'text-center align-middle';
const headCell =
    'h-auto min-h-10 py-2 px-1.5 text-[8px] font-bold tracking-wide text-slate-500 whitespace-normal text-center align-middle leading-tight break-words hyphens-auto min-w-[3.5rem] max-w-[9rem]';
const tableBase = 'w-max min-w-full caption-bottom text-sm border-collapse';
const reviewTableClass =
    '[&_thead_tr]:border-b-2 [&_thead_tr]:border-slate-200 [&_tbody_tr]:border-b [&_tbody_tr]:border-slate-200 [&_tfoot_tr]:border-t-2 [&_tfoot_tr]:border-slate-300 [&_th]:border-r [&_th]:border-slate-100 [&_th:last-child]:border-r-0 [&_th]:h-auto [&_th]:whitespace-normal [&_td]:border-r [&_td]:border-slate-100 [&_td:last-child]:border-r-0';

function ReviewHeadLabel({ children, title }: { children: React.ReactNode; title?: string }) {
    return (
        <span className="block w-full leading-tight break-words" title={title}>
            {children}
        </span>
    );
}
const hideScrollbar = 'scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

function AmountCellWrap({ children }: { children: React.ReactNode }) {
    return <div className="flex justify-center items-center">{children}</div>;
}

function useReviewTableScroll(deps: unknown[]) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    const [scrollWidth, setScrollWidth] = useState(0);
    const syncingRef = useRef(false);

    const syncScrollLeft = useCallback((left: number, source: HTMLElement) => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        for (const ref of [scrollRef, barRef]) {
            const el = ref.current;
            if (el && el !== source) {
                el.scrollLeft = left;
            }
        }
        syncingRef.current = false;
    }, []);

    const onScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => syncScrollLeft(e.currentTarget.scrollLeft, e.currentTarget),
        [syncScrollLeft],
    );

    useEffect(() => {
        const table = tableRef.current;
        if (!table) return;

        const update = () => setScrollWidth(table.scrollWidth);
        update();

        const ro = new ResizeObserver(update);
        ro.observe(table);
        return () => ro.disconnect();
    }, deps);

    return { scrollRef, barRef, tableRef, scrollWidth, onScroll };
}

function ReviewTableScroller({
    deps,
    children,
}: {
    deps: unknown[];
    children: (tableRef: React.RefObject<HTMLTableElement | null>) => React.ReactNode;
}) {
    const { scrollRef, barRef, tableRef, scrollWidth, onScroll } = useReviewTableScroll(deps);

    return (
        <div className="rounded-xl border border-slate-100 bg-white shadow-2xs overflow-hidden">
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className={cn('max-h-[calc(100dvh-13rem)] overflow-auto bg-white', hideScrollbar)}
            >
                {children(tableRef)}
            </div>
            <div
                ref={barRef}
                onScroll={onScroll}
                className="sticky bottom-0 z-50 h-3 overflow-x-auto overflow-y-hidden border-t border-slate-200 bg-slate-100/95"
                aria-label="Horizontal table scroll"
            >
                <div style={{ width: scrollWidth > 0 ? scrollWidth : '100%', height: 1 }} />
            </div>
        </div>
    );
}

const stickyHeadTh = 'sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm shadow-[0_1px_0_0_rgba(15,23,42,0.06)]';
const stickyFootTd = 'sticky bottom-0 z-30 bg-slate-50/95 backdrop-blur-sm shadow-[0_-1px_0_0_rgba(15,23,42,0.06)]';

function formatMoneyTotal(value: number): string {
    return `৳${value.toLocaleString()}`;
}

export function PayslipReviewTable({
    payslips,
    canEdit,
    amounts,
    onAmountChange,
}: {
    payslips: PayslipRow[];
    canEdit: boolean;
    amounts: Record<number, string>;
    onAmountChange: (lineId: number, value: string) => void;
}) {
    const { earnings, deductions } = useMemo(() => collectHeadColumns(payslips), [payslips]);

    const footerTotals = useMemo(() => {
        let basic = 0;
        let gross = 0;
        let deduction = 0;
        let net = 0;
        for (const payslip of payslips) {
            const totals = previewTotals(payslip, amounts);
            basic += totals.basic || payslip.basic;
            gross += totals.gross;
            deduction += totals.deduction;
            net += totals.net;
        }
        return { basic, gross, deduction, net };
    }, [payslips, amounts]);

    const columnTotals = useMemo(() => {
        const earningTotals: Record<string, number> = {};
        const deductionTotals: Record<string, number> = {};

        for (const head of earnings) {
            earningTotals[head.columnKey] = payslips.reduce(
                (sum, payslip) => sum + sumLineAmounts(linesForEarningColumn(payslip, head), amounts),
                0,
            );
        }

        for (const head of deductions) {
            deductionTotals[head.columnKey] = payslips.reduce(
                (sum, payslip) => sum + sumLineAmounts(linesForDeductionColumn(payslip, head), amounts),
                0,
            );
        }

        return { earningTotals, deductionTotals };
    }, [payslips, earnings, deductions, amounts]);

    if (payslips.length === 0) {
        return null;
    }

    return (
        <ReviewTableScroller deps={[payslips, earnings, deductions, amounts]}>
            {(tableRef) => (
                <table ref={tableRef} className={cn(tableBase, reviewTableClass)}>
                    <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                            <TableHead className={cn(headCell, stickyHeadTh, stickyCell, 'left-0 min-w-[2rem] max-w-[2rem] z-50')}>
                                <ReviewHeadLabel>#</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, stickyCell, 'left-[2rem] min-w-[4.5rem] max-w-[4.5rem] z-50')}>
                                <ReviewHeadLabel>PIN</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, stickyCell, 'left-[6.5rem] min-w-[10rem] max-w-[10rem] z-50')}>
                                <ReviewHeadLabel>Employee</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'min-w-[8rem] max-w-[12rem]')}>
                                <ReviewHeadLabel>Designation</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'min-w-[3.5rem] max-w-[4rem]')}>
                                <ReviewHeadLabel>Grade</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'min-w-[3rem] max-w-[3.5rem]')}>
                                <ReviewHeadLabel>Step</ReviewHeadLabel>
                            </TableHead>
                            {earnings.map((head) => (
                                <TableHead
                                    key={head.columnKey}
                                    className={cn(headCell, stickyHeadTh, 'text-emerald-700')}
                                >
                                    <ReviewHeadLabel title={head.head_name}>{head.head_name}</ReviewHeadLabel>
                                </TableHead>
                            ))}
                            <TableHead className={cn(headCell, stickyHeadTh, 'text-slate-700 bg-slate-50/50')}>
                                <ReviewHeadLabel>Gross</ReviewHeadLabel>
                            </TableHead>
                            {deductions.map((head) => (
                                <TableHead
                                    key={head.columnKey}
                                    className={cn(headCell, stickyHeadTh, head.is_loan ? 'text-amber-700' : 'text-red-700')}
                                >
                                    <ReviewHeadLabel title={head.head_name}>{head.head_name}</ReviewHeadLabel>
                                </TableHead>
                            ))}
                            <TableHead className={cn(headCell, stickyHeadTh, 'text-red-700 bg-slate-50/50')}>
                                <ReviewHeadLabel title="Total Deduction">Total Ded.</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'text-emerald-800 bg-emerald-50/30')}>
                                <ReviewHeadLabel title="Net Payable">Net Payable</ReviewHeadLabel>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {payslips.map((payslip, index) => {
                        const preview = previewTotals(payslip, amounts);

                        return (
                            <TableRow key={payslip.id} className="group bg-white hover:bg-slate-50/60">
                                <TableCell className={cn('text-[11px] text-slate-400 font-medium', stickyCell, 'left-0')}>{index + 1}</TableCell>
                                <TableCell className={cn('font-mono text-[10px] font-semibold text-slate-500 uppercase', stickyCell, 'left-[2rem]')}>
                                    {payslip.pin}
                                </TableCell>
                                <TableCell className={cn('min-w-[10rem]', stickyCell, 'left-[6.5rem]')}>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-semibold text-slate-800">{payslip.name}</span>
                                        {payslip.is_withheld && (
                                            <Badge variant="outline" className="text-[8px] uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-50 px-1 py-0">
                                                Hold
                                            </Badge>
                                        )}
                                        {payslip.payroll_remark && (
                                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[8px] uppercase tracking-wider text-rose-700 px-1 py-0">
                                                {payslip.payable_days != null && payslip.days_in_month != null
                                                    ? `${payslip.payable_days}/${payslip.days_in_month}d`
                                                    : 'Sep'}
                                            </Badge>
                                        )}
                                    </div>
                                    {payslip.payroll_remark && (
                                        <p className="mt-0.5 text-[10px] text-rose-600/90 truncate max-w-[14rem]" title={payslip.payroll_remark}>
                                            {payslip.payroll_remark}
                                        </p>
                                    )}
                                </TableCell>
                                <TableCell className="text-[11px] text-slate-600 align-middle">
                                    <span className="line-clamp-2" title={payslip.designation ?? undefined}>
                                        {payslip.designation ?? '—'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-[11px] text-slate-600 text-center align-middle">{payslip.grade ?? '—'}</TableCell>
                                <TableCell className="text-[11px] text-slate-600 text-center align-middle">{payslip.step ?? '—'}</TableCell>
                                {earnings.map((head) => {
                                    const lines = linesForEarningColumn(payslip, head);
                                    const line = lines.length === 1 ? lines[0] : undefined;
                                    return (
                                        <TableCell key={`${payslip.id}-${head.columnKey}`} className={amountCell}>
                                            <AmountCellWrap>
                                                {head.is_others_earning || lines.length > 1 ? (
                                                    <GroupedAmountCell
                                                        lines={lines}
                                                        canEdit={canEdit}
                                                        amounts={amounts}
                                                        onChange={onAmountChange}
                                                        compact
                                                    />
                                                ) : (
                                                    <AmountCell
                                                        line={line}
                                                        canEdit={canEdit}
                                                        value={line ? amounts[line.id] ?? String(line.computed_amount) : '0'}
                                                        onChange={onAmountChange}
                                                        compact
                                                    />
                                                )}
                                            </AmountCellWrap>
                                        </TableCell>
                                    );
                                })}
                                <TableCell className={cn(moneyCell, 'font-semibold text-slate-700 bg-slate-50/20')}>
                                    ৳{preview.gross.toLocaleString()}
                                </TableCell>
                                {deductions.map((head) => {
                                    const lines = linesForDeductionColumn(payslip, head);
                                    return (
                                        <TableCell key={`${payslip.id}-${head.columnKey}`} className={amountCell}>
                                            <AmountCellWrap>
                                                <GroupedAmountCell
                                                    lines={lines}
                                                    canEdit={canEdit}
                                                    amounts={amounts}
                                                    onChange={onAmountChange}
                                                    compact
                                                    isLoan={head.is_loan}
                                                />
                                            </AmountCellWrap>
                                        </TableCell>
                                    );
                                })}
                                <TableCell className={cn(moneyCell, 'font-semibold text-red-700 bg-slate-50/20')}>
                                    ৳{preview.deduction.toLocaleString()}
                                </TableCell>
                                <TableCell className={cn(moneyCell, 'font-bold text-emerald-700 bg-emerald-50/20')}>
                                    ৳{preview.net.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                            <TableCell colSpan={3} className={cn(stickyFootTd, stickyCell, 'left-0 text-[10px] font-bold uppercase tracking-wider text-slate-500 z-50')}>
                                Totals ({payslips.length})
                            </TableCell>
                            <TableCell className={cn(stickyFootTd, 'text-center text-[10px] text-slate-400')}>—</TableCell>
                            <TableCell className={cn(stickyFootTd, 'text-center text-[10px] text-slate-400')}>—</TableCell>
                            <TableCell className={cn(stickyFootTd, 'text-center text-[10px] text-slate-400')}>—</TableCell>
                            {earnings.map((head) => (
                                <TableCell key={`foot-${head.columnKey}`} className={cn(moneyCell, stickyFootTd, 'font-semibold text-emerald-800')}>
                                    {formatMoneyTotal(columnTotals.earningTotals[head.columnKey] ?? 0)}
                                </TableCell>
                            ))}
                            <TableCell className={cn(moneyCell, stickyFootTd, 'font-bold text-slate-800')}>
                                {formatMoneyTotal(footerTotals.gross)}
                            </TableCell>
                            {deductions.map((head) => (
                                <TableCell
                                    key={`foot-${head.columnKey}`}
                                    className={cn(moneyCell, stickyFootTd, 'font-semibold', head.is_loan ? 'text-amber-800' : 'text-red-800')}
                                >
                                    {formatMoneyTotal(columnTotals.deductionTotals[head.columnKey] ?? 0)}
                                </TableCell>
                            ))}
                            <TableCell className={cn(moneyCell, stickyFootTd, 'font-bold text-red-800')}>
                                {formatMoneyTotal(footerTotals.deduction)}
                            </TableCell>
                            <TableCell className={cn(moneyCell, stickyFootTd, 'font-bold text-emerald-800')}>
                                {formatMoneyTotal(footerTotals.net)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </table>
            )}
        </ReviewTableScroller>
    );
}

export function BonusPayslipReviewTable({
    payslips,
    canEdit,
    amounts,
    onAmountChange,
}: {
    payslips: PayslipRow[];
    canEdit: boolean;
    amounts: Record<number, string>;
    onAmountChange: (lineId: number, value: string) => void;
}) {
    const footerTotals = useMemo(() => {
        let basic = 0;
        let bonus = 0;
        let net = 0;
        for (const payslip of payslips) {
            const review = payslip.bonus_review;
            basic += payslip.basic;
            if (!review?.line_id) {
                const amt = review?.bonus_amount ?? 0;
                bonus += amt;
                net += payslip.is_withheld ? 0 : amt;
                continue;
            }
            const raw = amounts[review.line_id] ?? String(review.bonus_amount);
            const amt = Number(raw) || 0;
            bonus += amt;
            net += payslip.is_withheld ? 0 : amt;
        }
        return { basic, bonus, net };
    }, [payslips, amounts]);

    if (payslips.length === 0) {
        return null;
    }

    return (
        <ReviewTableScroller deps={[payslips, amounts]}>
            {(tableRef) => (
                <table ref={tableRef} className={cn(tableBase, reviewTableClass)}>
                    <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                            <TableHead className={cn(headCell, stickyHeadTh, 'min-w-[2rem] max-w-[2rem]')}>
                                <ReviewHeadLabel>#</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'min-w-[4.5rem] max-w-[4.5rem]')}>
                                <ReviewHeadLabel>PIN</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'min-w-[10rem] max-w-[10rem]')}>
                                <ReviewHeadLabel>Employee</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh)}>
                                <ReviewHeadLabel>Basic Salary</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'min-w-[3rem] max-w-[3.5rem]')}>
                                <ReviewHeadLabel>Rate</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'text-violet-700')}>
                                <ReviewHeadLabel>Bonus</ReviewHeadLabel>
                            </TableHead>
                            <TableHead className={cn(headCell, stickyHeadTh, 'text-emerald-800 bg-emerald-50/30')}>
                                <ReviewHeadLabel title="Net Payable">Net Payable</ReviewHeadLabel>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {payslips.map((payslip, index) => {
                        const review = payslip.bonus_review!;
                        const amount = review.line_id
                            ? amounts[review.line_id] ?? String(review.bonus_amount)
                            : String(review.bonus_amount);
                        const bonusAmount = Number(amount);
                        const net = payslip.is_withheld ? 0 : (Number.isFinite(bonusAmount) ? bonusAmount : review.bonus_amount);

                        return (
                            <TableRow key={payslip.id} className="bg-white hover:bg-slate-50/60">
                                <TableCell className="text-[11px] text-slate-400 font-medium">{index + 1}</TableCell>
                                <TableCell className="font-mono text-[10px] font-semibold text-slate-500 uppercase">{payslip.pin}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-semibold text-slate-800">{payslip.name}</span>
                                        {payslip.is_withheld && (
                                            <Badge variant="outline" className="text-[8px] uppercase tracking-wider text-amber-600 border-amber-200 bg-amber-50 px-1 py-0">
                                                Hold
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{review.configuration_name}</p>
                                </TableCell>
                                <TableCell className={cn(moneyCell, 'text-slate-700')}>৳{payslip.basic.toLocaleString()}</TableCell>
                                <TableCell className={cn('text-[11px] text-slate-600 text-center align-middle')}>{review.basic_percentage}%</TableCell>
                                <TableCell className={amountCell}>
                                    <AmountCellWrap>
                                        {canEdit && review.line_id ? (
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                className="h-7 w-24 mx-auto px-1.5 text-center font-mono text-[11px] shadow-none border-slate-200"
                                                value={amount}
                                                onChange={(e) => onAmountChange(review.line_id!, e.target.value)}
                                            />
                                        ) : (
                                            <span className={cn(moneyCell, 'font-semibold text-violet-700')}>৳{review.bonus_amount.toLocaleString()}</span>
                                        )}
                                    </AmountCellWrap>
                                </TableCell>
                                <TableCell className={cn(moneyCell, 'font-bold text-emerald-700 bg-emerald-50/20')}>
                                    ৳{net.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                    <TableFooter>
                        <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
                            <TableCell colSpan={3} className={cn(stickyFootTd, 'text-[10px] font-bold uppercase tracking-wider text-slate-500')}>
                                Totals ({payslips.length})
                            </TableCell>
                            <TableCell className={cn(moneyCell, stickyFootTd, 'font-semibold text-slate-800')}>
                                {formatMoneyTotal(footerTotals.basic)}
                            </TableCell>
                            <TableCell className={cn(stickyFootTd, 'text-center text-[10px] text-slate-400')}>—</TableCell>
                            <TableCell className={cn(moneyCell, stickyFootTd, 'font-semibold text-violet-800')}>
                                {formatMoneyTotal(footerTotals.bonus)}
                            </TableCell>
                            <TableCell className={cn(moneyCell, stickyFootTd, 'font-bold text-emerald-800')}>
                                {formatMoneyTotal(footerTotals.net)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </table>
            )}
        </ReviewTableScroller>
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
                        {payslip.payroll_remark && (
                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[9px] uppercase tracking-wider text-rose-700">
                                {payslip.payable_days != null && payslip.days_in_month != null
                                    ? `${payslip.payable_days}/${payslip.days_in_month} days`
                                    : 'Separation'}
                            </Badge>
                        )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400/90 font-medium">
                        {payslip.designation ?? '—'} · {payslip.grade ?? '—'} · Step {payslip.step ?? '—'}
                    </p>
                    {payslip.payroll_remark && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed font-medium text-rose-700/90">
                            <UserX className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{payslip.payroll_remark}</span>
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-4 text-right text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium"><span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-0.5">Gross</span> <span className="font-mono">৳{preview.gross.toLocaleString()}</span></span>
                    <span className="text-slate-500 font-medium"><span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-0.5">Ded.</span> <span className="font-mono">৳{preview.deduction.toLocaleString()}</span></span>
                    <span className="font-bold text-emerald-700 font-mono">Net ৳{preview.net.toLocaleString()}</span>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t border-slate-100/60 px-5 pb-5 pt-4 bg-slate-50/20">
                    {payslip.payroll_remark && (
                        <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50/60 px-3.5 py-3 text-xs text-rose-900">
                            <div className="mb-1 flex items-center gap-1.5 font-semibold">
                                <UserX className="h-3.5 w-3.5" />
                                Separation salary note
                            </div>
                            <p>{payslip.payroll_remark}</p>
                        </div>
                    )}
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
