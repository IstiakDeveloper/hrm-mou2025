import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatSmartNumber, formatSmartKm } from '@/lib/format-smart-number';
import { PayrollReportDocumentHeader } from '@/components/payroll/PayrollReportDocumentHeader';

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    pin?: string | null;
    department?: { id: number; name: string } | null;
    designation?: { id: number; name: string } | null;
    branch?: { id: number; name: string } | null;
}

interface LogBook {
    id: number;
    date: string;
    start_time: string;
    start_place: string;
    start_meter_reading: string | number;
    destination: string | null;
    purpose: string;
    return_time: string;
    end_meter_reading: string | number;
    distance_km: string | number;
    personal_km: string | number | null;
    official_km: string | number;
    payment_status: 'unpaid' | 'paid';
    log_book_payment_id?: number | null;
    employee: Employee;
}

interface SingleEmployeeSummary extends EmployeeNameFields {
    id: number;
    employee_id?: string | null;
    pin?: string | null;
    department?: { id: number; name: string } | null;
    designation?: { id: number; name: string } | null;
    branch?: { id: number; name: string; branch_code?: string | null } | null;
}

type Props = {
    logBooks: LogBook[];
    filterSummary: string;
    generatedAt: string;
    companyName?: string;
    companyAddress?: string;
    singleEmployee?: SingleEmployeeSummary | null;
};

function paymentLabel(lb: LogBook): string {
    if (lb.payment_status === 'paid') return 'Paid';
    if (lb.log_book_payment_id) return 'In Payment';
    return 'Unpaid';
}

