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
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import {
    CalendarIcon,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    ClipboardCheck,
    Eye,
    FileText,
    MoreHorizontal,
    Plus,
    Search,
    User,
    UserX,
    XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Department {
    id: number;
    name: string;
}

interface Employee extends EmployeeNameFields {
    id: number;
    employee_id: string;
    department: Department;
    designation: {
        id: number;
        name: string;
    };
}

interface LeaveType {
    id: number;
    name: string;
}

interface LeaveApproverUser {
    id: number;
    name: string;
}

interface LeaveApplication {
    id: number;
    employee_id: number;
    leave_type_id: number;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    applied_at: string;
    approved_by: number | null;
    rejection_reason: string | null;
    documents: string | null;
    employee: Employee;
    /** Laravel serializes relation as `leave_type` in JSON; support both. */
    leaveType?: LeaveType;
    leave_type?: LeaveType;
    approver: LeaveApproverUser | null;
    /** Set by server: current user may approve/reject this row (tier + legacy rules). */
    can_approve_action?: boolean;
    /** Pending: current tier target; approved/rejected: who actioned it. */
    approver_display?: {
        label: string;
        title: string | null;
        name: string | null;
        status: string;
    };
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

interface ApplicationsResponse {
    data: LeaveApplication[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface ApplicationsIndexProps {
    applications: ApplicationsResponse;
    departments: Department[];
    employees: Employee[];
    filters: {
        status: string;
        department_id: string;
        employee_id: string;
        from_date: string;
        to_date: string;
        search: string;
        per_page?: string;
    };
    canApprove: boolean;
    userPermissions: {
        canView: boolean;
        canCreate: boolean;
        canEdit: boolean;
        canApprove: boolean;
        isBranchManager: boolean;
        userBranchId: number | null;
        userDepartmentId: number | null;
        isEmployee: boolean;
        employeeId: number | null;
    };
    currentUserId: number;
}

export default function ApplicationsIndex({
    applications,
    departments,
    employees,
    filters,
    canApprove,
    userPermissions,
    currentUserId
  }: ApplicationsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [departmentId, setDepartmentId] = useState(filters.department_id || 'all');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.from_date ? new Date(filters.from_date) : undefined
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.to_date ? new Date(filters.to_date) : undefined
    );
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);
    const [perPage, setPerPage] = useState(filters.per_page || '10');

    const handleSearch = () => {
        router.get(route('leave.applications.index'), {
            search,
            status: status === 'all' ? '' : status,
            department_id: departmentId === 'all' ? '' : departmentId,
            employee_id: employeeId === 'all' ? '' : employeeId,
            from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            per_page: perPage
        }, { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('leave.applications.index'), {
            search,
            status: status === 'all' ? '' : status,
            department_id: departmentId === 'all' ? '' : departmentId,
            employee_id: employeeId === 'all' ? '' : employeeId,
            from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            per_page: value
        }, { preserveState: true });
    };


    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setDepartmentId('all');
        setEmployeeId('all');
        setFromDate(undefined);
        setToDate(undefined);
        setPerPage('10');
        router.get(route('leave.applications.index'), { per_page: '10' }, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        const statusStyles: Record<string, string> = {
            'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'approved': 'bg-green-100 text-green-800 border-green-200',
            'rejected': 'bg-red-100 text-red-800 border-red-200',
            'cancelled': 'bg-gray-100 text-gray-800 border-gray-200'
        };

        const statusIcons: Record<string, React.ReactNode> = {
            'pending': <ClipboardCheck className="mr-1 h-3 w-3" />,
            'approved': <CheckCircle2 className="mr-1 h-3 w-3" />,
            'rejected': <XCircle className="mr-1 h-3 w-3" />,
            'cancelled': <UserX className="mr-1 h-3 w-3" />
        };

        return (
            <Badge variant="outline" className={`${statusStyles[status]} flex items-center`}>
                {statusIcons[status]}
                <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </Badge>
        );
    };

    const goToCreatePage = () => {
        // Use router.visit instead of router.get to ensure proper navigation
        router.visit(route('leave.applications.create'));
    };

    return (
        <Layout>
            <Head title="Leave Applications" />

            <PageSurface className="max-w-7xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2 border-b border-slate-200 pb-3">
                    <div>
                        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Leave Applications</h1>
                        <p className="text-xs text-slate-500">
                            Manage employee leave requests and approvals
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-white"
                            onClick={() => router.visit(route('leave.applications.report'))}
                        >
                            <FileText className="mr-1 h-3 w-3" />
                            Report
                        </Button>
                        <Button onClick={goToCreatePage} size="sm" className="h-7 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="mr-1 h-3 w-3" />
                            Apply for Leave
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="shadow-xs border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-2.5 sm:p-4">
                        <div className="grid grid-cols-2 gap-2 mb-2.5">
                            <div className="space-y-1">
                                <Label className="text-[10px]">From Date</Label>
                                <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-8 text-xs px-2.5",
                                                !fromDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                            {fromDate ? format(fromDate, 'PP') : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={fromDate}
                                            onSelect={(date) => {
                                                setFromDate(date);
                                                setFromDateOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px]">To Date</Label>
                                <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-8 text-xs px-2.5",
                                                !toDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                            {toDate ? format(toDate, 'PP') : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={toDate}
                                            onSelect={(date) => {
                                                setToDate(date);
                                                setToDateOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                                <Input
                                    placeholder="Search name or ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="pl-8 h-8 text-xs"
                                />
                            </div>

                            <div>
                                <Select
                                    value={status}
                                    onValueChange={setStatus}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Select
                                    value={departmentId}
                                    onValueChange={setDepartmentId}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments && departments.map((department) => (
                                            <SelectItem key={department.id} value={department.id.toString()}>
                                                {department.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Select
                                    value={employeeId}
                                    onValueChange={setEmployeeId}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {employees && employees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id.toString()}>
                                                {employeeDisplayName(employee)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-end gap-1.5">
                            <Button variant="outline" size="sm" onClick={resetFilters} className="h-7 px-2 text-[10px]">
                                Reset
                            </Button>
                            <Button size="sm" onClick={handleSearch} className="h-7 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700">
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Applications Card / Table */}
                <Card className="shadow-xs border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        {/* Mobile Card List View (sm:hidden) */}
                        <div className="p-2 space-y-2 sm:hidden">
                            {applications.data.length > 0 ? (
                                applications.data.map((application) => (
                                    <div key={application.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs space-y-1.5">
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="h-6 w-6 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                                    <User className="h-3 w-3" />
                                                </div>
                                                <span className="font-bold text-xs text-slate-900 truncate">
                                                    {employeeDisplayName(application.employee)}
                                                </span>
                                            </div>
                                            {getStatusBadge(application.status)}
                                        </div>
                                        
                                        <div className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                                            <div className="flex items-center space-x-1">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 px-1.5">
                                                    {application.leaveType?.name ?? application.leave_type?.name ?? '—'}
                                                </Badge>
                                                {application.documents && application.documents.length > 0 && (
                                                    <span className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded" title={`${application.documents.length} document(s) attached`}>
                                                        <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                                                        {application.documents.length}
                                                    </span>
                                                )}
                                            </div>
                                            <span>
                                                {application.days} day{application.days > 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <div className="text-[10px] text-slate-500">
                                            {application.start_date && format(new Date(application.start_date), 'dd MMM yyyy')}
                                            {application.start_date !== application.end_date && (
                                                <span> - {format(new Date(application.end_date), 'dd MMM yyyy')}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                                            <span className="truncate max-w-[160px]">
                                                Appr: {application.approver_display?.label || '—'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6.5 w-6.5 text-blue-600 bg-blue-50" 
                                                    title="View"
                                                    onClick={() => router.visit(route('leave.applications.show', application.id))}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>

                                                {application.status === 'pending' && application.employee_id === userPermissions.employeeId && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6.5 w-6.5 text-slate-600 bg-slate-50" 
                                                        title="Cancel"
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to cancel this leave application?')) {
                                                                router.post(route('leave.applications.cancel', application.id));
                                                            }
                                                        }}
                                                    >
                                                        <UserX className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}

                                                {application.status === 'pending' && application.can_approve_action && (
                                                    <>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6.5 w-6.5 text-green-600 bg-green-50" 
                                                            title="Approve"
                                                            onClick={() => router.post(route('leave.applications.approve', application.id))}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6.5 w-6.5 text-red-600 bg-red-50" 
                                                            title="Reject"
                                                            onClick={() => {
                                                                const reason = prompt('Please enter a reason for rejection:');
                                                                if (reason) {
                                                                    router.post(route('leave.applications.reject', application.id), {
                                                                        rejection_reason: reason
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-xs text-slate-500">
                                    No leave applications found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View (hidden sm:block) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider pl-4">Employee</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Leave Type</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Duration</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Days</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Approver</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Applied On</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider text-right pr-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {applications.data.length > 0 ? (
                                        applications.data.map((application) => (
                                            <TableRow key={application.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                                <TableCell className="pl-4 py-2">
                                                    <div className="flex items-center space-x-2.5">
                                                        <div className="flex-shrink-0">
                                                            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                                <User className="h-3.5 w-3.5" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-xs text-slate-800">
                                                                {employeeDisplayName(application.employee)}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-mono">
                                                                ID: {application.employee.employee_id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex items-center space-x-1.5">
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                                            {application.leaveType?.name ?? application.leave_type?.name ?? '—'}
                                                        </Badge>
                                                        {application.documents && application.documents.length > 0 && (
                                                            <span className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100" title={`${application.documents.length} document(s) attached`}>
                                                                <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                                                                {application.documents.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="text-xs">
                                                        {application.start_date && format(new Date(application.start_date), 'dd MMM yyyy')}
                                                        {application.start_date !== application.end_date && (
                                                            <span> to {format(new Date(application.end_date), 'dd MMM yyyy')}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="font-medium text-xs">
                                                        {application.days} {application.days > 1 ? 'days' : 'day'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    {getStatusBadge(application.status)}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="max-w-[200px]">
                                                        <div className="text-xs font-medium text-slate-800 truncate" title={application.approver_display?.label || '—'}>
                                                            {application.approver_display?.label || '—'}
                                                        </div>
                                                        {application.status === 'pending' && application.approver_display?.title && application.approver_display?.name && (
                                                            <div className="text-[10px] text-slate-500 truncate">
                                                                {application.approver_display.title}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="text-xs">
                                                        {application.applied_at && format(new Date(application.applied_at), 'dd MMM yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-4 py-2">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" 
                                                            title="View Details"
                                                            onClick={() => router.visit(route('leave.applications.show', application.id))}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>

                                                        {application.status === 'pending' && application.employee_id === userPermissions.employeeId && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-7 w-7 text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors" 
                                                                title="Cancel"
                                                                onClick={() => {
                                                                    if (confirm('Are you sure you want to cancel this leave application?')) {
                                                                        router.post(route('leave.applications.cancel', application.id));
                                                                    }
                                                                }}
                                                            >
                                                                <UserX className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}

                                                        {application.status === 'pending' && application.can_approve_action && (
                                                            <>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7 text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 rounded-lg transition-colors" 
                                                                    title="Approve"
                                                                    onClick={() => router.post(route('leave.applications.approve', application.id))}
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-7 w-7 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                                                                    title="Reject"
                                                                    onClick={() => {
                                                                        const reason = prompt('Please enter a reason for rejection:');
                                                                        if (reason) {
                                                                            router.post(route('leave.applications.reject', application.id), {
                                                                                rejection_reason: reason
                                                                            });
                                                                        }
                                                                    }}
                                                                >
                                                                    <XCircle className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-20 text-center text-xs">
                                                No leave applications found.
                                                {(search || status !== 'all' || departmentId !== 'all' || employeeId !== 'all' || fromDate || toDate) && (
                                                    <Button
                                                        variant="link"
                                                        onClick={resetFilters}
                                                        className="px-2 font-normal text-xs"
                                                    >
                                                        Clear filters
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {applications && applications.meta && applications.meta.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                        <span className="hidden sm:inline">Rows per page:</span>
                                        <Select
                                            value={perPage}
                                            onValueChange={handlePerPageChange}
                                        >
                                            <SelectTrigger className="h-8 w-[70px] text-[13px] bg-white border-slate-200">
                                                <SelectValue placeholder="10" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                                <SelectItem value="200">200</SelectItem>
                                                <SelectItem value="500">500</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[13px] text-slate-500">
                                            Showing <span className="font-semibold text-slate-700">{applications.meta.total > 0 ? (applications.meta.current_page - 1) * applications.meta.per_page + 1 : 0}</span> to{' '}
                                            <span className="font-semibold text-slate-700">
                                                {Math.min(applications.meta.current_page * applications.meta.per_page, applications.meta.total)}
                                            </span>{' '}
                                            of <span className="font-semibold text-slate-700">{applications.meta.total}</span> entries
                                        </p>
                                    </div>
                                </div>
                                
                                {applications.meta.last_page > 1 && (
                                    <div className="flex items-center justify-end">
                                        <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                                            {applications.meta.current_page > 1 && applications.links?.prev && (
                                                <Link
                                                    href={applications.links.prev}
                                                    preserveState
                                                    className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}

                                            {applications.meta.links && applications.meta.links.slice(1, -1).map((link, i) => {
                                                const isActive = link.active;
                                                const isDots = link.label === '...';
                                                
                                                if (isDots) {
                                                    return (
                                                        <span key={i} className="relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-medium text-slate-400">
                                                            ...
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <Link
                                                        key={i}
                                                        href={link.url || '#'}
                                                        preserveState
                                                        className={`relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-semibold rounded-lg transition-all duration-200 shadow-sm ${
                                                            isActive
                                                                ? 'z-10 bg-emerald-600 text-white shadow-sm border border-emerald-600'
                                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 focus:z-20'
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                );
                                            })}

                                            {applications.meta.current_page < applications.meta.last_page && applications.links?.next && (
                                                <Link
                                                    href={applications.links.next}
                                                    preserveState
                                                    className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                                >
                                                    <span className="sr-only">Next</span>
                                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}
                                        </nav>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
