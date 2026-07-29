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
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
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
    CalendarIcon,
    Search,
    Clock,
    UserCheck,
    Edit,
    Trash2,
    MoreHorizontal,
    Plus,
    Download,
    Calendar,
    BarChart,
    RefreshCw,
    Building,
    Users,
    AlertCircle,
    Info,
    CheckCircle,
    XCircle,
    AlertTriangle,
    MessageSquare,
    FileText,
    ChevronRight,
    ChevronLeft,
    User,
    Building2,
    Navigation,
    MapPin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageSurface } from '@/components/page-surface';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Department {
    id: number;
    name: string;
}

interface Branch {
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

interface Device {
    id: number;
    name: string;
}

interface Movement {
    id: number;
    movement_type: string;
    purpose: string;
    destination: string;
    status: string;
    from_datetime: string;
    actual_return_datetime: string;
}

interface Attendance {
    id: number;
    employee_id: number;
    date: string;
    check_in: string | null;
    check_out: string | null;
    check_in_formatted: string | null;
    check_out_formatted: string | null;
    status: string;
    device_id: number | null;
    location_coordinates: string | null;
    remarks: string | null;
    auto_remarks: string | null;
    employee: Employee;
    device: Device | null;

    // Movement related properties
    has_movement: boolean;
    multiple_movements: boolean;
    movements?: Movement[];
    total_movements?: number;
    movement_type?: string;
    movement_purpose?: string;
    movement_destination?: string;
    movement_status?: string;
    movement_from?: string;
    movement_to?: string;
    movement_id?: number;
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

interface AttendancesResponse {
    data: Attendance[];
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
    canSyncDevices: boolean;
    isEmployee: boolean;
    isBranchManager: boolean;
    isDepartmentHead: boolean;
}

interface AttendanceIndexProps {
    attendances: AttendancesResponse;
    branches: Branch[];
    departments: Department[];
    filters: {
        date: string;
        branch_id: string;
        department_id: string;
        status: string;
        search: string;
        per_page?: string;
    };
    date: string;
    readableDate: string;
    userPermissions: UserPermissions;
}

export default function AttendanceIndex({
    attendances,
    branches,
    departments,
    filters,
    date,
    readableDate,
    userPermissions
}: AttendanceIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [branchId, setBranchId] = useState(filters.branch_id || null);
    const [departmentId, setDepartmentId] = useState(filters.department_id || null);
    const [status, setStatus] = useState(filters.status || null);
    const [currentDate, setCurrentDate] = useState(date);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [movementFilter, setMovementFilter] = useState(null);
    const [perPage, setPerPage] = useState(filters.per_page || '10');

    const handleSearch = () => {
        router.get(route('attendance.index'), {
            search,
            date: currentDate,
            branch_id: branchId || '',
            department_id: departmentId || '',
            status: status || '',
            movement_filter: movementFilter || '',
            per_page: perPage
        }, { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('attendance.index'), {
            search,
            date: currentDate,
            branch_id: branchId || '',
            department_id: departmentId || '',
            status: status || '',
            movement_filter: movementFilter || '',
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
        setBranchId(null);
        setDepartmentId(null);
        setStatus(null);
        setPerPage('10');
        router.get(route('attendance.index'), { date: currentDate, per_page: '10' }, { preserveState: true });
    };

    const handleDateChange = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            setCurrentDate(formattedDate);
            setCalendarOpen(false);
            router.get(route('attendance.index'), {
                date: formattedDate,
                search,
                branch_id: branchId || '',
                department_id: departmentId || '',
                status: status || '',
                per_page: perPage
            }, { preserveState: true });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
            router.delete(route('attendance.destroy', id));
        }
    };

    const syncAttendance = () => {
        router.post(route('attendance.sync-devices'));
    };

    const getMovementBadge = (type) => {
        return (
            <Badge variant="outline" className={type === 'official' ?
                'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-amber-100 text-amber-800 border-amber-200'}>
                <Building2 className="mr-1 h-3 w-3" />
                {type === 'official' ? 'Official' : 'Personal'}
            </Badge>
        );
    };

    const getMovementStatusBadge = (status) => {
        const statusConfig = {
            'active': {
                className: 'bg-green-100 text-green-800 border-green-200',
                icon: <Clock className="mr-1 h-3 w-3" />,
                text: 'Active'
            },
            'completed': {
                className: 'bg-gray-100 text-gray-800 border-gray-200',
                icon: <CheckCircle className="mr-1 h-3 w-3" />,
                text: 'Completed'
            }
        };

        const config = statusConfig[status] || statusConfig['active'];

        return (
            <Badge variant="outline" className={config.className}>
                {config.icon}
                {config.text}
            </Badge>
        );
    };

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            present: 'bg-green-100 text-green-800',
            absent: 'bg-red-100 text-red-800',
            late: 'bg-orange-100 text-orange-800',
            half_day: 'bg-yellow-100 text-yellow-800',
            leave: 'bg-blue-100 text-blue-800'
        };

        const statusColor = statusColors[status] || 'bg-gray-100 text-gray-800';

        // Icon based on status
        const getStatusIcon = () => {
            switch (status) {
                case 'present':
                    return <CheckCircle className="mr-1 h-3 w-3" />;
                case 'absent':
                    return <XCircle className="mr-1 h-3 w-3" />;
                case 'late':
                    return <Clock className="mr-1 h-3 w-3" />;
                default:
                    return null;
            }
        };

        return (
            <Badge variant="outline" className={`${statusColor} border-0 flex items-center`}>
                {getStatusIcon()}
                <span>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</span>
            </Badge>
        );
    };

