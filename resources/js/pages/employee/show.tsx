import React, { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft, Phone, MapPin, Calendar, Briefcase, Building, User,
    AlertTriangle, Pencil, FileText, Clock, CheckCircle, AlertCircle,
    XCircle, Timer, CalendarIcon, ArrowUpRight, GraduationCap, Users, Shield,
    CreditCard, Award, HeartHandshake, FolderOpen, Activity, Star, ShieldCheck,
    Download, ExternalLink
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
type Cheque = { bank_name?: string; branch_name?: string; cheque_no?: string; amount?: string | number; notes?: string; };
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
    return Number.isNaN(d.getTime()) ? String(value) : format(d, 'PPP');
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
    department: Department; designation: Designation; branch: Branch; manager: Manager | null; status: string; resignation_date?: string; dropout_date?: string; dropout_reason?: string; final_payment_date?: string; last_promotion_date?: string; probation_period_days?: number | null; total_service_length_days?: number | null; service_length_from_confirmation_days?: number | null; staff_age_years?: number | null; length_of_service_on_last_promotion_days?: number | null; joining_designation_name?: string; last_designation_name?: string; last_branch_name?: string; pin?: string; name_en?: string; full_name_en?: string | null; name_bn?: string; email_id?: string;

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

interface EmployeeShowProps {
    employee: Employee;
    currentYearLeaveBalances: LeaveBalance[];
    recentLeaveApplications: LeaveApplication[];
    recentMovements: Movement[];
    transferHistories: TransferHistory[];
    promotionHistories: PromotionHistory[];
    demotionHistories: DemotionHistory[];
}

const getLeaveStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-rose-50 text-rose-800 border-rose-200', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
        <Badge variant="outline" className={`${config.color} border flex items-center text-[10px] py-0.5 px-1.5`}>
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
        <Badge variant="outline" className={`${config.color} border flex items-center text-[10px] py-0.5 px-1.5`}>
            {config.icon}
            <span className="capitalize">{status}</span>
        </Badge>
    );
};

const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.toDateString() === end.toDateString()) return format(start, 'PPP');
    return `${format(start, 'PP')} - ${format(end, 'PP')}`;
};

const formatDateTimeRange = (fromDatetime: string, toDatetime: string) => {
    const from = new Date(fromDatetime);
    const to = new Date(toDatetime);
    if (from.toDateString() === to.toDateString()) return `${format(from, 'PP')}, ${format(from, 'p')} - ${format(to, 'p')}`;
    return `${format(from, 'PP p')} - ${format(to, 'PP p')}`;
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

    return `${years}y, ${months}M, ${days}D`;
};

const DataItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0 text-xs sm:text-sm gap-4">
        <span className="text-gray-400 font-medium shrink-0 pt-0.5">{label}</span>
        <span className="text-gray-800 font-semibold text-right break-words max-w-[70%]">
            {value || <span className="text-gray-300 font-normal italic">N/A</span>}
        </span>
    </div>
);