export default function LogBookPrint({ logBooks, filterSummary, generatedAt, companyName, companyAddress, singleEmployee }: Props) {
    const showEmployeeColumn = !singleEmployee;
    const totals = logBooks.reduce(
        (acc, lb) => ({
            totalKm: acc.totalKm + Number(lb.distance_km || 0),
            personalKm: acc.personalKm + Number(lb.personal_km || 0),
            officialKm: acc.officialKm + Number(lb.official_km || 0),
        }),
        { totalKm: 0, personalKm: 0, officialKm: 0 },
    );

    useEffect(() => {
        const tryPrint = () => {
            const splash = document.querySelector('[aria-busy="true"][role="status"]');
            if (splash) {
                const timer = window.setTimeout(tryPrint, 200);
                return () => window.clearTimeout(timer);
            }
            window.print();
        };
        const timer = window.setTimeout(tryPrint, 600);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title="Print Log Book Register" />

            <style>{`
                @page {
                    size: A4 landscape;
                    margin: 8mm 6mm;
                }
                html, body { background: #f8fafc; }
                @media print {
                    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; height: auto !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    [data-screen-root] { display: none !important; }
                    [data-print-root] { display: block !important; padding: 0 !important; margin: 0 !important; }
                    .print-table { page-break-inside: auto; }
                    .print-table tr { page-break-inside: avoid; page-break-after: auto; }
                    table { border-collapse: collapse !important; width: 100% !important; }
                    thead { display: table-header-group; }
                    th, td { border: 1px solid #d4d4d8 !important; padding: 4px 5px !important; vertical-align: top; word-break: break-word; }
                    th { background: #f8fafc !important; color: #111827 !important; }
                    td, p, span, div { color: #111827 !important; }
                }
            `}</style>

            <div data-screen-root="" className="mx-auto max-w-6xl px-4 py-6 print:hidden">
                <div className="mb-4 flex items-center gap-3">
                    <Link href={route('movement-log-books.index')}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <Button size="sm" onClick={() => window.print()}>
                        <Printer className="mr-1 h-4 w-4" />
                        Print
                    </Button>
                </div>
            </div>

            <div data-print-root="" className="mx-auto max-w-[1200px] px-4 py-2 print:max-w-none print:px-0">
                <PayrollReportDocumentHeader
                    companyName={companyName}
                    companyAddress={companyAddress}
                    title="Log Book Register"
                />

                <div className="mb-3 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                    <div>
                        <span className="font-semibold text-slate-800">Total entries:</span> {logBooks.length}
                        {filterSummary && filterSummary !== 'All entries' && (
                            <span className="ml-3 text-slate-500">({filterSummary})</span>
                        )}
                    </div>
                    <div className="text-[9px] text-slate-500">
                        Generated: {format(new Date(generatedAt), 'dd MMM yyyy, hh:mm a')}
                    </div>
                </div>

                {singleEmployee && (
                    <div className="mb-3 rounded-lg border border-slate-300 bg-slate-50/60 p-2.5 print:border-slate-400 print:bg-transparent">
                        <div className="mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1 text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                            <span>Employee Information</span>
                            <span className="text-[9px] font-semibold text-slate-600">Movement Log Book Scoped Report</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-[10px] text-slate-800">
                            <div>
                                <span className="block text-[9px] font-medium text-slate-500 uppercase">Employee Name</span>
                                <span className="font-bold text-slate-900">{employeeDisplayName(singleEmployee)}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-medium text-slate-500 uppercase">PIN / ID</span>
                                <span className="font-mono font-medium">{singleEmployee.pin || singleEmployee.employee_id || '—'}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-medium text-slate-500 uppercase">Branch</span>
                                <span className="font-medium">{singleEmployee.branch?.name || '—'}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-medium text-slate-500 uppercase">Department</span>
                                <span className="font-medium">{singleEmployee.department?.name || '—'}</span>
                            </div>
                            <div>
                                <span className="block text-[9px] font-medium text-slate-500 uppercase">Designation</span>
                                <span className="font-medium">{singleEmployee.designation?.name || '—'}</span>
                            </div>
                        </div>
                    </div>
                )}

                <table className="print-table w-full border-collapse text-[10px]">
                    <thead>
                        <tr className="border-b border-gray-300 bg-gray-50">
                            <th className="p-1.5 text-left font-semibold">Date</th>
                            {showEmployeeColumn && <th className="p-1.5 text-left font-semibold">PIN</th>}
                            {showEmployeeColumn && <th className="p-1.5 text-left font-semibold">Employee</th>}
                            {showEmployeeColumn && <th className="p-1.5 text-left font-semibold">Branch</th>}
                            <th className="p-1.5 text-left font-semibold">Start Place</th>
                            <th className="p-1.5 text-left font-semibold">Destination</th>
                            <th className="p-1.5 text-left font-semibold">Purpose</th>
                            <th className="p-1.5 text-right font-semibold">Start Meter</th>
                            <th className="p-1.5 text-right font-semibold">End Meter</th>
                            <th className="p-1.5 text-right font-semibold">Total</th>
                            <th className="p-1.5 text-right font-semibold">Personal</th>
                            <th className="p-1.5 text-right font-semibold">Official</th>
                            <th className="p-1.5 text-left font-semibold">Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logBooks.map((lb) => (
                            <tr key={lb.id} className="border-b border-gray-200">
                                <td className="whitespace-nowrap p-1.5">{format(new Date(lb.date), 'dd/MM/yy')}</td>
                                {showEmployeeColumn && <td className="whitespace-nowrap p-1.5 font-mono">{lb.employee.pin || lb.employee.employee_id}</td>}
                                {showEmployeeColumn && <td className="p-1.5">{employeeDisplayName(lb.employee)}</td>}
                                {showEmployeeColumn && <td className="p-1.5">{lb.employee.branch?.name || '—'}</td>}
                                <td className="max-w-[80px] truncate p-1.5">{lb.start_place}</td>
                                <td className="max-w-[80px] truncate p-1.5">{lb.destination || '—'}</td>
                                <td className="max-w-[100px] truncate p-1.5">{lb.purpose}</td>
                                <td className="whitespace-nowrap p-1.5 text-right font-mono">{formatSmartNumber(lb.start_meter_reading)}</td>
                                <td className="whitespace-nowrap p-1.5 text-right font-mono">{formatSmartNumber(lb.end_meter_reading)}</td>
                                <td className="whitespace-nowrap p-1.5 text-right">{formatSmartKm(lb.distance_km)}</td>
                                <td className="whitespace-nowrap p-1.5 text-right">
                                    {lb.personal_km != null && Number(lb.personal_km) > 0 ? formatSmartKm(lb.personal_km) : '—'}
                                </td>
                                <td className="whitespace-nowrap p-1.5 text-right font-semibold">{formatSmartKm(lb.official_km)}</td>
                                <td className="whitespace-nowrap p-1.5">{paymentLabel(lb)}</td>
                            </tr>
                        ))}
                        {logBooks.length > 0 && (
                            <tr className="bg-gray-50 font-bold border-t-2 border-slate-400">
                                <td colSpan={showEmployeeColumn ? 9 : 6} className="p-1.5 text-right uppercase tracking-wider text-[9px] text-slate-700">Total</td>
                                <td className="whitespace-nowrap p-1.5 text-right font-mono">{formatSmartKm(totals.totalKm)}</td>
                                <td className="whitespace-nowrap p-1.5 text-right font-mono">{formatSmartKm(totals.personalKm)}</td>
                                <td className="whitespace-nowrap p-1.5 text-right font-mono text-emerald-800">{formatSmartKm(totals.officialKm)}</td>
                                <td className="p-1.5" />
                            </tr>
                        )}
                        {logBooks.length === 0 && (
                            <tr>
                                <td colSpan={showEmployeeColumn ? 13 : 10} className="p-4 text-center text-gray-400">
                                    No log book entries found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
