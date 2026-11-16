import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { cn } from '@/lib/utils';

export type LoanInstallmentLedgerRow = {
    id: number;
    installment_no: number;
    scheduled_month: string | null;
    principal_amount: number;
    service_charge_amount: number;
    total_amount: number;
    payment_month: string | null;
    payment_branch: string | null;
    paid_principal_amount: number | null;
    paid_service_charge_amount: number | null;
    paid_amount: number | null;
    balance_principal: number;
    balance_service_charge: number;
    balance_total: number;
    status_label: string;
};

type Props = {
    rows: LoanInstallmentLedgerRow[];
    title?: string;
    emptyMessage?: string;
    embedded?: boolean;
};

const fmt = fmtLoanAmount;

const numCell = (value: number | null | undefined, showZero = false) => {
    if (value === null || value === undefined) {
        return showZero ? fmt(0) : '—';
    }
    return fmt(value);
};

const headGroup = 'border border-zinc-300 bg-zinc-50/90 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-600';
const headSub = 'border border-zinc-300 bg-zinc-50/90 text-xs text-right text-zinc-500';
const cellBase = 'border border-zinc-300 bg-white';
const cellRight = 'border border-zinc-300 bg-white text-xs text-right tabular-nums text-zinc-700';
const cellCenter = 'border border-zinc-300 bg-white text-xs text-center text-zinc-700';

