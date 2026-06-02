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
    CreditCard, Award, HeartHandshake, FolderOpen, Activity, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface Department { id: number; name: string; }
interface Designation { id: number; name: string; }
interface Branch { id: number; name: string; }
interface Manager { id: number; first_name: string; last_name: string; employee_id: string; pin?: string; name_en?: string; }

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

type Address = { type: 'present' | 'permanent'; division: string; district: string; upazila: string; union: string; village: string; address_details: string; };
type Education = { degree: string; institute: string; group_name: string; board: string; subject: string; result_type: string; result_value: string; };
type Nominee = { name: string; relation: string; date_of_birth: string; share: string; contact: string; };
type Guarantor = { name: string; age: string; occupation: string; relation: string; phone: string; email: string; };
type Cheque = { bank_name: string; branch_name: string; cheque_no: string; notes?: string; };
type Asset = { serial: string; asset_no: string; name: string; details: string; provided_quality: string; asset_price: string; };
type Experience = { organization: string; from_date: string; to_date: string; designation: string; department: string; address: string; };
type Training = { training_title: string; institute: string; address: string; duration: string; remarks: string; };

interface EmployeeType { id: number; name: string; probation_months: number; }

interface Employee {
    id: number; employee_id: string; first_name: string | null; last_name: string | null; email: string; phone: string; gender: string; blood_group: string; date_of_birth: string; joining_date: string; confirmation_date?: string; address: string; photo: string | null; nid: string; nid_number?: string; smart_card_number?: string; birth_registration_number?: string; emergency_contact: string;
    employee_type?: EmployeeType | null;
    employeeType?: EmployeeType | null;
    department: Department; designation: Designation; branch: Branch; manager: Manager | null; status: string; resignation_date?: string; dropout_date?: string; dropout_reason?: string; final_payment_date?: string; last_promotion_date?: string; probation_period_days?: number | null; total_service_length_days?: number | null; service_length_from_confirmation_days?: number | null; staff_age_years?: number | null; length_of_service_on_last_promotion_days?: number | null; joining_designation_name?: string; last_designation_name?: string; last_branch_name?: string; pin?: string; name_en?: string; full_name_en?: string | null; name_bn?: string; email_id?: string;

    // Additional fields mapped from create page
    religion?: string; marital_status?: string; spouse_name?: string; spouse_mobile?: string; birth_date_certificate?: string; birth_date_original?: string;
    fathers_name?: string; fathers_mobile?: string; mothers_name?: string; mothers_mobile?: string;
    tin_certificate_no?: string; driving_license_no?: string; passport_no?: string;
    payscale?: { id: number; name: string }; salaryGrade?: { id: number; name: string }; salary_grade?: { id: number; name: string }; salaryStep?: { id: number; step_number: number }; salary_step?: { id: number; step_number: number };
    is_project_employee?: boolean; is_custodian?: boolean; identification_mark?: string;
    mobile_personal?: string; mobile_official?: string;
    addresses?: Address[]; educations?: Education[];
    bank?: { bank_name: string; branch_name: string; account_no: string; account_type: string; bank_address: string; remark: string; };
    nominees?: Nominee[]; guarantors?: Guarantor[]; guarantor_cheques?: Cheque[];
    collateral?: { has_certificate: boolean; certificate_levels: string[]; security_amount: string; collateral_interest: string; collateral_date: string; notes: string; };
    collateral_receive_cheques?: Cheque[]; assets?: Asset[]; experiences?: Experience[]; trainings?: Training[];

    // Salary specific
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
}

const getLeaveStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-rose-100 text-rose-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
        <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
            {config.icon}
            <span className="capitalize">{status}</span>
        </Badge>
    );
};

const getMovementStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-rose-100 text-rose-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
        completed: { color: 'bg-teal-100 text-teal-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
        <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
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
    <div className="flex flex-col space-y-1.5 border-b border-gray-100/50 pb-3 h-full justify-end">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-[14px] font-medium text-gray-800 break-words">{value || <span className="text-gray-300 italic">Not Provided</span>}</span>
    </div>
);

