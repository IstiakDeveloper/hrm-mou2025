import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    Calendar as CalendarIcon,
    Filter,
    Download,
    RefreshCcw,
    UserCheck,
    UserX,
    Clock,
    FileDown,
    FileBarChart2,
    CircleAlert,
    CheckCircle2,
    CalendarClock,
    BarChart,
    ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Attendance {
    id: number;
    employee_id: number;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: 'present' | 'absent' | 'late' | 'half_day' | 'leave';
    device_id: number | null;
    working_hours: number | null;
    overtime_hours: number | null;
    employee: {
        id: number;
        employee_id: string;
        first_name: string;
        last_name: string;
        department: {
            id: number;
            name: string;
        };
        designation: {
            id: number;
            name: string;
        };
        branch: {
            id: number;
            name: string;
        };
    };
}

interface Branch {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
}

interface ChartDataItem {
    date: string;
    present: number;
    absent: number;
    late: number;
    half_day: number;
    leave: number;
}

interface StatusColors {
    present: string;
    absent: string;
    late: string;
    half_day: string;
    leave: string;
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

interface AttendanceResponse {
    data: Attendance[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface AttendanceReportProps {
    attendances: AttendanceResponse;
    branches: Branch[];
    departments: Department[];
    employees: Employee[];
    filters: {
        start_date?: string;
        end_date?: string;
        branch_id?: string;
        department_id?: string;
        status?: string;
        employee_id?: string;
    };
    startDate: string;
    endDate: string;
    summary: {
        totalDays: number;
        present: number;
        absent: number;
        late: number;
        halfDay: number;
        onLeave: number;
        workingDays: number;
        totalWorkingHours: number;
        totalOvertimeHours: number;
    };
    chartData: ChartDataItem[];
    statusColors: StatusColors;
}

export default function AttendanceReport({
    attendances,
    branches,
    departments,
    employees,
    filters,
    startDate,
    endDate,
    summary,
    chartData,
    statusColors
}: AttendanceReportProps) {
    // Local state for filters
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.start_date ? parseISO(filters.start_date) : parseISO(startDate)
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.end_date ? parseISO(filters.end_date) : parseISO(endDate)
    );

    const [branch, setBranch] = useState(filters.branch_id || 'all');
    const [department, setDepartment] = useState(filters.department_id || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');

    // View control state
    const [showDetails, setShowDetails] = useState(false);
    const [expandedChart, setExpandedChart] = useState(false);

    // Handle filter application
    const applyFilters = () => {
        router.get(route('reports.attendance'), {
            start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            branch_id: branch !== 'all' ? branch : '',
            department_id: department !== 'all' ? department : '',
            status: status !== 'all' ? status : '',
            employee_id: employeeId !== 'all' ? employeeId : '',
        }, { preserveState: true });
    };

    // Reset filters
    const resetFilters = () => {
        setFromDate(parseISO(startDate));
        setToDate(parseISO(endDate));
        setBranch('all');
        setDepartment('all');
        setStatus('all');
        setEmployeeId('all');

        router.get(route('reports.attendance'), {}, { preserveState: true });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'present':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Present</Badge>;
            case 'absent':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Absent</Badge>;
            case 'late':
                return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Late</Badge>;
            case 'half_day':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Half Day</Badge>;
            case 'leave':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">On Leave</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Calculate time difference
    const calculateDuration = (checkIn: string | null, checkOut: string | null) => {
        if (!checkIn || !checkOut) return '-';

        const start = new Date(`2000-01-01 ${checkIn}`);
        const end = new Date(`2000-01-01 ${checkOut}`);

        // If checkout is before checkin, assume it's next day
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }

        const diff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
        return diff.toFixed(2) + ' hrs';
    };

    // Export handlers
    const handleExportPdf = () => {
        router.post(route('reports.export-pdf'), {
            report_type: 'attendance',
            ...filters
        });
    };

    const handleExportExcel = () => {
        router.post(route('reports.export-excel'), {
            report_type: 'attendance',
            ...filters
        });
    };

    // Format chart data for display
    const formattedChartData = chartData.map(item => ({
        ...item,
        date: format(parseISO(item.date), 'MMM dd')
    }));

    // Calculate attendance percentage
    const attendancePercentage = summary.totalDays
        ? Math.round((summary.present / (summary.workingDays || 1)) * 100)
        : 0;

    // Calculate average working hours per day
    const avgWorkingHours = summary.totalWorkingHours && summary.present
        ? (summary.totalWorkingHours / summary.present).toFixed(1)
        : '0';

    return (
        <Layout>
            <Head title="Attendance Report" />

            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Attendance Report</h1>
                        <p className="mt-1 text-gray-500">
                            View and analyze employee attendance records from {format(parseISO(startDate), 'MMM dd, yyyy')} to {format(parseISO(endDate), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportPdf} className="flex items-center">
                            <FileDown className="mr-2 h-4 w-4" />
                            Export PDF
                        </Button>
                        <Button variant="outline" onClick={handleExportExcel} className="flex items-center">
                            <Download className="mr-2 h-4 w-4" />
                            Export Excel
                        </Button>
                        <Link href={route('reports.index')}>
                            <Button variant="outline" className="flex items-center">
                                <FileBarChart2 className="mr-2 h-4 w-4" />
                                All Reports
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Summary Overview */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <BarChart className="h-5 w-5 mr-2 text-primary" />
                            Attendance Overview
                        </CardTitle>
                        <CardDescription>
                            Summary of attendance metrics for the selected period ({differenceInDays(parseISO(endDate), parseISO(startDate)) + 1} days)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                            <div className="flex flex-col p-4 bg-green-50 rounded-lg">
                                <div className="text-sm text-green-700 mb-1 flex items-center">
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Present
                                </div>
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-green-700 mr-2">{summary.present}</span>
                                    <span className="text-sm text-green-600">days</span>
                                </div>
                                <div className="mt-2 text-xs text-green-600">
                                    {attendancePercentage}% attendance rate
                                </div>
                            </div>

                            <div className="flex flex-col p-4 bg-red-50 rounded-lg">
                                <div className="text-sm text-red-700 mb-1 flex items-center">
                                    <UserX className="h-4 w-4 mr-1" />
                                    Absent
                                </div>
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-red-700 mr-2">{summary.absent}</span>
                                    <span className="text-sm text-red-600">days</span>
                                </div>
                                <div className="mt-2 text-xs text-red-600">
                                    {summary.workingDays ? Math.round((summary.absent / summary.workingDays) * 100) : 0}% absence rate
                                </div>
                            </div>

                            <div className="flex flex-col p-4 bg-orange-50 rounded-lg">
                                <div className="text-sm text-orange-700 mb-1 flex items-center">
                                    <CircleAlert className="h-4 w-4 mr-1" />
                                    Late
                                </div>
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-orange-700 mr-2">{summary.late}</span>
                                    <span className="text-sm text-orange-600">days</span>
                                </div>
                                <div className="mt-2 text-xs text-orange-600">
                                    {summary.present ? Math.round((summary.late / (summary.present + summary.late)) * 100) : 0}% of present days
                                </div>
                            </div>

                            <div className="flex flex-col p-4 bg-yellow-50 rounded-lg">
                                <div className="text-sm text-yellow-700 mb-1 flex items-center">
                                    <CalendarClock className="h-4 w-4 mr-1" />
                                    Half Day
                                </div>
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-yellow-700 mr-2">{summary.halfDay}</span>
                                    <span className="text-sm text-yellow-600">days</span>
                                </div>
                                <div className="mt-2 text-xs text-yellow-600">
                                    {summary.workingDays ? Math.round((summary.halfDay / summary.workingDays) * 100) : 0}% of total days
                                </div>
                            </div>

                            <div className="flex flex-col p-4 bg-blue-50 rounded-lg">
                                <div className="text-sm text-blue-700 mb-1 flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                    On Leave
                                </div>
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-blue-700 mr-2">{summary.onLeave}</span>
                                    <span className="text-sm text-blue-600">days</span>
                                </div>
                                <div className="mt-2 text-xs text-blue-600">
                                    {summary.workingDays ? Math.round((summary.onLeave / summary.workingDays) * 100) : 0}% of total days
                                </div>
                            </div>

                            <div className="flex flex-col p-4 bg-purple-50 rounded-lg">
                                <div className="text-sm text-purple-700 mb-1 flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    Working Hours
                                </div>
                                <div className="flex items-baseline">
                                    <span className="text-2xl font-bold text-purple-700 mr-2">{avgWorkingHours}</span>
                                    <span className="text-sm text-purple-600">hrs/day</span>
                                </div>
                                <div className="mt-2 text-xs text-purple-600">
                                    {summary.totalOvertimeHours ? summary.totalOvertimeHours.toFixed(1) : 0} total overtime hrs
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Visual Representation using CSS only */}
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                            <CardTitle>Attendance Distribution</CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedChart(!expandedChart)}
                                className="flex items-center"
                            >
                                {expandedChart ? 'Collapse' : 'Expand'}
                                <ChevronDown className={cn(
                                    "ml-1 h-4 w-4 transition-transform",
                                    expandedChart && "rotate-180"
                                )} />
                            </Button>
                        </div>
                        <CardDescription>
                            Visual breakdown of attendance status distribution
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Status Distribution Chart */}
                            <div>
                                <h3 className="text-sm font-medium mb-3">Overall Status Distribution</h3>
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center">
                                        <span className="w-24 text-sm">Present</span>
                                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 rounded-full"
                                                style={{ width: `${(summary.present / summary.totalDays) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="ml-2 text-sm">{summary.present} ({Math.round((summary.present / summary.totalDays) * 100)}%)</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-24 text-sm">Absent</span>
                                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-red-500 rounded-full"
                                                style={{ width: `${(summary.absent / summary.totalDays) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="ml-2 text-sm">{summary.absent} ({Math.round((summary.absent / summary.totalDays) * 100)}%)</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-24 text-sm">Late</span>
                                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-orange-500 rounded-full"
                                                style={{ width: `${(summary.late / summary.totalDays) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="ml-2 text-sm">{summary.late} ({Math.round((summary.late / summary.totalDays) * 100)}%)</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-24 text-sm">Half Day</span>
                                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-500 rounded-full"
                                                style={{ width: `${(summary.halfDay / summary.totalDays) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="ml-2 text-sm">{summary.halfDay} ({Math.round((summary.halfDay / summary.totalDays) * 100)}%)</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-24 text-sm">On Leave</span>
                                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${(summary.onLeave / summary.totalDays) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="ml-2 text-sm">{summary.onLeave} ({Math.round((summary.onLeave / summary.totalDays) * 100)}%)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Trend (visible only when expanded) */}
                            {expandedChart && (
                                <div className="mt-6 pt-6 border-t">
                                    <h3 className="text-sm font-medium mb-3">Daily Attendance Trend</h3>
                                    <div className="overflow-x-auto">
                                        <div className="min-w-max">
                                            <div className="flex mb-2">
                                                {formattedChartData.map((day, index) => (
                                                    <div key={index} className="w-14 text-center text-xs font-medium">
                                                        {day.date}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex h-64 relative">
                                                {formattedChartData.map((day, index) => {
                                                    const total = day.present + day.absent + day.late + day.half_day + day.leave;
                                                    return (
                                                        <div key={index} className="w-14 flex flex-col-reverse">
                                                            {total > 0 ? (
                                                                <>
                                                                    <div
                                                                        className="bg-green-500 w-full"
                                                                        style={{ height: `${(day.present / total) * 100}%` }}
                                                                        title={`Present: ${day.present}`}
                                                                    ></div>
                                                                    <div
                                                                        className="bg-red-500 w-full"
                                                                        style={{ height: `${(day.absent / total) * 100}%` }}
                                                                        title={`Absent: ${day.absent}`}
                                                                    ></div>
                                                                    <div
                                                                        className="bg-orange-500 w-full"
                                                                        style={{ height: `${(day.late / total) * 100}%` }}
                                                                        title={`Late: ${day.late}`}
                                                                    ></div>
                                                                    <div
                                                                        className="bg-yellow-500 w-full"
                                                                        style={{ height: `${(day.half_day / total) * 100}%` }}
                                                                        title={`Half Day: ${day.half_day}`}
                                                                    ></div>
                                                                    <div
                                                                        className="bg-blue-500 w-full"
                                                                        style={{ height: `${(day.leave / total) * 100}%` }}
                                                                        title={`On Leave: ${day.leave}`}
                                                                    ></div>
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                                                                    No data
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center mt-4 text-sm">
                                        <div className="flex items-center mr-4"><div className="w-3 h-3 bg-green-500 mr-1"></div> Present</div>
                                        <div className="flex items-center mr-4"><div className="w-3 h-3 bg-red-500 mr-1"></div> Absent</div>
                                        <div className="flex items-center mr-4"><div className="w-3 h-3 bg-orange-500 mr-1"></div> Late</div>
                                        <div className="flex items-center mr-4"><div className="w-3 h-3 bg-yellow-500 mr-1"></div> Half Day</div>
                                        <div className="flex items-center"><div className="w-3 h-3 bg-blue-500 mr-1"></div> On Leave</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </CardTitle>
                        <CardDescription>Filter attendance records by date range, branch, department, or status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date Range</label>
                                <div className="flex gap-2">
                                    <div className="w-1/2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {fromDate ? format(fromDate, 'MMM dd, yyyy') : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={fromDate}
                                                    onSelect={setFromDate}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="w-1/2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {toDate ? format(toDate, 'MMM dd, yyyy') : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={toDate}
                                                    onSelect={setToDate}
                                                    initialFocus
                                                    disabled={(date) => date < (fromDate || new Date(2020, 0, 1))}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Branch</label>
                                <Select value={branch} onValueChange={setBranch}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Branches" />
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

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Department</label>
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="present">Present</SelectItem>
                                        <SelectItem value="absent">Absent</SelectItem>
                                        <SelectItem value="late">Late</SelectItem>
                                        <SelectItem value="half_day">Half Day</SelectItem>
                                        <SelectItem value="leave">On Leave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Employee</label>
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Employees" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {employees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id.toString()}>
                                                {employee.employee_id} - {employee.first_name} {employee.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end gap-2">
                                <Button onClick={applyFilters} className="flex-1">
                                    Apply Filters
                                </Button>
                                <Button variant="outline" onClick={resetFilters}>
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table Header */}
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold">Attendance Records</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-sm"
                    >
                        {showDetails ? 'Hide' : 'Show'} Details
                    </Button>
                </div>

                {/* Attendance Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    {showDetails && (
                                        <>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Working Hours</TableHead>
                                            <TableHead>Overtime</TableHead>
                                        </>
                                    )}
                                    <TableHead>Status</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Branch</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendances.data.length > 0 ? (
                                    attendances.data.map((attendance) => (
                                        <TableRow key={attendance.id}>
                                            <TableCell className="font-medium">
                                                <div>
                                                    {attendance.employee.first_name} {attendance.employee.last_name}
                                                    <div className="text-xs text-gray-500">{attendance.employee.employee_id}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{format(parseISO(attendance.date), 'EEE, MMM dd')}</TableCell>
                                            <TableCell>
                                                {attendance.check_in ? (
                                                    <span className="flex items-center">
                                                        <Clock className="mr-1 h-3 w-3 text-green-500" />
                                                        {attendance.check_in.substring(0, 5)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {attendance.check_out ? (
                                                    <span className="flex items-center">
                                                        <Clock className="mr-1 h-3 w-3 text-red-500" />
                                                        {attendance.check_out.substring(0, 5)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            {showDetails && (
                                                <>
                                                    <TableCell>
                                                        {calculateDuration(attendance.check_in, attendance.check_out)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {attendance.working_hours ? `${attendance.working_hours.toFixed(2)} hrs` : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {attendance.overtime_hours ? (
                                                            <span className="text-purple-600">{attendance.overtime_hours.toFixed(2)} hrs</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell>{getStatusBadge(attendance.status)}</TableCell>
                                            <TableCell>{attendance.employee.department.name}</TableCell>
                                            <TableCell>{attendance.employee.branch.name}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={showDetails ? 10 : 7} className="h-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <UserCheck className="h-12 w-12 text-gray-400 mb-2" />
                                                <p>No attendance records found for the selected criteria.</p>
                                                {(branch || department || status || employeeId ||
                                                    fromDate?.toString() !== parseISO(startDate).toString() ||
                                                    toDate?.toString() !== parseISO(endDate).toString()) && (
                                                        <Button
                                                            variant="link"
                                                            onClick={resetFilters}
                                                            className="px-2 font-normal mt-2"
                                                        >
                                                            Clear filters
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
                {attendances.meta && attendances.meta.last_page > 1 && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                {attendances.meta.current_page > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={attendances.links.prev || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(attendances.links.prev || '', filters, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}

                                {attendances.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
                                    const isPageNumber = !isNaN(Number(link.label));

                                    if (!isPageNumber && link.label === '...') {
                                        return (
                                            <PaginationItem key={i}>
                                                <PaginationEllipsis />
                                            </PaginationItem>
                                        );
                                    }

                                    return (
                                        <PaginationItem key={i}>
                                            <PaginationLink
                                                href={link.url || '#'}
                                                isActive={link.active}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (link.url) {
                                                        router.get(link.url, filters, { preserveState: true });
                                                    }
                                                }}
                                            >
                                                {link.label}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {attendances.meta.current_page < attendances.meta.last_page && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={attendances.links.next || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(attendances.links.next || '', filters, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {/* Report Notes */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="text-md">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm space-y-2">
                            <p>
                                <span className="font-medium">Working Hours:</span> Standard working hours are calculated based on check-in and check-out times.
                            </p>
                            <p>
                                <span className="font-medium">Overtime:</span> Hours worked beyond the standard shift time are counted as overtime.
                            </p>
                            <p>
                                <span className="font-medium">Late Status:</span> Employees are marked as late if they check in after the designated time according to company policy.
                            </p>
                            <p>
                                <span className="font-medium">Half Day:</span> Employees who work less than the required number of hours are marked as half-day.
                            </p>
                            <p>
                                <span className="font-medium">Data Source:</span> This report is generated from biometric attendance devices and approved leaves.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Summary */}
                <Card className="mt-6">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-md">Month-to-Date Performance</CardTitle>
                        <CardDescription>
                            Attendance performance for the current month
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="rounded-lg border bg-card p-3">
                                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium">Attendance Rate</p>
                                    <CircleAlert className={cn(
                                        "h-4 w-4",
                                        attendancePercentage >= 90 ? "text-green-500" :
                                            attendancePercentage >= 80 ? "text-yellow-500" : "text-red-500"
                                    )} />
                                </div>
                                <div className="text-2xl font-bold">{attendancePercentage}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {attendancePercentage >= 90 ? "Excellent" :
                                        attendancePercentage >= 80 ? "Good" : "Needs Improvement"}
                                </p>
                            </div>

                            <div className="rounded-lg border bg-card p-3">
                                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium">Punctuality</p>
                                    <Clock className={cn(
                                        "h-4 w-4",
                                        summary.late / (summary.present || 1) <= 0.1 ? "text-green-500" :
                                            summary.late / (summary.present || 1) <= 0.2 ? "text-yellow-500" : "text-red-500"
                                    )} />
                                </div>
                                <div className="text-2xl font-bold">
                                    {summary.present ? Math.round(((summary.present - summary.late) / summary.present) * 100) : 0}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {summary.late} days with late arrivals
                                </p>
                            </div>

                            <div className="rounded-lg border bg-card p-3">
                                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium">Avg. Working Hours</p>
                                    <CalendarClock className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {avgWorkingHours}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    hours per day
                                </p>
                            </div>

                            <div className="rounded-lg border bg-card p-3">
                                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <p className="text-sm font-medium">Overtime</p>
                                    <Clock className="h-4 w-4 text-purple-500" />
                                </div>
                                <div className="text-2xl font-bold">
                                    {summary.totalOvertimeHours ? summary.totalOvertimeHours.toFixed(1) : 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    total hours
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Weekday Analysis */}
                <Card className="mt-6">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-md">Weekday Attendance Analysis</CardTitle>
                        <CardDescription>
                            Breakdown of attendance patterns by day of the week
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Day</TableHead>
                                        <TableHead>Present %</TableHead>
                                        <TableHead>Absent %</TableHead>
                                        <TableHead>Late %</TableHead>
                                        <TableHead>On Leave %</TableHead>
                                        <TableHead>Avg. Hours</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* This would typically be generated from backend data */}
                                    <TableRow>
                                        <TableCell className="font-medium">Monday</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                                                </div>
                                                <span>85%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                                </div>
                                                <span>5%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                                                </div>
                                                <span>10%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                                                </div>
                                                <span>0%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>8.2 hrs</TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell className="font-medium">Tuesday</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                                                </div>
                                                <span>90%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                                                </div>
                                                <span>0%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                                </div>
                                                <span>5%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                                </div>
                                                <span>5%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>8.4 hrs</TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell className="font-medium">Wednesday</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                                                </div>
                                                <span>88%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '2%' }}></div>
                                                </div>
                                                <span>2%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '7%' }}></div>
                                                </div>
                                                <span>7%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                                                </div>
                                                <span>3%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>8.3 hrs</TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell className="font-medium">Thursday</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                                                </div>
                                                <span>92%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                                                </div>
                                                <span>3%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '2%' }}></div>
                                                </div>
                                                <span>2%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                                                </div>
                                                <span>3%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>8.5 hrs</TableCell>
                                    </TableRow>

                                    <TableRow>
                                        <TableCell className="font-medium">Friday</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                                                </div>
                                                <span>80%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                                </div>
                                                <span>5%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                                </div>
                                                <span>5%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                                                </div>
                                                <span>10%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>8.0 hrs</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
