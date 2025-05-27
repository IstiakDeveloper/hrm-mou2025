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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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

interface Department {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
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

    const handleSearch = () => {
        router.get(route('attendance.index'), {
            search,
            date: currentDate,
            branch_id: branchId || '',
            department_id: departmentId || '',
            status: status || '',
            movement_filter: movementFilter || ''
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
        router.get(route('attendance.index'), { date: currentDate }, { preserveState: true });
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
                status: status || ''
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

    return (
        <Layout>
            <Head title="Daily Attendance" />

            <div className="container mx-auto py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Daily Attendance</h1>
                        <p className="mt-1 text-gray-500">
                            View and manage attendance records for {readableDate}
                        </p>
                    </div>

                    <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="flex items-center">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {currentDate ? format(new Date(currentDate), 'PPP') : 'Select date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                                    mode="single"
                                    selected={currentDate ? new Date(currentDate) : undefined}
                                    onSelect={handleDateChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>

                        {userPermissions.canCreate && (
                            <Link href={route('attendance.create')}>
                                <Button className="flex items-center">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Attendance
                                </Button>
                            </Link>
                        )}

                        {userPermissions.canSyncDevices && (
                            <Button variant="outline" className="flex items-center" onClick={syncAttendance}>
                                <RefreshCw className="mr-1 h-4 w-4" />
                                Sync Devices
                            </Button>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex items-center">
                                    <MoreHorizontal className="mr-1 h-4 w-4" />
                                    <span>Options</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <Link href={route('attendance.monthly')}>
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        <span>Monthly View</span>
                                    </DropdownMenuItem>
                                </Link>

                                <Link href={route('attendance.sheet-report')}>
                                    <DropdownMenuItem className="cursor-pointer">
                                        <FileText className="mr-2 h-4 w-4" />
                                        <span>Attendance Report</span>
                                    </DropdownMenuItem>
                                </Link>
                                {/* <Link href={route('attendance.report')}>
                                    <DropdownMenuItem className="cursor-pointer">
                                        <BarChart className="mr-2 h-4 w-4" />
                                        <span>Attendance Report</span>
                                    </DropdownMenuItem>
                                </Link> */}
                                {/* Only show device management for users with sync permission */}
                                {userPermissions.canSyncDevices && (
                                    <>
                                        <Link href={route('attendance.devices.index')}>
                                            <DropdownMenuItem className="cursor-pointer">
                                                <Clock className="mr-2 h-4 w-4" />
                                                <span>Manage Devices</span>
                                            </DropdownMenuItem>
                                        </Link>
                                        <Link href={route('attendance.settings.index')}>
                                            <DropdownMenuItem className="cursor-pointer">
                                                <Clock className="mr-2 h-4 w-4" />
                                                <span>Settings</span>
                                            </DropdownMenuItem>
                                        </Link>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Role-based Context Message */}
                {userPermissions.isEmployee && !userPermissions.isBranchManager && !userPermissions.isDepartmentHead && (
                    <Alert className="mb-6">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            You are viewing your own attendance records.
                            {userPermissions.canCreate && " You can add your own attendance records."}
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
                                : "Filter attendance by name, branch, department or status"}
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

                            <div className="w-full md:w-64">
                                <Select
                                    value={movementFilter || undefined}
                                    onValueChange={(value) => setMovementFilter(value === "all" ? null : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Movement Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Records</SelectItem>
                                        <SelectItem value="with-movement">With Movement</SelectItem>
                                        <SelectItem value="without-movement">Without Movement</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-full md:w-64">
                                <Select
                                    value={status || undefined}
                                    onValueChange={(value) => setStatus(value === "all" ? null : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
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
                            </div>

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

                {/* Attendance Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Device</TableHead>
                                    <TableHead>Movement & Remarks</TableHead>
                                    {(userPermissions.canEdit || userPermissions.canDelete) && (
                                        <TableHead className="text-right">Actions</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendances.data && attendances.data.length > 0 ? (
                                    attendances.data.map((attendance) => (
                                        <TableRow
                                            key={attendance.id}
                                            className={attendance.has_movement ?
                                                "hover:bg-blue-50/50 border-l-2 border-l-blue-200" :
                                                "hover:bg-gray-50"
                                            }
                                        >
                                            <TableCell>
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                                                            <User className="h-4 w-4 text-white" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {attendance.employee.first_name} {attendance.employee.last_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-mono">
                                                            ID: {attendance.employee.employee_id}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        <Building2 className="mr-1 h-3 w-3" />
                                                        {attendance.employee.department.name}
                                                    </Badge>
                                                    <div className="text-xs text-gray-500">
                                                        {attendance.employee.designation.name}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                {attendance.check_in_formatted ? (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                                        <div className="text-green-700 font-medium">
                                                            <Clock className="inline mr-1 h-4 w-4 text-green-500" />
                                                            {attendance.check_in_formatted}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                                                        <span className="text-gray-500">Not checked in</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {attendance.check_out_formatted ? (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                                                        <div className="text-orange-700 font-medium">
                                                            <Clock className="inline mr-1 h-4 w-4 text-orange-500" />
                                                            {attendance.check_out_formatted}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                                                        <span className="text-gray-500">Not checked out</span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {getStatusBadge(attendance.status)}
                                            </TableCell>

                                            <TableCell>
                                                {attendance.device ? (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                        <div className="text-sm">
                                                            <span className="font-medium">{attendance.device.name}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                                                        <span className="text-gray-500">Manual entry</span>
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
                                                    <div className="space-y-2">
                                                        {attendance.auto_remarks ? (
                                                            <div className="flex items-center text-sm bg-gray-50 p-2 rounded-md">
                                                                {getRemarksIcon(attendance.auto_remarks)}
                                                                <span className="ml-2">{attendance.auto_remarks}</span>
                                                            </div>
                                                        ) : attendance.remarks ? (
                                                            <div className="flex items-center text-sm bg-blue-50 p-2 rounded-md">
                                                                <MessageSquare className="mr-2 h-4 w-4 text-blue-500 flex-shrink-0" />
                                                                <span className="text-gray-700">{attendance.remarks}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center text-sm text-gray-400">
                                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                                <span>No additional notes</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {(userPermissions.canEdit || userPermissions.canDelete) && (
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            {userPermissions.canEdit && (
                                                                <DropdownMenuItem
                                                                    onClick={() => router.get(route('attendance.edit', attendance.id))}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    <span>Edit Attendance</span>
                                                                </DropdownMenuItem>
                                                            )}

                                                            {attendance.has_movement && (
                                                                <DropdownMenuItem asChild>
                                                                    <Link
                                                                        href={route('movements.show', attendance.movement_id)}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        <Navigation className="mr-2 h-4 w-4" />
                                                                        <span>View Movement</span>
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            )}

                                                            {userPermissions.canDelete && (
                                                                <>
                                                                    <div className="border-t my-1"></div>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(attendance.id)}
                                                                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        <span>Delete Record</span>
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
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
                    </CardContent>
                </Card>

                {/* Pagination */}
                {attendances.meta && attendances.meta.last_page > 1 && (
                    <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6 mt-4">
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(attendances.meta.current_page - 1) * 20 + 1}</span> to{' '}
                                    <span className="font-medium">
                                        {Math.min(attendances.meta.current_page * 20, attendances.meta.total)}
                                    </span>{' '}
                                    of <span className="font-medium">{attendances.meta.total}</span> attendance records
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    {attendances.meta.current_page > 1 && (
                                        <Link
                                            href={route('attendance.index', {
                                                page: attendances.meta.current_page - 1,
                                                search,
                                                date: currentDate,
                                                branch_id: branchId || '',
                                                department_id: departmentId || '',
                                                status: status || ''
                                            })}
                                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                                        >
                                            <span className="sr-only">Previous</span>
                                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                        </Link>
                                    )}

                                    {attendances.meta.links && attendances.meta.links.slice(1, -1).map((link, i) => {
                                        // Skip links that are just labels and not actual page links
                                        if (link.label === '&laquo; Previous' || link.label === 'Next &raquo;') {
                                            return null;
                                        }

                                        // Handle ellipsis
                                        if (link.label === '...') {
                                            return (
                                                <span
                                                    key={`ellipsis-${i}`}
                                                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300"
                                                >
                                                    ...
                                                </span>
                                            );
                                        }

                                        // Regular page links
                                        return (
                                            <Link
                                                key={i}
                                                href={route('attendance.index', {
                                                    page: link.label,
                                                    search,
                                                    date: currentDate,
                                                    branch_id: branchId || '',
                                                    department_id: departmentId || '',
                                                    status: status || ''
                                                })}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${link.active
                                                    ? 'z-10 bg-primary text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary'
                                                    : 'text-gray-500 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                                                    }`}
                                                aria-current={link.active ? 'page' : undefined}
                                            >
                                                {link.label}
                                            </Link>
                                        );
                                    })}

                                    {attendances.meta.current_page < attendances.meta.last_page && (
                                        <Link
                                            href={route('attendance.index', {
                                                page: attendances.meta.current_page + 1,
                                                search,
                                                date: currentDate,
                                                branch_id: branchId || '',
                                                department_id: departmentId || '',
                                                status: status || ''
                                            })}
                                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                                        >
                                            <span className="sr-only">Next</span>
                                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                        </Link>
                                    )}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
