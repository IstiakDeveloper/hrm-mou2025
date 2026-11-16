import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Wallet, X } from 'lucide-react';
import { staffFundPath } from '@/lib/staff-fund-nav';
import { formatTakaAmount } from '@/lib/taka-format';
import { cn } from '@/lib/utils';

type Record = {
    id: number;
    employee_id: number;
    employee_label: string;
    service_end_date: string;
    completed_years: number;
    basic_multiplier: number;
    gratuity_amount: number;
    status: string;
    payment_date: string | null;
    payment_reference: string | null;
};

type Props = {
    records: Record[];
    filters: { status: string };
};

export default function GratuityPayments({ records, filters: init }: Props) {
    const [status, setStatus] = useState(init.status || 'all');

    const apply = () => {
        router.get(route('gratuity.payments'), status === 'all' ? {} : { status }, { preserveState: true });
    };

    return (
        <StaffFundLayout title="Gratuity Payments" activeTab="gratuity-payments" description="History of calculated, approved, and disbursed gratuity payment records.">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Link
                        href={staffFundPath('/gratuity')}
                        className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
                    >
                        <ArrowLeft className="h-3 w-3" /> Back to Entitlements
                    </Link>
                </div>
            </div>

            {/* Compact Filter Card */}
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg mb-3">
                <CardHeader className="border-b border-zinc-100 px-3 py-1.5 bg-zinc-50/50">
                    <CardTitle className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">Filter Records</CardTitle>
                </CardHeader>
                <CardContent className="p-3 flex items-end gap-2 max-w-md">
                    <div className="space-y-0.5 w-full">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase">Payment Status</label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-8 text-xs border-zinc-200 focus-visible:ring-emerald-500 rounded bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="calculated">Calculated</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white px-4 rounded" onClick={apply}>
                        Apply
                    </Button>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg">
                <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50">
                    <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                        Payment Logs
                        <span className="ml-1 text-[10px] font-normal text-zinc-400">({records.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {records.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-zinc-500">No gratuity payment records yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50 border-b border-zinc-200/60">
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider pl-3">Employee</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Service End</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Years completed</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-center">Multiplier</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider text-right">Amount (৳)</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-bold text-zinc-600 h-8 py-1 uppercase text-[9px] tracking-wider pr-3">Paid Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((r) => (
                                        <TableRow key={r.id} className="hover:bg-emerald-50/10 border-b border-zinc-100/80 transition-colors">
                                            <TableCell className="pl-3 py-1.5">
                                                <Link href={route('gratuity.show', r.employee_id)} className="font-bold text-emerald-700 hover:underline">
                                                    {r.employee_label}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-zinc-800 font-medium whitespace-nowrap">{r.service_end_date}</TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums text-zinc-600">{r.completed_years}</TableCell>
                                            <TableCell className="text-center py-1.5">
                                                <span className="inline-flex items-center rounded bg-emerald-50 px-1 py-0.2 font-mono text-[9px] font-bold text-emerald-800 border border-emerald-100">
                                                    {r.basic_multiplier}x
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right py-1.5 tabular-nums font-bold text-zinc-850">{formatTakaAmount(r.gratuity_amount, 2)}</TableCell>
                                            <TableCell className="py-1.5">
                                                <span className={cn(
                                                    "inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold border uppercase tracking-wide",
                                                    r.status === 'paid' && "bg-emerald-50 text-emerald-800 border-emerald-100",
                                                    r.status === 'approved' && "bg-emerald-50/50 text-emerald-750 border-emerald-100/80",
                                                    r.status === 'calculated' && "bg-zinc-50 text-zinc-650 border-zinc-200",
                                                    r.status === 'cancelled' && "bg-red-50 text-red-800 border-red-100"
                                                )}>
                                                    {r.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-zinc-500 pr-3 whitespace-nowrap">{r.payment_date || '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </StaffFundLayout>
    );
}