    const getRemarksIcon = (remarks: string) => {
        if (remarks.includes('Late')) {
            return <Clock className="mr-1 h-4 w-4 text-orange-500" />;
        } else if (remarks.includes('Overtime')) {
            return <Clock className="mr-1 h-4 w-4 text-blue-500" />;
        } else if (remarks.includes('Half day')) {
            return <AlertTriangle className="mr-1 h-4 w-4 text-yellow-500" />;
        } else if (remarks.includes('Weekend')) {
            return <Calendar className="mr-1 h-4 w-4 text-purple-500" />;
        } else if (remarks === 'Regular') {
            return <CheckCircle className="mr-1 h-4 w-4 text-green-500" />;
        } else if (remarks === 'Absent') {
            return <XCircle className="mr-1 h-4 w-4 text-red-500" />;
        } else {
            return <MessageSquare className="mr-1 h-4 w-4 text-gray-500" />;
        }
    };

    // Check if pagination data exists
    const hasPagination = attendances.meta && attendances.links;

    // Check if user can see branch/department filters
    const canFilterByBranch = userPermissions.isBranchManager || !userPermissions.isEmployee;
    const canFilterByDepartment = userPermissions.isDepartmentHead || userPermissions.isBranchManager || !userPermissions.isEmployee;

    const showAdminActions = !userPermissions.isEmployee || userPermissions.isBranchManager || userPermissions.isDepartmentHead;

