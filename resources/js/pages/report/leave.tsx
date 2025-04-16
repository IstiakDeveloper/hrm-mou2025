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
    FileDown,
    FileBarChart2,
    CheckCircle,
    XCircle,
    Clock,
    CalendarDays,
    Calendar as CalendarFull,
    ChevronDown
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface LeaveApplication {
    id: number;
    employee_id: number;
    leave_type_id: number;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
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
    };
    leaveType: {
        id: number;
        name: string;
        color: string;
    };
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

interface LeaveApplicationResponse {
    data: LeaveApplication[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface LeaveReportProps {
    applications: LeaveApplicationResponse;
    departments: Department[];
    employees: Employee[];
    filters: {
        start_date?: string;
        end_date?: string;
        status?: string;
        department_id?: string;
        leave_type_id?: string;
        employee_id?: string;
    };
    startDate: string;
    endDate: string;
    summary: {
        total: number;
        approved: number;
        rejected: number;
        pending: number;
        totalDays: number;
    };
}

export default function LeaveReport({
    applications,
    departments,
    employees,
    filters,
    startDate,
    endDate,
    summary
}: LeaveReportProps) {
    // Local state for filters
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.start_date ? parseISO(filters.start_date) : parseISO(startDate)
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.end_date ? parseISO(filters.end_date) : parseISO(endDate)
    );
    const [status, setStatus] = useState(filters.status || 'all');
    const [department, setDepartment] = useState(filters.department_id || 'all');
    const [leaveType, setLeaveType] = useState(filters.leave_type_id || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
    const [showDetailedChart, setShowDetailedChart] = useState(false);

    // Handle filter application
    const applyFilters = () => {
        router.get(route('reports.leave'), {
            start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            status: status !== 'all' ? status : '',
            department_id: department !== 'all' ? department : '',
            leave_type_id: leaveType !== 'all' ? leaveType : '',
            employee_id: employeeId !== 'all' ? employeeId : '',
        }, { preserveState: true });
    };

    // Reset filters
    const resetFilters = () => {
        setFromDate(parseISO(startDate));
        setToDate(parseISO(endDate));
        setStatus('all');
        setDepartment('all');
        setLeaveType('all');
        setEmployeeId('all');

        router.get(route('reports.leave'), {}, { preserveState: true });
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Export handlers
    const handleExportPdf = () => {
        router.post(route('reports.export-pdf'), {
            report_type: 'leave',
            ...filters
        });
    };

    const handleExportExcel = () => {
        router.post(route('reports.export-excel'), {
            report_type: 'leave',
            ...filters
        });
    };

    // Generate percentage for donut chart and progress bar
    const total = summary.approved + summary.rejected + summary.pending;
    const approvedPercentage = total > 0 ? Math.round((summary.approved / total) * 100) : 0;
    const rejectedPercentage = total > 0 ? Math.round((summary.rejected / total) * 100) : 0;
    const pendingPercentage = total > 0 ? Math.round((summary.pending / total) * 100) : 0;

    return (
        <Layout>
            <Head title="Leave Report" />

            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Leave Report</h1>
                        <p className="mt-1 text-gray-500">
                            Track and analyze employee leave applications
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

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-gray-500">Total Applications</span>
                                <span className="text-3xl font-bold">{summary.total}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-green-700">Approved</span>
                                <span className="text-3xl font-bold text-green-700">{summary.approved}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-red-700">Rejected</span>
                                <span className="text-3xl font-bold text-red-700">{summary.rejected}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-yellow-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-yellow-700">Pending</span>
                                <span className="text-3xl font-bold text-yellow-700">{summary.pending}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-blue-700">Total Days</span>
                                <span className="text-3xl font-bold text-blue-700">{summary.totalDays}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Status distribution chart using CSS only */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between">
                                <CardTitle>Leave Status Distribution</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowDetailedChart(!showDetailedChart)}
                                    className="flex items-center text-xs"
                                >
                                    {showDetailedChart ? 'Show Simple' : 'Show Detailed'}
                                    <ChevronDown className={cn(
                                        "ml-1 h-4 w-4 transition-transform",
                                        showDetailedChart && "rotate-180"
                                    )} />
                                </Button>
                            </div>
                            <CardDescription>
                                Distribution of leave applications by status
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {showDetailedChart ? (
                                /* Detailed bar chart view */
                                <div className="h-64 px-2">
                                    <div className="flex h-56 items-end gap-2">
                                        <div className="relative flex h-full w-1/3 flex-col items-center justify-end">
                                            <div className="absolute bottom-0 w-full bg-green-100 rounded-t-md"
                                                style={{ height: `${approvedPercentage}%` }}>
                                                <div className="absolute top-0 left-0 right-0 -mt-6 text-center text-sm font-medium">
                                                    {approvedPercentage}%
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 flex h-11 items-center justify-center rounded-b-md bg-green-600 text-sm text-white">
                                                Approved
                                            </div>
                                        </div>

                                        <div className="relative flex h-full w-1/3 flex-col items-center justify-end">
                                            <div className="absolute bottom-0 w-full bg-red-100 rounded-t-md"
                                                style={{ height: `${rejectedPercentage}%` }}>
                                                <div className="absolute top-0 left-0 right-0 -mt-6 text-center text-sm font-medium">
                                                    {rejectedPercentage}%
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 flex h-11 items-center justify-center rounded-b-md bg-red-600 text-sm text-white">
                                                Rejected
                                            </div>
                                        </div>

                                        <div className="relative flex h-full w-1/3 flex-col items-center justify-end">
                                            <div className="absolute bottom-0 w-full bg-yellow-100 rounded-t-md"
                                                style={{ height: `${pendingPercentage}%` }}>
                                                <div className="absolute top-0 left-0 right-0 -mt-6 text-center text-sm font-medium">
                                                    {pendingPercentage}%
                                                </div>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 flex h-11 items-center justify-center rounded-b-md bg-yellow-500 text-sm text-white">
                                                Pending
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center mt-2 text-xs text-gray-500">
                                        Based on {summary.total} leave applications
                                    </div>
                                </div>
                            ) : (
                                /* Simple donut chart view using CSS */
                                <div className="flex flex-col items-center h-64">
                                    <div className="relative w-48 h-48 my-4">
                                        {/* Layered rings to create donut chart effect */}
                                        <div className="absolute inset-0 rounded-full border-8 border-gray-100"></div>

                                        {/* Colored segments - we're using conic-gradient for this */}
                                        {total > 0 && (
                                            <div
                                                className="absolute inset-0 rounded-full border-8"
                                                style={{
                                                    borderColor: 'transparent',
                                                    background: `conic-gradient(
                            #22c55e 0% ${approvedPercentage}%,
                            #ef4444 ${approvedPercentage}% ${approvedPercentage + rejectedPercentage}%,
                            #eab308 ${approvedPercentage + rejectedPercentage}% 100%
                          )`
                                                }}
                                            ></div>
                                        )}

                                        {/* White center to create donut hole */}
                                        <div className="absolute inset-0 m-4 rounded-full bg-white flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="text-lg font-bold">{summary.total}</div>
                                                <div className="text-xs text-gray-500">Applications</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="flex gap-6 mt-2">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                                            <span className="text-sm">Approved ({summary.approved})</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                                            <span className="text-sm">Rejected ({summary.rejected})</span>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                                            <span className="text-sm">Pending ({summary.pending})</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Date Range Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Information</CardTitle>
                            <CardDescription>
                                Overview of the current report parameters
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <CalendarFull className="h-5 w-5 mr-2 text-gray-500" />
                                    <div>
                                        <p className="text-sm font-medium">Date Range</p>
                                        <p className="text-sm text-gray-500">
                                            {format(parseISO(startDate), 'MMMM d, yyyy')} to {format(parseISO(endDate), 'MMMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <CalendarDays className="h-5 w-5 mr-2 text-gray-500" />
                                    <div>
                                        <p className="text-sm font-medium">Report Period</p>
                                        <p className="text-sm text-gray-500">
                                            {differenceInDays(parseISO(endDate), parseISO(startDate)) + 1} days
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                                    <div>
                                        <p className="text-sm font-medium">Approval Rate</p>
                                        <div className="flex items-center mt-1">
                                            <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                                                <div
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${approvedPercentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm text-gray-500">
                                                {approvedPercentage}% of applications approved
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Clock className="h-5 w-5 mr-2 text-yellow-500" />
                                    <div>
                                        <p className="text-sm font-medium">Average Leave Duration</p>
                                        <p className="text-sm text-gray-500">
                                            {summary.approved ? (summary.totalDays / summary.approved).toFixed(1) : 0} days per approved application
                                        </p>
                                    </div>
                                </div>

                                {/* Additional insights */}
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-medium mb-2">Leave Status Breakdown</h3>
                                    <div className="space-y-2">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Approved</span>
                                                <span>{summary.approved} ({approvedPercentage}%)</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full">
                                                <div
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${approvedPercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Rejected</span>
                                                <span>{summary.rejected} ({rejectedPercentage}%)</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full">
                                                <div
                                                    className="h-full bg-red-500 rounded-full"
                                                    style={{ width: `${rejectedPercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span>Pending</span>
                                                <span>{summary.pending} ({pendingPercentage}%)</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full">
                                                <div
                                                    className="h-full bg-yellow-500 rounded-full"
                                                    style={{ width: `${pendingPercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </CardTitle>
                        <CardDescription>Filter leave applications by date range, status, department, or employee</CardDescription>
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
                                                    {fromDate ? format(fromDate, 'PPP') : <span>Pick a date</span>}
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
                                                    {toDate ? format(toDate, 'PPP') : <span>Pick a date</span>}
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
                                <label className="text-sm font-medium">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
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
                                <label className="text-sm font-medium">Leave Type</label>
                                <Select value={leaveType} onValueChange={setLeaveType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Leave Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Leave Types</SelectItem>
                                        <SelectItem value="1">Annual Leave</SelectItem>
                                        <SelectItem value="2">Sick Leave</SelectItem>
                                        <SelectItem value="3">Maternity Leave</SelectItem>
                                        <SelectItem value="4">Paternity Leave</SelectItem>
                                        <SelectItem value="5">Unpaid Leave</SelectItem>
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

                {/* Leave Applications Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Leave Type</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Department</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.data.length > 0 ? (
                                    applications.data.map((application) => (
                                        <TableRow key={application.id}>
                                            <TableCell className="font-medium">
                                                {application.employee.first_name} {application.employee.last_name}
                                                <div className="text-xs text-gray-500">{application.employee.employee_id}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <div
                                                        className="w-3 h-3 rounded-full mr-2"
                                                        style={{ backgroundColor: application.leaveType.color }}
                                                    ></div>
                                                    {application.leaveType.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{format(parseISO(application.start_date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>{format(parseISO(application.end_date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>{application.days}</TableCell>
                                            <TableCell className="max-w-xs truncate">{application.reason}</TableCell>
                                            <TableCell>{getStatusBadge(application.status)}</TableCell>
                                            <TableCell>{application.employee.department.name}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <CalendarDays className="h-12 w-12 text-gray-400 mb-2" />
                                                <p>No leave applications found for the selected criteria.</p>
                                                <Button
                                                    variant="link"
                                                    onClick={resetFilters}
                                                    className="px-2 font-normal mt-2"
                                                >
                                                    Clear filters
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {applications.meta && applications.meta.last_page > 1 && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                {applications.meta.current_page > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={applications.links.prev || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(applications.links.prev || '', filters, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}

                                {applications.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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

                                {applications.meta.current_page < applications.meta.last_page && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={applications.links.next || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(applications.links.next || '', filters, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {/* Monthly Leave Distribution - Additional Analysis */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Monthly Leave Distribution</CardTitle>
                        <CardDescription>
                            Analysis of leave applications by month
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <div className="min-w-max">
                                {/* Monthly Leave Distribution Chart using CSS grid */}
                                <div className="grid grid-cols-12 gap-2 mb-2">
                                    <div className="col-span-1"></div>
                                    <div className="col-span-1 text-center text-xs font-medium">Jan</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Feb</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Mar</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Apr</div>
                                    <div className="col-span-1 text-center text-xs font-medium">May</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Jun</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Jul</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Aug</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Sep</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Oct</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Nov</div>
                                    <div className="col-span-1 text-center text-xs font-medium">Dec</div>
                                </div>

                                {/* These would typically be dynamically generated - showing mock data for example */}
                                <div className="grid grid-cols-12 gap-2 mb-1">
                                    <div className="col-span-1 text-xs font-medium">Annual</div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">5</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">3</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">7</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">9</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">12</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">8</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">6</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">15</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">4</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">7</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">11</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-green-100 rounded flex items-center justify-center text-xs font-medium">20</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-2 mb-1">
                                    <div className="col-span-1 text-xs font-medium">Sick</div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">8</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">10</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">9</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">7</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">5</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">3</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">4</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">6</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">9</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">12</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">11</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-medium">7</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-2 mb-1">
                                    <div className="col-span-1 text-xs font-medium">Other</div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">2</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">1</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">3</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">2</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">4</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">2</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">1</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">0</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">1</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">2</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">1</div>
                                    </div>
                                    <div className="col-span-1">
                                        <div className="h-8 bg-purple-100 rounded flex items-center justify-center text-xs font-medium">3</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 border rounded-lg">
                                <h3 className="text-sm font-medium mb-2">Peak Leave Months</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">December</span>
                                        <span className="font-medium">30 days</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">August</span>
                                        <span className="font-medium">21 days</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">May</span>
                                        <span className="font-medium">21 days</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <h3 className="text-sm font-medium mb-2">Most Common Leave Type</h3>
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                                        <span className="text-lg font-bold text-green-700">107</span>
                                    </div>
                                    <span className="text-sm">Annual Leave</span>
                                    <span className="text-xs text-gray-500 mt-1">56% of all leave</span>
                                </div>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <h3 className="text-sm font-medium mb-2">Average Leave Per Month</h3>
                                <div className="text-center mb-2">
                                    <span className="text-2xl font-bold">16.7</span>
                                    <span className="text-sm text-gray-500 ml-1">applications</span>
                                </div>
                                <div className="flex items-center justify-center">
                                    <div className="w-full h-2 bg-gray-100 rounded-full">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `75%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
