import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Phone, MapPin, Calendar, Briefcase, Building, User,
    AlertTriangle, Pencil, FileText, Clock, CheckCircle, AlertCircle,
    XCircle, Timer, CalendarIcon, GraduationCap, Users, Shield,
    CreditCard, Award, HeartHandshake, FolderOpen, Activity, ShieldCheck,
    Download, ExternalLink, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { employeeDisplayName, employeeInitials, type EmployeeNameFields } from '@/lib/employee-name';
import { formatEmployeeDocumentTypeLabel } from '@/lib/employee-v2-form-persist';
import { formatTakaWithSymbol } from '@/lib/taka-format';

interface Department { id: number; name: string; }
interface Designation { id: number; name: string; }
interface Branch { id: number; name: string; }
interface Manager extends EmployeeNameFields { id: number; employee_id: string; pin?: string; }

interface LeaveType { id: number; name: string; days_allowed: number; is_paid: boolean; description: string | null; carry_forward: boolean; }
interface LeaveBalance { id: number; employee_id: number; leave_type_id: number; year: number; allocated_days: number; used_days: number; remaining_days: number; leave_type: LeaveType; }
interface LeaveApplication { id: number; employee_id: number; leave_type_id: number; start_date: string; end_date: string; days: number; reason: string | null; status: 'pending' | 'approved' | 'rejected'; approved_by: number | null; applied_at: string; documents: string[] | null; rejection_reason: string | null; leave_type: LeaveType; created_at: string; }
interface Movement { id: number; employee_id: number; movement_type: 'official' | 'personal'; from_datetime: string; actual_return_datetime: string; purpose: string; destination: string | null; remarks: string | null; approved_by: number | null; status: 'pending' | 'approved' | 'rejected' | 'completed'; created_at: string; }

type TransferHistory = {
    id: number;
    transfer_id: number;
    employee_id: number;
    transfer_date: string;
    fromBranch: { id: number; name: string } | null;
    toBranch: { id: number; name: string } | null;
    transfer: { id: number; transfer_order_no: string | null; effective_date: string; status: string } | null;
};

type PromotionHistory = {
    id: number;
    promotion_id: number;
    employee_id: number;
    promotion_date: string;
    fromDesignation: { id: number; name: string } | null;
    toDesignation: { id: number; name: string } | null;
    fromSalaryGrade: { id: number; name: string } | null;
    toSalaryGrade: { id: number; name: string } | null;
    from_basic_salary: string | number | null;
    to_basic_salary: string | number | null;
    promotion: { id: number; promotion_order_no: string | null; effective_date: string; status: string } | null;
};

type DemotionHistory = {
    id: number;
    demotion_id: number;
    employee_id: number;
    demotion_date: string;
    fromDesignation: { id: number; name: string } | null;
    toDesignation: { id: number; name: string } | null;
    fromSalaryGrade: { id: number; name: string } | null;
    toSalaryGrade: { id: number; name: string } | null;
    from_basic_salary: string | number | null;
    to_basic_salary: string | number | null;
    demotion: { id: number; demotion_order_no: string | null; effective_date: string; status: string } | null;
};

type Address = { type: 'present' | 'permanent'; division: string; district: string; upazila: string; union: string; village: string; address_details: string; };
type Education = { degree: string; institute: string; group_name: string; board: string; subject: string; result_type: string; result_value: string; };
type Nominee = Record<string, string | number | null | undefined> & { name: string; relation?: string; date_of_birth?: string; share?: string | number; share_percentage?: string | number; contact?: string; mobile?: string; };
type Guarantor = Record<string, string | number | null | undefined> & { name: string; age?: string | number; occupation?: string; profession?: string; relation?: string; phone?: string; mobile?: string; email?: string; father_name?: string; address?: string; organization?: string; designation?: string; nid?: string; };
type Cheque = { bank_name?: string; branch_name?: string; cheque_no?: string; qty?: string | number; notes?: string; };
type Asset = Record<string, string | number | null | undefined> & { serial?: string | number; serial_no?: string; asset_no?: string; name?: string; asset_name?: string; details?: string; asset_details?: string; provided_quality?: string; provided_qty?: string | number; asset_price?: string | number; };
type Experience = { organization: string; from_date: string; to_date: string; designation: string; department: string; address: string; responsibility?: string; };
type Training = { training_title: string; institute: string; address: string; duration: string; remarks: string; };
type EmployeeDocumentRow = { id: number; document_type: string; title: string; description: string | null; expiry_date: string | null; file_path: string; created_at?: string; };

interface NamedEntity { id: number; name: string; }
interface EmployeeType extends NamedEntity { probation_months: number; }

function pickRowField(row: Record<string, unknown> | undefined, ...keys: string[]): string {
    if (!row) return '';
    for (const key of keys) {
        const value = row[key];
        if (value != null && String(value).trim() !== '') return String(value);
    }
    return '';
}

function formatOptionalDate(value: string | null | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : format(d, 'PP');
}