    return (
        <Layout>
            <Head title="Daily Attendance" />

            <PageSurface className="max-w-7xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="mb-3 space-y-2">
                    {/* Top row: Title and primary actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-2.5">
                        <div>
                            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Daily Attendance</h1>
                            <p className="text-xs text-slate-500">
                                View and manage attendance records for {readableDate}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-white border-slate-200 text-slate-700 font-medium">
                                        <CalendarIcon className="mr-1 h-3 w-3 text-emerald-600" />
                                        {currentDate ? format(new Date(currentDate), 'MMM d, yyyy') : 'Select date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <CalendarComponent
                                        mode="single"
                                        selected={currentDate ? new Date(currentDate) : undefined}
                                        onSelect={handleDateChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <Link href={route('attendance.monthly')}>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-white border-slate-200 text-slate-700 font-medium">
                                    <Calendar className="mr-1 h-3 w-3 text-slate-500" />
                                    Monthly
                                </Button>
                            </Link>

                            <Link href={route('attendance.sheet-report')}>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-white border-slate-200 text-slate-700 font-medium">
                                    <FileText className="mr-1 h-3 w-3 text-slate-500" />
                                    Report
                                </Button>
                            </Link>

                            {showAdminActions && userPermissions.canSyncDevices && (
                                <>
                                    <Link href={route('attendance.devices.index')}>
                                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-white border-slate-200 text-slate-700 font-medium">
                                            <Clock className="mr-1 h-3 w-3 text-slate-500" />
                                            Devices
                                        </Button>
                                    </Link>
                                    <Link href={route('attendance.settings.index')}>
                                        <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-white border-slate-200 text-slate-700 font-medium">
                                            <Building className="mr-1 h-3 w-3 text-slate-500" />
                                            Settings
                                        </Button>
                                    </Link>
                                </>
                            )}

                            {showAdminActions && userPermissions.canCreate && (
                                <Link href={route('attendance.create')}>
                                    <Button size="sm" className="h-7 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add Attendance
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Role-based Context Message */}
                    {userPermissions.isEmployee && !userPermissions.isBranchManager && !userPermissions.isDepartmentHead && (
                        <Alert className="bg-blue-50 text-blue-800 border-blue-200 py-2 text-xs">
                            <Info className="h-3.5 w-3.5 text-blue-600" />
                            <AlertDescription className="text-xs">
                                You are viewing your daily attendance records.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Compact Mobile-Friendly Filter Bar */}
                    <div className="space-y-2 w-full bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-200">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search employee..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9 h-8 text-xs bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
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

                            <Select value={movementFilter || undefined} onValueChange={(value) => setMovementFilter(value === "all" ? null : value)}>
                                <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs bg-white border-slate-200 rounded-lg">
                                    <SelectValue placeholder="Movement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Records</SelectItem>
                                    <SelectItem value="with-movement">With Movement</SelectItem>
                                    <SelectItem value="without-movement">No Movement</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={status || undefined} onValueChange={(value) => setStatus(value === "all" ? null : value)}>
                                <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs bg-white border-slate-200 rounded-lg">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="present">Present</SelectItem>
                                    <SelectItem value="absent">Absent</SelectItem>
                                    <SelectItem value="late">Late</SelectItem>
                                    <SelectItem value="half_day">Half Day</SelectItem>
                                    <SelectItem value="leave">Leave</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="col-span-2 sm:col-span-1 sm:ml-auto flex items-center justify-end gap-1.5 pt-0.5 sm:pt-0">
                                <Button variant="outline" onClick={resetFilters} size="sm" className="h-8 text-xs text-slate-600 px-3 flex-1 sm:flex-initial">
                                    Reset
                                </Button>
                                <Button onClick={handleSearch} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 rounded-lg flex-1 sm:flex-initial">
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Table */}
                <Card className="shadow-xs border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        {/* Mobile Card View (sm:hidden) */}
                        <div className="p-2 space-y-2 sm:hidden">
                            {attendances.data && attendances.data.length > 0 ? (
                                attendances.data.map((attendance) => (
                                    <div
                                        key={attendance.id}
                                        className={cn(
                                            "rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs space-y-2",
                                            attendance.has_movement ? "border-l-4 border-l-blue-500 bg-blue-50/15" : ""
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-1.5">
                                            <div className="flex items-center space-x-2 min-w-0">
                                                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                                    <User className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-xs text-slate-800 truncate">
                                                        {employeeDisplayName(attendance.employee)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 truncate">
                                                        {attendance.employee.department.name} • ID: {attendance.employee.employee_id}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {getStatusBadge(attendance.status)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-lg text-xs">
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Check In</span>
                                                {attendance.check_in_formatted ? (
                                                    <span className="text-emerald-700 font-semibold flex items-center mt-0.5 text-xs">
                                                        <Clock className="inline mr-1 h-3 w-3 text-emerald-600 shrink-0" />
                                                        {attendance.check_in_formatted}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">Not checked in</span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Check Out</span>
                                                {attendance.check_out_formatted ? (
                                                    <span className="text-amber-700 font-semibold flex items-center mt-0.5 text-xs">
                                                        <Clock className="inline mr-1 h-3 w-3 text-amber-600 shrink-0" />
                                                        {attendance.check_out_formatted}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">Not checked out</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium text-slate-600">Source:</span>
                                                {attendance.device ? (
                                                    <span className="text-blue-600 font-medium">{attendance.device.name}</span>
                                                ) : (
                                                    <span>Manual</span>
                                                )}
                                            </div>
                                            {attendance.has_movement && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] px-1.5 py-0">
                                                    <Navigation className="mr-1 h-2.5 w-2.5" />
                                                    {attendance.multiple_movements ? `${attendance.total_movements} Movements` : 'Movement'}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-xs text-slate-500">
                                    No attendance records found for this date.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View (hidden sm:block) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Employee</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Department</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Check In</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Check Out</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Device</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Movement & Remarks</TableHead>
                                        {(userPermissions.canEdit || userPermissions.canDelete) && (
                                            <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendances.data && attendances.data.length > 0 ? (
                                        attendances.data.map((attendance) => (
                                            <TableRow
                                                key={attendance.id}
                                                className={`hover:bg-slate-50 transition-colors border-b border-slate-100 group ${attendance.has_movement ? 'border-l-2 border-l-blue-400 bg-blue-50/10 hover:bg-blue-50/30' : ''}`}
                                            >
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="flex-shrink-0">
                                                            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                                <User className="h-3.5 w-3.5" />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-xs text-slate-800">
                                                                {employeeDisplayName(attendance.employee)}
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 font-mono">
                                                                ID: {attendance.employee.employee_id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-0.5">
                                                        <div className="text-xs font-medium text-slate-700 flex items-center">
                                                            <Building2 className="mr-1.5 h-3 w-3 text-slate-400" />
                                                            {attendance.employee.department.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 pl-4">
                                                            {attendance.employee.designation.name}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                {attendance.check_in_formatted ? (
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                                                        <div className="text-green-700 font-medium text-xs">
                                                            <Clock className="inline mr-1 h-3.5 w-3.5 text-green-500" />
                                                            {attendance.check_in_formatted}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
                                                        <span className="text-gray-500 text-xs">Not checked in</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {attendance.check_out_formatted ? (
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
                                                        <div className="text-orange-700 font-medium text-xs">
                                                            <Clock className="inline mr-1 h-3.5 w-3.5 text-orange-500" />
                                                            {attendance.check_out_formatted}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
                                                        <span className="text-gray-500 text-xs">Not checked out</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <div className="scale-90 origin-left">
                                                    {getStatusBadge(attendance.status)}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                {attendance.device ? (
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                                        <div className="text-xs">
                                                            <span className="font-medium text-slate-700">{attendance.device.name}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
                                                        <span className="text-gray-500 text-[11px]">Manual entry</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {attendance.has_movement ? (
                                                    <div className="space-y-2">
                                                        {attendance.multiple_movements ? (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <div className="cursor-pointer hover:bg-blue-50 p-2 rounded-md border border-blue-200 transition-all duration-200">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center space-x-2">
                                                                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                                                                    <Navigation className="mr-1 h-3 w-3" />
                                                                                    {attendance.total_movements} Movements
                                                                                </Badge>
                                                                            </div>
                                                                            <Info className="h-4 w-4 text-blue-500" />
                                                                        </div>
                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                            Multiple movements on this day
                                                                        </div>
                                                                    </div>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-96" sideOffset={5} align="start">
                                                                    <div className="space-y-4">
                                                                        <h4 className="font-semibold text-lg flex items-center">
                                                                            <Navigation className="mr-2 h-5 w-5 text-red-500" />
                                                                            {attendance.total_movements} Movements Today
                                                                        </h4>

                                                                        <div className="max-h-64 overflow-y-auto space-y-3">
                                                                            {attendance.movements?.map((movement, index) => (
                                                                                <div key={movement.id} className="border-b pb-3 last:border-b-0">
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <Badge variant="outline" className={movement.movement_type === 'official' ?
                                                                                            'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                                                                                            <Building2 className="mr-1 h-3 w-3" />
                                                                                            {index + 1}. {movement.movement_type}
                                                                                        </Badge>
                                                                                        <Badge variant="outline" className={
                                                                                            movement.status === 'completed'
                                                                                                ? 'bg-green-100 text-green-800 border-green-200'
                                                                                                : 'bg-blue-100 text-blue-800 border-blue-200'
                                                                                        }>
                                                                                            {movement.status === 'completed' ? (
                                                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                                                            ) : (
                                                                                                <Clock className="mr-1 h-3 w-3" />
                                                                                            )}
                                                                                            {movement.status}
                                                                                        </Badge>
                                                                                    </div>

                                                                                    <div className="text-sm space-y-1">
                                                                                        <div>
                                                                                            <span className="text-gray-500 font-medium">Purpose:</span>
                                                                                            <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                                                                                                {movement.purpose?.length > 80 ? (
                                                                                                    <div>
                                                                                                        {movement.purpose.substring(0, 80)}...
                                                                                                        <Link
                                                                                                            href={route('movements.show', movement.id)}
                                                                                                            className="text-blue-600 hover:underline ml-1"
                                                                                                        >
                                                                                                            Read Full
                                                                                                        </Link>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    movement.purpose
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                            <div>
                                                                                                <span className="text-gray-500">Destination:</span>
                                                                                                <div className="font-medium flex items-center">
                                                                                                    <MapPin className="mr-1 h-3 w-3 text-gray-400" />
                                                                                                    {movement.destination}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-gray-500">Time:</span>
                                                                                                <div className="font-medium flex items-center">
                                                                                                    <Clock className="mr-1 h-3 w-3 text-gray-400" />
                                                                                                    {new Date(movement.from_datetime).toLocaleTimeString('en-US', {
                                                                                                        hour: '2-digit',
                                                                                                        minute: '2-digit',
                                                                                                        hour12: true
                                                                                                    })} - {new Date(movement.actual_return_datetime).toLocaleTimeString('en-US', {
                                                                                                        hour: '2-digit',
                                                                                                        minute: '2-digit',
                                                                                                        hour12: true
                                                                                                    })}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        <div className="pt-3 border-t flex justify-between">
                                                                            <span className="text-xs text-gray-400">
                                                                                {attendance.total_movements} movements total
                                                                            </span>
                                                                            <span className="text-xs text-gray-400">
                                                                                Click outside to close
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        ) : (
                                                            // Single movement popover
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <div className="cursor-pointer hover:bg-blue-50 p-2 rounded-md border border-transparent hover:border-blue-200 transition-all duration-200">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center space-x-2">
                                                                                {getMovementBadge(attendance.movement_type)}
                                                                                <span className="text-sm font-medium">Movement</span>
                                                                            </div>
                                                                            <Info className="h-4 w-4 text-blue-500" />
                                                                        </div>
                                                                        <div className="text-xs text-gray-600 mt-1">
                                                                            <Navigation className="inline mr-1 h-3 w-3" />
                                                                            {attendance.movement_purpose?.length > 30
                                                                                ? `${attendance.movement_purpose.substring(0, 30)}...`
                                                                                : attendance.movement_purpose
                                                                            }
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                            <Clock className="inline mr-1 h-3 w-3" />
                                                                            {attendance.movement_from} - {attendance.movement_to}
                                                                        </div>
                                                                    </div>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-80" sideOffset={5} align="start">
                                                                    <div className="space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <h4 className="font-semibold text-lg flex items-center">
                                                                                <Navigation className="mr-2 h-5 w-5 text-blue-500" />
                                                                                Movement Details
                                                                            </h4>
                                                                            <Badge variant="outline" className={
                                                                                attendance.movement_status === 'completed'
                                                                                    ? 'bg-green-100 text-green-800 border-green-200'
                                                                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                                                            }>
                                                                                {attendance.movement_status === 'completed' ? (
                                                                                    <CheckCircle className="mr-1 h-3 w-3" />
                                                                                ) : (
                                                                                    <Clock className="mr-1 h-3 w-3" />
                                                                                )}
                                                                                {attendance.movement_status}
                                                                            </Badge>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                                            <div className="space-y-2">
                                                                                <div>
                                                                                    <span className="text-gray-500 font-medium">Type:</span>
                                                                                    <div className="mt-1">
                                                                                        {getMovementBadge(attendance.movement_type)}
                                                                                    </div>
                                                                                </div>

                                                                                <div>
                                                                                    <span className="text-gray-500 font-medium">Duration:</span>
                                                                                    <div className="mt-1 flex items-center text-gray-700">
                                                                                        <Clock className="mr-1 h-4 w-4" />
                                                                                        {attendance.movement_from} - {attendance.movement_to}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <div>
                                                                                    <span className="text-gray-500 font-medium">Destination:</span>
                                                                                    <div className="mt-1 flex items-center text-gray-700">
                                                                                        <MapPin className="mr-1 h-4 w-4" />
                                                                                        {attendance.movement_destination}
                                                                                    </div>
                                                                                </div>

                                                                                <div>
                                                                                    <span className="text-gray-500 font-medium">Status:</span>
                                                                                    <div className="mt-1">
                                                                                        <Badge variant="outline" className={
                                                                                            attendance.movement_status === 'completed'
                                                                                                ? 'bg-green-100 text-green-800 border-green-200'
                                                                                                : 'bg-blue-100 text-blue-800 border-blue-200'
                                                                                        }>
                                                                                            {attendance.movement_status === 'completed' ? (
                                                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                                                            ) : (
                                                                                                <Clock className="mr-1 h-3 w-3" />
                                                                                            )}
                                                                                            {attendance.movement_status}
                                                                                        </Badge>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div>
                                                                            <span className="text-gray-500 font-medium">Purpose:</span>
                                                                            <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm text-gray-700">
                                                                                {attendance.movement_purpose}
                                                                            </div>
                                                                        </div>

                                                                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                                                            <Link
                                                                                href={route('movements.show', attendance.movement_id)}
                                                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                                                            >
                                                                                <FileText className="mr-1 h-4 w-4" />
                                                                                View Full Movement Record
                                                                            </Link>
                                                                            <span className="text-xs text-gray-400">
                                                                                Click outside to close
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}

                                                        {/* Auto Remarks for movement records */}
                                                        {attendance.auto_remarks && (
                                                            <div className="flex items-center text-xs text-gray-500 bg-gray-50 p-1 rounded">
                                                                {getRemarksIcon(attendance.auto_remarks)}
                                                                <span className="ml-1">{attendance.auto_remarks}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    // No movement - show regular remarks
                                                    <div className="space-y-1.5">
                                                        {attendance.auto_remarks ? (
                                                            <div className="flex items-center text-xs bg-gray-50 p-1.5 rounded-md">
                                                                <div className="scale-75 origin-left -mr-1">{getRemarksIcon(attendance.auto_remarks)}</div>
                                                                <span className="ml-0.5">{attendance.auto_remarks}</span>
                                                            </div>
                                                        ) : attendance.remarks ? (
                                                            <div className="flex items-center text-xs bg-blue-50 p-1.5 rounded-md">
                                                                <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                                                <span className="text-gray-700">{attendance.remarks}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center text-[11px] text-gray-400">
                                                                <MessageSquare className="mr-1.5 h-3 w-3" />
                                                                <span>No additional notes</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>

                                                {(userPermissions.canEdit || userPermissions.canDelete) && (
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                            {userPermissions.canEdit && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" 
                                                                    title="Edit Attendance"
                                                                    onClick={() => router.get(route('attendance.edit', attendance.id))}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {attendance.has_movement && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" 
                                                                    title="View Movement"
                                                                    onClick={() => router.get(route('movements.show', attendance.movement_id))}
                                                                >
                                                                    <Navigation className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {userPermissions.canDelete && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                                                                    title="Delete Attendance"
                                                                    onClick={() => handleDelete(attendance.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center text-gray-500 space-y-4">
                                                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <AlertCircle className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="font-medium text-lg text-gray-700">No attendance records found</h3>
                                                    <p className="text-sm max-w-md">
                                                        {userPermissions.isEmployee
                                                            ? "You don't have any attendance records for this date. Your attendance will appear here once you check in."
                                                            : "No attendance records found for the selected date and filters. Try adjusting your search criteria or select a different date."}
                                                    </p>
                                                </div>
                                                {userPermissions.canCreate && (
                                                    <Link href={route('attendance.create')}>
                                                        <Button className="mt-4 flex items-center" variant="default">
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Add Attendance Record
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {hasPagination && (
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
                                    Showing <span className="font-semibold text-slate-700">{attendances.meta.total > 0 ? (attendances.meta.current_page - 1) * attendances.meta.per_page + 1 : 0}</span> to{' '}
                                    <span className="font-semibold text-slate-700">
                                        {Math.min(attendances.meta.current_page * attendances.meta.per_page, attendances.meta.total)}
                                    </span>{' '}
                                    of <span className="font-semibold text-slate-700">{attendances.meta.total}</span> entries
                                </p>
                            </div>
                        </div>

                        {attendances.meta.last_page > 1 && (
                            <div className="flex items-center justify-end">
                                <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                                    {attendances.meta.current_page > 1 && attendances.links?.prev && (
                                        <Link
                                            href={attendances.links.prev}
                                            preserveState
                                            className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                        </Link>
                                    )}

                                    {attendances.meta.links && attendances.meta.links.slice(1, -1).map((link, i) => {
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
                                                className={`relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-semibold rounded-lg transition-all duration-200 shadow-sm ${isActive
                                                        ? 'z-10 bg-emerald-600 text-white shadow-sm border border-emerald-600'
                                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 focus:z-20'
                                                    }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    })}

                                    {attendances.meta.current_page < attendances.meta.last_page && attendances.links?.next && (
                                        <Link
                                            href={attendances.links.next}
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
            </PageSurface>
        </Layout>
    );
}