const Section = ({ title, icon, children, className = "" }: { title: string, icon?: React.ReactNode, children: React.ReactNode, className?: string }) => (
    <Card className={`border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden ${className}`}>
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-3 px-4">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 text-gray-900">
                {icon} {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
            {children}
        </CardContent>
    </Card>
);

const StatCard = ({ title, value, icon, subtitle }: { title: string, value: string, icon: React.ReactNode, subtitle: string }) => (
    <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-3">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            {icon}
        </div>
        <div className="min-w-0">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</h4>
            <div className="text-xs sm:text-sm font-bold text-gray-800 truncate mt-0.5">{value}</div>
            <p className="text-[9px] text-gray-400 truncate mt-0.5">{subtitle}</p>
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
}: EmployeeShowProps) {
    const isDropout = !!employee.dropout_date;

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

    const durationFromLastPromotionYmd = employee.last_promotion_date ? calculateYmd(employee.last_promotion_date, serviceEndDate) : 'N/A (No Promotion)';

    const getStatusBadge = () => {
        const statusColors = { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', inactive: 'bg-gray-50 text-gray-750 border-gray-200', on_leave: 'bg-teal-50 text-teal-700 border-teal-200', terminated: 'bg-rose-50 text-rose-700 border-rose-200', };
        const statusColor = statusColors[employee.status as keyof typeof statusColors] || 'bg-gray-50 text-gray-700 border-gray-200';
        const statusLabel = (employee.status || 'unknown').replace(/_/g, ' ');
        return (
            <Badge className={`${statusColor} border shadow-none px-2 py-0.5 font-medium text-[10px] flex items-center w-fit`}>
                <span className="relative flex h-1.5 w-1.5 mr-1.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${employee.status === 'active' ? 'bg-emerald-400' : 'hidden'}`}></span>
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${employee.status === 'active' ? 'bg-emerald-500' : (employee.status === 'on_leave' ? 'bg-teal-500' : 'bg-gray-400')}`}></span>
                </span>
                {statusLabel ? statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1) : '—'}
            </Badge>
        );
    };

    const collateralCertificateLevels = useMemo(
        () => parseCertificateLevels(employee.collateral?.certificate_levels),
        [employee.collateral?.certificate_levels],
    );

    const careerTimeline = useMemo(() => {
        const transfers = (transferHistories || []).map((h) => ({
            type: 'transfer' as const,
            id: h.id,
            date: h.transfer_date,
            meta: h,
        }));
        const promotions = (promotionHistories || []).map((h) => ({
            type: 'promotion' as const,
            id: h.id,
            date: h.promotion_date,
            meta: h,
        }));
        const demotions = (demotionHistories || []).map((h) => ({
            type: 'demotion' as const,
            id: h.id,
            date: h.demotion_date,
            meta: h,
        }));
        return [...transfers, ...promotions, ...demotions].sort((a, b) => {
            const ad = new Date(a.date).getTime();
            const bd = new Date(b.date).getTime();
            return bd - ad;
        });
    }, [promotionHistories, demotionHistories, transferHistories]);

    const handlePrintIdCard = () => {
        document.body.classList.add('print-id-card');
        setTimeout(() => {
            window.print();
            document.body.classList.remove('print-id-card');
        }, 100);
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

            <div className="container mx-auto py-6 px-4 max-w-6xl space-y-4 cv-section">

                {/* Back Button */}
                <Link href={route('employees.index')} className="no-print inline-flex items-center text-xs font-medium text-gray-500 hover:text-emerald-600 transition-colors">
                    <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Directory
                </Link>

                {/* Compact Hero Header Card */}
                <div className="relative bg-white rounded-xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-emerald-800 to-teal-700 relative">
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwbDhfOFpNOCAwTDBfOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')" }}></div>
                    </div>

                    <div className="px-6 pb-5 relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
                            <div className="-mt-10 md:-mt-12 shrink-0">
                                <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-white shadow bg-white">
                                    {employee.photo ? (
                                        <AvatarImage src={`/storage/${employee.photo}`} alt={displayName} className="object-cover" />
                                    ) : (
                                        <AvatarFallback className="text-3xl font-bold bg-emerald-50 text-emerald-600">
                                            {getInitials()}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                            </div>
                            <div className="space-y-1 pt-2 md:pt-4">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{displayName}</h1>
                                    {employee.name_bn && <span className="text-sm text-gray-555 font-medium">({employee.name_bn})</span>}
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-0.5 text-xs text-gray-550 font-medium">
                                    <span className="text-emerald-700 font-semibold">{employee.designation?.name || employee.last_designation_name || 'Designation N/A'}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{employee.department?.name || 'Department N/A'}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{employee.branch?.name || 'Branch N/A'}</span>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                                    {getStatusBadge()}
                                    <Badge variant="outline" className="font-mono text-[10px] bg-gray-55 text-gray-600 border-gray-200 py-0.5 px-2">PIN: {employee.pin || employee.employee_id || 'N/A'}</Badge>
                                    {employee.is_project_employee && <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] py-0.5 px-2">Project Staff</Badge>}
                                    {employee.is_custodian && <Badge variant="secondary" className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] py-0.5 px-2">Custodian</Badge>}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 justify-center md:justify-end no-print self-center md:self-start pt-2 md:pt-4 mb-1">
                            <Button variant="outline" size="sm" onClick={handlePrintIdCard} className="h-8 text-xs border-gray-200 text-gray-700 hover:bg-emerald-50">
                                <User className="w-3.5 h-3.5 mr-1" /> ID Card
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs border-gray-205 text-gray-700 hover:bg-gray-50">
                                <FileText className="w-3.5 h-3.5 mr-1" /> CV
                            </Button>
                            <Link href={route('employees.edit', employee.id)}>
                                <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Service Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard title="Probation Period" value={probationYmd || '—'} icon={<Timer className="w-4 h-4" />} subtitle="Joining to Confirmation Date" />
                    <StatCard title="Total Service Length" value={totalServiceYmd || '—'} icon={<Briefcase className="w-4 h-4" />} subtitle="Joining to Resignation/Today" />
                    <StatCard title="Service from Confirmation" value={confirmationServiceYmd || '—'} icon={<CheckCircle className="w-4 h-4" />} subtitle="Confirmation to Resignation/Today" />
                    <StatCard title="Duration from Last Promo" value={durationFromLastPromotionYmd || '—'} icon={<ArrowUpRight className="w-4 h-4" />} subtitle="Last Promotion to Resignation/Today" />
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="personal" className="w-full">
                    <div className="border-b border-gray-200 mb-4 overflow-x-auto scrollbar-none">
                        <TabsList className="bg-transparent h-auto p-0 flex gap-6 min-w-max border-b-0">
                            <TabsTrigger 
                                value="personal" 
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-650 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none shadow-none py-2 px-1 text-xs sm:text-sm font-semibold transition-all text-gray-500 hover:text-gray-700"
                            >
                                <User className="w-4 h-4 mr-1.5" /> Personal Info
                            </TabsTrigger>
                            <TabsTrigger 
                                value="employment" 
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-650 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none shadow-none py-2 px-1 text-xs sm:text-sm font-semibold transition-all text-gray-500 hover:text-gray-700"
                            >
                                <Briefcase className="w-4 h-4 mr-1.5" /> Employment Info
                            </TabsTrigger>
                            <TabsTrigger 
                                value="career" 
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-650 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none shadow-none py-2 px-1 text-xs sm:text-sm font-semibold transition-all text-gray-500 hover:text-gray-700"
                            >
                                <Activity className="w-4 h-4 mr-1.5" /> Career Timeline
                            </TabsTrigger>
                            <TabsTrigger 
                                value="education" 
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-650 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none shadow-none py-2 px-1 text-xs sm:text-sm font-semibold transition-all text-gray-500 hover:text-gray-700"
                            >
                                <GraduationCap className="w-4 h-4 mr-1.5" /> Edu & Experience
                            </TabsTrigger>
                            <TabsTrigger 
                                value="financial" 
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-650 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none shadow-none py-2 px-1 text-xs sm:text-sm font-semibold transition-all text-gray-500 hover:text-gray-700"
                            >
                                <CreditCard className="w-4 h-4 mr-1.5" /> Financial & Records
                            </TabsTrigger>
                            <TabsTrigger 
                                value="documents" 
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-650 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none shadow-none py-2 px-1 text-xs sm:text-sm font-semibold transition-all text-gray-500 hover:text-gray-700"
                            >
                                <FileText className="w-4 h-4 mr-1.5" /> Documents
                            </TabsTrigger>
                            <TabsTrigger 
                                value="leave" 
                                className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-650 data-[state=active]:shadow-none border-b-2 border-transparent rounded-none shadow-none py-2 px-1 text-xs sm:text-sm font-semibold transition-all text-gray-500 hover:text-gray-700"
                            >
                                <Calendar className="w-4 h-4 mr-1.5" /> Leaves & Movement
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* PERSONAL INFO TAB */}
                    <TabsContent value="personal" className="space-y-4 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Basic Details" icon={<User className="w-4 h-4" />}>
                                <div className="space-y-1">
                                    <DataItem label="Name (English)" value={displayName} />
                                    <DataItem label="Name (Bangla)" value={employee.name_bn} />
                                    <DataItem label="Gender" value={employee.gender} />
                                    <DataItem label="Blood Group" value={employee.blood_group} />
                                    <DataItem label="Religion" value={employee.religion} />
                                    <DataItem label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'PPP') : ''} />
                                    <DataItem label="DOB (Original)" value={employee.birth_date_original ? format(new Date(employee.birth_date_original), 'PPP') : ''} />
                                    <DataItem label="DOB (Certificate)" value={employee.birth_date_certificate ? format(new Date(employee.birth_date_certificate), 'PPP') : ''} />
                                    <DataItem label="Identification Mark" value={employee.identification_mark} />
                                    <DataItem label="Staff Age" value={employee.staff_age_years != null ? `${employee.staff_age_years} years` : ''} />
                                </div>
                            </Section>

                            <div className="flex flex-col gap-4">
                                <Section title="Photo & Signature" icon={<FileText className="w-4 h-4" />}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col items-center sm:items-start space-y-1.5">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Employee Photo</span>
                                            {employee.photo ? (
                                                <img src={`/storage/${employee.photo}`} alt={displayName} className="h-20 w-20 rounded-lg border border-gray-200 object-cover shadow-sm" />
                                            ) : (
                                                <div className="h-20 w-20 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-450 italic">No photo</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center sm:items-start space-y-1.5">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Signature Scan</span>
                                            {employee.signature ? (
                                                <img src={`/storage/${employee.signature}`} alt="Signature" className="h-20 w-full max-w-[150px] rounded-lg border border-gray-200 object-contain bg-white p-1 shadow-sm" />
                                            ) : (
                                                <div className="h-20 w-full max-w-[150px] rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-440 italic">No signature</div>
                                            )}
                                        </div>
                                    </div>
                                </Section>

                                <Section title="Contact Information" icon={<Phone className="w-4 h-4" />}>
                                    <div className="space-y-1">
                                        <DataItem label="Email" value={employee.email} />
                                        <DataItem label="Official Email ID" value={employee.email_id} />
                                        <DataItem label="Phone" value={employee.phone} />
                                        <DataItem label="Mobile (Personal)" value={employee.mobile_personal} />
                                        <DataItem label="Mobile (Official)" value={employee.mobile_official} />
                                        <DataItem label="Emergency Contact" value={employee.emergency_contact} />
                                    </div>
                                </Section>
                            </div>

                            <Section title="Family & Relatives" icon={<Users className="w-4 h-4" />}>
                                <div className="space-y-1">
                                    <DataItem label="Father's Name" value={employee.fathers_name || (employee as any).fathers_name} />
                                    <DataItem label="Father's Mobile" value={employee.fathers_mobile || (employee as any).fathers_mobile} />
                                    <DataItem label="Mother's Name" value={employee.mothers_name || (employee as any).mothers_name} />
                                    <DataItem label="Mother's Mobile" value={employee.mothers_mobile || (employee as any).mothers_mobile} />
                                    <DataItem label="Marital Status" value={employee.marital_status || (employee as any).marital_status} />
                                    {(employee.marital_status === 'Married' || (employee as any).marital_status === 'Married') && (
                                        <>
                                            <DataItem label="Spouse Name" value={employee.spouse_name || (employee as any).spouse_name} />
                                            <DataItem label="Spouse Mobile" value={employee.spouse_mobile || (employee as any).spouse_mobile} />
                                        </>
                                    )}
                                </div>
                            </Section>

                            <Section title="Identity Documents" icon={<Shield className="w-4 h-4" />}>
                                <div className="space-y-1">
                                    <DataItem label="NID" value={employee.nid} />
                                    <DataItem label="NID Number" value={employee.nid_number} />
                                    <DataItem label="Smart Card Number" value={employee.smart_card_number} />
                                    <DataItem label="Birth Registration No" value={employee.birth_registration_number} />
                                    <DataItem label="TIN Certificate No" value={employee.tin_certificate_no} />
                                    <DataItem label="Driving License No" value={employee.driving_license_no} />
                                    <DataItem label="Passport No" value={employee.passport_no} />
                                </div>
                            </Section>
                        </div>

                        <Section title="Addresses" icon={<MapPin className="w-4 h-4" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                                    <h3 className="font-semibold text-xs text-gray-700 mb-2 flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Present Address</h3>
                                    {employee.addresses && employee.addresses.find(a => a.type === 'present') ? (
                                        <div className="space-y-1 text-xs text-gray-600">
                                            {(() => {
                                                const addr = employee.addresses.find(a => a.type === 'present')!;
                                                return (
                                                    <>
                                                        <div className="flex justify-between border-b border-gray-100/50 py-1"><span className="text-gray-400">Village:</span> <span className="font-semibold text-gray-800">{addr.village || '—'}</span></div>
                                                        <div className="flex justify-between border-b border-gray-100/50 py-1"><span className="text-gray-400">Union:</span> <span className="font-semibold text-gray-800">{addr.union || '—'}</span></div>
                                                        <div className="flex justify-between border-b border-gray-100/50 py-1"><span className="text-gray-400">Upazila:</span> <span className="font-semibold text-gray-800">{addr.upazila || '—'}</span></div>
                                                        <div className="flex justify-between border-b border-gray-100/50 py-1"><span className="text-gray-400">District:</span> <span className="font-semibold text-gray-800">{addr.district || '—'}</span></div>
                                                        <div className="flex justify-between py-1"><span className="text-gray-400">Division:</span> <span className="font-semibold text-gray-800">{addr.division || '—'}</span></div>
                                                        {addr.address_details && (
                                                            <div className="pt-1.5 border-t border-gray-250 mt-1"><span className="text-gray-400 block mb-0.5">Full Address:</span> <span className="font-semibold text-gray-850">{addr.address_details}</span></div>
                                                        )}
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-450 italic">No present address details provided.</div>
                                    )}
                                </div>
                                <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                                    <h3 className="font-semibold text-xs text-gray-700 mb-2 flex items-center"><Building className="w-3.5 h-3.5 mr-1 text-teal-600" /> Permanent Address</h3>
                                    {employee.addresses && employee.addresses.find(a => a.type === 'permanent') ? (
                                        <div className="space-y-1 text-xs text-gray-600">
                                            {(() => {
                                                const addr = employee.addresses.find(a => a.type === 'permanent')!;
                                                return (
                                                    <>
                                                        <div className="flex justify-between border-b border-gray-100/50 py-1"><span className="text-gray-400">Village:</span> <span className="font-semibold text-gray-800">{addr.village || '—'}</span></div>
                                                        <div className="flex justify-between border-b border-gray-100/50 py-1"><span className="text-gray-400">Union:</span> <span className="font-semibold text-gray-800">{addr.union || '—'}</span></div>
                                                        <div className="flex justify-between border-b border-gray-100/50 py-1"><span className="text-gray-400">Upazila:</span> <span className="font-semibold text-gray-800">{addr.upazila || '—'}</span></div>
                                                        <div className="flex justify-between border-b border-gray-100/50 py-1"><span className="text-gray-400">District:</span> <span className="font-semibold text-gray-800">{addr.district || '—'}</span></div>
                                                        <div className="flex justify-between py-1"><span className="text-gray-400">Division:</span> <span className="font-semibold text-gray-800">{addr.division || '—'}</span></div>
                                                        {addr.address_details && (
                                                            <div className="pt-1.5 border-t border-gray-250 mt-1"><span className="text-gray-400 block mb-0.5">Full Address:</span> <span className="font-semibold text-gray-850">{addr.address_details}</span></div>
                                                        )}
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-450 italic">No permanent address details provided.</div>
                                    )}
                                </div>
                            </div>
                        </Section>
                    </TabsContent>

                    {/* EMPLOYMENT INFO TAB */}
                    <TabsContent value="employment" className="space-y-4 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Organizational Placement" icon={<Building className="w-4 h-4" />}>
                                <div className="space-y-1">
                                    <DataItem label="Employment Type" value={employee.employee_type?.name || employee.employeeType?.name} />
                                    <DataItem label="Department" value={employee.department?.name} />
                                    <DataItem label="Current Designation" value={employee.designation?.name} />
                                    <DataItem label="Joining Designation" value={employee.joining_designation_name} />
                                    <DataItem label="Last Designation" value={employee.last_designation_name} />
                                    <DataItem label="Current Branch" value={employee.branch?.name} />
                                    <DataItem label="Last Branch" value={employee.last_branch_name} />
                                    <DataItem label="Program" value={employee.program?.name} />
                                    <DataItem label="Project" value={employee.project?.name} />
                                    <DataItem label="Reports To (Manager)" value={employee.manager ? `${employeeDisplayName(employee.manager)} (${employee.manager.pin || employee.manager.employee_id})` : ''} />
                                </div>
                            </Section>

                            <div className="space-y-4">
                                <Section title="Service Timeline" icon={<Clock className="w-4 h-4" />}>
                                    <div className="space-y-1">
                                        <DataItem label="Joining Date" value={employee.joining_date ? format(new Date(employee.joining_date), 'PPP') : ''} />
                                        <DataItem label="Confirmation Date" value={employee.confirmation_date ? format(new Date(employee.confirmation_date), 'PPP') : ''} />
                                        <DataItem label="Last Promotion Date" value={employee.last_promotion_date ? format(new Date(employee.last_promotion_date), 'PPP') : ''} />
                                        <DataItem label="Joining Date at Present Location" value={employee.joining_date ? format(new Date(employee.joining_date), 'PPP') : ''} />
                                    </div>
                                </Section>

                                {isDropout && (
                                    <Section title="Exit Details" icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} className="border-rose-100 bg-rose-50/10">
                                        <div className="space-y-1">
                                            <DataItem label="Status" value={<span className="text-rose-600 font-bold">Dropout / Terminated</span>} />
                                            <DataItem label="Dropout Date" value={employee.dropout_date ? format(new Date(employee.dropout_date), 'PPP') : ''} />
                                            <DataItem label="Final Payment Date" value={employee.final_payment_date ? format(new Date(employee.final_payment_date), 'PPP') : ''} />
                                            <DataItem label="Dropout Reason" value={employee.dropout_reason} />
                                        </div>
                                    </Section>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* CAREER MOVEMENT TIMELINE TAB */}
                    <TabsContent value="career" className="space-y-4 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <Section title="Career Movement Timeline" icon={<Activity className="w-4 h-4" />}>
                            {careerTimeline.length === 0 ? (
                                <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">
                                    No transfer / promotion / demotion history found yet.
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-gray-100 ml-3 pl-6 space-y-4 py-1">
                                    {careerTimeline.map((item) => {
                                        if (item.type === 'transfer') {
                                            const h = item.meta as TransferHistory;
                                            const from = (h as any).fromBranch?.name ?? (h as any).from_branch?.name ?? '—';
                                            const to = (h as any).toBranch?.name ?? (h as any).to_branch?.name ?? '—';
                                            const orderNo = h.transfer?.transfer_order_no ?? '—';
                                            return (
                                                <div key={`t-${h.id}`} className="relative">
                                                    <div className="absolute -left-[31px] top-1.5 bg-violet-550 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-violet-50"></div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50/50 hover:bg-gray-50 p-2.5 rounded-lg border border-gray-100 transition-colors">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge className="bg-violet-50 text-violet-700 border border-violet-100 text-[10px] py-0 px-1.5 font-semibold">Transfer</Badge>
                                                                <span className="text-xs sm:text-sm font-semibold text-gray-900">{from} <span className="text-gray-400 font-normal">→</span> {to}</span>
                                                            </div>
                                                            <div className="mt-0.5 text-[11px] text-gray-500">
                                                                Effective: {h.transfer_date ? format(new Date(h.transfer_date), 'PPP') : '—'} <span className="text-gray-300 mx-1.5">|</span> Order: <span className="font-mono text-gray-700">{orderNo}</span>
                                                            </div>
                                                        </div>
                                                        {h.transfer_id ? (
                                                            <Link href={route('transfers.show', h.transfer_id)} className="shrink-0">
                                                                <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">
                                                                    View Order
                                                                </Button>
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (item.type === 'demotion') {
                                            const h = item.meta as DemotionHistory;
                                            const from = (h as any).fromDesignation?.name ?? (h as any).from_designation?.name ?? '—';
                                            const to = (h as any).toDesignation?.name ?? (h as any).to_designation?.name ?? '—';
                                            const orderNo = h.demotion?.demotion_order_no ?? '—';
                                            const gradeFrom = (h as any).fromSalaryGrade?.name ?? (h as any).from_salary_grade?.name ?? '—';
                                            const gradeTo = (h as any).toSalaryGrade?.name ?? (h as any).to_salary_grade?.name ?? '—';

                                            return (
                                                <div key={`d-${h.id}`} className="relative">
                                                    <div className="absolute -left-[31px] top-1.5 bg-orange-550 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-orange-50"></div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50/50 hover:bg-gray-50 p-2.5 rounded-lg border border-gray-100 transition-colors">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge className="bg-orange-50 text-orange-700 border border-orange-100 text-[10px] py-0 px-1.5 font-semibold">Demotion</Badge>
                                                                <span className="text-xs sm:text-sm font-semibold text-gray-900">{from} <span className="text-gray-400 font-normal">→</span> {to}</span>
                                                            </div>
                                                            <div className="mt-0.5 text-[11px] text-gray-500">
                                                                Effective: {h.demotion_date ? format(new Date(h.demotion_date), 'PPP') : '—'} <span className="text-gray-300 mx-1.5">|</span> Order: <span className="font-mono text-gray-700">{orderNo}</span>
                                                            </div>
                                                            <div className="mt-0.5 text-[11px] text-gray-500 font-medium">
                                                                Grade: {gradeFrom} → {gradeTo} <span className="text-gray-300 mx-1.5">|</span> Basic: {h.from_basic_salary ? formatCurrency(h.from_basic_salary) : '—'} → {h.to_basic_salary ? formatCurrency(h.to_basic_salary) : '—'}
                                                            </div>
                                                        </div>
                                                        {h.demotion_id ? (
                                                            <Link href={route('demotions.show', h.demotion_id)} className="shrink-0">
                                                                <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">
                                                                    View Order
                                                                </Button>
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const h = item.meta as PromotionHistory;
                                        const from = (h as any).fromDesignation?.name ?? (h as any).from_designation?.name ?? '—';
                                        const to = (h as any).toDesignation?.name ?? (h as any).to_designation?.name ?? '—';
                                        const orderNo = h.promotion?.promotion_order_no ?? '—';
                                        const gradeFrom = (h as any).fromSalaryGrade?.name ?? (h as any).from_salary_grade?.name ?? '—';
                                        const gradeTo = (h as any).toSalaryGrade?.name ?? (h as any).to_salary_grade?.name ?? '—';

                                        return (
                                            <div key={`p-${h.id}`} className="relative">
                                                <div className="absolute -left-[31px] top-1.5 bg-emerald-550 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-emerald-50"></div>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gray-50/50 hover:bg-gray-50 p-2.5 rounded-lg border border-gray-100 transition-colors">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] py-0 px-1.5 font-semibold">Promotion</Badge>
                                                            <span className="text-xs sm:text-sm font-semibold text-gray-900">{from} <span className="text-gray-400 font-normal">→</span> {to}</span>
                                                        </div>
                                                        <div className="mt-0.5 text-[11px] text-gray-500">
                                                            Effective: {h.promotion_date ? format(new Date(h.promotion_date), 'PPP') : '—'} <span className="text-gray-300 mx-1.5">|</span> Order: <span className="font-mono text-gray-700">{orderNo}</span>
                                                        </div>
                                                        <div className="mt-0.5 text-[11px] text-gray-500 font-medium">
                                                            Grade: {gradeFrom} → {gradeTo} <span className="text-gray-300 mx-1.5">|</span> Basic: {h.from_basic_salary ? formatCurrency(h.from_basic_salary) : '—'} → {h.to_basic_salary ? formatCurrency(h.to_basic_salary) : '—'}
                                                        </div>
                                                    </div>
                                                    {h.promotion_id ? (
                                                        <Link href={route('promotions.show', h.promotion_id)} className="shrink-0">
                                                            <Button variant="outline" size="sm" className="h-7 text-[11px] px-2.5">
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
                    </TabsContent>

                    {/* EDUCATION & EXPERIENCE TAB */}
                    <TabsContent value="education" className="space-y-4 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <Section title="Educational Qualifications" icon={<GraduationCap className="w-4 h-4" />}>
                            {employee.educations && employee.educations.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Degree</th>
                                                <th className="px-3 py-2">Institute</th>
                                                <th className="px-3 py-2">Board/University</th>
                                                <th className="px-3 py-2">Group/Subject</th>
                                                <th className="px-3 py-2">Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-105">
                                            {employee.educations.map((edu, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-3 py-2 font-semibold text-gray-900">{edu.degree}</td>
                                                    <td className="px-3 py-2 text-gray-600">{edu.institute}</td>
                                                    <td className="px-3 py-2 text-gray-600">{edu.board}</td>
                                                    <td className="px-3 py-2 text-gray-600">{edu.group_name || edu.subject}</td>
                                                    <td className="px-3 py-2 text-gray-650 font-medium uppercase">{edu.result_type}: {edu.result_value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">
                                    No educational qualifications added.
                                </div>
                            )}
                        </Section>

                        <Section title="Professional Experience" icon={<Briefcase className="w-4 h-4" />}>
                            {employee.experiences && employee.experiences.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Organization</th>
                                                <th className="px-3 py-2">Designation</th>
                                                <th className="px-3 py-2">Department</th>
                                                <th className="px-3 py-2">Duration</th>
                                                <th className="px-3 py-2">Address</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-105">
                                            {employee.experiences.map((exp, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-3 py-2 font-semibold text-gray-900">{exp.organization}</td>
                                                    <td className="px-3 py-2 text-gray-600">{exp.designation}</td>
                                                    <td className="px-3 py-2 text-gray-600">{exp.department}</td>
                                                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{exp.from_date} to {exp.to_date}</td>
                                                    <td className="px-3 py-2 text-gray-600">{exp.address}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">
                                    No prior experience added.
                                </div>
                            )}
                        </Section>

                        <Section title="Training & Certifications" icon={<Award className="w-4 h-4" />}>
                            {employee.trainings && employee.trainings.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Training Title</th>
                                                <th className="px-3 py-2">Institute</th>
                                                <th className="px-3 py-2">Duration</th>
                                                <th className="px-3 py-2">Address</th>
                                                <th className="px-3 py-2">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-105">
                                            {employee.trainings.map((trn, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-3 py-2 font-semibold text-gray-900">{trn.training_title}</td>
                                                    <td className="px-3 py-2 text-gray-600">{trn.institute}</td>
                                                    <td className="px-3 py-2 text-gray-600">{trn.duration}</td>
                                                    <td className="px-3 py-2 text-gray-600">{trn.address}</td>
                                                    <td className="px-3 py-2 text-gray-600">{trn.remarks}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">
                                    No training records added.
                                </div>
                            )}
                        </Section>
                    </TabsContent>

                    {/* FINANCIAL & RECORDS TAB */}
                    <TabsContent value="financial" className="space-y-4 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Salary Details" icon={<CreditCard className="w-4 h-4" />}>
                                <div className="space-y-1">
                                    <DataItem label="Payscale" value={employee.payscale?.name} />
                                    <DataItem label="Salary Grade" value={employee.salaryGrade?.name || employee.salary_grade?.name} />
                                    <DataItem label="Salary Step" value={employee.salaryStep?.step_number ? `Step ${employee.salaryStep.step_number}` : (employee.salary_step?.step_number ? `Step ${employee.salary_step.step_number}` : '')} />
                                    <DataItem label="Basic Salary" value={employee.basic_salary ? formatCurrency(employee.basic_salary) : ''} />
                                </div>
                            </Section>

                            <Section title="Bank Account" icon={<Building className="w-4 h-4" />}>
                                {employee.bank ? (
                                    <div className="space-y-1">
                                        <DataItem label="Bank Name" value={employee.bank.bank_name} />
                                        <DataItem label="Branch Name" value={employee.bank.branch_name} />
                                        <DataItem label="Account No." value={employee.bank.account_no} />
                                        <DataItem label="Account Type" value={employee.bank.account_type} />
                                        <DataItem label="Bank Address" value={employee.bank.bank_address} />
                                        <DataItem label="Remark" value={employee.bank.remark} />
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-450 italic py-4 text-center">No bank account details provided.</div>
                                )}
                            </Section>
                        </div>

                        <Section title="Nominees" icon={<HeartHandshake className="w-4 h-4" />}>
                            {employee.nominees && employee.nominees.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {employee.nominees.map((nominee, i) => {
                                        const share = pickRowField(nominee, 'share_percentage', 'share');
                                        const contact = pickRowField(nominee, 'mobile', 'contact');
                                        return (
                                            <div key={i} className="bg-gray-55/40 border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-center mb-2 gap-2 border-b border-gray-200/50 pb-1.5">
                                                    <h4 className="font-bold text-xs text-gray-900 truncate">{nominee.name}</h4>
                                                    {share && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] py-0 px-1.5 shrink-0 font-semibold">{share}% Share</Badge>}
                                                </div>
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    <div className="flex justify-between"><span className="text-gray-400">Relation:</span> <span className="font-semibold text-gray-800">{nominee.relation || '—'}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-400">DOB:</span> <span className="font-semibold text-gray-800">{formatOptionalDate(nominee.date_of_birth as string)}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-400">Contact:</span> <span className="font-semibold text-gray-800">{contact || '—'}</span></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No nominees assigned.</div>
                            )}
                        </Section>

                        <Section title="References & Guarantors" icon={<ShieldCheck className="w-4 h-4" />}>
                            {employee.guarantors && employee.guarantors.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {employee.guarantors.map((guarantor, i) => (
                                        <div key={i} className="bg-gray-55/40 border border-gray-100 rounded-lg p-3">
                                            <h4 className="font-bold text-xs text-gray-900 border-b border-gray-200/50 pb-1.5 mb-2">{guarantor.name}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600">
                                                <DataItem label="Father's Name" value={pickRowField(guarantor, 'father_name')} />
                                                <DataItem label="Mobile" value={pickRowField(guarantor, 'mobile', 'phone')} />
                                                <DataItem label="NID" value={pickRowField(guarantor, 'nid')} />
                                                <DataItem label="Relation" value={pickRowField(guarantor, 'relation')} />
                                                <DataItem label="Age" value={pickRowField(guarantor, 'age')} />
                                                <DataItem label="Profession" value={pickRowField(guarantor, 'profession', 'occupation')} />
                                                <DataItem label="Organization" value={pickRowField(guarantor, 'organization')} />
                                                <DataItem label="Designation" value={pickRowField(guarantor, 'designation')} />
                                                <DataItem label="Email" value={pickRowField(guarantor, 'email')} />
                                                <div className="sm:col-span-2">
                                                    <DataItem label="Address" value={pickRowField(guarantor, 'address')} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No guarantors assigned.</div>
                            )}
                        </Section>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Security Cheques" icon={<ShieldCheck className="w-4 h-4" />}>
                                {employee.guarantor_cheques && employee.guarantor_cheques.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                                <tr>
                                                    <th className="px-3 py-2">Bank Name</th>
                                                    <th className="px-3 py-2">Branch</th>
                                                    <th className="px-3 py-2">Cheque No.</th>
                                                    <th className="px-3 py-2">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-105">
                                                {employee.guarantor_cheques.map((cheque, i) => (
                                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-3 py-2 font-semibold text-gray-900">{cheque.bank_name || '—'}</td>
                                                        <td className="px-3 py-2 text-gray-600">{cheque.branch_name || '—'}</td>
                                                        <td className="px-3 py-2 text-gray-600">{cheque.cheque_no || '—'}</td>
                                                        <td className="px-3 py-2 text-gray-600">{cheque.amount ? formatCurrency(cheque.amount) : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No security cheques registered.</div>
                                )}
                            </Section>

                            <Section title="Collateral & Deposits" icon={<Shield className="w-4 h-4" />}>
                                {employee.collateral ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={employee.collateral.has_certificate ? 'default' : 'secondary'} className={employee.collateral.has_certificate ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'text-gray-500 bg-gray-50 border-gray-200'}>
                                                {employee.collateral.has_certificate ? 'Certificate Submitted' : 'No Certificate'}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <DataItem label="Security Amount" value={employee.collateral.security_amount ? formatCurrency(employee.collateral.security_amount) : ''} />
                                            <DataItem label="Collateral Interest" value={employee.collateral.collateral_interest ? `${employee.collateral.collateral_interest}%` : ''} />
                                            <DataItem label="Collateral Date" value={employee.collateral.collateral_date ? formatOptionalDate(employee.collateral.collateral_date) : ''} />
                                            <DataItem label="Security Notes" value={employee.collateral.notes} />
                                        </div>
                                        {collateralCertificateLevels.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Certificate Levels</span>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {collateralCertificateLevels.map((level) => (
                                                        <Badge key={level} variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px] py-0 px-1.5">{level}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No collateral information provided.</div>
                                )}
                            </Section>
                        </div>

                        {employee.collateral && employee.collateral_receive_cheques && employee.collateral_receive_cheques.length > 0 && (
                            <Section title="Collateral Receive Cheques" icon={<Shield className="w-4 h-4" />}>
                                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Bank Name</th>
                                                <th className="px-3 py-2">Branch</th>
                                                <th className="px-3 py-2">Cheque No.</th>
                                                <th className="px-3 py-2">Amount</th>
                                                <th className="px-3 py-2">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-105">
                                            {employee.collateral_receive_cheques.map((cheque, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-3 py-2 font-semibold text-gray-900">{cheque.bank_name || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{cheque.branch_name || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{cheque.cheque_no || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{cheque.amount ? formatCurrency(cheque.amount) : '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{cheque.notes || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Section>
                        )}

                        <Section title="Assigned Assets" icon={<FolderOpen className="w-4 h-4" />}>
                            {employee.assets && employee.assets.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-105 shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Asset Name</th>
                                                <th className="px-3 py-2">Asset No.</th>
                                                <th className="px-3 py-2">Serial No.</th>
                                                <th className="px-3 py-2">Qty</th>
                                                <th className="px-3 py-2">Details</th>
                                                <th className="px-3 py-2">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-105">
                                            {employee.assets.map((asset, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-3 py-2 font-semibold text-gray-900">{pickRowField(asset, 'asset_name', 'name')}</td>
                                                    <td className="px-3 py-2 text-gray-600">{pickRowField(asset, 'asset_no') || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{pickRowField(asset, 'serial_no', 'serial') || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{pickRowField(asset, 'provided_qty', 'provided_quality') || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{pickRowField(asset, 'asset_details', 'details') || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{asset.asset_price ? formatCurrency(asset.asset_price) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No assets assigned.</div>
                            )}
                        </Section>
                    </TabsContent>

                    {/* DOCUMENTS TAB */}
                    <TabsContent value="documents" className="space-y-4 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <Section title="Employee Documents" icon={<FileText className="w-4 h-4" />}>
                            {employee.documents && employee.documents.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="px-3 py-2">Type</th>
                                                <th className="px-3 py-2">Title</th>
                                                <th className="px-3 py-2">Description</th>
                                                <th className="px-3 py-2">Expiry Date</th>
                                                <th className="px-3 py-2">File</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-105">
                                            {employee.documents.map((doc) => (
                                                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-3 py-2">
                                                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px] py-0 px-1.5 font-semibold">
                                                            {formatEmployeeDocumentTypeLabel(doc.document_type)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-2 font-semibold text-gray-900">{doc.title}</td>
                                                    <td className="px-3 py-2 text-gray-600">{doc.description || '—'}</td>
                                                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{doc.expiry_date ? formatOptionalDate(doc.expiry_date) : '—'}</td>
                                                    <td className="px-3 py-2">
                                                        {doc.file_path ? (
                                                            <a href={`/storage/${doc.file_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-semibold">
                                                                <Download className="h-3.5 w-3.5" />
                                                                Download
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-400 italic">No file</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No documents uploaded.</div>
                            )}
                            <div className="mt-4 text-center no-print">
                                <Link href={route('employees.documents.index', employee.id)}>
                                    <Button variant="outline" size="sm" className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                        Manage Documents
                                    </Button>
                                </Link>
                            </div>
                        </Section>
                    </TabsContent>

                    {/* LEAVES & MOVEMENT TAB */}
                    <TabsContent value="leave" className="space-y-4 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <Section title="Leave Balances (Current Year)" icon={<Calendar className="w-4 h-4" />}>
                            {currentYearLeaveBalances && currentYearLeaveBalances.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {currentYearLeaveBalances.map((balance) => (
                                        <div key={balance.id} className="bg-gray-50/50 border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-xs text-gray-900">{balance.leave_type.name}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{balance.leave_type.is_paid ? 'Paid' : 'Unpaid'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-emerald-600">{balance.remaining_days}</div>
                                                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Remaining</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] font-medium text-gray-500">
                                                    <span>Used: {balance.used_days}</span>
                                                    <span>Allocated: {balance.allocated_days}</span>
                                                </div>
                                                <Progress value={(balance.used_days / balance.allocated_days) * 100} className="h-1.5 bg-gray-100" indicatorClassName="bg-emerald-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-550 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No leave balances found for current year.</div>
                            )}
                        </Section>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Section title="Recent Leave Applications" icon={<CalendarIcon className="w-4 h-4" />}>
                                {recentLeaveApplications && recentLeaveApplications.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {recentLeaveApplications.map((leave) => (
                                            <div key={leave.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50/30 transition-colors shadow-sm bg-white">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <h4 className="font-semibold text-xs text-gray-900">{leave.leave_type.name}</h4>
                                                    {getLeaveStatusBadge(leave.status)}
                                                </div>
                                                <div className="flex items-center text-[11px] text-gray-600 mb-1.5 bg-gray-50 p-1.5 rounded w-fit">
                                                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                                    <span className="font-medium">{formatDateRange(leave.start_date, leave.end_date)}</span>
                                                    <span className="mx-1.5 text-gray-300">|</span>
                                                    <span className="font-bold text-emerald-600">{leave.days} day{leave.days !== 1 ? 's' : ''}</span>
                                                </div>
                                                {leave.reason && <p className="text-[11px] text-gray-500 line-clamp-1 mt-1">{leave.reason}</p>}
                                            </div>
                                        ))}
                                        <div className="pt-1.5 text-center">
                                            <Link href={route('employees.leaves.index', employee.id)}>
                                                <Button variant="link" className="text-emerald-600 text-xs py-0 h-auto font-semibold">View All Leaves &rarr;</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-xs text-gray-550 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No recent leave applications.</div>
                                )}
                            </Section>

                            <Section title="Recent Movements" icon={<Activity className="w-4 h-4" />}>
                                {recentMovements && recentMovements.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {recentMovements.map((movement) => (
                                            <div key={movement.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50/30 transition-colors shadow-sm bg-white">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-semibold ${movement.movement_type === 'official' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                                                            {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                                                        </Badge>
                                                        <h4 className="font-semibold text-xs text-gray-950 truncate max-w-[120px] sm:max-w-[180px]">{movement.purpose}</h4>
                                                    </div>
                                                    {getMovementStatusBadge(movement.status)}
                                                </div>
                                                <div className="flex items-center text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded">
                                                    <Timer className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                                    <span className="font-medium">{formatDateTimeRange(movement.from_datetime, movement.actual_return_datetime)}</span>
                                                </div>
                                                {movement.destination && (
                                                    <div className="flex items-center text-[11px] text-gray-500 mt-1.5 px-1">
                                                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
                                                        <span>{movement.destination}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div className="pt-1.5 text-center">
                                            <Link href={route('employees.movements.index', employee.id)}>
                                                <Button variant="link" className="text-emerald-600 text-xs py-0 h-auto font-semibold">View All Movements &rarr;</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-xs text-gray-550 italic bg-gray-55 rounded-lg border border-dashed border-gray-200">No recent movements.</div>
                                )}
                            </Section>
                        </div>
                    </TabsContent>
                </Tabs>
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