function parseCertificateLevels(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function formatCurrency(value: string | number | null | undefined): string {
    if (value == null || value === '') return '';
    return formatTakaWithSymbol(value);
}

interface Employee extends EmployeeNameFields {
    id: number; employee_id: string; email: string; phone: string; gender: string; blood_group: string; date_of_birth: string; joining_date: string; confirmation_date?: string; address: string; photo: string | null; nid: string; nid_number?: string; smart_card_number?: string; birth_registration_number?: string; emergency_contact: string;
    employee_type?: EmployeeType | null;
    employeeType?: EmployeeType | null;
    department: Department; designation: Designation; branch: Branch; manager: Manager | null; status: string; resignation_date?: string; dropout_date?: string; dropout_reason?: string; cause_of_separation?: string; final_payment_date?: string; final_payment_amount?: string | number | null; last_promotion_date?: string; probation_period_days?: number | null; total_service_length_days?: number | null; service_length_from_confirmation_days?: number | null; staff_age_years?: number | null; length_of_service_on_last_promotion_days?: number | null; joining_designation_name?: string; last_designation_name?: string; last_branch_name?: string; pin?: string; name_en?: string; full_name_en?: string | null; name_bn?: string; email_id?: string;

    religion?: string; marital_status?: string; spouse_name?: string; spouse_mobile?: string; birth_date_certificate?: string; birth_date_original?: string;
    fathers_name?: string; fathers_mobile?: string; mothers_name?: string; mothers_mobile?: string;
    tin_certificate_no?: string; driving_license_no?: string; passport_no?: string;
    payscale?: { id: number; name: string }; salaryGrade?: { id: number; name: string }; salary_grade?: { id: number; name: string }; salaryStep?: { id: number; step_number: number }; salary_step?: { id: number; step_number: number };
    is_project_employee?: boolean; is_custodian?: boolean; identification_mark?: string;
    mobile_personal?: string; mobile_official?: string;
    addresses?: Address[]; educations?: Education[];
    bank?: { bank_name: string; branch_name: string; account_no: string; account_type: string; bank_address: string; remark: string; };
    nominees?: Nominee[]; guarantors?: Guarantor[]; guarantor_cheques?: Cheque[];
    collateral?: { has_certificate: boolean; certificate_levels: string[] | string; security_amount: string; collateral_interest: string; collateral_date: string; notes: string; };
    collateral_receive_cheques?: Cheque[]; assets?: Asset[]; experiences?: Experience[]; trainings?: Training[];
    documents?: EmployeeDocumentRow[];
    program?: NamedEntity | null;
    project?: NamedEntity | null;
    signature?: string | null;

    salary_grade_id?: number | string | null;
    basic_salary?: string;
}

export type JobHistoryTimelineItem = {
    id: string;
    event_type: 'joining' | 'confirmation' | 'transfer' | 'promotion' | 'demotion' | 'left' | 'final_payment';
    event_date: string;
    from_designation_name?: string | null;
    to_designation_name?: string | null;
    from_branch_name?: string | null;
    to_branch_name?: string | null;
    remarks?: string | null;
    cause_of_separation?: string | null;
    amount_received?: string | number | null;
    order_no?: string | null;
    transfer_id?: number | null;
    promotion_id?: number | null;
    demotion_id?: number | null;
    is_manual: boolean;
};

export type DisciplinaryActionItem = {
    id: number;
    action_type: string;
    action_date: string;
    details?: string | null;
};

interface EmployeeShowProps {
    employee: Employee;
    currentYearLeaveBalances: LeaveBalance[];
    recentLeaveApplications: LeaveApplication[];
    recentMovements: Movement[];
    transferHistories: TransferHistory[];
    promotionHistories: PromotionHistory[];
    demotionHistories: DemotionHistory[];
    jobHistoryTimeline?: JobHistoryTimelineItem[];
    upcomingEvents?: JobHistoryTimelineItem[];
    disciplinaryActions?: DisciplinaryActionItem[];
}

const getLeaveStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-rose-50 text-rose-800 border-rose-200', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
        <Badge variant="outline" className={`${config.color} border flex items-center text-[10px] py-0 px-1.5`}>
            {config.icon}
            <span className="capitalize">{status}</span>
        </Badge>
    );
};

const getMovementStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-rose-50 text-rose-800 border-rose-200', icon: <XCircle className="h-3 w-3 mr-1" /> },
        completed: { color: 'bg-teal-50 text-teal-800 border-teal-200', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
        <Badge variant="outline" className={`${config.color} border flex items-center text-[10px] py-0 px-1.5`}>
            {config.icon}
            <span className="capitalize">{status}</span>
        </Badge>
    );
};

const getDisciplinaryBadge = (type: string) => {
    let cls = 'bg-slate-100 text-slate-900 border-slate-300';
    if (type.includes('Warning')) cls = 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
    else if (type.includes('Show Cause')) cls = 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
    else if (type.includes('Explanation')) cls = 'bg-blue-100 text-blue-950 border-blue-300 font-bold';
    else if (type.includes('Suspension')) cls = 'bg-orange-100 text-orange-950 border-orange-300 font-bold';
    else if (type.includes('Deduction')) cls = 'bg-rose-100 text-rose-950 border-rose-300 font-bold';
    else if (type.includes('Fine')) cls = 'bg-purple-100 text-purple-950 border-purple-300 font-bold';
    else if (type.includes('Embezzlement') || type.includes('Irregularity')) cls = 'bg-red-100 text-red-950 border-red-400 font-black';

    return (
        <Badge variant="outline" className={`${cls} text-xs py-0.5 px-2 font-extrabold shadow-2xs`}>
            {type}
        </Badge>
    );
};

const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.toDateString() === end.toDateString()) return format(start, 'PP');
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
};

const formatDateTimeRange = (fromDatetime: string, toDatetime: string) => {
    const from = new Date(fromDatetime);
    const to = new Date(toDatetime);
    if (from.toDateString() === to.toDateString()) return `${format(from, 'PP')}, ${format(from, 'p')} - ${format(to, 'p')}`;
    return `${format(from, 'MMM dd p')} - ${format(to, 'MMM dd p')}`;
};

const calculateYmd = (startDate: string | null | undefined, endDate: string | null | undefined): string | null => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    let s = start;
    let e = end;
    if (s.getTime() > e.getTime()) {
        const tmp = s; s = e; e = tmp;
    }

    let years = e.getFullYear() - s.getFullYear();
    let months = e.getMonth() - s.getMonth();
    let days = e.getDate() - s.getDate();

    if (days < 0) {
        const prevMonthLastDay = new Date(e.getFullYear(), e.getMonth(), 0);
        days += prevMonthLastDay.getDate();
        months -= 1;
    }

    if (months < 0) {
        months += 12;
        years -= 1;
    }

    years = Math.max(0, years);
    months = Math.max(0, months);
    days = Math.max(0, days);

    return `${years}y, ${months}m, ${days}d`;
};

// High-contrast, highly legible DataItem component
const DataItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-200/70 last:border-b-0 text-xs gap-2">
        <span className="text-slate-700 font-semibold shrink-0">{label}</span>
        <span className="text-slate-950 font-bold text-right break-words max-w-[65%] truncate">
            {value || <span className="text-gray-400 font-normal italic">N/A</span>}
        </span>
    </div>
);