const Section = ({ title, icon, children, className = "" }: { title: string, icon?: React.ReactNode, children: React.ReactNode, className?: string }) => (
    <Card className={`mb-6 border-none shadow-[0_2px_10px_-3px_rgba(16,185,129,0.1)] rounded-xl overflow-hidden ${className}`}>
        <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-white border-b border-emerald-50 py-4 px-6">
            <CardTitle className="text-[16px] font-bold flex items-center gap-2 text-emerald-900">
                {icon} {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
            {children}
        </CardContent>
    </Card>
);

const StatCard = ({ title, value, icon, subtitle }: { title: string, value: string, icon: React.ReactNode, subtitle: string }) => (
    <div className="bg-white p-5 rounded-xl border border-emerald-50 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.15)] transition-all duration-300 flex items-start gap-4">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">{icon}</div>
        <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</h4>
            <div className="text-lg font-bold text-gray-900 mb-1">{value}</div>
            <p className="text-[11px] text-gray-500">{subtitle}</p>
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
}: EmployeeShowProps) {
    const isDropout = !!employee.dropout_date;

    const getEmployeeDisplayName = (): string => {
        const fromEn = (employee.full_name_en || employee.name_en || '').trim();
        if (fromEn) return fromEn;
        const parts = [employee.first_name, employee.last_name].filter(p => p != null && String(p).trim() !== '');
        if (parts.length) return parts.join(' ');
        return String(employee.pin || employee.employee_id || 'Employee');
    };

    const getInitials = (): string => {
        const name = getEmployeeDisplayName().trim();
        const tokens = name.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) return `${tokens[0].charAt(0)}${tokens[tokens.length - 1].charAt(0)}`.toUpperCase();
        if (tokens.length === 1 && tokens[0].length >= 2) return tokens[0].slice(0, 2).toUpperCase();
        if (tokens.length === 1 && tokens[0].length === 1) return tokens[0].toUpperCase();
        const id = String(employee.pin || employee.employee_id || '?').replace(/\s+/g, '');
        return id.length >= 2 ? id.slice(0, 2).toUpperCase() : (id.charAt(0) || '?').toUpperCase();
    };

    const serviceEndDate = employee.dropout_date || employee.resignation_date || format(new Date(), 'yyyy-MM-dd');
    const totalServiceYmd = calculateYmd(employee.joining_date, serviceEndDate);

    // Confirmation Service
    const confirmationServiceYmd = employee.confirmation_date ? calculateYmd(employee.confirmation_date, serviceEndDate) : 'Not Confirmed';

    // Probation Period
    let probationYmd = calculateYmd(employee.joining_date, employee.confirmation_date);
    const probMonths = employee.employee_type?.probation_months || employee.employeeType?.probation_months;
    if (!employee.confirmation_date && probMonths) {
        probationYmd = `${probMonths} Months`;
    }

    // Duration from Last Promotion
    const durationFromLastPromotionYmd = employee.last_promotion_date ? calculateYmd(employee.last_promotion_date, serviceEndDate) : 'N/A (No Promotion)';

    const getStatusBadge = () => {
        const statusColors = { active: 'bg-emerald-100 text-emerald-800 border-emerald-200', inactive: 'bg-gray-100 text-gray-800 border-gray-200', on_leave: 'bg-teal-100 text-teal-800 border-teal-200', terminated: 'bg-rose-100 text-rose-800 border-rose-200', };
        const statusColor = statusColors[employee.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
        const statusLabel = (employee.status || 'unknown').replace(/_/g, ' ');
        return (
            <Badge className={`${statusColor} border shadow-sm px-3 py-1 font-medium`}>
                <span className="relative flex h-2 w-2 mr-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${employee.status === 'active' ? 'bg-emerald-400' : 'hidden'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${employee.status === 'active' ? 'bg-emerald-500' : (employee.status === 'on_leave' ? 'bg-teal-500' : 'bg-gray-500')}`}></span>
                </span>
                {statusLabel ? statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1) : '—'}
            </Badge>
        );
    };

    const hasSalaryGrade = !!employee.salary_grade_id;

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
        return [...transfers, ...promotions].sort((a, b) => {
            const ad = new Date(a.date).getTime();
            const bd = new Date(b.date).getTime();
            return bd - ad;
        });
    }, [promotionHistories, transferHistories]);

    const handlePrintIdCard = () => {
        document.body.classList.add('print-id-card');
        setTimeout(() => {
            window.print();
            document.body.classList.remove('print-id-card');
        }, 100);
    };

    return (
        <Layout>
            <Head title={`Employee: ${getEmployeeDisplayName()}`} />

            {/* Print Styles */}
            <style>{`
              @media print {
                html, body { background: #fff !important; }
                .no-print { display: none !important; }
                .print-only { display: block !important; }
                .container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
                
                /* Hide global layout elements globally during print */
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

            <div className="container mx-auto py-8 max-w-7xl space-y-6 cv-section">

                {/* Back Button */}
                <Link href={route('employees.index')} className="no-print inline-flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
                </Link>

                {/* Hero Header Card */}
                <div className="relative bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-emerald-50 overflow-hidden">
                    {/* Darker Premium Banner */}
                    <div className="h-32 md:h-44 bg-gradient-to-r from-[#064e3b] via-[#0f766e] to-[#047857] relative">
                        {/* Subtle overlay pattern for premium feel */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8cGF0aCBkPSJNMCAwbDhfOFpNOCAwTDBfOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')" }}></div>
                    </div>

                    <div className="px-6 sm:px-10 pb-8 relative">
                        {/* Absolute positioned Avatar so it strictly overlaps without disrupting flex layout */}
                        <div className="absolute -top-16 md:-top-20 left-1/2 transform -translate-x-1/2 md:left-10 md:translate-x-0">
                            <Avatar className="h-32 w-32 md:h-44 md:w-44 border-[6px] border-white shadow-xl bg-white shrink-0">
                                {employee.photo ? (
                                    <AvatarImage src={`/storage/${employee.photo}`} alt={getEmployeeDisplayName()} className="object-cover" />
                                ) : (
                                    <AvatarFallback className="text-4xl md:text-5xl font-bold bg-emerald-50 text-emerald-600">
                                        {getInitials()}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                        </div>

                        {/* Top spacing on mobile so text avoids avatar; pl on desktop to sit next to avatar */}
                        <div className="pt-20 md:pt-4 flex flex-col xl:flex-row xl:items-start justify-between gap-6 md:pl-[200px]">

                            {/* Information Block - Safely in the white area */}
                            <div className="text-center md:text-left space-y-4 w-full">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex flex-col sm:flex-row items-center md:items-baseline gap-1 sm:gap-3 justify-center md:justify-start">
                                        <span>{getEmployeeDisplayName()}</span>
                                        {employee.name_bn && <span className="text-lg sm:text-xl text-gray-500 font-medium">({employee.name_bn})</span>}
                                    </h1>
                                </div>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-gray-600">
                                    <span className="flex items-center bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full shadow-sm"><Briefcase className="w-4 h-4 mr-2 text-emerald-600" /> {employee.designation?.name || employee.last_designation_name || 'Designation N/A'}</span>
                                    <span className="flex items-center bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full shadow-sm"><Building className="w-4 h-4 mr-2 text-teal-600" /> {employee.department?.name || 'Department N/A'}</span>
                                    <span className="flex items-center bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full shadow-sm"><MapPin className="w-4 h-4 mr-2 text-emerald-600" /> {employee.branch?.name || 'Branch N/A'}</span>
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-3">
                                    {getStatusBadge()}
                                    {employee.is_project_employee && <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"><Star className="w-3 h-3 mr-1" /> Project Staff</Badge>}
                                    {employee.is_custodian && <Badge variant="secondary" className="bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"><Shield className="w-3 h-3 mr-1" /> Custodian</Badge>}
                                    <Badge variant="outline" className="font-mono bg-white text-gray-600 border-gray-200 shadow-sm px-3 py-1">PIN: {employee.pin || employee.employee_id || 'N/A'}</Badge>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-end w-full xl:w-auto shrink-0 mt-2 xl:mt-0 no-print">
                                <Button variant="outline" onClick={handlePrintIdCard} className="shadow-sm border-gray-200 hover:bg-emerald-50 text-emerald-700 w-full sm:w-auto transition-colors">
                                    <User className="w-4 h-4 mr-2" /> Print ID Card
                                </Button>
                                <Button variant="outline" onClick={() => window.print()} className="shadow-sm border-gray-200 hover:bg-gray-50 text-gray-700 w-full sm:w-auto transition-colors">
                                    <FileText className="w-4 h-4 mr-2" /> Print CV
                                </Button>
                                <Link href={route('employees.edit', employee.id)} className="w-full sm:w-auto">
                                    <Button className="shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto transition-all">
                                        <Pencil className="w-4 h-4 mr-2" /> Edit Profile
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Probation Period" value={probationYmd || '—'} icon={<Timer className="w-6 h-6" />} subtitle="Joining Date to Confirmation Date" />
                    <StatCard title="Total Service Length" value={totalServiceYmd || '—'} icon={<Briefcase className="w-6 h-6" />} subtitle="Joining Date to Resignation/Today" />
                    <StatCard title="Service from Confirmation" value={confirmationServiceYmd || '—'} icon={<CheckCircle className="w-6 h-6" />} subtitle="Confirmation Date to Resignation/Today" />
                    <StatCard title="Duration from Last Promo" value={durationFromLastPromotionYmd || '—'} icon={<ArrowUpRight className="w-6 h-6" />} subtitle="Last Promotion to Resignation/Today" />
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="personal" className="w-full">
                    <div className="bg-white p-1.5 rounded-xl border border-emerald-50 shadow-sm mb-6 inline-block w-full overflow-x-auto">
                        <TabsList className="bg-transparent h-auto p-0 flex gap-1 min-w-max">
                            <TabsTrigger value="personal" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg py-2.5 px-5 font-medium transition-all"><User className="w-4 h-4 mr-2" /> Personal Info</TabsTrigger>
                            <TabsTrigger value="employment" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg py-2.5 px-5 font-medium transition-all"><Briefcase className="w-4 h-4 mr-2" /> Employment Info</TabsTrigger>
                            <TabsTrigger value="career" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg py-2.5 px-5 font-medium transition-all"><Activity className="w-4 h-4 mr-2" /> Career Timeline</TabsTrigger>
                            <TabsTrigger value="education" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg py-2.5 px-5 font-medium transition-all"><GraduationCap className="w-4 h-4 mr-2" /> Edu & Experience</TabsTrigger>
                            {hasSalaryGrade && (
                                <TabsTrigger value="financial" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg py-2.5 px-5 font-medium transition-all"><CreditCard className="w-4 h-4 mr-2" /> Financial & Assets</TabsTrigger>
                            )}
                            <TabsTrigger value="leave" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg py-2.5 px-5 font-medium transition-all"><Calendar className="w-4 h-4 mr-2" /> Leaves & Movement</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* PERSONAL INFO TAB */}
                    <TabsContent value="personal" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Section title="Basic Details" icon={<User className="w-5 h-5" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <DataItem label="Name (English)" value={employee.full_name_en || employee.name_en || `${employee.first_name || ''} ${employee.last_name || ''}`} />
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

                            <Section title="Contact Information" icon={<Phone className="w-5 h-5" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <DataItem label="Email" value={employee.email} />
                                    <DataItem label="Official Email ID" value={employee.email_id} />
                                    <DataItem label="Phone" value={employee.phone} />
                                    <DataItem label="Mobile (Personal)" value={employee.mobile_personal} />
                                    <DataItem label="Mobile (Official)" value={employee.mobile_official} />
                                    <DataItem label="Emergency Contact" value={employee.emergency_contact} />
                                </div>
                            </Section>

                            <Section title="Family & Relatives" icon={<Users className="w-5 h-5" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

                            <Section title="Identity Documents" icon={<Shield className="w-5 h-5" />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

                        <Section title="Addresses" icon={<MapPin className="w-5 h-5" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Present Address */}
                                <div className="bg-emerald-50/30 p-5 rounded-xl border border-emerald-100/50">
                                    <h3 className="font-semibold text-emerald-900 mb-4 flex items-center"><MapPin className="w-4 h-4 mr-2 text-emerald-500" /> Present Address</h3>
                                    {employee.addresses && employee.addresses.find(a => a.type === 'present') ? (
                                        <div className="space-y-3">
                                            {(() => {
                                                const addr = employee.addresses.find(a => a.type === 'present')!;
                                                return (
                                                    <>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">Village:</span> <span className="font-medium text-gray-900">{addr.village || '—'}</span></div>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">Union:</span> <span className="font-medium text-gray-900">{addr.union || '—'}</span></div>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">Upazila:</span> <span className="font-medium text-gray-900">{addr.upazila || '—'}</span></div>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">District:</span> <span className="font-medium text-gray-900">{addr.district || '—'}</span></div>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">Division:</span> <span className="font-medium text-gray-900">{addr.division || '—'}</span></div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 italic">No present address details provided.</div>
                                    )}
                                </div>
                                {/* Permanent Address */}
                                <div className="bg-teal-50/30 p-5 rounded-xl border border-teal-100/50">
                                    <h3 className="font-semibold text-teal-900 mb-4 flex items-center"><Building className="w-4 h-4 mr-2 text-teal-500" /> Permanent Address</h3>
                                    {employee.addresses && employee.addresses.find(a => a.type === 'permanent') ? (
                                        <div className="space-y-3">
                                            {(() => {
                                                const addr = employee.addresses.find(a => a.type === 'permanent')!;
                                                return (
                                                    <>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">Village:</span> <span className="font-medium text-gray-900">{addr.village || '—'}</span></div>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">Union:</span> <span className="font-medium text-gray-900">{addr.union || '—'}</span></div>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">Upazila:</span> <span className="font-medium text-gray-900">{addr.upazila || '—'}</span></div>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">District:</span> <span className="font-medium text-gray-900">{addr.district || '—'}</span></div>
                                                        <div className="text-sm"><span className="text-gray-500 w-24 inline-block">Division:</span> <span className="font-medium text-gray-900">{addr.division || '—'}</span></div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 italic">No permanent address details provided.</div>
                                    )}
                                </div>
                            </div>
                        </Section>
                    </TabsContent>

                    {/* EMPLOYMENT INFO TAB */}
                    <TabsContent value="employment" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <Section title="Organizational Placement" icon={<Building className="w-5 h-5" />}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <DataItem label="Department" value={employee.department?.name} />
                                <DataItem label="Current Designation" value={employee.designation?.name} />
                                <DataItem label="Joining Designation" value={employee.joining_designation_name} />
                                <DataItem label="Last Designation" value={employee.last_designation_name} />
                                <DataItem label="Current Branch" value={employee.branch?.name} />
                                <DataItem label="Last Branch" value={employee.last_branch_name} />
                                <DataItem label="Reports To (Manager)" value={employee.manager ? `${employee.manager.name_en || employee.manager.first_name} (${employee.manager.pin || employee.manager.employee_id})` : ''} />
                            </div>
                        </Section>

                        <Section title="Service Timeline" icon={<Clock className="w-5 h-5" />}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <DataItem label="Joining Date" value={employee.joining_date ? format(new Date(employee.joining_date), 'PPP') : ''} />
                                <DataItem label="Confirmation Date" value={employee.confirmation_date ? format(new Date(employee.confirmation_date), 'PPP') : ''} />
                                <DataItem label="Last Promotion Date" value={employee.last_promotion_date ? format(new Date(employee.last_promotion_date), 'PPP') : ''} />
                                <DataItem label="Joining Date at Present Location" value={employee.joining_date ? format(new Date(employee.joining_date), 'PPP') : ''} />
                            </div>
                        </Section>

                        {isDropout && (
                            <Section title="Exit Details" icon={<AlertTriangle className="w-5 h-5 text-rose-500" />} className="border-rose-100 bg-rose-50/30">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <DataItem label="Status" value={<span className="text-rose-600 font-bold">Dropout / Terminated</span>} />
                                    <DataItem label="Dropout Date" value={employee.dropout_date ? format(new Date(employee.dropout_date), 'PPP') : ''} />
                                    <DataItem label="Final Payment Date" value={employee.final_payment_date ? format(new Date(employee.final_payment_date), 'PPP') : ''} />
                                    <div className="col-span-full">
                                        <DataItem label="Dropout Reason" value={employee.dropout_reason} />
                                    </div>
                                </div>
                            </Section>
                        )}
                    </TabsContent>

                    {/* CAREER MOVEMENT TIMELINE TAB */}
                    <TabsContent value="career" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <Section title="Career Movement Timeline" icon={<Activity className="w-5 h-5" />}>
                            {careerTimeline.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    No transfer / promotion history found yet.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {careerTimeline.map((item) => {
                                        if (item.type === 'transfer') {
                                            const h = item.meta as TransferHistory;
                                            const from = (h as any).fromBranch?.name ?? (h as any).from_branch?.name ?? '—';
                                            const to = (h as any).toBranch?.name ?? (h as any).to_branch?.name ?? '—';
                                            const orderNo = h.transfer?.transfer_order_no ?? '—';
                                            return (
                                                <div
                                                    key={`t-${h.id}`}
                                                    className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge className="bg-violet-50 text-violet-700 border border-violet-100">Transfer</Badge>
                                                                <span className="text-sm font-semibold text-gray-900">{from} → {to}</span>
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-500">
                                                                Effective: {h.transfer_date ? format(new Date(h.transfer_date), 'PPP') : '—'} · Order: <span className="font-mono">{orderNo}</span>
                                                            </div>
                                                        </div>
                                                        {h.transfer_id ? (
                                                            <Link href={route('transfers.show', h.transfer_id)} className="shrink-0">
                                                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                                                    View
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
                                            <div
                                                key={`p-${h.id}`}
                                                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">Promotion</Badge>
                                                            <span className="text-sm font-semibold text-gray-900">{from} → {to}</span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            Effective: {h.promotion_date ? format(new Date(h.promotion_date), 'PPP') : '—'} · Order: <span className="font-mono">{orderNo}</span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-600">
                                                            Grade: {gradeFrom} → {gradeTo}
                                                            {' · '}
                                                            Basic: {h.from_basic_salary ?? '—'} → {h.to_basic_salary ?? '—'}
                                                        </div>
                                                    </div>
                                                    {h.promotion_id ? (
                                                        <Link href={route('promotions.show', h.promotion_id)} className="shrink-0">
                                                            <Button variant="outline" size="sm" className="h-8 text-xs">
                                                                View
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
                    <TabsContent value="education" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <Section title="Educational Qualifications" icon={<GraduationCap className="w-5 h-5" />}>
                            {employee.educations && employee.educations.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-emerald-50 text-emerald-700 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Degree</th>
                                                <th className="px-4 py-3">Institute</th>
                                                <th className="px-4 py-3">Board/University</th>
                                                <th className="px-4 py-3">Group/Subject</th>
                                                <th className="px-4 py-3">Result</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {employee.educations.map((edu, i) => (
                                                <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{edu.degree}</td>
                                                    <td className="px-4 py-3 text-gray-600">{edu.institute}</td>
                                                    <td className="px-4 py-3 text-gray-600">{edu.board}</td>
                                                    <td className="px-4 py-3 text-gray-600">{edu.group_name || edu.subject}</td>
                                                    <td className="px-4 py-3 text-gray-600 uppercase">{edu.result_type}: {edu.result_value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    No educational qualifications added.
                                </div>
                            )}
                        </Section>

                        <Section title="Professional Experience" icon={<Briefcase className="w-5 h-5" />}>
                            {employee.experiences && employee.experiences.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-emerald-50 text-emerald-700 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Organization</th>
                                                <th className="px-4 py-3">Designation</th>
                                                <th className="px-4 py-3">Department</th>
                                                <th className="px-4 py-3">Duration</th>
                                                <th className="px-4 py-3">Address</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {employee.experiences.map((exp, i) => (
                                                <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{exp.organization}</td>
                                                    <td className="px-4 py-3 text-gray-600">{exp.designation}</td>
                                                    <td className="px-4 py-3 text-gray-600">{exp.department}</td>
                                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{exp.from_date} to {exp.to_date}</td>
                                                    <td className="px-4 py-3 text-gray-600">{exp.address}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    No prior experience added.
                                </div>
                            )}
                        </Section>

                        <Section title="Training & Certifications" icon={<Award className="w-5 h-5" />}>
                            {employee.trainings && employee.trainings.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-emerald-50 text-emerald-700 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Training Title</th>
                                                <th className="px-4 py-3">Institute</th>
                                                <th className="px-4 py-3">Duration</th>
                                                <th className="px-4 py-3">Address</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {employee.trainings.map((trn, i) => (
                                                <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{trn.training_title}</td>
                                                    <td className="px-4 py-3 text-gray-600">{trn.institute}</td>
                                                    <td className="px-4 py-3 text-gray-600">{trn.duration}</td>
                                                    <td className="px-4 py-3 text-gray-600">{trn.address}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    No training records added.
                                </div>
                            )}
                        </Section>
                    </TabsContent>

                    {/* FINANCIAL & ASSETS TAB - CONDITIONALLY RENDERED */}
                    {hasSalaryGrade && (
                        <TabsContent value="financial" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Section title="Salary & Bank Account" icon={<CreditCard className="w-5 h-5" />}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <DataItem label="Payscale" value={employee.payscale?.name} />
                                        <DataItem label="Salary Grade" value={employee.salaryGrade?.name || employee.salary_grade?.name} />
                                        <DataItem label="Salary Step" value={employee.salaryStep?.step_number ? `Step ${employee.salaryStep.step_number}` : (employee.salary_step?.step_number ? `Step ${employee.salary_step.step_number}` : '')} />
                                        <DataItem label="Basic Salary" value={employee.basic_salary ? `৳ ${employee.basic_salary}` : ''} />
                                        <div className="col-span-full mt-2">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bank Details</h4>
                                            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-100">
                                                <DataItem label="Bank Name" value={employee.bank?.bank_name} />
                                                <DataItem label="Branch Name" value={employee.bank?.branch_name} />
                                                <DataItem label="Account No." value={employee.bank?.account_no} />
                                                <DataItem label="Account Type" value={employee.bank?.account_type} />
                                            </div>
                                        </div>
                                    </div>
                                </Section>

                                <Section title="Collateral Info" icon={<Shield className="w-5 h-5" />}>
                                    {employee.collateral ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant={employee.collateral.has_certificate ? "default" : "secondary"} className={employee.collateral.has_certificate ? "bg-emerald-100 text-emerald-800" : ""}>
                                                    {employee.collateral.has_certificate ? "Certificate Submitted" : "No Certificate"}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <DataItem label="Security Amount" value={employee.collateral.security_amount ? `৳ ${employee.collateral.security_amount}` : ''} />
                                                <DataItem label="Collateral Interest" value={employee.collateral.collateral_interest ? `${employee.collateral.collateral_interest}%` : ''} />
                                                <DataItem label="Collateral Date" value={employee.collateral.collateral_date ? format(new Date(employee.collateral.collateral_date), 'PPP') : ''} />
                                            </div>
                                            {employee.collateral.certificate_levels && employee.collateral.certificate_levels.length > 0 && (
                                                <div className="mt-2">
                                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Certificate Levels</span>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {employee.collateral.certificate_levels.map(l => <Badge key={l} variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">{l}</Badge>)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 italic">No collateral information provided.</div>
                                    )}
                                </Section>
                            </div>

                            <Section title="Nominees" icon={<HeartHandshake className="w-5 h-5" />}>
                                {employee.nominees && employee.nominees.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {employee.nominees.map((nominee, i) => (
                                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h4 className="font-bold text-gray-900">{nominee.name}</h4>
                                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">{nominee.share}% Share</Badge>
                                                </div>
                                                <div className="space-y-2 text-sm text-gray-600">
                                                    <div className="flex justify-between"><span className="text-gray-400">Relation:</span> <span className="font-medium">{nominee.relation}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-400">DOB:</span> <span className="font-medium">{nominee.date_of_birth}</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-400">Contact:</span> <span className="font-medium">{nominee.contact}</span></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">No nominees assigned.</div>
                                )}
                            </Section>

                            <Section title="Guarantors" icon={<Users className="w-5 h-5" />}>
                                {employee.guarantors && employee.guarantors.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {employee.guarantors.map((guarantor, i) => (
                                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row gap-6">
                                                <div className="flex-1 space-y-3">
                                                    <h4 className="font-bold text-gray-900 text-lg border-b pb-2">{guarantor.name}</h4>
                                                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                        <div><span className="text-gray-400 block text-xs">Relation</span> <span className="font-medium">{guarantor.relation}</span></div>
                                                        <div><span className="text-gray-400 block text-xs">Age</span> <span className="font-medium">{guarantor.age}</span></div>
                                                        <div><span className="text-gray-400 block text-xs">Occupation</span> <span className="font-medium">{guarantor.occupation}</span></div>
                                                        <div><span className="text-gray-400 block text-xs">Phone</span> <span className="font-medium">{guarantor.phone}</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">No guarantors assigned.</div>
                                )}
                            </Section>

                            <Section title="Organizational Assets" icon={<FolderOpen className="w-5 h-5" />}>
                                {employee.assets && employee.assets.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-emerald-50 text-emerald-700 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">Asset Name</th>
                                                    <th className="px-4 py-3">Asset No. / Serial</th>
                                                    <th className="px-4 py-3">Details</th>
                                                    <th className="px-4 py-3">Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {employee.assets.map((asset, i) => (
                                                    <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-gray-900">{asset.name}</td>
                                                        <td className="px-4 py-3 text-gray-600">{asset.asset_no} {asset.serial ? `(SN: ${asset.serial})` : ''}</td>
                                                        <td className="px-4 py-3 text-gray-600">{asset.details}</td>
                                                        <td className="px-4 py-3 text-gray-600">{asset.asset_price ? `৳ ${asset.asset_price}` : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">No assets assigned.</div>
                                )}
                            </Section>
                        </TabsContent>
                    )}

                    {/* LEAVES & MOVEMENT TAB */}
                    <TabsContent value="leave" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                        <Section title="Leave Balances (Current Year)" icon={<Calendar className="w-5 h-5" />}>
                            {currentYearLeaveBalances && currentYearLeaveBalances.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {currentYearLeaveBalances.map((balance) => (
                                        <div key={balance.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex justify-between items-end mb-4">
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{balance.leave_type.name}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">{balance.leave_type.is_paid ? 'Paid Leave' : 'Unpaid Leave'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-black text-emerald-600">{balance.remaining_days}</div>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Days Left</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-gray-500">Used: {balance.used_days}</span>
                                                    <span className="text-gray-500">Total: {balance.allocated_days}</span>
                                                </div>
                                                <Progress value={(balance.used_days / balance.allocated_days) * 100} className="h-2 bg-emerald-100" indicatorClassName="bg-emerald-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">No leave balances found for current year.</div>
                            )}
                        </Section>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Section title="Recent Leave Applications" icon={<CalendarIcon className="w-5 h-5" />}>
                                {recentLeaveApplications && recentLeaveApplications.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentLeaveApplications.map((leave) => (
                                            <div key={leave.id} className="border border-gray-100 rounded-xl p-4 hover:bg-emerald-50/30 transition-colors shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-semibold text-gray-900">{leave.leave_type.name}</h4>
                                                    {getLeaveStatusBadge(leave.status)}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600 mb-2 bg-gray-100/50 p-2 rounded-lg w-fit">
                                                    <Calendar className="h-4 w-4 mr-2 text-emerald-500" />
                                                    <span className="font-medium">{formatDateRange(leave.start_date, leave.end_date)}</span>
                                                    <span className="mx-2 text-gray-300">|</span>
                                                    <span className="font-bold text-emerald-600">{leave.days} day{leave.days !== 1 ? 's' : ''}</span>
                                                </div>
                                                {leave.reason && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{leave.reason}</p>}
                                            </div>
                                        ))}
                                        <div className="pt-2 text-center">
                                            <Link href={route('employees.leaves.index', employee.id)}>
                                                <Button variant="link" className="text-emerald-600">View All Leaves &rarr;</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">No recent leave applications.</div>
                                )}
                            </Section>

                            <Section title="Recent Movements" icon={<Activity className="w-5 h-5" />}>
                                {recentMovements && recentMovements.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentMovements.map((movement) => (
                                            <div key={movement.id} className="border border-gray-100 rounded-xl p-4 hover:bg-emerald-50/30 transition-colors shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={`${movement.movement_type === 'official' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                                                            {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                                                        </Badge>
                                                        <h4 className="font-semibold text-gray-900">{movement.purpose}</h4>
                                                    </div>
                                                    {getMovementStatusBadge(movement.status)}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600 mt-3 bg-gray-100/50 p-2 rounded-lg">
                                                    <Timer className="h-4 w-4 mr-2 text-gray-400" />
                                                    <span className="font-medium">{formatDateTimeRange(movement.from_datetime, movement.actual_return_datetime)}</span>
                                                </div>
                                                {movement.destination && (
                                                    <div className="flex items-center text-sm text-gray-600 mt-2 px-2">
                                                        <MapPin className="h-4 w-4 mr-2 text-rose-400" />
                                                        <span>{movement.destination}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div className="pt-2 text-center">
                                            <Link href={route('employees.movements.index', employee.id)}>
                                                <Button variant="link" className="text-emerald-600">View All Movements &rarr;</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">No recent movements.</div>
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
                        {/* Wavy curve at the bottom of the green section */}
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
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#1f2937', lineHeight: '1.2' }}>{employee.full_name_en || employee.name_en || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Employee'}</div>
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
