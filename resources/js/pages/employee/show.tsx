import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    Building,
    User,
    AlertTriangle,
    Pencil,
    UserCheck,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    XCircle,
    Timer,
    CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
        <div className="col-span-5 text-[12px] text-gray-500 leading-5">{label}</div>
        <div className="col-span-7 text-[13px] text-gray-900 leading-5 break-words">{value}</div>
    </div>
);

interface Department {
    id: number;
    name: string;
}

interface Designation {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface Manager {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
}

interface LeaveType {
    id: number;
    name: string;
    days_allowed: number;
    is_paid: boolean;
    description: string | null;
    carry_forward: boolean;
}

interface LeaveBalance {
    id: number;
    employee_id: number;
    leave_type_id: number;
    year: number;
    allocated_days: number;
    used_days: number;
    remaining_days: number;
    leave_type: LeaveType;
}

interface LeaveApplication {
    id: number;
    employee_id: number;
    leave_type_id: number;
    start_date: string;
    end_date: string;
    days: number;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    approved_by: number | null;
    applied_at: string;
    documents: string[] | null;
    rejection_reason: string | null;
    leave_type: LeaveType;
    created_at: string;
}

interface Movement {
    id: number;
    employee_id: number;
    movement_type: 'official' | 'personal';
    from_datetime: string;
    actual_return_datetime: string;
    purpose: string;
    destination: string | null;
    remarks: string | null;
    approved_by: number | null;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    created_at: string;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string;
    gender: string;
    blood_group: string;
    date_of_birth: string;
    joining_date: string;
    confirmation_date?: string;
    address: string;
    photo: string | null;
    nid: string;
    nid_number?: string;
    smart_card_number?: string;
    birth_registration_number?: string;
    emergency_contact: string;
    department: Department;
    designation: Designation;
    branch: Branch;
    manager: Manager | null;
    status: string;
    // Financial details are managed in Payroll module
    resignation_date?: string;
    dropout_date?: string;
    dropout_reason?: string;
    final_payment_date?: string;
    last_promotion_date?: string;
    probation_period_days?: number | null;
    total_service_length_days?: number | null;
    service_length_from_confirmation_days?: number | null;
    staff_age_years?: number | null;
    length_of_service_on_last_promotion_days?: number | null;
    joining_designation_name?: string;
    last_designation_name?: string;
    last_branch_name?: string;
    pin?: string;
    name_en?: string;
    full_name_en?: string | null;
    name_bn?: string;
    email_id?: string;
}

interface EmployeeShowProps {
    employee: Employee;
    currentYearLeaveBalances: LeaveBalance[];
    recentLeaveApplications: LeaveApplication[];
    recentMovements: Movement[];
}

// Helper function to get status badge for leave applications
const getLeaveStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
        <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
            {config.icon}
            <span className="capitalize">{status}</span>
        </Badge>
    );
};

// Helper function to get status badge for movements
const getMovementStatusBadge = (status: string) => {
    const statusConfig = {
        pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
        approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
        completed: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
        <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
            {config.icon}
            <span className="capitalize">{status}</span>
        </Badge>
    );
};

// Format date range for leaves
const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start.toDateString() === end.toDateString()) {
        return format(start, 'PPP');
    }

    return `${format(start, 'PP')} - ${format(end, 'PP')}`;
};

// Format datetime range for movements
const formatDateTimeRange = (fromDatetime: string, toDatetime: string) => {
    const from = new Date(fromDatetime);
    const to = new Date(toDatetime);

    const sameDay = from.toDateString() === to.toDateString();

    if (sameDay) {
        return `${format(from, 'PP')}, ${format(from, 'p')} - ${format(to, 'p')}`;
    }

    return `${format(from, 'PP p')} - ${format(to, 'PP p')}`;
};

const calculateYmd = (startDate: string | null | undefined, endDate: string | null | undefined): string | null => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

    // Ensure start <= end
    let s = start;
    let e = end;
    if (s.getTime() > e.getTime()) {
        const tmp = s;
        s = e;
        e = tmp;
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

    return `${years}Y - ${months}M - ${days}D`;
};