// High-contrast Section component with prominent headers
const Section = ({ title, icon, children, className = "" }: { title: string, icon?: React.ReactNode, children: React.ReactNode, className?: string }) => (
    <Card className={`border border-slate-200/90 shadow-2xs rounded-xl overflow-hidden ${className}`}>
        <CardHeader className="bg-slate-100/90 border-b border-slate-200 py-2.5 px-3.5">
            <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                {icon} {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 bg-white">
            {children}
        </CardContent>
    </Card>
);

const StatCard = ({ title, value, icon, subtitle }: { title: string, value: string, icon: React.ReactNode, subtitle: string }) => (
    <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
        <div className="p-1.5 bg-emerald-100/80 text-emerald-800 rounded-md shrink-0">
            {icon}
        </div>
        <div className="min-w-0">
            <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider leading-tight">{title}</h4>
            <div className="text-xs font-extrabold text-slate-950 truncate mt-0.5">{value}</div>
            <p className="text-[9px] text-slate-500 font-medium truncate leading-tight">{subtitle}</p>
        </div>
    </div>
);

export default function EmployeeShow({
    employee,
    currentYearLeaveBalances,
    recentLeaveApplications,
    recentMovements,
    transferHistories = [],
    promotionHistories = [],
    demotionHistories = [],
    jobHistoryTimeline = [],
    upcomingEvents = [],
    disciplinaryActions = [],
}: EmployeeShowProps) {
    const isDropout = !!(
        employee.dropout_date
        || employee.dropout_reason
        || employee.cause_of_separation
        || employee.final_payment_date
        || (employee.final_payment_amount != null && employee.final_payment_amount !== '')
    );

    const displayName = employeeDisplayName(employee, String(employee.pin || employee.employee_id || 'Employee'));

    const getInitials = (): string => {
        const fromName = employeeInitials(employee, '');
        if (fromName) return fromName;
        const id = String(employee.pin || employee.employee_id || '?').replace(/\s+/g, '');
        return id.length >= 2 ? id.slice(0, 2).toUpperCase() : (id.charAt(0) || '?').toUpperCase();
    };

    const serviceEndDate = employee.dropout_date || employee.resignation_date || format(new Date(), 'yyyy-MM-dd');
    const totalServiceYmd = calculateYmd(employee.joining_date, serviceEndDate);

    const confirmationServiceYmd = employee.confirmation_date ? calculateYmd(employee.confirmation_date, serviceEndDate) : 'Not Confirmed';

    let probationYmd = calculateYmd(employee.joining_date, employee.confirmation_date);
    const probMonths = employee.employee_type?.probation_months || employee.employeeType?.probation_months;
    if (!employee.confirmation_date && probMonths) {
        probationYmd = `${probMonths} Months`;
    }

    const durationFromLastPromotionYmd = employee.last_promotion_date ? calculateYmd(employee.last_promotion_date, serviceEndDate) : 'N/A (No Promo)';

    const getStatusBadge = () => {
        const statusColors = { active: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold', inactive: 'bg-gray-100 text-gray-800 border-gray-300 font-bold', on_leave: 'bg-teal-50 text-teal-800 border-teal-300 font-bold', terminated: 'bg-rose-50 text-rose-800 border-rose-300 font-bold', };
        const statusColor = statusColors[employee.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-300 font-bold';
        const statusLabel = (employee.status || 'unknown').replace(/_/g, ' ');
        return (
            <Badge className={`${statusColor} border shadow-none px-2 py-0.5 text-[10px] flex items-center w-fit`}>
                <span className="relative flex h-1.5 w-1.5 mr-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${employee.status === 'active' ? 'bg-emerald-500' : 'hidden'}`}></span>
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${employee.status === 'active' ? 'bg-emerald-600' : (employee.status === 'on_leave' ? 'bg-teal-600' : 'bg-gray-500')}`}></span>
                </span>
                {statusLabel ? statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1) : '—'}
            </Badge>
        );
    };

    const collateralCertificateLevels = useMemo(
        () => parseCertificateLevels(employee.collateral?.certificate_levels),
        [employee.collateral?.certificate_levels],
    );

    const handlePrintIdCard = () => {
        document.body.classList.add('print-id-card');
        setTimeout(() => {
            window.print();
            document.body.classList.remove('print-id-card');
        }, 100);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <Layout>
            <Head title={`Employee: ${displayName}`} />

            <style>{`
              @media print {
                html, body { background: #fff !important; }
                .no-print { display: none !important; }
                .print-only { display: block !important; }
                .container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
                
                header, nav, aside, footer, [data-sidebar="true"], .admin-sidebar, .admin-header { display: none !important; }
                main, #app, .flex-1 { padding: 0 !important; margin: 0 !important; overflow: visible !important; width: 100% !important; min-height: 0 !important; }
                
                body.print-id-card .cv-section { display: none !important; }
                body:not(.print-id-card) .id-card-section { display: none !important; }

                .a4-page-card {
                  break-after: page;
                  page-break-after: always;
                  break-inside: avoid;
                  page-break-inside: avoid;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin-bottom: 2rem !important;
                }
                
                body.print-id-card {
                    margin: 0;
                    padding: 0;
                    display: block;
                    background: transparent !important;
                }
                
                body.print-id-card > div {
                    display: block !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                body.print-id-card .id-card-section {
                    display: flex !important;
                    flex-direction: row;
                    gap: 10mm;
                    padding: 10mm;
                    justify-content: flex-start;
                    align-items: flex-start;
                }
              }
              @media screen {
                .print-only { display: none !important; }
                .id-card-section { display: none !important; }
              }
            `}</style>

            <div className="container mx-auto py-4 px-3 sm:px-4 max-w-5xl space-y-4 cv-section">

                {/* Back Button */}
                <Link href={route('employees.index')} className="no-print inline-flex items-center text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors">
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Directory
                </Link>

                {/* Compact Hero Header Card */}
                <div className="relative bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
                    <div className="h-20 bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 relative">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwbDhfOFpNOCAwTDBfOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')" }}></div>
                    </div>

                    <div className="px-4 pb-4 relative flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
                            <div className="-mt-10 md:-mt-11 shrink-0">
                                <Avatar className="h-20 w-20 md:h-24 md:w-24 border-3 border-white shadow-md bg-white">
                                    {employee.photo ? (
                                        <AvatarImage src={`/storage/${employee.photo}`} alt={displayName} className="object-cover" />
                                    ) : (
                                        <AvatarFallback className="text-2xl font-bold bg-emerald-50 text-emerald-800">
                                            {getInitials()}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                            </div>
                            <div className="space-y-1 pt-1 md:pt-2">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                    <h1 className="text-xl md:text-2xl font-black text-slate-950 leading-tight">{displayName}</h1>
                                    {employee.name_bn && <span className="text-xs text-slate-600 font-semibold">({employee.name_bn})</span>}
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-0.5 text-xs text-slate-800 font-bold">
                                    <span className="text-emerald-800 font-black">{employee.designation?.name || employee.last_designation_name || 'Designation N/A'}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-slate-800">{employee.department?.name || 'Department N/A'}</span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-slate-800">{employee.branch?.name || 'Branch N/A'}</span>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-0.5">
                                    {getStatusBadge()}
                                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 text-slate-900 border-slate-300 py-0 px-2 font-bold">PIN: {employee.pin || employee.employee_id || 'N/A'}</Badge>
                                    {employee.is_project_employee && <Badge variant="secondary" className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] py-0 px-1.5 font-bold">Project Staff</Badge>}
                                    {employee.is_custodian && <Badge variant="secondary" className="bg-sky-100 text-sky-900 border border-sky-300 text-[10px] py-0 px-1.5 font-bold">Custodian</Badge>}
                                </div>
                            </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex flex-wrap gap-1.5 justify-center md:justify-end no-print self-center md:self-start pt-1.5">
                            <Button variant="outline" size="sm" onClick={handlePrintIdCard} className="h-8 text-xs border-slate-300 text-slate-800 font-bold hover:bg-emerald-50 px-2.5">
                                <User className="w-3.5 h-3.5 mr-1 text-emerald-700" /> ID Card
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs border-slate-300 text-slate-800 font-bold hover:bg-gray-100 px-2.5">
                                <FileText className="w-3.5 h-3.5 mr-1 text-teal-700" /> Print Document
                            </Button>
                            <Link href={route('employees.edit', employee.id)}>
                                <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs px-3">
                                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Profile
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Service Statistics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <StatCard title="Probation Period" value={probationYmd || '—'} icon={<Timer className="w-3.5 h-3.5" />} subtitle="Joining to Confirmation" />
                    <StatCard title="Total Service Length" value={totalServiceYmd || '—'} icon={<Briefcase className="w-3.5 h-3.5" />} subtitle="Joining to Today" />
                    <StatCard title="Service from Confirmation" value={confirmationServiceYmd || '—'} icon={<CheckCircle className="w-3.5 h-3.5" />} subtitle="Confirmation to Today" />
                    <StatCard title="Duration from Last Promo" value={durationFromLastPromotionYmd || '—'} icon={<Activity className="w-3.5 h-3.5" />} subtitle="Last Promotion to Today" />
                </div>

                {/* Sticky Section Navigator */}
                <div className="sticky top-2 z-30 no-print my-2 bg-white/95 backdrop-blur-md rounded-lg border border-slate-300 shadow-2xs p-1 overflow-x-auto scrollbar-none flex items-center gap-1 min-w-max sm:min-w-0">
                    <button onClick={() => scrollToSection('sec-overview')} className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-800 hover:text-emerald-800 hover:bg-emerald-50 flex items-center gap-1 transition-colors shrink-0">
                        <User className="w-3 h-3 text-emerald-700" /> 1. Overview & Employment
                    </button>
                    <button onClick={() => scrollToSection('sec-career')} className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-800 hover:text-emerald-800 hover:bg-emerald-50 flex items-center gap-1 transition-colors shrink-0">
                        <Clock className="w-3 h-3 text-emerald-700" /> 2. Career History & Timeline
                    </button>
                    <button onClick={() => scrollToSection('sec-financial')} className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-800 hover:text-emerald-800 hover:bg-emerald-50 flex items-center gap-1 transition-colors shrink-0">
                        <CreditCard className="w-3 h-3 text-emerald-700" /> 3. Financial, Records & Edu
                    </button>
                    <button onClick={() => scrollToSection('sec-documents-leaves')} className="px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-800 hover:text-emerald-800 hover:bg-emerald-50 flex items-center gap-1 transition-colors shrink-0">
                        <FileText className="w-3 h-3 text-emerald-700" /> 4. Documents & Leaves
                    </button>
                </div>

                {/* CONTINUOUS CONSOLIDATED A4 DOCUMENT PAGES STACKED VERTICALLY */}
                <div className="space-y-6">

                    {/* SECTION 1: OVERVIEW & EMPLOYMENT DETAILS */}
                    <div id="sec-overview" className="a4-page-card bg-white rounded-xl border border-slate-300/90 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 space-y-4 scroll-mt-16">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                                <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-1.5">
                                    <User className="w-4 h-4 text-emerald-700" /> 1. Overview & Employment Profile
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                                Section 1 / 4
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Personal Details */}
                            <Section title="Basic Personal Information" icon={<User className="w-3.5 h-3.5 text-emerald-700" />}>
                                <div className="space-y-0.5">
                                    <DataItem label="Name (English)" value={displayName} />
                                    <DataItem label="Name (Bangla)" value={employee.name_bn} />
                                    <DataItem label="Gender" value={employee.gender} />
                                    <DataItem label="Blood Group" value={employee.blood_group} />
                                    <DataItem label="Religion" value={employee.religion} />
                                    <DataItem label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'PP') : ''} />
                                    <DataItem label="DOB (Original)" value={employee.birth_date_original ? format(new Date(employee.birth_date_original), 'PP') : ''} />
                                    <DataItem label="DOB (Certificate)" value={employee.birth_date_certificate ? format(new Date(employee.birth_date_certificate), 'PP') : ''} />
                                    <DataItem label="Identification Mark" value={employee.identification_mark} />
                                    <DataItem label="Staff Age" value={employee.staff_age_years != null ? `${employee.staff_age_years} years` : ''} />
                                </div>
                            </Section>

                            {/* Organizational Placement */}
                            <Section title="Organizational Placement & Status" icon={<Building className="w-3.5 h-3.5 text-emerald-700" />}>
                                <div className="space-y-0.5">
                                    <DataItem label="Employment Type" value={employee.employee_type?.name || employee.employeeType?.name} />
                                    <DataItem label="Department" value={employee.department?.name} />
                                    <DataItem label="Current Designation" value={employee.designation?.name} />
                                    <DataItem label="Joining Designation" value={employee.joining_designation_name} />
                                    <DataItem label="Current Branch" value={employee.branch?.name} />
                                    <DataItem label="Program" value={employee.program?.name} />
                                    <DataItem label="Project" value={employee.project?.name} />
                                    <DataItem label="Reports To (Manager)" value={employee.manager ? `${employeeDisplayName(employee.manager)} (${employee.manager.pin || employee.manager.employee_id})` : ''} />
                                    <DataItem label="Joining Date" value={employee.joining_date ? format(new Date(employee.joining_date), 'PP') : ''} />
                                    <DataItem label="Confirmation Date" value={employee.confirmation_date ? format(new Date(employee.confirmation_date), 'PP') : ''} />
                                </div>
                            </Section>

                            {/* Contact & Family */}
                            <Section title="Contact Information" icon={<Phone className="w-3.5 h-3.5 text-emerald-700" />}>
                                <div className="space-y-0.5">
                                    <DataItem label="Email" value={employee.email} />
                                    <DataItem label="Official Email ID" value={employee.email_id} />
                                    <DataItem label="Phone" value={employee.phone} />
                                    <DataItem label="Mobile (Personal)" value={employee.mobile_personal} />
                                    <DataItem label="Mobile (Official)" value={employee.mobile_official} />
                                    <DataItem label="Emergency Contact" value={employee.emergency_contact} />
                                </div>
                            </Section>

                            {/* Photo, Signature & Identity */}
                            <div className="flex flex-col gap-4">
                                <Section title="Photo, Signature & Identity" icon={<Shield className="w-3.5 h-3.5 text-emerald-700" />}>
                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        <div className="flex flex-col items-center sm:items-start space-y-1">
                                            <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">Photo</span>
                                            {employee.photo ? (
                                                <img src={`/storage/${employee.photo}`} alt={displayName} className="h-16 w-16 rounded-md border border-slate-300 object-cover shadow-2xs" />
                                            ) : (
                                                <div className="h-16 w-16 rounded-md border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-500 font-semibold italic">No photo</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center sm:items-start space-y-1">
                                            <span className="text-[9px] font-extrabold text-slate-700 uppercase tracking-wider">Signature</span>
                                            {employee.signature ? (
                                                <img src={`/storage/${employee.signature}`} alt="Signature" className="h-16 w-full max-w-[130px] rounded-md border border-slate-300 object-contain bg-white p-1 shadow-2xs" />
                                            ) : (
                                                <div className="h-16 w-full max-w-[130px] rounded-md border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[10px] text-slate-500 font-semibold italic">No signature</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <DataItem label="NID / Smart Card" value={employee.nid_number || employee.smart_card_number || employee.nid} />
                                        <DataItem label="Birth Reg. No" value={employee.birth_registration_number} />
                                        <DataItem label="TIN Certificate No" value={employee.tin_certificate_no} />
                                    </div>
                                </Section>

                                {isDropout && (
                                    <Section title="Exit Details" icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />} className="border-rose-300 bg-rose-50/20">
                                        <div className="space-y-0.5">
                                            <DataItem label="Status" value={<span className="text-rose-700 font-black">Dropout / Terminated</span>} />
                                            <DataItem label="Dropout Date" value={employee.dropout_date ? format(new Date(employee.dropout_date), 'PP') : ''} />
                                            <DataItem label="Final Payment Date" value={employee.final_payment_date ? format(new Date(employee.final_payment_date), 'PP') : ''} />
                                            <DataItem label="Amount Received" value={employee.final_payment_amount != null && employee.final_payment_amount !== '' ? formatTakaWithSymbol(employee.final_payment_amount) : ''} />
                                            <DataItem label="Type of Separation" value={employee.dropout_reason} />
                                            <DataItem label="Cause of Separation" value={employee.cause_of_separation} />
                                        </div>
                                    </Section>
                                )}
                            </div>
                        </div>

                        {/* Addresses Consolidated */}
                        <Section title="Address Details" icon={<MapPin className="w-3.5 h-3.5 text-emerald-700" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                                    <h3 className="font-bold text-xs text-slate-900 mb-1.5 flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-emerald-700" /> Present Address</h3>
                                    {employee.addresses && employee.addresses.find(a => a.type === 'present') ? (
                                        <div className="space-y-0.5 text-xs">
                                            {(() => {
                                                const addr = employee.addresses.find(a => a.type === 'present')!;
                                                return (
                                                    <>
                                                        <div className="flex justify-between border-b border-slate-200/60 py-0.5"><span className="text-slate-700 font-semibold">Village:</span> <span className="font-bold text-slate-950">{addr.village || '—'}</span></div>
                                                        <div className="flex justify-between border-b border-slate-200/60 py-0.5"><span className="text-slate-700 font-semibold">Upazila / District:</span> <span className="font-bold text-slate-950">{addr.upazila || '—'}, {addr.district || '—'}</span></div>
                                                        {addr.address_details && (
                                                            <div className="pt-1 mt-0.5"><span className="text-slate-700 font-semibold block text-[10px]">Full Address:</span> <span className="font-bold text-slate-950">{addr.address_details}</span></div>
                                                        )}
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-500 font-medium italic">No present address.</div>
                                    )}
                                </div>
                                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                                    <h3 className="font-bold text-xs text-slate-900 mb-1.5 flex items-center"><Building className="w-3.5 h-3.5 mr-1 text-teal-700" /> Permanent Address</h3>
                                    {employee.addresses && employee.addresses.find(a => a.type === 'permanent') ? (
                                        <div className="space-y-0.5 text-xs">
                                            {(() => {
                                                const addr = employee.addresses.find(a => a.type === 'permanent')!;
                                                return (
                                                    <>
                                                        <div className="flex justify-between border-b border-slate-200/60 py-0.5"><span className="text-slate-700 font-semibold">Village:</span> <span className="font-bold text-slate-950">{addr.village || '—'}</span></div>
                                                        <div className="flex justify-between border-b border-slate-200/60 py-0.5"><span className="text-slate-700 font-semibold">Upazila / District:</span> <span className="font-bold text-slate-950">{addr.upazila || '—'}, {addr.district || '—'}</span></div>
                                                        {addr.address_details && (
                                                            <div className="pt-1 mt-0.5"><span className="text-slate-700 font-semibold block text-[10px]">Full Address:</span> <span className="font-bold text-slate-950">{addr.address_details}</span></div>
                                                        )}
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-500 font-medium italic">No permanent address.</div>
                                    )}
                                </div>
                            </div>
                        </Section>
                    </div>

                    {/* SECTION 2: CAREER HISTORY & TIMELINE */}
                    <div id="sec-career" className="a4-page-card bg-white rounded-xl border border-slate-300/90 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 space-y-4 scroll-mt-16">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                                <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-1.5">
                                    <Activity className="w-4 h-4 text-emerald-700" /> 2. Career History & Timeline
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                                Section 2 / 4
                            </span>
                        </div>

                        {/* Chronological Job History Timeline */}
                        <Section title="Unified Job History Timeline" icon={<Clock className="w-3.5 h-3.5 text-emerald-700" />}>
                            {(!jobHistoryTimeline || jobHistoryTimeline.length === 0) ? (
                                <div className="text-center py-4 text-xs text-slate-500 font-medium italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    No job history timeline recorded yet.
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-emerald-300 ml-2.5 pl-4 space-y-2.5 py-1">
                                    {jobHistoryTimeline.map((item) => {
                                        const eventDateStr = item.event_date ? format(new Date(item.event_date), 'PP') : '—';

                                        const getEventBadge = (type: string) => {
                                            switch (type) {
                                                case 'joining':
                                                    return <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[9px] py-0 px-1.5 font-bold">Joining</Badge>;
                                                case 'confirmation':
                                                    return <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 text-[9px] py-0 px-1.5 font-bold">Confirmation</Badge>;
                                                case 'transfer':
                                                    return <Badge className="bg-violet-100 text-violet-900 border-violet-300 text-[9px] py-0 px-1.5 font-bold">Transfer</Badge>;
                                                case 'promotion':
                                                    return <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[9px] py-0 px-1.5 font-bold">Promotion</Badge>;
                                                case 'demotion':
                                                    return <Badge className="bg-orange-100 text-orange-900 border-orange-300 text-[9px] py-0 px-1.5 font-bold">Demotion</Badge>;
                                                case 'left':
                                                    return <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[9px] py-0 px-1.5 font-bold">Left / Separation</Badge>;
                                                case 'final_payment':
                                                    return <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[9px] py-0 px-1.5 font-bold">Final Payment</Badge>;
                                                default:
                                                    return <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[9px] py-0 px-1.5 font-bold">{type}</Badge>;
                                            }
                                        };

                                        return (
                                            <div key={item.id} className="relative">
                                                <div className="absolute -left-[23px] top-1.5 bg-emerald-700 w-2 h-2 rounded-full border-2 border-white ring-2 ring-emerald-100"></div>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 bg-slate-50/80 hover:bg-slate-100/70 p-2.5 rounded-lg border border-slate-200 transition-colors">
                                                    <div className="space-y-0.5">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {getEventBadge(item.event_type)}
                                                            <span className="text-xs font-black text-slate-950">
                                                                {item.event_type === 'joining' && `Joining as ${item.to_designation_name || 'Designation'} ${item.to_branch_name ? `at Branch (${item.to_branch_name})` : ''}`}
                                                                {item.event_type === 'confirmation' && `Confirmed as ${item.to_designation_name || 'Designation'}`}
                                                                {item.event_type === 'transfer' && `Transferred from ${item.from_branch_name || '—'} to ${item.to_branch_name || '—'}`}
                                                                {item.event_type === 'promotion' && `Promoted ${item.from_designation_name ? `from ${item.from_designation_name}` : ''} as ${item.to_designation_name || 'Designation'}`}
                                                                {item.event_type === 'demotion' && `Demoted ${item.from_designation_name ? `from ${item.from_designation_name}` : ''} as ${item.to_designation_name || 'Designation'}`}
                                                                {item.event_type === 'left' && `Left from Branch ${item.from_branch_name || '—'}`}
                                                                {item.event_type === 'final_payment' && `Final Payment Settled`}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-700 font-semibold flex flex-wrap items-center gap-1.5">
                                                            <span>Date: <strong className="text-slate-950 font-bold">{eventDateStr}</strong></span>
                                                            {item.order_no && (
                                                                <>
                                                                    <span className="text-slate-400">|</span>
                                                                    <span>Order: <code className="font-mono text-slate-900 font-bold">{item.order_no}</code></span>
                                                                </>
                                                            )}
                                                            {item.remarks && (
                                                                <>
                                                                    <span className="text-slate-400">|</span>
                                                                    <span className="italic text-slate-800">{item.event_type === 'left' ? `Type: ${item.remarks}` : item.remarks}</span>
                                                                </>
                                                            )}
                                                            {item.event_type === 'left' && item.cause_of_separation && (
                                                                <>
                                                                    <span className="text-slate-400">|</span>
                                                                    <span className="italic text-slate-800">Cause: {item.cause_of_separation}</span>
                                                                </>
                                                            )}
                                                            {item.event_type === 'final_payment' && item.amount_received != null && item.amount_received !== '' && (
                                                                <>
                                                                    <span className="text-slate-400">|</span>
                                                                    <span className="italic text-slate-800">Amount: {formatTakaWithSymbol(item.amount_received)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {item.transfer_id ? (
                                                        <Link href={route('transfers.show', item.transfer_id)} className="shrink-0 no-print">
                                                            <Button variant="outline" size="sm" className="h-6 text-[10px] border-slate-300 font-bold text-slate-800 px-2">
                                                                View Order
                                                            </Button>
                                                        </Link>
                                                    ) : null}
                                                    {item.promotion_id ? (
                                                        <Link href={route('promotions.show', item.promotion_id)} className="shrink-0 no-print">
                                                            <Button variant="outline" size="sm" className="h-6 text-[10px] border-slate-300 font-bold text-slate-800 px-2">
                                                                View Order
                                                            </Button>
                                                        </Link>
                                                    ) : null}
                                                    {item.demotion_id ? (
                                                        <Link href={route('demotions.show', item.demotion_id)} className="shrink-0 no-print">
                                                            <Button variant="outline" size="sm" className="h-6 text-[10px] border-slate-300 font-bold text-slate-800 px-2">
                                                                View Order
                                                            </Button>
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Section>

                        {/* Dedicated Full-Width Disciplinary Actions Card Grid */}
                        <Card className="border border-slate-200/90 shadow-2xs rounded-xl overflow-hidden">
                            <CardHeader className="bg-slate-100/90 border-b border-slate-200 py-2 px-3.5 flex flex-row items-center justify-between">
                                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                                    <Shield className="w-4 h-4 text-rose-600" /> Disciplinary Actions & Official Notices ({disciplinaryActions?.length || 0})
                                </CardTitle>
                                <Link href={route('disciplinary-actions.create', { employee_id: employee.id })}>
                                    <Button size="sm" variant="outline" className="h-7 text-xs border-rose-300 text-rose-700 font-bold hover:bg-rose-50 px-2.5">
                                        + Take Action
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent className="p-3.5 bg-white">
                                {(!disciplinaryActions || disciplinaryActions.length === 0) ? (
                                <div className="flex items-center justify-center gap-2 py-4 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Clean Record: No disciplinary actions or penalties recorded for this employee.</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                    {disciplinaryActions.map((action) => (
                                        <div key={action.id} className="bg-slate-50/90 border border-slate-300 hover:border-slate-400 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5">
                                            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                                {getDisciplinaryBadge(action.action_type)}
                                                <div className="flex items-center text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                                                    <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                                                    {action.action_date ? format(new Date(action.action_date), 'PP') : '—'}
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-900 font-medium leading-relaxed">
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">Details & Remarks</span>
                                                <p className="text-slate-900 font-semibold break-words">
                                                    {action.details || <span className="text-slate-400 font-normal italic">No details recorded</span>}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                        {/* Upcoming Events */}
                        {upcomingEvents && upcomingEvents.length > 0 && (
                            <Section title="Upcoming Scheduled Events" icon={<Calendar className="w-3.5 h-3.5 text-blue-700" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {upcomingEvents.map((item) => (
                                        <div key={item.id} className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs flex justify-between items-center">
                                            <div>
                                                <span className="font-bold text-blue-950 capitalize">{item.event_type} Scheduled</span>
                                                <p className="text-[10px] text-slate-700 font-medium mt-0.5">{item.remarks || item.to_designation_name}</p>
                                            </div>
                                            <span className="text-[11px] text-blue-900 font-black shrink-0">{item.event_date ? format(new Date(item.event_date), 'PP') : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </div>

                    {/* SECTION 3: FINANCIAL, RECORDS & QUALIFICATIONS */}
                    <div id="sec-financial" className="a4-page-card bg-white rounded-xl border border-slate-300/90 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 space-y-4 scroll-mt-16">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                                <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-1.5">
                                    <CreditCard className="w-4 h-4 text-emerald-700" /> 3. Financial, Records & Qualifications
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                                Section 3 / 4
                            </span>
                        </div>

                        {/* Salary & Bank Details Side-by-Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Salary & Compensation" icon={<CreditCard className="w-3.5 h-3.5 text-emerald-700" />}>
                                <div className="space-y-0.5">
                                    <DataItem label="Payscale" value={employee.payscale?.name} />
                                    <DataItem label="Salary Grade" value={employee.salaryGrade?.name || employee.salary_grade?.name} />
                                    <DataItem label="Salary Step" value={employee.salaryStep?.step_number ? `Step ${employee.salaryStep.step_number}` : (employee.salary_step?.step_number ? `Step ${employee.salary_step.step_number}` : '')} />
                                    <DataItem label="Basic Salary" value={employee.basic_salary ? formatCurrency(employee.basic_salary) : ''} />
                                </div>
                            </Section>

                            <Section title="Bank Account Details" icon={<Building className="w-3.5 h-3.5 text-emerald-700" />}>
                                {employee.bank ? (
                                    <div className="space-y-0.5">
                                        <DataItem label="Bank Name" value={employee.bank.bank_name} />
                                        <DataItem label="Branch Name" value={employee.bank.branch_name} />
                                        <DataItem label="Account No." value={employee.bank.account_no} />
                                        <DataItem label="Account Type" value={employee.bank.account_type} />
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-500 font-medium italic py-2 text-center">No bank account details provided.</div>
                                )}
                            </Section>
                        </div>

                        {/* Educational Qualifications & Experience */}
                        <Section title="Educational Qualifications" icon={<GraduationCap className="w-3.5 h-3.5 text-emerald-700" />}>
                            {employee.educations && employee.educations.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200 uppercase text-[9px]">
                                            <tr>
                                                <th className="px-2.5 py-1.5">Degree</th>
                                                <th className="px-2.5 py-1.5">Institute</th>
                                                <th className="px-2.5 py-1.5">Board/Univ</th>
                                                <th className="px-2.5 py-1.5">Subject</th>
                                                <th className="px-2.5 py-1.5">Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {employee.educations.map((edu, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-2.5 py-1.5 font-bold text-slate-950">{edu.degree}</td>
                                                    <td className="px-2.5 py-1.5 text-slate-800 font-medium">{edu.institute}</td>
                                                    <td className="px-2.5 py-1.5 text-slate-800 font-medium">{edu.board}</td>
                                                    <td className="px-2.5 py-1.5 text-slate-800 font-medium">{edu.group_name || edu.subject}</td>
                                                    <td className="px-2.5 py-1.5 text-slate-950 font-bold uppercase">{edu.result_type}: {edu.result_value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-3 text-xs text-slate-500 font-medium italic bg-slate-50 rounded-md border border-dashed border-slate-200">
                                    No educational qualifications added.
                                </div>
                            )}
                        </Section>

                        {/* Nominees & Guarantors */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Nominees" icon={<HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />}>
                                {employee.nominees && employee.nominees.length > 0 ? (
                                    <div className="space-y-2">
                                        {employee.nominees.map((nominee, i) => (
                                            <div key={i} className="bg-slate-50/80 border border-slate-200 rounded-md p-2 text-xs">
                                                <div className="flex justify-between font-bold text-slate-950 border-b border-slate-200 pb-1 mb-1">
                                                    <span>{nominee.name} ({nominee.relation || 'Nominee'})</span>
                                                    {pickRowField(nominee, 'share_percentage', 'share') && <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] py-0 px-1 font-bold">{pickRowField(nominee, 'share_percentage', 'share')}% Share</Badge>}
                                                </div>
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-slate-700 font-semibold">DOB: <strong className="text-slate-950">{formatOptionalDate(nominee.date_of_birth as string) || 'N/A'}</strong></span>
                                                    <span className="text-slate-700 font-semibold">Mobile: <strong className="text-slate-950">{pickRowField(nominee, 'mobile', 'contact') || 'N/A'}</strong></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-3 text-xs text-slate-500 font-medium italic bg-slate-50 rounded-md border border-dashed border-slate-200">No nominees assigned.</div>
                                )}
                            </Section>

                            <Section title="Security & Collateral" icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />}>
                                {employee.collateral ? (
                                    <div className="space-y-0.5">
                                        <DataItem label="Certificate" value={employee.collateral.has_certificate ? <span className="text-emerald-800 font-bold">Submitted</span> : 'No'} />
                                        <DataItem label="Security Amount" value={employee.collateral.security_amount ? formatCurrency(employee.collateral.security_amount) : ''} />
                                        <DataItem label="Interest Rate" value={employee.collateral.collateral_interest ? `${employee.collateral.collateral_interest}%` : ''} />
                                        <DataItem label="Collateral Date" value={employee.collateral.collateral_date ? formatOptionalDate(employee.collateral.collateral_date) : ''} />
                                    </div>
                                ) : (
                                    <div className="text-center py-3 text-xs text-slate-500 font-medium italic bg-slate-50 rounded-md border border-dashed border-slate-200">No collateral recorded.</div>
                                )}
                            </Section>
                        </div>
                    </div>

                    {/* SECTION 4: DOCUMENTS, LEAVES & MOVEMENTS */}
                    <div id="sec-documents-leaves" className="a4-page-card bg-white rounded-xl border border-slate-300/90 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6 space-y-4 scroll-mt-16">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                                <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-emerald-700" /> 4. Documents, Leaves & Movements
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200">
                                Section 4 / 4
                            </span>
                        </div>

                        {/* Employee Documents Table */}
                        <Section title="Uploaded Documents" icon={<FileText className="w-3.5 h-3.5 text-emerald-700" />}>
                            {employee.documents && employee.documents.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200 uppercase text-[9px]">
                                            <tr>
                                                <th className="px-2.5 py-1.5">Type</th>
                                                <th className="px-2.5 py-1.5">Title</th>
                                                <th className="px-2.5 py-1.5">Expiry Date</th>
                                                <th className="px-2.5 py-1.5">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {employee.documents.map((doc) => (
                                                <tr key={doc.id} className="hover:bg-slate-50">
                                                    <td className="px-2.5 py-1.5">
                                                        <Badge variant="outline" className="border-emerald-300 text-emerald-900 bg-emerald-50 text-[9px] py-0 px-1 font-bold">
                                                            {formatEmployeeDocumentTypeLabel(doc.document_type)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-2.5 py-1.5 font-bold text-slate-950">{doc.title}</td>
                                                    <td className="px-2.5 py-1.5 text-slate-800 font-semibold whitespace-nowrap">{doc.expiry_date ? formatOptionalDate(doc.expiry_date) : '—'}</td>
                                                    <td className="px-2.5 py-1.5">
                                                        {doc.file_path ? (
                                                            <a href={`/storage/${doc.file_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-black text-[11px]">
                                                                <Download className="h-3 w-3" /> Download
                                                            </a>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-[10px]">No file</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-3 text-xs text-slate-500 font-medium italic bg-slate-50 rounded-md border border-dashed border-slate-200">No documents uploaded.</div>
                            )}
                        </Section>

                        {/* Leaves & Movements Side-by-Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Leave Balances & Applications" icon={<Calendar className="w-3.5 h-3.5 text-emerald-700" />}>
                                {currentYearLeaveBalances && currentYearLeaveBalances.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {currentYearLeaveBalances.map((balance) => (
                                            <div key={balance.id} className="bg-slate-50 border border-slate-200 rounded-md p-2 text-xs">
                                                <div className="flex justify-between font-bold text-slate-950">
                                                    <span className="truncate">{balance.leave_type.name}</span>
                                                    <span className="text-emerald-800 font-black">{balance.remaining_days}d</span>
                                                </div>
                                                <div className="mt-1">
                                                    <Progress value={(balance.used_days / balance.allocated_days) * 100} className="h-1 bg-slate-200" indicatorClassName="bg-emerald-600" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                {recentLeaveApplications && recentLeaveApplications.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {recentLeaveApplications.slice(0, 3).map((leave) => (
                                            <div key={leave.id} className="border border-slate-200 rounded-md p-2 bg-white text-xs flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-slate-950">{leave.leave_type.name} ({leave.days}d)</div>
                                                    <div className="text-[10px] text-slate-600 font-semibold">{formatDateRange(leave.start_date, leave.end_date)}</div>
                                                </div>
                                                {getLeaveStatusBadge(leave.status)}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-2 text-xs text-slate-500 font-medium italic">No recent leaves.</div>
                                )}
                            </Section>

                            <Section title="Recent Movements" icon={<Activity className="w-3.5 h-3.5 text-emerald-700" />} >
                                {recentMovements && recentMovements.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {recentMovements.slice(0, 3).map((movement) => (
                                            <div key={movement.id} className="border border-slate-200 rounded-md p-2 bg-white text-xs flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-slate-950 truncate max-w-[150px]">{movement.purpose}</div>
                                                    <div className="text-[10px] text-slate-600 font-semibold">{formatDateTimeRange(movement.from_datetime, movement.actual_return_datetime)}</div>
                                                </div>
                                                {getMovementStatusBadge(movement.status)}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-2 text-xs text-slate-500 font-medium italic">No recent movements.</div>
                                )}
                            </Section>
                        </div>
                    </div>

                </div>
            </div>

            {/* ID CARD PRINT SECTION */}
            <div className="id-card-section flex-row gap-8 justify-center pt-10" style={{ display: 'none' }}>
                {/* Front Side */}
                <div style={{ width: '54mm', height: '86mm', position: 'relative', overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', borderRadius: '4px' }}>

                    {/* Top Green Background */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '38mm', background: '#117559' }}>
                        <svg viewBox="0 0 100 25" preserveAspectRatio="none" style={{ position: 'absolute', bottom: '-1px', left: 0, width: '100%', height: '8mm' }}>
                            <path fill="#fff" d="M0 25 C 20 0, 80 0, 100 25 L 100 25 L 0 25 Z" />
                        </svg>
                    </div>

                    {/* Logo */}
                    <div style={{ position: 'absolute', top: '5mm', left: '50%', transform: 'translateX(-50%)', width: '11mm', height: '11mm', background: '#fff', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <img src="/logo.png" style={{ width: '9mm', height: '9mm', objectFit: 'contain' }} alt="Company Logo" />
                    </div>

                    {/* Photo */}
                    <div style={{ position: 'absolute', top: '20mm', left: '50%', transform: 'translateX(-50%)', width: '28mm', height: '28mm', borderRadius: '50%', border: '3px solid #fff', overflow: 'hidden', background: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10 }}>
                        {employee.photo ? (
                            <img src={`/storage/${employee.photo}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#117559', fontSize: '14px', fontWeight: 'bold' }}>
                                {getInitials()}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div style={{ position: 'absolute', top: '50mm', left: '3mm', right: '3mm', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#1f2937', lineHeight: '1.2' }}>{displayName}</div>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#117559', marginTop: '2px' }}>{employee.designation?.name || 'Designation N/A'}</div>
                        <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>{employee.department?.name || 'Department N/A'}</div>

                        <div style={{ marginTop: '5mm', fontSize: '8.5px', display: 'flex', flexDirection: 'column', gap: '1.5px', alignItems: 'center' }}>
                            <div className="flex justify-between w-[38mm]"><span style={{ fontWeight: 'bold', color: '#4b5563' }}>PIN NO:</span> <span style={{ fontWeight: '600', color: '#1f2937' }}>{employee.pin || employee.employee_id}</span></div>
                            <div className="flex justify-between w-[38mm]"><span style={{ fontWeight: 'bold', color: '#4b5563' }}>BLOOD:</span> <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{employee.blood_group || 'N/A'}</span></div>
                            <div className="flex justify-between w-[38mm]"><span style={{ fontWeight: 'bold', color: '#4b5563' }}>PHONE:</span> <span style={{ fontWeight: '600', color: '#1f2937' }}>{employee.mobile_official || employee.phone}</span></div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8mm', background: '#117559', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        www.mousumibd.org
                    </div>
                </div>

                {/* Back Side */}
                <div style={{ width: '54mm', height: '86mm', position: 'relative', overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', borderRadius: '4px' }}>
                    <div style={{ padding: '5mm', fontSize: '8px', color: '#4b5563', lineHeight: '1.4' }}>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '10px', marginBottom: '3mm', color: '#117559' }}>INSTRUCTIONS</div>

                        <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
                            <div style={{ display: 'inline-block', background: '#ecfdf5', color: '#047857', padding: '1.5mm 2.5mm', borderRadius: '3px', fontWeight: 'bold', fontSize: '7.5px', border: '1px solid #d1fae5' }}>
                                Valid as long as you are employed
                            </div>
                        </div>

                        <div style={{ marginBottom: '4mm' }}>
                            <div style={{ marginBottom: '1.5px' }}>• This card is the property of the organization.</div>
                            <div style={{ marginBottom: '1.5px' }}>• It must be worn at all times while on duty.</div>
                            <div style={{ marginBottom: '1.5px' }}>• If found, please return to the head office.</div>
                        </div>

                        <div style={{ marginBottom: '3mm', background: '#f3f6f4', padding: '2.5mm', borderRadius: '4px', borderLeft: '2px solid #117559' }}>
                            <span style={{ fontWeight: 'bold', color: '#1f2937', display: 'block', marginBottom: '1px' }}>Emergency Contact:</span>
                            <span style={{ color: '#117559', fontWeight: 'bold', fontSize: '10px' }}>{employee.emergency_contact || employee.mobile_personal || employee.phone || 'N/A'}</span>
                        </div>

                        <div style={{ marginBottom: '2.5mm' }}>
                            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>National ID:</span> {employee.nid_number || employee.nid || 'N/A'}
                        </div>

                        <div style={{ marginBottom: '2.5mm' }}>
                            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Address:</span><br />
                            <span style={{ fontSize: '7.5px', color: '#6b7280' }}>{
                                employee.addresses?.find(a => a.type === 'present')?.village ||
                                employee.addresses?.find(a => a.type === 'present')?.address_details ||
                                employee.address || 'N/A'
                            }</span>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div style={{ position: 'absolute', bottom: '11mm', left: '4mm', right: '4mm', display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ textAlign: 'center', width: '21mm' }}>
                            <div style={{ borderBottom: '1px solid #1f2937', height: '6mm', width: '100%' }}></div>
                            <div style={{ fontSize: '6.5px', paddingTop: '3px', fontWeight: '700', color: '#1f2937' }}>Holder's Signature</div>
                        </div>
                        <div style={{ textAlign: 'center', width: '21mm' }}>
                            <div style={{ borderBottom: '1px solid #1f2937', height: '6mm', width: '100%' }}></div>
                            <div style={{ fontSize: '6.5px', paddingTop: '3px', fontWeight: '700', color: '#1f2937' }}>Auth. Signature</div>
                        </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '8mm', background: '#117559', color: '#fff', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        www.mousumibd.org
                    </div>
                </div>
            </div>
        </Layout>
    );
}
