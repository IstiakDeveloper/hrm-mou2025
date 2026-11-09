import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type Named = { id: number; name: string };
type User = { id: number; name: string };
type Employee = EmployeeNameFields & {
    id: number;
    employee_id: string;
};

type Redesignation = {
    id: number;
    effective_date: string;
    order_no: string | null;
    reason: string | null;
    employee: Employee;
    fromDepartment?: Named | null;
    toDepartment?: Named | null;
    fromDesignation?: Named | null;
    toDesignation?: Named | null;
    from_department?: Named | null;
    to_department?: Named | null;
    from_designation?: Named | null;
    to_designation?: Named | null;
    creator?: User | null;
};

type Props = {
    redesignation: Redesignation;
    canEdit: boolean;
};

function nameOf(value: Named | null | undefined): string {
    return value?.name?.trim() ? value.name : '—';
}

export default function RedesignationShow({ redesignation, canEdit }: Props) {
    const fromDepartment = redesignation.fromDepartment ?? redesignation.from_department;
    const toDepartment = redesignation.toDepartment ?? redesignation.to_department;
    const fromDesignation = redesignation.fromDesignation ?? redesignation.from_designation;
    const toDesignation = redesignation.toDesignation ?? redesignation.to_designation;
    const effective = new Date(redesignation.effective_date);

    return (
        <Layout>
            <Head title="Re Designation details" />
            <PageSurface className="max-w-5xl bg-zinc-50/40 py-5 md:py-6">
                <div className="mb-5">
                    <Link href={route('redesignations.index')} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Re Designation
                    </Link>
                </div>

                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900 md:text-lg">Re designation</h1>
                        <p className="mt-1 text-xs text-zinc-600">
                            {employeeDisplayName(redesignation.employee)} · {redesignation.employee.employee_id}
                        </p>
                    </div>
                    {canEdit && (
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                            <Link href={route('redesignations.edit', redesignation.id)}>
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                Edit
                            </Link>
                        </Button>
                    )}
                </div>

                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Department and designation</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">
                            Effective on {format(effective, 'dd MMM yyyy')}
                            {redesignation.order_no ? ` · Order ${redesignation.order_no}` : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
                        <div className="rounded-lg border border-zinc-200 bg-white p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">From</p>
                            <p className="mt-2 text-xs text-zinc-900">
                                <span className="font-medium">Department:</span> {nameOf(fromDepartment)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-900">
                                <span className="font-medium">Designation:</span> {nameOf(fromDesignation)}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">To</p>
                            <p className="mt-2 text-xs text-zinc-900">
                                <span className="font-medium">Department:</span> {nameOf(toDepartment)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-900">
                                <span className="font-medium">Designation:</span> {nameOf(toDesignation)}
                            </p>
                        </div>
                        {redesignation.reason && (
                            <div className="md:col-span-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Reason</p>
                                <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-800">{redesignation.reason}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