export default function EmployeeShow({
    employee,
    currentYearLeaveBalances,
    recentLeaveApplications,
    recentMovements
}: EmployeeShowProps) {
    const isDropout = !!employee.dropout_date;

    const getEmployeeDisplayName = (): string => {
        const fromEn = (employee.full_name_en || employee.name_en || '').trim();
        if (fromEn) {
            return fromEn;
        }
        const parts = [employee.first_name, employee.last_name].filter(
            (p) => p != null && String(p).trim() !== ''
        );
        if (parts.length) {
            return parts.join(' ');
        }
        return String(employee.pin || employee.employee_id || 'Employee');
    };

    // Get initials for avatar fallback (handles null last_name / name_en-only records)
    const getInitials = (): string => {
        const name = getEmployeeDisplayName().trim();
        const tokens = name.split(/\s+/).filter(Boolean);
        if (tokens.length >= 2) {
            return `${tokens[0].charAt(0)}${tokens[tokens.length - 1].charAt(0)}`.toUpperCase();
        }
        if (tokens.length === 1 && tokens[0].length >= 2) {
            return tokens[0].slice(0, 2).toUpperCase();
        }
        if (tokens.length === 1 && tokens[0].length === 1) {
            return tokens[0].toUpperCase();
        }
        const id = String(employee.pin || employee.employee_id || '?').replace(/\s+/g, '');
        return id.length >= 2 ? id.slice(0, 2).toUpperCase() : (id.charAt(0) || '?').toUpperCase();
    };

    const serviceEndDate =
        employee.dropout_date ||
        employee.resignation_date ||
        format(new Date(), 'yyyy-MM-dd');

    const totalServiceYmd = calculateYmd(employee.joining_date, serviceEndDate);
    const confirmationServiceYmd = calculateYmd(employee.confirmation_date, serviceEndDate);
    const probationYmd = calculateYmd(employee.joining_date, employee.confirmation_date);
    const serviceOnLastPromotionYmd = calculateYmd(employee.joining_date, employee.last_promotion_date);

    // Format status for display
    const getStatusBadge = () => {
        const statusColors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            on_leave: 'bg-blue-100 text-blue-800',
            terminated: 'bg-red-100 text-red-800',
        };

        const statusColor = statusColors[employee.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

        const statusLabel = (employee.status || 'unknown').replace(/_/g, ' ');

        return (
            <Badge variant="outline" className={`${statusColor} border-0`}>
                {statusLabel ? statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1) : '—'}
            </Badge>
        );
    };

    // Component for leave balances
    const LeaveBalancesTab = () => (
        <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-green-100 p-1.5">
                            <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <CardTitle>Leave Balances</CardTitle>
                            <CardDescription>Current year leave allocation and usage</CardDescription>
                        </div>
                    </div>
                    <Link href={route('employees.leaves.index', employee.id)}>
                        <Button variant="outline" size="sm" className="flex items-center">
                            <FileText className="mr-1 h-4 w-4" />
                            View All Leaves
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {currentYearLeaveBalances.length > 0 ? (
                    <div className="space-y-6">
                        {currentYearLeaveBalances.map((balance) => (
                            <div key={balance.id} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-medium text-sm text-gray-900">{balance.leave_type.name}</h4>
                                        <p className="text-xs text-gray-500">
                                            {balance.leave_type.is_paid ? 'Paid Leave' : 'Unpaid Leave'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-medium">
                                            {balance.remaining_days} / {balance.allocated_days} days
                                        </span>
                                        <p className="text-xs text-gray-500">Remaining</p>
                                    </div>
                                </div>
                                <Progress
                                    value={(balance.used_days / balance.allocated_days) * 100}
                                    className="h-2"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No leave balances found for current year.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    // Component for leave applications
    const LeaveApplicationsTab = () => (
        <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-blue-100 p-1.5">
                            <CalendarIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle>Leave Applications</CardTitle>
                            <CardDescription>Recent leave requests and their status</CardDescription>
                        </div>
                    </div>
                    <Link href={route('employees.leaves.index', employee.id)}>
                        <Button variant="outline" size="sm" className="flex items-center">
                            <FileText className="mr-1 h-4 w-4" />
                            View All Leaves
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {recentLeaveApplications.length > 0 ? (
                    <div className="space-y-4">
                        {recentLeaveApplications.map((leave) => (
                            <div key={leave.id} className="border rounded-md p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-900">{leave.leave_type.name}</h4>
                                    {getLeaveStatusBadge(leave.status)}
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mb-1">
                                    <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                                    <span>{formatDateRange(leave.start_date, leave.end_date)}</span>
                                    <span className="mx-1.5">•</span>
                                    <span>{leave.days} day{leave.days !== 1 ? 's' : ''}</span>
                                </div>
                                {leave.reason && (
                                    <p className="text-sm text-gray-600 mt-2">{leave.reason}</p>
                                )}
                                <div className="flex items-center text-xs text-gray-400 mt-2">
                                    <Clock className="h-3 w-3 mr-1" />
                                    <span>Applied on {format(new Date(leave.created_at), 'PP')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No recent leave applications found.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    // Component for movements
    const MovementsTab = () => (
        <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="rounded-full bg-purple-100 p-1.5">
                            <Briefcase className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <CardTitle>Movements</CardTitle>
                            <CardDescription>Recent official and personal movements</CardDescription>
                        </div>
                    </div>
                    <Link href={route('employees.movements.index', employee.id)}>
                        <Button variant="outline" size="sm" className="flex items-center">
                            <FileText className="mr-1 h-4 w-4" />
                            View All Movements
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {recentMovements.length > 0 ? (
                    <div className="space-y-4">
                        {recentMovements.map((movement) => (
                            <div key={movement.id} className="border rounded-md p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center">
                                        <Badge variant="outline" className={`${movement.movement_type === 'official' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'} border-0 mr-2`}>
                                            {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                                        </Badge>
                                        <h4 className="font-medium text-gray-900">{movement.purpose}</h4>
                                    </div>
                                    {getMovementStatusBadge(movement.status)}
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mb-1">
                                    <Timer className="h-4 w-4 mr-1.5 text-gray-400" />
                                    <span>{formatDateTimeRange(movement.from_datetime, movement.actual_return_datetime)}</span>
                                </div>
                                {movement.destination && (
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                        <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
                                        <span>{movement.destination}</span>
                                    </div>
                                )}
                                {movement.remarks && (
                                    <p className="text-sm text-gray-600 mt-2">{movement.remarks}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No recent movements found.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Layout>
            <Head title={`Employee: ${getEmployeeDisplayName()}`} />

            <style>{`
              @media screen {
                .print-only-cv { display: none !important; }
              }
              @media print {
                @page { size: A4; margin: 6mm; }

                html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
                .print\\:hidden { display: none !important; }
                .print\\:shadow-none { box-shadow: none !important; }
                .print\\:border-none { border: none !important; }

                /* Undo AdminLayout fixed viewport + overflow scrolling */
                .h-screen { height: auto !important; }
                .overflow-hidden { overflow: visible !important; }
                .overflow-auto { overflow: visible !important; }
                main { overflow: visible !important; height: auto !important; }

                /* Print ONLY the CV block; hide everything else from AdminLayout too */
                body { visibility: hidden !important; }
                .print-only-cv, .print-only-cv * { visibility: visible !important; }
                .print-only-cv {
                  display: block !important;
                  position: static !important;
                  width: auto !important;
                  height: auto !important;
                }
                .no-print { display: none !important; }

                /* keep clean typography like Word */
                * { color: #000 !important; }
                .print-text { font-family: Arial, "Times New Roman", serif; }
                .print-compact { line-height: 1.15 !important; }

                /* Allow multi-page printing */
                .print-only-cv .shadow-sm { page-break-inside: avoid; break-inside: avoid; }
                .print-only-cv .space-y-2 > * { break-inside: avoid; }

                /* Make print much more compact */
                .print-only-cv { padding: 0 !important; margin: 0 !important; }
                .print-only-cv .text-\\[18px\\] { font-size: 16px !important; }
                .print-only-cv .text-\\[12px\\] { font-size: 11px !important; }
                .print-only-cv .bg-gray-50 { background: #fff !important; }
                .print-only-cv .border-b { border-bottom: 1px solid #ddd !important; }
                .print-only-cv .rounded-lg { border-radius: 0 !important; }
                .print-only-cv .shadow-sm { box-shadow: none !important; }
              }
            `}</style>

            <div className="container mx-auto py-8 print-text print-compact">
                <div className="mb-6 print:hidden">
                    <Link
                        href={route('employees.index')}
                        className="flex w-fit items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        <span>Back to Employees</span>
                    </Link>
                </div>

                {/* Header with employee summary */}
                <div className="mb-4 bg-white rounded-lg shadow-sm overflow-hidden print:shadow-none print:border-none no-print">
                    <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
                        <div className="absolute -bottom-16 left-8">
                            <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                                {employee.photo ? (
                                    <AvatarImage src={`/storage/${employee.photo}`} alt={getEmployeeDisplayName()} />
                                ) : (
                                    <AvatarFallback className="text-3xl bg-blue-200">
                                        {getInitials()}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                        </div>
                    </div>

                    <div className="pt-20 pb-5 px-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {getEmployeeDisplayName()}
                                </h1>
                                <div className="mt-1 flex items-center space-x-4">
                                    <span className="text-gray-500">{employee.designation?.name}</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-gray-500">{employee.department?.name}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{getStatusBadge()}</span>
                                </div>
                            </div>

                            <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="flex items-center print:hidden"
                                    onClick={() => window.print()}
                                >
                                    <FileText className="mr-1 h-4 w-4" />
                                    Print
                                </Button>
                                <Link href={route('employees.documents.index', employee.id)}>
                                    <Button variant="outline" className="flex items-center">
                                        <FileText className="mr-1 h-4 w-4" />
                                        Documents
                                    </Button>
                                </Link>
                                <Link href={route('employees.edit', employee.id)}>
                                    <Button variant="outline" className="flex items-center">
                                        <Pencil className="mr-1 h-4 w-4" />
                                        Edit
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Employee details tabs */}
                <Tabs defaultValue="cv" className="w-full no-print">
                    <TabsList className="mb-4 print:hidden">
                        <TabsTrigger value="cv">Profile (CV)</TabsTrigger>
                        <TabsTrigger value="leave_movement">Leave & Movement</TabsTrigger>
                    </TabsList>

                    {/* CV Tab */}
                    <TabsContent value="cv">
                        <div className="space-y-3">
                            {/* Header row */}
                            <Card className="shadow-sm print:shadow-none">
                                <CardHeader className="bg-gray-50 border-b py-3">
                                    <CardTitle className="text-base">Employee Profile (CV)</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="text-[18px] font-semibold text-gray-900">
                                                {employee.full_name_en || employee.name_en || `${employee.first_name} ${employee.last_name}`}
                                            </div>
                                            <div className="mt-0.5 text-[13px] text-gray-700">
                                                {employee.last_designation_name || employee.designation?.name || '—'} • {employee.department?.name || '—'}
                                            </div>
                                            <div className="mt-3">
                                                <Row label="Employee Pin" value={employee.pin || employee.employee_id || '—'} />
                                                <Row label="Status" value={employee.status ? employee.status.replace('_', ' ') : '—'} />
                                                <Row label="Email" value={employee.email || '—'} />
                                                <Row label="Email ID" value={employee.email_id || '—'} />
                                                <Row label="Phone" value={employee.phone || '—'} />
                                                <Row label="Name (Bangla)" value={employee.name_bn || '—'} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-gray-900 mb-2">Personal</div>
                                            <Row label="Gender" value={employee.gender || '—'} />
                                            <Row label="Blood Group" value={employee.blood_group || '—'} />
                                            <Row label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'PPP') : '—'} />
                                            <Row label="Staff Age (Resignation/Today)" value={employee.staff_age_years != null ? `${employee.staff_age_years} years` : '—'} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="shadow-sm lg:col-span-2">
                                    <CardHeader className="bg-gray-50 border-b">
                                        <CardTitle className="text-lg">Employment</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <dl className="space-y-4">
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Department</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{employee.department?.name || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Joining Designation</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{employee.joining_designation_name || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Last Designation</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{employee.last_designation_name || employee.designation?.name || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Reports To</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {employee.manager ? `${employee.manager.name_en || ''} (${employee.manager.pin || employee.manager.employee_id})` : '—'}
                                                    </dd>
                                                </div>
                                            </dl>
                                            <dl className="space-y-4">
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Current Branch</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{employee.branch?.name || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Last Branch</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{employee.last_branch_name || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Joining Date</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {employee.joining_date ? format(new Date(employee.joining_date), 'PPP') : '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Confirmation Date</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {employee.confirmation_date ? format(new Date(employee.confirmation_date), 'PPP') : '—'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm">
                                    <CardHeader className="bg-gray-50 border-b">
                                        <CardTitle className="text-lg">Personal</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.gender || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Blood Group</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.blood_group || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.date_of_birth ? format(new Date(employee.date_of_birth), 'PPP') : '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Staff Age (Resignation/Today)</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.staff_age_years != null ? `${employee.staff_age_years} years` : '—'}</dd>
                                            </div>
                                        </dl>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="shadow-sm lg:col-span-2">
                                    <CardHeader className="bg-gray-50 border-b">
                                        <CardTitle className="text-lg">Service & Exit</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <dl className="space-y-4">
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Total Service Length</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{totalServiceYmd ? totalServiceYmd : '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Service From Confirmation</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{confirmationServiceYmd ? confirmationServiceYmd : '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Last Promotion/Grade Change Date</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {employee.last_promotion_date ? format(new Date(employee.last_promotion_date), 'PPP') : '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Probation Period</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {probationYmd ? probationYmd : '—'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Length of Service on Last Promotion</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {serviceOnLastPromotionYmd ? serviceOnLastPromotionYmd : '—'}
                                                    </dd>
                                                </div>
                                            </dl>
                                            <dl className="space-y-4">
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Running / Dropout</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">
                                                        {isDropout ? 'Dropout' : 'Running'}
                                                    </dd>
                                                </div>

                                                {isDropout ? (
                                                    <>
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Dropout Date</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">
                                                                {employee.dropout_date ? format(new Date(employee.dropout_date), 'PPP') : '—'}
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Dropout Reason</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">{employee.dropout_reason || '—'}</dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-sm font-medium text-gray-500">Final Payment Date</dt>
                                                            <dd className="mt-1 text-sm text-gray-900">
                                                                {employee.final_payment_date ? format(new Date(employee.final_payment_date), 'PPP') : '—'}
                                                            </dd>
                                                        </div>
                                                    </>
                                                ) : null}
                                            </dl>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="shadow-sm lg:col-span-2">
                                    <CardHeader className="bg-gray-50 border-b">
                                        <CardTitle className="text-lg">Address & Education</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <dl className="space-y-4">
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{employee.emergency_contact || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{employee.address || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Village</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{(employee as any).village || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Post Office</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{(employee as any).post_office || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Union / Pouroshova</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{(employee as any).union_pouroshova || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Ward No</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{(employee as any).ward_no || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Upazila</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{(employee as any).upazila || '—'}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">District</dt>
                                                    <dd className="mt-1 text-sm text-gray-900">{(employee as any).district || '—'}</dd>
                                                </div>
                                            </dl>
                                            <dl className="space-y-4">
                                                <div>
                                                    <dt className="text-sm font-medium text-gray-500">Educational Qualification</dt>
                                                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                                                        {(employee as any).educational_qualification || '—'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm">
                                    <CardHeader className="bg-gray-50 border-b">
                                        <CardTitle className="text-lg">Identity & Family</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">NID</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.nid || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Smart Card Number</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.smart_card_number || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Birth Registration Number</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{employee.birth_registration_number || '—'}</dd>
                                            </div>
                                            <Separator className="my-2" />
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Father's Name</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{(employee as any).fathers_name || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Father's Mobile</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{(employee as any).fathers_mobile || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Mother's Name</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{(employee as any).mothers_name || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Mother's Mobile</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{(employee as any).mothers_mobile || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Marital Status</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{(employee as any).marital_status || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Spouse Name</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{(employee as any).spouse_name || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">Spouse Mobile</dt>
                                                <dd className="mt-1 text-sm text-gray-900">{(employee as any).spouse_mobile || '—'}</dd>
                                            </div>
                                        </dl>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="shadow-sm">
                                <CardHeader className="bg-gray-50 border-b">
                                    <CardTitle className="text-lg">Documents</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <Link href={route('employees.documents.index', employee.id)}>
                                        <Button className="flex items-center">
                                            <FileText className="mr-1 h-4 w-4" />
                                            View Documents
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Leave & Movement Tab */}
                    <TabsContent value="leave_movement">
                        <Tabs defaultValue="leave_balances" className="w-full">
                            <TabsList className="mb-6">
                                <TabsTrigger value="leave_balances">Leave Balances</TabsTrigger>
                                <TabsTrigger value="leave_applications">Leave Applications</TabsTrigger>
                                <TabsTrigger value="movements">Movements</TabsTrigger>
                            </TabsList>

                            <TabsContent value="leave_balances">
                                <LeaveBalancesTab />
                            </TabsContent>

                            <TabsContent value="leave_applications">
                                <LeaveApplicationsTab />
                            </TabsContent>

                            <TabsContent value="movements">
                                <MovementsTab />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>


                    {/* Documents Tab (This is just a placeholder - it will redirect) */}
                    <TabsContent value="documents">
                        <div className="flex justify-center items-center py-12">
                            <p>Redirecting to documents page...</p>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Print-only CV */}
                <div className="print-only-cv">
                    <div className="text-center mb-1">
                        <div className="text-[18px] font-bold">
                            {employee.full_name_en || employee.name_en || `${employee.first_name} ${employee.last_name}`}
                        </div>
                        <div className="text-[12px]">
                            {employee.last_designation_name || employee.designation?.name || '—'} | {employee.department?.name || '—'} | Pin: {employee.pin || employee.employee_id || '—'}
                        </div>
                    </div>

                    {/* Reuse CV content without tabs/extra UI */}
                    <div className="space-y-1">
                        <Card className="shadow-sm print:shadow-none">
                            <CardHeader className="bg-gray-50 border-b py-1.5">
                                <CardTitle className="text-sm">Personal & Contact</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Row label="Name (English)" value={employee.full_name_en || employee.name_en || `${employee.first_name} ${employee.last_name}`} />
                                        <Row label="Name (Bangla)" value={employee.name_bn || '—'} />
                                        <Row label="Gender" value={employee.gender || '—'} />
                                        <Row label="Blood Group" value={employee.blood_group || '—'} />
                                        <Row label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'PPP') : '—'} />
                                        <Row label="Staff Age (Resignation/Today)" value={employee.staff_age_years != null ? `${employee.staff_age_years} years` : '—'} />
                                    </div>
                                    <div>
                                        <Row label="Email" value={employee.email || '—'} />
                                        <Row label="Email ID" value={employee.email_id || '—'} />
                                        <Row label="Phone" value={employee.phone || '—'} />
                                        <Row label="Emergency Contact" value={employee.emergency_contact || '—'} />
                                        <Row label="Address" value={employee.address || '—'} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm print:shadow-none">
                            <CardHeader className="bg-gray-50 border-b py-1.5">
                                <CardTitle className="text-sm">Employment</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Row label="Department" value={employee.department?.name || '—'} />
                                        <Row label="Joining Designation" value={employee.joining_designation_name || '—'} />
                                        <Row label="Last Designation" value={employee.last_designation_name || employee.designation?.name || '—'} />
                                        <Row label="Reports To" value={employee.manager ? `${employee.manager.name_en || ''} (${employee.manager.pin || employee.manager.employee_id})` : '—'} />
                                    </div>
                                    <div>
                                        <Row label="Current Branch" value={employee.branch?.name || '—'} />
                                        <Row label="Last Branch" value={employee.last_branch_name || '—'} />
                                        <Row label="Joining Date" value={employee.joining_date ? format(new Date(employee.joining_date), 'PPP') : '—'} />
                                        <Row label="Confirmation Date" value={employee.confirmation_date ? format(new Date(employee.confirmation_date), 'PPP') : '—'} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm print:shadow-none">
                            <CardHeader className="bg-gray-50 border-b py-1.5">
                                <CardTitle className="text-sm">Service & Exit</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Row label="Total Service Length" value={totalServiceYmd ? totalServiceYmd : '—'} />
                                        <Row label="Service From Confirmation" value={confirmationServiceYmd ? confirmationServiceYmd : '—'} />
                                        <Row label="Last Promotion/Grade Change" value={employee.last_promotion_date ? format(new Date(employee.last_promotion_date), 'PPP') : '—'} />
                                        <Row label="Probation Period" value={probationYmd ? probationYmd : '—'} />
                                        <Row label="Service on Last Promotion" value={serviceOnLastPromotionYmd ? serviceOnLastPromotionYmd : '—'} />
                                    </div>
                                    <div>
                                        <Row label="Running / Dropout" value={isDropout ? 'Dropout' : 'Running'} />
                                        {isDropout ? (
                                            <>
                                                <Row label="Dropout Date" value={employee.dropout_date ? format(new Date(employee.dropout_date), 'PPP') : '—'} />
                                                <Row label="Dropout Reason" value={employee.dropout_reason || '—'} />
                                                <Row label="Final Payment Date" value={employee.final_payment_date ? format(new Date(employee.final_payment_date), 'PPP') : '—'} />
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm print:shadow-none">
                            <CardHeader className="bg-gray-50 border-b py-1.5">
                                <CardTitle className="text-sm">Identity & Family</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Row label="NID" value={employee.nid || '—'} />
                                        <Row label="Smart Card Number" value={employee.smart_card_number || '—'} />
                                        <Row label="Birth Registration Number" value={employee.birth_registration_number || '—'} />
                                    </div>
                                    <div>
                                        <Row label="Father's Name" value={(employee as any).fathers_name || '—'} />
                                        <Row label="Father's Mobile" value={(employee as any).fathers_mobile || '—'} />
                                        <Row label="Mother's Name" value={(employee as any).mothers_name || '—'} />
                                        <Row label="Mother's Mobile" value={(employee as any).mothers_mobile || '—'} />
                                        <Row label="Marital Status" value={(employee as any).marital_status || '—'} />
                                        <Row label="Spouse Name" value={(employee as any).spouse_name || '—'} />
                                        <Row label="Spouse Mobile" value={(employee as any).spouse_mobile || '—'} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm print:shadow-none">
                            <CardHeader className="bg-gray-50 border-b py-1.5">
                                <CardTitle className="text-sm">Address & Education</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Row label="Village" value={(employee as any).village || '—'} />
                                        <Row label="Post Office" value={(employee as any).post_office || '—'} />
                                        <Row label="Union / Pouroshova" value={(employee as any).union_pouroshova || '—'} />
                                        <Row label="Ward No" value={(employee as any).ward_no || '—'} />
                                        <Row label="Upazila" value={(employee as any).upazila || '—'} />
                                        <Row label="District" value={(employee as any).district || '—'} />
                                    </div>
                                    <div>
                                        <Row label="Educational Qualification" value={(employee as any).educational_qualification || '—'} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        </Layout>
    );
}

// Helper function to calculate duration between two dates
function calculateDuration(startDate: Date, endDate: Date): string {
    const diffInYears = endDate.getFullYear() - startDate.getFullYear();
    const diffInMonths = endDate.getMonth() - startDate.getMonth();

    let years = diffInYears;
    let months = diffInMonths;

    if (months < 0) {
        years--;
        months += 12;
    }

    let result = '';

    if (years > 0) {
        result += `${years} year${years > 1 ? 's' : ''}`;
    }

    if (months > 0) {
        if (result.length > 0) result += ' ';
        result += `${months} month${months > 1 ? 's' : ''}`;
    }

    if (result.length === 0) {
        const diffInDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        result = `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
    }

    return result;
}
