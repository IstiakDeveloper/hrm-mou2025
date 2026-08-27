import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { PayrollReportDocumentHeader } from '@/components/payroll/PayrollReportDocumentHeader';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { formatSmartKm, formatSmartNumber } from '@/lib/format-smart-number';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';

interface Employee extends EmployeeNameFields {
    pin?: string | null;
    employee_id: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    branch?: { name: string } | null;
}

interface Payment {
    id: number;
    voucher_no: string | null;
    period_year: number;
    period_month: number;
    rate_per_km: string | number;
    total_amount: string | number;
    status?: 'pending' | 'recommended' | 'approved' | 'rejected';
    needs_recommendation?: boolean;
    employee: Employee;
    approver?: { name: string } | null;
    recommender?: { name: string } | null;
    processor?: { name: string } | null;
    approved_at?: string | null;
    recommended_at?: string | null;
    processed_at?: string | null;
}

interface KmSummary {
    entry_count: number;
    total_km: number;
    personal_km: number;
    official_km: number;
}

type Props = {
    payment: Payment;
    displayVoucherNo?: string;
    kmSummary: KmSummary;
    companyName?: string;
    companyAddress?: string;
    generatedAt: string;
};

export default function LogBookPaymentVoucher({ payment, displayVoucherNo, kmSummary, companyName, companyAddress, generatedAt }: Props) {
    const monthLabel = format(new Date(payment.period_year, payment.period_month - 1, 1), 'MMMM yyyy');
    const isPending = payment.status === 'pending';
    const isRecommended = payment.status === 'recommended';
    const stampLabel = isPending ? 'PENDING' : isRecommended ? 'RECOMMENDED' : 'APPROVED';
    const stampDate = isPending
        ? (payment.processed_at ? format(new Date(payment.processed_at), 'dd MMM yyyy') : '')
        : isRecommended
            ? (payment.recommended_at ? format(new Date(payment.recommended_at), 'dd MMM yyyy') : (payment.processed_at ? format(new Date(payment.processed_at), 'dd MMM yyyy') : ''))
            : (payment.approved_at ? format(new Date(payment.approved_at), 'dd MMM yyyy') : '');
    const voucherNo = displayVoucherNo || payment.voucher_no || '—';

    useEffect(() => {
        const tryPrint = () => {
            const splash = document.querySelector('[aria-busy="true"][role="status"]');
            if (splash) {
                window.setTimeout(tryPrint, 200);
                return;
            }
            window.print();
        };
        const timer = window.setTimeout(tryPrint, 600);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title={`${isPending ? 'Pending Voucher' : isRecommended ? 'Recommended Voucher' : 'Voucher'} ${voucherNo}`} />

            <style>{`
                @page { size: A4 portrait; margin: 12mm; }
                html, body { background: #f1f5f9; }
                @media print {
                    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    [data-screen-root] { display: none !important; }
                    [data-print-root] { display: block !important; padding: 0 !important; margin: 0 !important; }
                    .voucher-page { border: none !important; box-shadow: none !important; }
                }

                .voucher-page {
                    position: relative;
                    overflow: hidden;
                    background: #fff;
                }

                /* Faint background text — never covers content */
                .approved-bg-text {
                    position: absolute;
                    top: 48%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-28deg);
                    font-size: 72px;
                    font-weight: 800;
                    letter-spacing: 0.18em;
                    color: #16a34a;
                    opacity: 0.045;
                    pointer-events: none;
                    user-select: none;
                    z-index: 0;
                    white-space: nowrap;
                }
                .voucher-page.is-pending .approved-bg-text { color: #d97706; opacity: 0.07; }
                .voucher-page.is-recommended .approved-bg-text { color: #0284c7; opacity: 0.07; }

                /* Corner stamp — clear of main data */
                .approved-stamp {
                    position: absolute;
                    top: 72px;
                    right: 18px;
                    z-index: 2;
                    pointer-events: none;
                    transform: rotate(12deg);
                }
                .approved-stamp-inner {
                    width: 92px;
                    height: 92px;
                    border: 2.5px solid #16a34a;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #16a34a;
                    background: rgba(255, 255, 255, 0.85);
                    box-shadow: inset 0 0 0 1px rgba(22, 163, 74, 0.35);
                    text-align: center;
                    line-height: 1.1;
                }
                .voucher-page.is-pending .approved-stamp-inner {
                    border-color: #d97706;
                    color: #d97706;
                    box-shadow: inset 0 0 0 1px rgba(217, 119, 6, 0.35);
                }
                .voucher-page.is-recommended .approved-stamp-inner {
                    border-color: #0284c7;
                    color: #0284c7;
                    box-shadow: inset 0 0 0 1px rgba(2, 132, 199, 0.35);
                }
                .approved-stamp-inner .mark { font-size: 18px; font-weight: 700; }
                .approved-stamp-inner .label {
                    margin-top: 2px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                }
                .approved-stamp-inner .date {
                    margin-top: 3px;
                    font-size: 8px;
                    font-weight: 600;
                    opacity: 0.9;
                }

                .voucher-content { position: relative; z-index: 1; }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0;
                    border: 1px solid #cbd5e1;
                }
                .info-cell {
                    padding: 8px 12px;
                    border-bottom: 1px solid #e2e8f0;
                    border-right: 1px solid #e2e8f0;
                    background: #fff;
                }
                .info-cell:nth-child(2n) { border-right: none; }
                .info-cell:nth-last-child(-n+2) { border-bottom: none; }
                .info-label {
                    display: block;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: #64748b;
                    margin-bottom: 2px;
                }
                .info-value {
                    font-size: 13px;
                    font-weight: 600;
                    color: #0f172a;
                }

                .km-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                .km-table th,
                .km-table td {
                    border: 1px solid #cbd5e1;
                    padding: 9px 12px;
                    background: #fff;
                }
                .km-table th {
                    background: #f8fafc;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #475569;
                }
                .km-table .payable-row td {
                    background: #f0fdf4;
                    color: #166534;
                    font-weight: 600;
                }

                .amount-box {
                    border: 1px solid #86efac;
                    background: #f0fdf4;
                    padding: 12px 14px;
                }
            `}</style>

            <div data-screen-root className="mx-auto max-w-3xl px-4 py-6 print:hidden">
                <div className="mb-4 flex items-center gap-3">
                    <Link href={route('movement-log-book-payments.show', payment.id)}>
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

            <div data-print-root className="mx-auto max-w-[210mm] px-4 py-4 print:max-w-none print:px-0">
                <div className={`voucher-page rounded-lg border border-slate-200 p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none${isPending ? ' is-pending' : ''}${isRecommended ? ' is-recommended' : ''}`}>
                    <div className="approved-bg-text" aria-hidden>{stampLabel}</div>

                    <div className="approved-stamp" aria-hidden>
                        <div className="approved-stamp-inner">
                            <span className="mark">{isPending ? '…' : isRecommended ? '✓' : '✓'}</span>
                            <span className="label">{stampLabel}</span>
                            {stampDate && <span className="date">{stampDate}</span>}
                        </div>
                    </div>

                    <div className="voucher-content">
                        <PayrollReportDocumentHeader
                            companyName={companyName}
                            companyAddress={companyAddress}
                            title={isPending ? 'Log Book Payment Voucher (Pending)' : isRecommended ? 'Log Book Payment Voucher (Recommended)' : 'Log Book Payment Voucher'}
                        />

                        <div className="mb-4 flex items-center justify-between border-b border-slate-300 pb-2">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-500">Voucher No</p>
                                <p className="font-mono text-sm font-bold text-slate-900">{voucherNo}</p>
                                {isPending && <p className="text-[10px] text-amber-700">Draft — assigned on approval</p>}
                                {isRecommended && <p className="text-[10px] text-sky-700">Recommended — assigned on approval</p>}
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase tracking-wide text-slate-500">Payment Month</p>
                                <p className="text-sm font-bold text-slate-900">{monthLabel}</p>
                            </div>
                        </div>

                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employee Details</p>
                        <div className="info-grid mb-4">
                            <div className="info-cell">
                                <span className="info-label">Employee</span>
                                <span className="info-value">{employeeDisplayName(payment.employee)}</span>
                            </div>
                            <div className="info-cell">
                                <span className="info-label">PIN</span>
                                <span className="info-value font-mono">{payment.employee.pin || payment.employee.employee_id}</span>
                            </div>
                            <div className="info-cell">
                                <span className="info-label">Branch</span>
                                <span className="info-value">{payment.employee.branch?.name || '—'}</span>
                            </div>
                            <div className="info-cell">
                                <span className="info-label">Department</span>
                                <span className="info-value">{payment.employee.department?.name || '—'}</span>
                            </div>
                            <div className="info-cell">
                                <span className="info-label">Designation</span>
                                <span className="info-value">{payment.employee.designation?.name || '—'}</span>
                            </div>
                            <div className="info-cell">
                                <span className="info-label">Total Entries</span>
                                <span className="info-value">{kmSummary.entry_count}</span>
                            </div>
                        </div>

                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Distance Summary</p>
                        <table className="km-table mb-4">
                            <thead>
                                <tr>
                                    <th className="text-left">Description</th>
                                    <th className="text-right">Distance</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Total KM</td>
                                    <td className="text-right font-mono">{formatSmartKm(kmSummary.total_km)}</td>
                                </tr>
                                <tr>
                                    <td>Personal KM</td>
                                    <td className="text-right font-mono">{formatSmartKm(kmSummary.personal_km)}</td>
                                </tr>
                                <tr className="payable-row">
                                    <td>Official KM (Payable)</td>
                                    <td className="text-right font-mono">{formatSmartKm(kmSummary.official_km)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="amount-box mb-8">
                            <div className="flex items-center justify-between text-sm text-slate-700">
                                <span>Rate per KM</span>
                                <strong>৳{formatSmartNumber(payment.rate_per_km)}</strong>
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-emerald-200 pt-2">
                                <span className="text-sm font-semibold text-slate-900">Total Payable Amount</span>
                                <strong className="text-xl font-bold text-emerald-700">৳{formatSmartNumber(payment.total_amount)}</strong>
                            </div>
                        </div>

                        <div className="mt-12 grid grid-cols-3 gap-8 text-sm">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-500">Processed by</p>
                                <div className="mt-12 border-t border-slate-400 pt-1">
                                    <p className="font-medium text-slate-900">{payment.processor?.name || '—'}</p>
                                    {payment.processed_at && (
                                        <p className="text-xs text-slate-500">{format(new Date(payment.processed_at), 'dd MMM yyyy')}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-500">Recommended by</p>
                                <div className="mt-12 border-t border-slate-400 pt-1">
                                    <p className="font-medium text-slate-900">
                                        {payment.recommender?.name
                                            || (payment.needs_recommendation === false ? 'Not required' : (isPending ? 'Awaiting recommendation' : '—'))}
                                    </p>
                                    {payment.recommended_at && (
                                        <p className="text-xs text-slate-500">{format(new Date(payment.recommended_at), 'dd MMM yyyy')}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-slate-500">Approved by</p>
                                <div className="mt-12 border-t border-slate-400 pt-1">
                                    <p className="font-medium text-slate-900">
                                        {payment.status === 'approved' ? (payment.approver?.name || '—') : 'Awaiting approval'}
                                    </p>
                                    {payment.approved_at && (
                                        <p className="text-xs text-slate-500">{format(new Date(payment.approved_at), 'dd MMM yyyy')}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <p className="mt-6 text-right text-[10px] text-slate-400">
                            Generated {format(new Date(generatedAt), 'dd MMM yyyy, hh:mm a')}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