function TableContent({ rows, emptyMessage }: { rows: LoanInstallmentLedgerRow[]; emptyMessage: string }) {
    const totals = rows.reduce(
        (acc, row) => {
            acc.schedulePrincipal += row.principal_amount ?? 0;
            acc.scheduleService += row.service_charge_amount ?? 0;
            acc.scheduleTotal += row.total_amount ?? 0;
            acc.collectionPrincipal += row.paid_principal_amount ?? 0;
            acc.collectionService += row.paid_service_charge_amount ?? 0;
            acc.collectionTotal += row.paid_amount ?? 0;
            // `balance_*` per row represents "remaining balance after that installment".
            // Therefore we must NOT sum them. Use the latest paid installment's balance.
            if (row.status_label === 'PAID') {
                acc.balancePrincipal = row.balance_principal ?? 0;
                acc.balanceService = row.balance_service_charge ?? 0;
                acc.balanceTotal = row.balance_total ?? 0;
            }
            return acc;
        },
        {
            schedulePrincipal: 0,
            scheduleService: 0,
            scheduleTotal: 0,
            collectionPrincipal: 0,
            collectionService: 0,
            collectionTotal: 0,
            balancePrincipal: 0,
            balanceService: 0,
            balanceTotal: 0,
        },
    );

    return (
        <div>
            {/* Mobile Card List View */}
            <div className="p-3 space-y-2.5 sm:hidden">
                {rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-xs text-zinc-500">
                        {emptyMessage}
                    </div>
                ) : (
                    rows.map((row) => {
                        const isPaid = row.status_label === 'PAID';
                        return (
                            <div key={row.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">
                                            #{row.installment_no}
                                        </span>
                                        <span className="text-xs text-zinc-700 font-semibold">{row.scheduled_month || '—'}</span>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-[10px] uppercase',
                                            isPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                                        )}
                                    >
                                        {row.status_label}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-1.5 pt-1 text-xs">
                                    <div className="bg-zinc-50 p-1.5 rounded text-center">
                                        <p className="text-[9px] uppercase text-zinc-500 font-bold">Scheduled</p>
                                        <p className="font-mono font-semibold text-zinc-900 text-[11px]">{fmt(row.total_amount)}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-1.5 rounded text-center">
                                        <p className="text-[9px] uppercase text-emerald-700 font-bold">Paid</p>
                                        <p className="font-mono font-semibold text-emerald-800 text-[11px]">{numCell(row.paid_amount, true)}</p>
                                    </div>
                                    <div className="bg-amber-50 p-1.5 rounded text-center">
                                        <p className="text-[9px] uppercase text-amber-800 font-bold">Remaining</p>
                                        <p className="font-mono font-semibold text-amber-900 text-[11px]">{isPaid ? fmt(row.balance_total) : fmt(0)}</p>
                                    </div>
                                </div>

                                {isPaid && (row.payment_month || row.payment_branch) && (
                                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-100 text-zinc-500">
                                        <span>Paid Month: {row.payment_month || '—'}</span>
                                        <span>Branch: {row.payment_branch || '—'}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
                <Table className="border-collapse">
                    <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                        <TableHead className={cn(headGroup, 'text-left')} rowSpan={2}>Scheduled month</TableHead>
                        <TableHead className={headGroup} colSpan={3}>Schedule</TableHead>
                        <TableHead className={headGroup} rowSpan={2}>Install no</TableHead>
                        <TableHead className={headGroup} rowSpan={2}>Payment month</TableHead>
                        <TableHead className={headGroup} rowSpan={2}>Payment branch</TableHead>
                        <TableHead className={headGroup} colSpan={3}>Collection</TableHead>
                        <TableHead className={headGroup} colSpan={3}>Loan balance</TableHead>
                        <TableHead className={headGroup} rowSpan={2}>Status</TableHead>
                    </TableRow>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                        <TableHead className={headSub}>PR</TableHead>
                        <TableHead className={headSub}>SC</TableHead>
                        <TableHead className={headSub}>Total</TableHead>
                        <TableHead className={headSub}>PR</TableHead>
                        <TableHead className={headSub}>SC</TableHead>
                        <TableHead className={headSub}>Total</TableHead>
                        <TableHead className={headSub}>PR</TableHead>
                        <TableHead className={headSub}>SC</TableHead>
                        <TableHead className={headSub}>Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={14} className="border border-zinc-300 py-10 text-center text-sm text-zinc-500">
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        <>
                            {rows.map((row) => {
                                const isPaid = row.status_label === 'PAID';

                                return (
                                    <TableRow key={row.id}>
                                        <TableCell className={cn(cellBase, 'text-xs font-medium text-zinc-800')}>{row.scheduled_month || '—'}</TableCell>
                                        <TableCell className={cellRight}>{fmt(row.principal_amount)}</TableCell>
                                        <TableCell className={cn(cellRight, 'text-violet-700')}>{fmt(row.service_charge_amount)}</TableCell>
                                        <TableCell className={cn(cellRight, 'font-medium text-zinc-900')}>{fmt(row.total_amount)}</TableCell>
                                        <TableCell className={cn(cellCenter, 'font-mono')}>{row.installment_no}</TableCell>
                                        <TableCell className={cellCenter}>{row.payment_month || '—'}</TableCell>
                                        <TableCell className={cn(cellBase, 'text-xs text-zinc-700')}>{row.payment_branch || '—'}</TableCell>
                                        <TableCell className={cn(cellRight, isPaid && 'text-emerald-800')}>{numCell(row.paid_principal_amount, true)}</TableCell>
                                        <TableCell className={cn(cellRight, isPaid && 'text-emerald-800')}>{numCell(row.paid_service_charge_amount, true)}</TableCell>
                                        <TableCell className={cn(cellRight, isPaid && 'font-medium text-emerald-800')}>{numCell(row.paid_amount, true)}</TableCell>
                                        <TableCell className={cellRight}>{isPaid ? fmt(row.balance_principal) : fmt(0)}</TableCell>
                                        <TableCell className={cn(cellRight, 'text-violet-700')}>{isPaid ? fmt(row.balance_service_charge) : fmt(0)}</TableCell>
                                        <TableCell className={cn(cellRight, 'font-medium text-zinc-900')}>{isPaid ? fmt(row.balance_total) : fmt(0)}</TableCell>
                                        <TableCell className={cellCenter}>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[10px] uppercase',
                                                    isPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-zinc-200 bg-zinc-50 text-zinc-600',
                                                )}
                                            >
                                                {row.status_label}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                                <TableCell className={cn(cellBase, 'text-xs font-semibold uppercase text-zinc-900')}>Total</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-zinc-900')}>{fmt(totals.schedulePrincipal)}</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-violet-800')}>{fmt(totals.scheduleService)}</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-zinc-950')}>{fmt(totals.scheduleTotal)}</TableCell>
                                <TableCell className={cn(cellCenter, 'font-semibold text-zinc-900')}>—</TableCell>
                                <TableCell className={cn(cellCenter, 'font-semibold text-zinc-900')}>—</TableCell>
                                <TableCell className={cn(cellBase, 'text-xs font-semibold text-zinc-900')}>—</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-emerald-800')}>{fmt(totals.collectionPrincipal)}</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-emerald-800')}>{fmt(totals.collectionService)}</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-emerald-900')}>{fmt(totals.collectionTotal)}</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-zinc-900')}>{fmt(totals.balancePrincipal)}</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-violet-800')}>{fmt(totals.balanceService)}</TableCell>
                                <TableCell className={cn(cellRight, 'font-semibold text-zinc-950')}>{fmt(totals.balanceTotal)}</TableCell>
                                <TableCell className={cn(cellCenter, 'font-semibold text-zinc-900')}>—</TableCell>
                            </TableRow>
                        </>
                    )}
                </TableBody>
            </Table>
        </div>
        </div>
    );
}

export function LoanInstallmentLedgerTable({
    rows,
    title = 'Installment ledger',
    emptyMessage = 'No installment schedule found.',
    embedded = false,
}: Props) {
    if (embedded) {
        return <TableContent rows={rows} emptyMessage={emptyMessage} />;
    }

    return (
        <Card className="border-zinc-200/90 shadow-2xs">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
                <CardTitle className="text-sm font-semibold text-zinc-900">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <TableContent rows={rows} emptyMessage={emptyMessage} />
            </CardContent>
        </Card>
    );
}
