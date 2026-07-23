import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Printer } from 'lucide-react';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    pin?: string | null;
    department?: { id: number; name: string } | null;
    designation?: { id: number; name: string } | null;
}

interface Movement {
    id: number;
    movement_type: 'official' | 'personal';
    from_datetime: string;
    to_datetime: string;
    destination: string;
    purpose: string;
    status: string;
    actual_return_datetime: string | null;
    employee: Employee;
}

type Props = {
    movements: Movement[];
    filterSummary: string;
    generatedAt: string;
};

function durationLabel(movement: Movement) {
    if (movement.status !== 'completed' || !movement.actual_return_datetime) return 'In progress';
    const fromTime = new Date(movement.from_datetime);
    const returnTime = new Date(movement.actual_return_datetime);
    const hours = differenceInHours(returnTime, fromTime);
    const minutes = differenceInMinutes(returnTime, fromTime) % 60;
    return `${hours}h ${minutes}m`;
}

export default function MovementPrint({ movements, filterSummary, generatedAt }: Props) {
    useEffect(() => {
        const timer = window.setTimeout(() => window.print(), 250);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title="Print Movement Register" />

            <style>{`
                @page {
                    size: A4 portrait;
                    margin: 10mm 8mm;
                }

                html, body {
                    background: #f8fafc;
                }

                @media print {
                    html, body {
                        background: #fff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        height: auto !important;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    [data-screen-root] {
                        display: none !important;
                    }

                    [data-print-root] {
                        position: static !important;
                        inset: auto !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        overflow: visible !important;
                        height: auto !important;
                    }

                    [data-print-page] {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-sizing: border-box;
                        overflow: visible !important;
                        height: auto !important;
                    }

                    .print-card {
                        border: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        height: auto !important;
                    }

                    table {
                        border-collapse: collapse !important;
                        width: 100% !important;
                        table-layout: fixed;
                        page-break-inside: auto;
                        break-inside: auto;
                    }

                    thead {
                        display: table-header-group;
                    }

                    tbody {
                        display: table-row-group;
                    }

                    tr {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    th, td {
                        border: 1px solid #d4d4d8 !important;
                        padding: 5px 6px !important;
                        vertical-align: top;
                        word-break: break-word;
                        overflow-wrap: anywhere;
                    }

                    th {
                        background: #f8fafc !important;
                        color: #111827 !important;
                    }

                    td, p, span, div {
                        color: #111827 !important;
                    }
                }
            `}</style>

            <div data-print-root className="mx-auto w-full max-w-[900px] px-3 py-5 print:mx-0 print:max-w-none print:px-0 print:py-0 sm:px-4 md:px-6">
                <div data-screen-root className="mb-4 flex items-center justify-between gap-3 print:hidden">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Movement Register Print</h1>
                        <p className="text-xs text-slate-500">Filtered movement list in A4 portrait format.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                            <Link href={route('movements.index')}>
                                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                                Back
                            </Link>
                        </Button>
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.print()}>
                            <Printer className="mr-1.5 h-3.5 w-3.5" />
                            Print
                        </Button>
                    </div>
                </div>

                <div data-print-page className="print-card rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="mb-4 flex items-end justify-between border-b-2 border-slate-950 pb-2.5">
                        <div>
                            <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4 text-slate-900" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                                    HRM System
                                </span>
                            </div>
                            <h1 className="mt-0.5 text-base font-black uppercase tracking-tight text-slate-950">
                                Movement Register
                            </h1>
                            <p className="text-[10px] font-medium text-slate-500">
                                Employee movement listing for office out and return tracking
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-800">
                                Generated:{' '}
                                <span className="font-extrabold text-slate-950">
                                    {format(new Date(generatedAt), 'dd MMM yyyy, hh:mm a')}
                                </span>
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-500">{filterSummary || 'All movements'}</div>
                        </div>
                    </div>

                    <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                        <span className="font-semibold text-slate-800">Total records:</span> {movements.length}
                    </div>

                    <div>
                        <table className="w-full text-[10px]">
                            <thead>
                                <tr>
                                    <th className="text-left">PIN</th>
                                    <th className="text-left">Employee</th>
                                    <th className="text-left">Type</th>
                                    <th className="text-left">From</th>
                                    <th className="text-left">Return</th>
                                    <th className="text-left">Destination</th>
                                    <th className="text-left">Status</th>
                                    <th className="text-left">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.length > 0 ? (
                                    movements.map((movement) => (
                                        <tr key={movement.id}>
                                            <td className="font-mono">{movement.employee.pin || movement.employee.employee_id || '—'}</td>
                                            <td>
                                                <div className="font-semibold">{employeeDisplayName(movement.employee)}</div>
                                                <div className="text-[9px] text-slate-500">
                                                    {movement.employee.department?.name || 'No Department'} •{' '}
                                                    {movement.employee.designation?.name || 'No Designation'}
                                                </div>
                                            </td>
                                            <td className="capitalize">{movement.movement_type}</td>
                                            <td>{format(new Date(movement.from_datetime), 'dd MMM yyyy HH:mm')}</td>
                                            <td>
                                                {movement.status === 'completed' && movement.actual_return_datetime
                                                    ? format(new Date(movement.actual_return_datetime), 'dd MMM yyyy HH:mm')
                                                    : format(new Date(movement.to_datetime), 'dd MMM yyyy HH:mm')}
                                            </td>
                                            <td>{movement.destination}</td>
                                            <td className="capitalize">{movement.status}</td>
                                            <td>{durationLabel(movement)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="text-center">
                                            No movement requests found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
