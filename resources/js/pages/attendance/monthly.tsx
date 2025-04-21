import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
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
    attendanceSettings = {}
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

    // Check if a date is a holiday
    const isHoliday = (day: number): boolean => {
        if (!holidays || !Array.isArray(holidays)) {
            return false;
        }

        // Add one day to fix the holiday display issue
        const adjustedDay = day - 1;
        const dateToCheck = `${month}-${adjustedDay.toString().padStart(2, '0')}`;

        return holidays.some(holiday => {
            const holidayDate = holiday.date.split('T')[0];
            return holidayDate.endsWith(dateToCheck) || holidayDate === dateToCheck;
        });
    };

    // Get holiday details for a specific day
    const getHolidayDetails = (day: number) => {
        // Add one day to fix the holiday display issue
        const adjustedDay = day - 1;
        const dateToCheck = `${month}-${adjustedDay.toString().padStart(2, '0')}`;

        return holidays.find(holiday => {
            const holidayDate = holiday.date.split('T')[0];
            return holidayDate.endsWith(dateToCheck) || holidayDate === dateToCheck;
        });
    };

    // Check if a date is a weekend for an employee
    const isWeekend = (day: number, branchId: number): boolean => {
        if (!attendanceSettings || !attendanceSettings[branchId] || !attendanceSettings[branchId].weekend_days) {
            return false;
        }

        // Use the actual day for weekend check (without the -1 adjustment)
        const dateToFind = `${month}-${day.toString().padStart(2, '0')}`;

        // Parse the date to get the day of week
        const date = new Date(`${month}-${day.toString().padStart(2, '0')}`);
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
        // First check if it's a holiday - using actual day number
        if (isHoliday(day)) {
            return 'holiday';
        }

        // Then check if it's a weekend - using actual day number
        if (isWeekend(day, branchId)) {
            return 'weekend';
        }

        // Continue with existing logic for attendance (using day-1)
        if (!attendances[employeeId]) return null;

        // Format date for the previous day as that's what our data seems to contain
        const lookupDay = day - 1; // Add one day to align with actual date
        const dateToFind = `${month}-${lookupDay.toString().padStart(2, '0')}`;

        // Find the attendance record for the adjusted date
        const attendance = attendances[employeeId]?.find(a => {
            // Extract just the date part for comparison
            const attendanceDate = a.date.split('T')[0];
            return attendanceDate.endsWith(dateToFind) || attendanceDate === dateToFind;
        });

        return attendance ? attendance.status : null;
    };

    // Fix the tooltip function to properly display times
    const getAttendanceTooltip = (employeeId: number, day: number, branchId: number) => {
        // Holiday tooltip - using actual day number
        if (isHoliday(day)) {
            const dateToFind = `${month}-${day.toString().padStart(2, '0')}`;

            const holiday = holidays.find(h => {
                const holidayDate = h.date.split('T')[0];
                return holidayDate.endsWith(dateToFind) || holidayDate === dateToFind;
            });

            return holiday ? `Holiday: ${holiday.title}${holiday.description ? '\n' + holiday.description : ''}` : 'Holiday';
        }

        // Weekend tooltip - using actual day number
        if (isWeekend(day, branchId)) {
            return 'Weekend';
        }

        // Continue with existing logic for attendance (using day-1)
        if (!attendances[employeeId]) return null;

        // Use the same +1 day offset as in getAttendanceStatus
        const lookupDay = day - 1;
        const dateToFind = `${month}-${lookupDay.toString().padStart(2, '0')}`;

        const attendance = attendances[employeeId]?.find(a => {
            const attendanceDate = a.date.split('T')[0];
            return attendanceDate.endsWith(dateToFind) || attendanceDate === dateToFind;
        });

        if (!attendance) return null;

        // Format tooltip with status and times
        let tooltipContent = attendance.status.charAt(0).toUpperCase() +
            attendance.status.slice(1).replace('_', ' ');

        // Format check-in time safely
        if (attendance.check_in) {
            try {
                // Handle time formats correctly
                const timeStr = attendance.check_in.split('T').pop()?.split('.')[0];
                const timeParts = timeStr?.split(':') || [];

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
                const timeStr = attendance.check_out.split('T').pop()?.split('.')[0];
                const timeParts = timeStr?.split(':') || [];

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

        // First count existing attendance records
        if (attendances[employeeId]) {
            attendances[employeeId]?.forEach(attendance => {
                if (Object.prototype.hasOwnProperty.call(summary, attendance.status)) {
                    summary[attendance.status as keyof typeof summary]++;
                }
            });
        }

        // Then count holidays and weekends for this month
        for (let day = 1; day <= daysInMonth; day++) {
            // Check if it's a holiday
            if (isHoliday(day)) {
                summary.holiday++;
                continue; // Skip to next day if it's a holiday
            }

            // Check if it's a weekend
            if (isWeekend(day, branchId)) {
                summary.weekend++;
                continue; // Skip to next day if it's a weekend
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

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link
                        href={route('attendance.index')}
                        className="flex w-fit items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        <span>Back to Daily Attendance</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Monthly Attendance</h1>
                        <p className="mt-1 text-gray-500">
                            View attendance records for {monthLabel}
                        </p>
                    </div>

                    <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            className="flex items-center"
                            onClick={() => handleMonthChange(prevMonthString)}
                        >
                            <Calendar className="mr-1 h-4 w-4" />
                            {format(prevMonth, 'MMM yyyy')}
                        </Button>

                        <Button
                            variant="outline"
                            className="flex items-center bg-blue-50"
                        >
                            <Calendar className="mr-1 h-4 w-4" />
                            {format(monthDate, 'MMM yyyy')}
                        </Button>

                        <Button
                            variant="outline"
                            className="flex items-center"
                            onClick={() => handleMonthChange(nextMonthString)}
                        >
                            <Calendar className="mr-1 h-4 w-4" />
                            {format(nextMonth, 'MMM yyyy')}
                        </Button>

                        <Link href={route('attendance.report')}>
                            <Button variant="outline" className="flex items-center">
                                <BarChart className="mr-1 h-4 w-4" />
                                View Report
                            </Button>
                        </Link>

                        <Button
                            variant="outline"
                            className="flex items-center"
                            onClick={handleExportPDF}
                        >
                            <Download className="mr-1 h-4 w-4" />
                            Export PDF
                        </Button>

                        {userPermissions.canCreate && (
                            <Link href={route('attendance.create')}>
                                <Button className="flex items-center">
                                    <Clock className="mr-1 h-4 w-4" />
                                    Add Attendance
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Role-based Context Message */}
                {userPermissions.isEmployee && !userPermissions.isBranchManager && !userPermissions.isDepartmentHead && (
                    <Alert className="mb-6">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            You are viewing your own monthly attendance records.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle>Filters</CardTitle>
                        <CardDescription>
                            {userPermissions.isEmployee && !userPermissions.isBranchManager && !userPermissions.isDepartmentHead
                                ? "Filter your attendance records"
                                : "Filter employees by name, branch or department"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                    <Input
                                        placeholder="Search by name or employee ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Only show branch filter if user can filter by branch */}
                            {canFilterByBranch && branches.length > 1 && (
                                <div className="w-full md:w-64">
                                    <Select
                                        value={branchId || undefined}
                                        onValueChange={(value) => setBranchId(value === "all" ? null : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Branches</SelectItem>
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Only show department filter if user can filter by department */}
                            {canFilterByDepartment && departments.length > 1 && (
                                <div className="w-full md:w-64">
                                    <Select
                                        value={departmentId || undefined}
                                        onValueChange={(value) => setDepartmentId(value === "all" ? null : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments.map((department) => (
                                                <SelectItem key={department.id} value={department.id.toString()}>
                                                    {department.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex space-x-2">
                                <Button variant="outline" onClick={resetFilters}>
                                    Reset
                                </Button>
                                <Button onClick={handleSearch}>
                                    Apply Filters
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Legend */}
                <div className="mb-4 flex flex-wrap gap-4">
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-green-100 mr-2 flex items-center justify-center text-xs font-bold text-green-800">P</span>
                        <span className="text-sm">Present</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-red-100 mr-2 flex items-center justify-center text-xs font-bold text-red-800">A</span>
                        <span className="text-sm">Absent</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-orange-100 mr-2 flex items-center justify-center text-xs font-bold text-orange-800">L</span>
                        <span className="text-sm">Late</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-yellow-100 mr-2 flex items-center justify-center text-xs font-bold text-yellow-800">H</span>
                        <span className="text-sm">Half Day</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-100 mr-2 flex items-center justify-center text-xs font-bold text-blue-800">LV</span>
                        <span className="text-sm">Leave</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 mr-2 flex items-center justify-center text-xs font-bold text-indigo-800">OD</span>
                        <span className="text-sm">On Duty</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-purple-100 mr-2 flex items-center justify-center text-xs font-bold text-purple-800">H</span>
                        <span className="text-sm">Holiday</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-teal-200 mr-2 flex items-center justify-center text-xs font-bold text-gray-800">W</span>
                        <span className="text-sm">Weekend</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-gray-100 mr-2 flex items-center justify-center text-xs font-bold text-gray-800">-</span>
                        <span className="text-sm">No Record</span>
                    </div>
                </div>

                {/* Monthly Attendance Table */}
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
                                                            <div className="font-medium">{employee.first_name} {employee.last_name}</div>
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
                                                                    className={`w-8 h-8 rounded-full ${getStatusColor(status)} flex items-center justify-center mx-auto text-xs font-medium cursor-help`}
                                                                    title={tooltip || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                                                >
                                                                    {getStatusCode(status)}
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
            </div>
        </Layout>
    );
}
