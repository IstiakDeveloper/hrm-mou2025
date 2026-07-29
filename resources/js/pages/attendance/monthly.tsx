import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination';
import {
    Calendar,
    CalendarIcon,
    Search,
    ArrowLeft,
    User,
    Building,
    Users,
    BarChart,
    Clock,
    AlertCircle,
    Info,
    Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Department {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface Designation {
    id: number;
    name: string;
}

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    department: Department;
    designation: Designation;
    branch: Branch;
}

interface Attendance {
    id: number;
    employee_id: number;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
    remarks: string | null;
    auto_remarks: string | null;
}

interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    from: number;
    last_page: number;
    links: PaginationLinks[];
    path: string;
    per_page: number;
    to: number;
    total: number;
}

interface EmployeesResponse {
    data: Employee[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface UserPermissions {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    isEmployee: boolean;
    isBranchManager: boolean;
    isDepartmentHead: boolean;
}

interface Holiday {
    id: number;
    title: string;
    date: string;
    description: string | null;
    is_recurring: boolean;
    applicable_branches: number[] | null;
}

interface AttendanceSetting {
    branch_id: number;
    weekend_days: number[];
}

interface AttendanceMonthlyProps {
    employees: EmployeesResponse;
    attendances: Record<string, Attendance[]>;
    leaveDays: Record<string, Record<string, string>>;
    dailyStatusByEmployee: Record<string, Record<string, { status: string; missing_checkout?: boolean; leave_type?: string | null }>>;
    summaryByEmployee: Record<string, Record<string, number>>;
    branches: Branch[];
    departments: Department[];
    filters: {
        month: string;
        branch_id: string;
        department_id: string;
        search: string;
    };
    month: string;
    daysInMonth: number;
    userPermissions: UserPermissions;
    holidays: Holiday[];
    attendanceSettings: Record<number, AttendanceSetting>;
}

export default function AttendanceMonthly({
    employees,
    attendances,
    branches,
    departments,
    filters,
    month,
    daysInMonth,
    userPermissions,
    holidays = [],
    attendanceSettings = {},
    leaveDays = {},
    dailyStatusByEmployee = {},
    summaryByEmployee = {}
}: AttendanceMonthlyProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id || null);
    const [departmentId, setDepartmentId] = useState(filters.department_id || null);
    const [currentMonth, setCurrentMonth] = useState(month);

    // Generate array of days for the month
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Parse month to get year and month
    const monthDate = parse(month, 'yyyy-MM', new Date());
    const monthLabel = format(monthDate, 'MMMM yyyy');

    // Get previous and next month
    const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1);
    const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1);

    const prevMonthString = format(prevMonth, 'yyyy-MM');
    const nextMonthString = format(nextMonth, 'yyyy-MM');

    const toYmd = (day: number) => `${month}-${day.toString().padStart(2, '0')}`;

    // Check if a date is a holiday
    const isHoliday = (day: number): boolean => {
        if (!holidays || !Array.isArray(holidays)) {
            return false;
        }

        const dateToCheck = toYmd(day);
        return holidays.some((holiday) => holiday.date === dateToCheck);
    };

    // Get holiday details for a specific day
    const getHolidayDetails = (day: number) => {
        const dateToCheck = toYmd(day);
        return holidays.find((holiday) => holiday.date === dateToCheck);
    };

    // Check if a date is a weekend for an employee
    const isWeekend = (day: number, branchId: number): boolean => {
        if (!attendanceSettings || !attendanceSettings[branchId] || !attendanceSettings[branchId].weekend_days) {
            return false;
        }

        const dateToFind = toYmd(day);
        // Use date-fns parse to avoid UTC parsing shifts of "YYYY-MM-DD"
        const date = parse(dateToFind, 'yyyy-MM-dd', new Date());
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

        return attendanceSettings[branchId].weekend_days.includes(dayOfWeek);
    };

    const handleSearch = () => {
        router.get(route('attendance.monthly'), {
            search,
            month: currentMonth,
            branch_id: branchId || '',
            department_id: departmentId || ''
        }, { preserveState: true });
    };

    const handleExportPDF = () => {
        const url = route('exports.attendance.monthly', {
            search,
            month: currentMonth,
            branch_id: branchId || '',
            department_id: departmentId || ''
        });

        window.open(url, '_blank');
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const resetFilters = () => {
        setSearch('');
        setBranchId(null);
        setDepartmentId(null);
        router.get(route('attendance.monthly'), { month: currentMonth }, { preserveState: true });
    };

    const handleMonthChange = (month: string) => {
        setCurrentMonth(month);
        router.get(route('attendance.monthly'), {
            month,
            search,
            branch_id: branchId || '',
            department_id: departmentId || ''
        }, { preserveState: true });
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'present':
                return 'bg-green-100 text-green-800';
            case 'absent':
                return 'bg-red-100 text-red-800';
            case 'late':
                return 'bg-orange-100 text-orange-800';
            case 'on_duty':
                return 'bg-indigo-100 text-indigo-800';
            case 'half_day':
                return 'bg-yellow-100 text-yellow-800';
            case 'weekend':
                return 'bg-teal-100 text-teal-800';
            case 'holiday':
                return 'bg-purple-100 text-purple-800';
            case 'leave':
                return 'bg-indigo-100 text-indigo-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Get short code for status badge
    const getStatusCode = (status: string): string => {
        switch (status) {
            case 'present':
                return 'P';
            case 'absent':
                return 'A';
            case 'late':
                return 'L';
            case 'on_duty':
                return 'OD';
            case 'half_day':
                return 'H';
            case 'weekend':
                return 'W';
            case 'holiday':
                return 'H';
            case 'leave':
                return 'L';
            default:
                return '-';
        }
    };


    const getAttendanceStatus = (employeeId: number, day: number, branchId: number) => {
        const serverStatus = dailyStatusByEmployee?.[employeeId]?.[day]?.status;
        if (typeof serverStatus === 'string') return serverStatus;
        if (serverStatus === null) return null; // future blank days
        // First check if it's a holiday - using actual day number
        if (isHoliday(day)) {
            return 'holiday';
        }

        // Then check if it's a weekend - using actual day number
        if (isWeekend(day, branchId)) {
            return 'weekend';
        }

        // Attendance record lookup (exact date match)
        if (!attendances[employeeId]) {
            return null;
        }

        const dateToFind = toYmd(day);

        // Find the attendance record for this date
        const attendance = attendances[employeeId]?.find(a => {
            return a.date === dateToFind;
        });

        if (attendance) return attendance.status;
        return null;
    };

    const hasMissingCheckout = (employeeId: number, day: number): boolean => {
        const serverMissing = dailyStatusByEmployee?.[employeeId]?.[day]?.missing_checkout;
        if (typeof serverMissing === 'boolean') return serverMissing;
        if (!attendances[employeeId]) return false;
        const dateToFind = toYmd(day);
        const attendance = attendances[employeeId]?.find((a) => a.date === dateToFind);
        return !!attendance && !!attendance.check_in && !attendance.check_out;
    };

    const getAttendanceRecord = (employeeId: number, day: number) => {
        if (!attendances[employeeId]) return null;
        const dateToFind = toYmd(day);
        return attendances[employeeId]?.find((a) => a.date === dateToFind) || null;
    };

    // Fix the tooltip function to properly display times
    const getAttendanceTooltip = (employeeId: number, day: number, branchId: number) => {
        const serverStatus = dailyStatusByEmployee?.[employeeId]?.[day]?.status;
        if (serverStatus === null) return null; // future blank days
        // Holiday tooltip - using actual day number
        if (isHoliday(day)) {
            const dateToFind = toYmd(day);
            const holiday = holidays.find((h) => h.date === dateToFind);

            return holiday ? `Holiday: ${holiday.title}${holiday.description ? '\n' + holiday.description : ''}` : 'Holiday';
        }

        // Weekend tooltip - using actual day number
        if (isWeekend(day, branchId)) {
            return 'Weekend';
        }

        const leaveType = dailyStatusByEmployee?.[employeeId]?.[day]?.leave_type;
        if (leaveType) return `Leave: ${leaveType}`;

        // Attendance tooltip lookup
        if (!attendances[employeeId]) {
            return null;
        }

        const dateToFind = toYmd(day);
        const attendance = attendances[employeeId]?.find((a) => a.date === dateToFind);

        if (!attendance) return null;

        // Format tooltip with status and times
        let tooltipContent = attendance.status.charAt(0).toUpperCase() +
            attendance.status.slice(1).replace('_', ' ');

        // Format check-in time safely
        if (attendance.check_in) {
            try {
                const timeParts = attendance.check_in.split(':') || [];

                if (timeParts.length >= 2) {
                    const hour = parseInt(timeParts[0]);
                    const minute = timeParts[1];
                    const formattedHour = hour % 12 || 12;
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    tooltipContent += `\nIn: ${formattedHour}:${minute} ${ampm}`;
                } else {
                    tooltipContent += `\nIn: ${attendance.check_in}`;
                }
            } catch (e) {
                tooltipContent += `\nIn: ${attendance.check_in}`;
            }
        }

        // Format check-out time safely
        if (attendance.check_out) {
            try {
                const timeParts = attendance.check_out.split(':') || [];

                if (timeParts.length >= 2) {
                    const hour = parseInt(timeParts[0]);
                    const minute = timeParts[1];
                    const formattedHour = hour % 12 || 12;
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    tooltipContent += `\nOut: ${formattedHour}:${minute} ${ampm}`;
                } else {
                    tooltipContent += `\nOut: ${attendance.check_out}`;
                }
            } catch (e) {
                tooltipContent += `\nOut: ${attendance.check_out}`;
            }
        } else if (attendance.check_in) {
            tooltipContent += `\nMissing check-out`;
        }

        // Add remarks if available
        if (attendance.auto_remarks) {
            tooltipContent += `\n${attendance.auto_remarks}`;
        } else if (attendance.remarks) {
            tooltipContent += `\n${attendance.remarks}`;
        }

        return tooltipContent;
    };

    // Calculate summary for each employee
    const getEmployeeSummary = (employeeId: number, branchId: number) => {
        const serverSummary = summaryByEmployee?.[employeeId];
        if (serverSummary) {
            return {
                present: serverSummary.present ?? 0,
                absent: serverSummary.absent ?? 0,
                late: serverSummary.late ?? 0,
                half_day: serverSummary.half_day ?? 0,
                leave: serverSummary.leave ?? 0,
                on_duty: serverSummary.on_duty ?? 0,
                weekend: serverSummary.weekend ?? 0,
                holiday: serverSummary.holiday ?? 0,
            };
        }
        // Initialize summary object with all status types including weekend and holiday
        const summary = {
            present: 0,
            absent: 0,
            late: 0,
            half_day: 0,
            leave: 0,
            on_duty: 0,
            weekend: 0,
            holiday: 0
        };

        // Build quick lookup by date for this employee
        const attendanceByDate = new Map<string, Attendance>();
        if (attendances[employeeId]) {
            attendances[employeeId]?.forEach((a) => {
                attendanceByDate.set(a.date, a);
            });
        }

        // Count day-by-day with correct precedence:
        // Holiday > Leave > Weekend > Attendance status > No record
        for (let day = 1; day <= daysInMonth; day++) {
            const ymd = toYmd(day);
            // Check if it's a holiday
            if (isHoliday(day)) {
                summary.holiday++;
                continue; // Skip to next day if it's a holiday
            }

            // Approved leave overrides attendance display/count
            if (leaveDays?.[employeeId]?.[ymd]) {
                summary.leave++;
                continue;
            }

            // Check if it's a weekend
            if (isWeekend(day, branchId)) {
                summary.weekend++;
                continue; // Skip to next day if it's a weekend
            }

            const a = attendanceByDate.get(ymd);
            if (a && Object.prototype.hasOwnProperty.call(summary, a.status)) {
                summary[a.status as keyof typeof summary]++;
            }
        }

        return summary;
    };

    // Check if pagination data exists
    const hasPagination = employees.meta && employees.links;

    // Check if user can see branch/department filters
    const canFilterByBranch = userPermissions.isBranchManager || !userPermissions.isEmployee;
    const canFilterByDepartment = userPermissions.isDepartmentHead || userPermissions.isBranchManager || !userPermissions.isEmployee;

    return (
        <Layout>
            <Head title="Monthly Attendance" />

            <PageSurface className="max-w-7xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="mb-2">
                    <Link
                        href={route('attendance.index')}
                        className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        <span>Back to Daily Attendance</span>
                    </Link>
                </div>

                <div className="mb-4 space-y-3">
                    {/* Top row: Title and primary actions */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 tracking-tight sm:text-2xl">Monthly Attendance</h1>
                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                View attendance records for {monthLabel}
                            </p>
                        </div>

                        {/* Month navigation & quick actions */}
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <div className="grid grid-cols-3 gap-1 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs bg-white border-slate-200 text-slate-700 shadow-xs font-medium px-2"
                                    onClick={() => handleMonthChange(prevMonthString)}
                                >
                                    <Calendar className="mr-1 h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>{format(prevMonth, 'MMM')}</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs bg-blue-50 border-blue-200 text-blue-700 shadow-xs font-bold pointer-events-none px-2"
                                >
                                    <span>{format(monthDate, 'MMM yyyy')}</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs bg-white border-slate-200 text-slate-700 shadow-xs font-medium px-2"
                                    onClick={() => handleMonthChange(nextMonthString)}
                                >
                                    <span>{format(nextMonth, 'MMM')}</span>
                                    <Calendar className="ml-1 h-3.5 w-3.5 text-slate-400 shrink-0" />
                                </Button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 w-full">
                                <Link href={route('attendance.report')} className="flex-1 sm:flex-none">
                                    <Button variant="outline" size="sm" className="h-8 text-xs w-full sm:w-auto bg-white border-slate-200 text-slate-700 shadow-xs font-medium">
                                        <BarChart className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                                        Report
                                    </Button>
                                </Link>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs flex-1 sm:flex-none bg-white border-slate-200 text-slate-700 shadow-xs font-medium"
                                    onClick={handleExportPDF}
                                >
                                    <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                                    Export PDF
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Role-based Context Message */}
                    {userPermissions.isEmployee && !userPermissions.isBranchManager && !userPermissions.isDepartmentHead && (
                        <Alert className="bg-blue-50 text-blue-800 border-blue-200 py-2">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-xs">
                                You are viewing your own monthly attendance records.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Compact Filter Bar */}
                    <div className="flex flex-col gap-2 w-full bg-slate-50/50 p-2.5 rounded-xl border border-slate-200 sm:flex-row sm:items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search by name or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-8 h-8 text-xs bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 w-full sm:flex sm:w-auto sm:items-center">
                            {canFilterByBranch && branches.length > 1 && (
                                <Select value={branchId || undefined} onValueChange={(value) => setBranchId(value === "all" ? null : value)}>
                                    <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs bg-white border-slate-200 rounded-lg">
                                        <SelectValue placeholder="Branch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {sortPayrollBranches(branches).map((b) => <SelectItem key={b.id} value={b.id.toString()}>{formatBranchSelectLabel(b)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            {canFilterByDepartment && departments.length > 1 && (
                                <Select value={departmentId || undefined} onValueChange={(value) => setDepartmentId(value === "all" ? null : value)}>
                                    <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs bg-white border-slate-200 rounded-lg">
                                        <SelectValue placeholder="Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Depts</SelectItem>
                                        {departments.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1 justify-end">
                                <Button variant="ghost" onClick={resetFilters} size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-700 px-2.5">
                                    Reset
                                </Button>
                                <Button onClick={handleSearch} size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3">
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="mb-3 flex flex-wrap gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-green-100 mr-1 flex items-center justify-center text-[10px] font-bold text-green-800">P</span>
                        <span className="text-[11px] text-slate-700">Present</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-red-100 mr-1 flex items-center justify-center text-[10px] font-bold text-red-800">A</span>
                        <span className="text-[11px] text-slate-700">Absent</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-orange-100 mr-1 flex items-center justify-center text-[10px] font-bold text-orange-800">L</span>
                        <span className="text-[11px] text-slate-700">Late</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-yellow-100 mr-1 flex items-center justify-center text-[10px] font-bold text-yellow-800">H</span>
                        <span className="text-[11px] text-slate-700">Half Day</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-blue-100 mr-1 flex items-center justify-center text-[10px] font-bold text-blue-800">LV</span>
                        <span className="text-[11px] text-slate-700">Leave</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 mr-1 flex items-center justify-center text-[10px] font-bold text-indigo-800">OD</span>
                        <span className="text-[11px] text-slate-700">On Duty</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-purple-100 mr-1 flex items-center justify-center text-[10px] font-bold text-purple-800">H</span>
                        <span className="text-[11px] text-slate-700">Holiday</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-5 h-5 rounded-full bg-teal-200 mr-1 flex items-center justify-center text-[10px] font-bold text-gray-800">W</span>
                        <span className="text-[11px] text-slate-700">Weekend</span>
                    </div>
                </div>

                {/* Conditional View: Calendar View for Single Employee Role vs Matrix Table for Admins/Managers */}
                {userPermissions.isEmployee && !userPermissions.isBranchManager && !userPermissions.isDepartmentHead && employees.data && employees.data.length > 0 ? (
                    (() => {
                        const singleEmp = employees.data[0];
                        const summary = getEmployeeSummary(singleEmp.id, singleEmp.branch?.id || 0);
                        const firstDayOfWeek = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();

                        return (
                            <div className="space-y-4">
                                {/* Monthly Summary Badges */}
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2 text-center shadow-2xs">
                                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Present</span>
                                        <span className="text-base font-bold text-emerald-900">{summary.present}</span>
                                    </div>
                                    <div className="rounded-xl border border-red-200 bg-red-50/70 p-2 text-center shadow-2xs">
                                        <span className="text-[10px] uppercase font-bold text-red-800 block">Absent</span>
                                        <span className="text-base font-bold text-red-900">{summary.absent}</span>
                                    </div>
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2 text-center shadow-2xs">
                                        <span className="text-[10px] uppercase font-bold text-amber-800 block">Late</span>
                                        <span className="text-base font-bold text-amber-900">{summary.late}</span>
                                    </div>
                                    <div className="rounded-xl border border-yellow-200 bg-yellow-50/70 p-2 text-center shadow-2xs">
                                        <span className="text-[10px] uppercase font-bold text-yellow-800 block">Half Day</span>
                                        <span className="text-base font-bold text-yellow-900">{summary.half_day}</span>
                                    </div>
                                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2 text-center shadow-2xs">
                                        <span className="text-[10px] uppercase font-bold text-blue-800 block">Leave</span>
                                        <span className="text-base font-bold text-blue-900">{summary.leave}</span>
                                    </div>
                                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-2 text-center shadow-2xs">
                                        <span className="text-[10px] uppercase font-bold text-indigo-800 block">On Duty</span>
                                        <span className="text-base font-bold text-indigo-900">{summary.on_duty}</span>
                                    </div>
                                    <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-2 text-center shadow-2xs">
                                        <span className="text-[10px] uppercase font-bold text-teal-800 block">Weekend</span>
                                        <span className="text-base font-bold text-teal-900">{summary.weekend}</span>
                                    </div>
                                    <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-2 text-center shadow-2xs">
                                        <span className="text-[10px] uppercase font-bold text-purple-800 block">Holiday</span>
                                        <span className="text-base font-bold text-purple-900">{summary.holiday}</span>
                                    </div>
                                </div>

                                {/* Calendar Card */}
                                <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
                                    <CardHeader className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                                                {monthLabel} Calendar
                                            </CardTitle>
                                            <CardDescription className="text-xs text-slate-500">
                                                {employeeDisplayName(singleEmp)} ({singleEmp.employee_id}) • {singleEmp.department?.name}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-2 sm:p-4">
                                        {/* Day Headers */}
                                        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-600 mb-2">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                                <div key={d} className="py-1.5 bg-slate-100/80 rounded-md text-[11px] sm:text-xs">
                                                    {d}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Calendar Grid */}
                                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                            {/* Padding slots */}
                                            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                                                <div key={`empty-${i}`} className="min-h-[56px] sm:min-h-[76px] rounded-lg border border-slate-100 bg-slate-50/20" />
                                            ))}

                                            {/* Day Cells */}
                                            {days.map(day => {
                                                const status = getAttendanceStatus(singleEmp.id, day, singleEmp.branch?.id || 0);
                                                const tooltip = getAttendanceTooltip(singleEmp.id, day, singleEmp.branch?.id || 0);
                                                const attRecord = getAttendanceRecord(singleEmp.id, day);
                                                const missingOut = hasMissingCheckout(singleEmp.id, day);

                                                return (
                                                    <div
                                                        key={day}
                                                        title={tooltip || ''}
                                                        className={cn(
                                                            "min-h-[58px] sm:min-h-[78px] rounded-xl border p-1 sm:p-1.5 flex flex-col justify-between transition-all relative group hover:shadow-xs",
                                                            status ? getStatusColor(status) : 'bg-white border-slate-200 text-slate-800',
                                                            missingOut && 'ring-2 ring-red-400'
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-xs sm:text-sm">{day}</span>
                                                            {status && (
                                                                <span className={cn(
                                                                    "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-bold shadow-2xs",
                                                                    getStatusColor(status)
                                                                )}>
                                                                    {getStatusCode(status)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {attRecord?.check_in && (
                                                            <div className="text-[9px] sm:text-[11px] font-medium leading-tight mt-1">
                                                                <span className="block text-emerald-800">In: {attRecord.check_in.substring(0, 5)}</span>
                                                                {attRecord.check_out ? (
                                                                    <span className="block text-slate-700">Out: {attRecord.check_out.substring(0, 5)}</span>
                                                                ) : missingOut ? (
                                                                    <span className="block text-red-700 font-bold">No Out</span>
                                                                ) : null}
                                                            </div>
                                                        )}

                                                        {!attRecord?.check_in && status && status !== 'present' && status !== 'absent' && (
                                                            <div className="text-[9px] sm:text-[10px] font-semibold capitalize truncate mt-1">
                                                                {status.replace('_', ' ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })()
                ) : (
                    /* Multi-Employee Matrix Table View for Admins & Managers */
                    <Card className="overflow-x-auto">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50">
                                        <TableHead className="sticky left-0 bg-gray-50 z-10 min-w-[200px]">Employee</TableHead>
                                        {days.map(day => (
                                            <TableHead key={day} className="text-center min-w-[40px]">{day}</TableHead>
                                        ))}
                                        <TableHead className="text-center min-w-[60px] bg-green-50">P</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-red-50">A</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-orange-50">L</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-yellow-50">H</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-blue-50">LV</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-indigo-50">OD</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-teal-50">W</TableHead>
                                        <TableHead className="text-center min-w-[60px] bg-purple-50">HO</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.data && employees.data.length > 0 ? (
                                        employees.data.map((employee) => {
                                            const summary = getEmployeeSummary(employee.id, employee.branch.id);
                                            return (
                                                <TableRow key={employee.id} className="hover:bg-gray-50">
                                                    <TableCell className="font-medium sticky left-0 bg-white z-10 hover:bg-gray-50">
                                                        <div className="flex items-center space-x-2">
                                                            <User className="h-4 w-4 text-gray-400" />
                                                            <div>
                                                                <div className="font-medium">{employeeDisplayName(employee)}</div>
                                                                <div className="text-xs text-gray-500 flex items-center">
                                                                    <span className="mr-1">{employee.employee_id}</span>
                                                                    <span className="mx-1">•</span>
                                                                    <span>{employee.department.name}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    {days.map(day => {
                                                        const status = getAttendanceStatus(employee.id, day, employee.branch.id);
                                                        const tooltip = getAttendanceTooltip(employee.id, day, employee.branch.id);
                                                        return (
                                                            <TableCell key={day} className="p-1 text-center">
                                                                {status ? (
                                                                    <div
                                                                        className={cn(
                                                                            `w-8 h-8 rounded-full ${getStatusColor(status)} flex items-center justify-center mx-auto text-xs font-medium cursor-help relative`,
                                                                            hasMissingCheckout(employee.id, day) && 'ring-2 ring-red-400'
                                                                        )}
                                                                        title={tooltip || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                                                    >
                                                                        {getStatusCode(status)}
                                                                        {hasMissingCheckout(employee.id, day) && (
                                                                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                                                                                !
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-xs text-gray-500">
                                                                        -
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell className="text-center bg-green-50">
                                                        <Badge variant="outline" className="bg-green-100 text-green-800 border-0">{summary.present}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center bg-red-50">
                                                        <Badge variant="outline" className="bg-red-100 text-red-800 border-0">{summary.absent}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center bg-orange-50">
                                                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-0">{summary.late}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center bg-yellow-50">
                                                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-0">{summary.half_day}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center bg-blue-50">
                                                        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-0">{summary.leave}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center bg-indigo-50">
                                                        <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-0">{summary.on_duty}</Badge>
                                                    </TableCell>
                                                    {/* New columns for Weekend and Holiday */}
                                                    <TableCell className="text-center bg-blue-50">
                                                        <Badge variant="outline" className="bg-teal-100 text-teal-800 border-0">{summary.weekend}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center bg-purple-50">
                                                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-0">{summary.holiday}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={days.length + 8} className="h-24 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <AlertCircle className="h-8 w-8 mb-2" />
                                                    <h3 className="font-medium">No employees found</h3>
                                                    <p className="text-sm mt-1">
                                                        {(search || branchId || departmentId)
                                                            ? "Try adjusting your filters to see more results."
                                                            : "There are no employees to display for this month."}
                                                    </p>
                                                    {(search || branchId || departmentId) && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={resetFilters}
                                                            className="mt-4"
                                                        >
                                                            Reset Filters
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {hasPagination && employees.meta.last_page > 1 && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                {employees.meta.current_page > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={route('attendance.monthly', {
                                                page: employees.meta.current_page - 1,
                                                search,
                                                month: currentMonth,
                                                branch_id: branchId || '',
                                                department_id: departmentId || ''
                                            })}
                                        />
                                    </PaginationItem>
                                )}

                                {employees.meta.links.map((link, i) => {
                                    // Skip previous/next links as we handle them separately
                                    if (link.label === '&laquo; Previous' || link.label === 'Next &raquo;') {
                                        return null;
                                    }

                                    // For ellipsis
                                    if (link.label === '...') {
                                        return (
                                            <PaginationItem key={`ellipsis-${i}`}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        );
                                    }

                                    // For numbered links
                                    return (
                                        <PaginationItem key={i}>
                                            <PaginationLink
                                                href={route('attendance.monthly', {
                                                    page: link.label,
                                                    search,
                                                    month: currentMonth,
                                                    branch_id: branchId || '',
                                                    department_id: departmentId || ''
                                                })}
                                                isActive={link.active}
                                            >
                                                {link.label}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {employees.meta.current_page < employees.meta.last_page && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={route('attendance.monthly', {
                                                page: employees.meta.current_page + 1,
                                                search,
                                                month: currentMonth,
                                                branch_id: branchId || '',
                                                department_id: departmentId || ''
                                            })}
                                        />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
