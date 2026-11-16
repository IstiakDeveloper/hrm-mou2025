import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { hasAppPermission } from '@/lib/permissions';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

type Member = {
    id: number;
    member_type: string;
    branch: string | null;
    employee_name: string | null;
    project: string | null;
    department: string | null;
    designation: string | null;
};

type Committee = {
    id: number;
    committee_name: string;
    establishment_date: string | null;
    total_member: number;
    is_active: boolean;
    inactive_date: string | null;
    members: Member[];
};

export default function LoanCommitteesIndex({ committees }: { committees: Committee[] }) {
    const { auth } = usePage<SharedData>().props;
    const canCreate = hasAppPermission(auth, 'payroll.create');
    const canEdit = hasAppPermission(auth, 'payroll.edit');
    const canDelete = hasAppPermission(auth, 'employee-loan.delete');
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    return (
        <EmployeeLoanLayout title="Loan committee" activeTab="committees" description="Manage loan approval committees and their members.">
            <div className="mb-4 flex justify-end">
                {canCreate && (
                    <Link href={employeeLoanPath(route('loan-committees.create'))}>
                        <Button size="sm" className="h-9 bg-emerald-600 text-xs hover:bg-emerald-700">
                            <Plus className="mr-1.5 h-4 w-4" />
                            New committee
                        </Button>
                    </Link>
                )}
            </div>

            <Card className="border-zinc-200/90 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                                <TableHead className="w-10" />
                                <TableHead className="text-xs font-semibold">#</TableHead>
                                <TableHead className="text-xs font-semibold">Committee name</TableHead>
                                <TableHead className="text-xs font-semibold">Establishment</TableHead>
                                <TableHead className="text-xs font-semibold text-center">Members</TableHead>
                                <TableHead className="text-xs font-semibold">Status</TableHead>
                                <TableHead className="text-xs font-semibold">Inactive date</TableHead>
                                <TableHead className="w-20 text-xs font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {committees.map((c, idx) => (
                                <React.Fragment key={c.id}>
                                    <TableRow>
                                        <TableCell>
                                            <button
                                                type="button"
                                                className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100"
                                                onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}
                                            >
                                                {expanded[c.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </button>
                                        </TableCell>
                                        <TableCell className="text-xs text-zinc-600">{idx + 1}</TableCell>
                                        <TableCell className="text-sm font-medium text-zinc-900">{c.committee_name}</TableCell>
                                        <TableCell className="text-xs text-zinc-600">{c.establishment_date}</TableCell>
                                        <TableCell className="text-center text-xs">{c.total_member}</TableCell>
                                        <TableCell>
                                            {c.is_active ? (
                                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                                    <Check className="mr-1 h-3 w-3" /> Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-zinc-500">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-zinc-600">{c.inactive_date || '—'}</TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                {canEdit && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                        <Link href={employeeLoanPath(route('loan-committees.edit', c.id))}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-rose-600 hover:text-rose-700"
                                                        onClick={() => confirm('Delete this committee?') && router.delete(route('loan-committees.destroy', c.id))}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {expanded[c.id] && (
                                        <TableRow className="bg-zinc-50/30 hover:bg-zinc-50/30">
                                            <TableCell />
                                            <TableCell colSpan={7} className="p-0">
                                                <div className="border-t border-zinc-100 px-4 py-3">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent">
                                                                {['Type', 'Branch', 'Employee', 'Project', 'Department', 'Designation'].map((h) => (
                                                                    <TableHead key={h} className="h-8 text-[11px] font-semibold text-zinc-600">{h}</TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {c.members.map((m) => (
                                                                <TableRow key={m.id}>
                                                                    <TableCell className="text-xs uppercase">{m.member_type}</TableCell>
                                                                    <TableCell className="text-xs">{m.branch || '—'}</TableCell>
                                                                    <TableCell className="text-xs">{m.employee_name || '—'}</TableCell>
                                                                    <TableCell className="text-xs">{m.project || '—'}</TableCell>
                                                                    <TableCell className="text-xs">{m.department || '—'}</TableCell>
                                                                    <TableCell className="text-xs">{m.designation || '—'}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </EmployeeLoanLayout>
    );
}
