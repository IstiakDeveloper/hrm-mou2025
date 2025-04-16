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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
    ArrowLeft,
    CalendarRange,
    Download,
    BarChart3,
    PieChart,
    RefreshCcw,
    Search,
    Filter,
    Building
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Create a safe calendar component to avoid SVG props issues
const SafeCalendar = ({ disabledDates, ...props }: any) => {
    return (
        <Calendar
            {...props}
            modifiers={{
                disabled: disabledDates ? (date: Date) => disabledDates(date) : undefined,
            }}
        />
    );
};

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    department: {
        id: number;
        name: string;
    } | null;
    designation: {
        id: number;
        name: string;
    } | null;
}

interface Department {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface Transfer {
    id: number;
    employee_id: number;
    from_branch_id: number;
    to_branch_id: number;
    from_department_id: number | null;
    to_department_id: number | null;
    from_designation_id: number | null;
    to_designation_id: number | null;
    effective_date: string;
    transfer_order_no: string | null;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
    approved_by: number | null;
    employee: Employee;
    fromBranch: Branch;
    toBranch: Branch;
    fromDepartment: Department | null;
    toDepartment: Department | null;
    approver: User | null;
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

interface TransfersResponse {
    data: Transfer[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface TransferSummary {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    completed: number;
}

interface TransferReportProps {
    transfers: TransfersResponse;
    departments: Department[];
    branches: Branch[];
    employees: Employee[];
    filters: {
        start_date?: string;
        end_date?: string;
        status?: string;
        department_id?: string;
        from_branch_id?: string;
        to_branch_id?: string;
        employee_id?: string;
    };
    startDate: string;
    endDate: string;
    summary: TransferSummary;
}

export default function TransferReport({
    transfers,
    departments,
    branches,
    employees,
    filters,
    startDate,
    endDate,
    summary
}: TransferReportProps) {
    // Initialize state with filters or "all" for select components
    const [status, setStatus] = useState(filters.status || 'all');
    const [departmentId, setDepartmentId] = useState(filters.department_id || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
    const [fromBranchId, setFromBranchId] = useState(filters.from_branch_id || 'all');
    const [toBranchId, setToBranchId] = useState(filters.to_branch_id || 'all');
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.start_date ? new Date(filters.start_date) : new Date(startDate)
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.end_date ? new Date(filters.end_date) : new Date(endDate)
    );
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);

    const handleApplyFilters = () => {
        router.get(route('transfers.report'), {
            start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            status: status === 'all' ? '' : status,
            department_id: departmentId === 'all' ? '' : departmentId,
            from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
            to_branch_id: toBranchId === 'all' ? '' : toBranchId,
            employee_id: employeeId === 'all' ? '' : employeeId,
        }, { preserveState: true });
    };

    const resetFilters = () => {
        setStatus('all');
        setDepartmentId('all');
        setEmployeeId('all');
        setFromBranchId('all');
        setToBranchId('all');
        setFromDate(new Date(subDays(new Date(), 30)));
        setToDate(new Date());
        router.get(route('transfers.report'), {
            start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
            end_date: format(new Date(), 'yyyy-MM-dd'),
        }, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
            case 'approved':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Approved</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Calculate percentage for summary cards
    const calculatePercentage = (value: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    // Check if pagination data exists
    const hasPagination = transfers?.meta && transfers?.links;

    return (
        <Layout>
            <Head title="Transfer Report" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('transfers.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Transfers
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Transfer Report</h1>
                        <p className="mt-1 text-gray-500">
                            Employee transfer activity from {format(new Date(startDate), 'MMM dd, yyyy')} to {format(new Date(endDate), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    <div>
                        <Button variant="outline" className="flex items-center">
                            <Download className="mr-1 h-4 w-4" />
                            Export Report
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Transfers</p>
                                    <p className="text-3xl font-bold mt-1">{summary?.total || 0}</p>
                                </div>
                                <BarChart3 className="h-6 w-6 text-gray-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Pending</p>
                                    <p className="text-3xl font-bold mt-1">{summary?.pending || 0}</p>
                                </div>
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    {calculatePercentage(summary?.pending || 0, summary?.total || 1)}%
                                </Badge>
                            </div>
                            <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-500 rounded-full"
                                    style={{ width: `${calculatePercentage(summary?.pending || 0, summary?.total || 1)}%` }}
                                ></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Approved</p>
                                    <p className="text-3xl font-bold mt-1">{summary?.approved || 0}</p>
                                </div>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {calculatePercentage(summary?.approved || 0, summary?.total || 1)}%
                                </Badge>
                            </div>
                            <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: `${calculatePercentage(summary?.approved || 0, summary?.total || 1)}%` }}
                                ></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Completed</p>
                                    <p className="text-3xl font-bold mt-1">{summary?.completed || 0}</p>
                                </div>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {calculatePercentage(summary?.completed || 0, summary?.total || 1)}%
                                </Badge>
                            </div>
                            <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full"
                                    style={{ width: `${calculatePercentage(summary?.completed || 0, summary?.total || 1)}%` }}
                                ></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Rejected</p>
                                    <p className="text-3xl font-bold mt-1">{summary?.rejected || 0}</p>
                                </div>
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    {calculatePercentage(summary?.rejected || 0, summary?.total || 1)}%
                                </Badge>
                            </div>
                            <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 rounded-full"
                                    style={{ width: `${calculatePercentage(summary?.rejected || 0, summary?.total || 1)}%` }}
                                ></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center">
                            <Filter className="h-4 w-4 mr-2" />
                            Report Filters
                        </CardTitle>
                        <CardDescription>Filter transfer data by date range and categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <CalendarRange className="h-4 w-4 mr-1 text-gray-500" />
                                    <span className="text-sm font-medium">Date Range</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "justify-start text-left font-normal",
                                                    !fromDate && "text-muted-foreground"
                                                )}
                                            >
                                                {fromDate ? format(fromDate, 'MMM dd, yyyy') : <span>Start Date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <SafeCalendar
                                                mode="single"
                                                selected={fromDate}
                                                onSelect={(date: Date | undefined) => {
                                                    setFromDate(date);
                                                    setFromDateOpen(false);
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "justify-start text-left font-normal",
                                                    !toDate && "text-muted-foreground"
                                                )}
                                            >
                                                {toDate ? format(toDate, 'MMM dd, yyyy') : <span>End Date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <SafeCalendar
                                                mode="single"
                                                selected={toDate}
                                                onSelect={(date: Date | undefined) => {
                                                    setToDate(date);
                                                    setToDateOpen(false);
                                                }}
                                                disabledDates={(date: Date) => fromDate ? date < fromDate : false}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status & Branches</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={departmentId} onValueChange={setDepartmentId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Department" />
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
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Branches</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={fromBranchId} onValueChange={setFromBranchId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="From Branch" />
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

                                    <Select value={toBranchId} onValueChange={setToBranchId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="To Branch" />
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
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Employee</label>
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {employees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id.toString()}>
                                                {employee.first_name} {employee.last_name} ({employee.employee_id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4 space-x-2">
                            <Button variant="outline" onClick={resetFilters}>
                                <RefreshCcw className="mr-1 h-4 w-4" />
                                Reset
                            </Button>
                            <Button onClick={handleApplyFilters}>
                                <Search className="mr-1 h-4 w-4" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Transfers Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Transfer Details</CardTitle>
                        <CardDescription>
                            Showing {transfers?.meta?.from || 0} to {transfers?.meta?.to || 0} of {transfers?.meta?.total || 0} transfers
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>From Branch</TableHead>
                                    <TableHead>To Branch</TableHead>
                                    <TableHead>Effective Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transfers?.data?.length > 0 ? (
                                    transfers.data.map((transfer) => (
                                        <TableRow key={transfer.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">
                                                        {transfer.employee.first_name} {transfer.employee.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {transfer.employee.department?.name || 'No Department'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{transfer.fromBranch.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {transfer.fromDepartment?.name || 'Same Department'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{transfer.toBranch.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {transfer.toDepartment?.name || 'Same Department'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(transfer.effective_date), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(transfer.status)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No transfer requests found for the selected filters.
                                            <Button
                                                variant="link"
                                                onClick={resetFilters}
                                                className="px-2 font-normal"
                                            >
                                                Clear filters
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter className="border-t pt-6 flex justify-between">
                        <div className="text-sm text-gray-500">
                            Showing {transfers?.meta?.from || 0} to {transfers?.meta?.to || 0} of {transfers?.meta?.total || 0} results
                        </div>
                    </CardFooter>
                </Card>

                {/* Pagination */}
                {hasPagination && transfers?.meta?.last_page > 1 && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                {transfers.meta.current_page > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={transfers.links.prev || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(transfers.links.prev || '', {
                                                    start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                                                    end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                                                    status: status === 'all' ? '' : status,
                                                    department_id: departmentId === 'all' ? '' : departmentId,
                                                    from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
                                                    to_branch_id: toBranchId === 'all' ? '' : toBranchId,
                                                    employee_id: employeeId === 'all' ? '' : employeeId,
                                                }, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}

                                {transfers.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                                                        router.get(link.url, {
                                                            start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                                                            end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                                                            status: status === 'all' ? '' : status,
                                                            department_id: departmentId === 'all' ? '' : departmentId,
                                                            from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
                                                            to_branch_id: toBranchId === 'all' ? '' : toBranchId,
                                                            employee_id: employeeId === 'all' ? '' : employeeId,
                                                        }, { preserveState: true });
                                                    }
                                                }}
                                            >
                                                {link.label}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {transfers.meta.current_page < transfers.meta.last_page && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={transfers.links.next || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(transfers.links.next || '', {
                                                    start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                                                    end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                                                    status: status === 'all' ? '' : status,
                                                    department_id: departmentId === 'all' ? '' : departmentId,
                                                    from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
                                                    to_branch_id: toBranchId === 'all' ? '' : toBranchId,
                                                    employee_id: employeeId === 'all' ? '' : employeeId,
                                                }, { preserveState: true });
                                            }}
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
