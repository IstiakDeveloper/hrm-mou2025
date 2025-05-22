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
    ArrowLeft,
    ArrowRight,
    CalendarRange,
    Check,
    ChevronDown,
    Filter,
    MoreHorizontal,
    Plus,
    RefreshCcw,
    Search,
    X,
    Clock,
    AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    department: {
        id: number;
        name: string;
    };
    designation: {
        id: number;
        name: string;
    };
}

interface Department {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface Movement {
    id: number;
    employee_id: number;
    movement_type: 'official' | 'personal';
    from_datetime: string;
    to_datetime: string;
    purpose: string;
    destination: string;
    remarks: string | null;
    status: 'active' | 'completed';
    is_returned: boolean;
    actual_return_datetime: string | null;
    employee: Employee;
    approved_by?: number | null;
    approver?: User | null;
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

interface MovementsResponse {
    data: Movement[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: PaginationMeta;
}

interface MovementIndexProps {
    movements: MovementsResponse;
    departments: Department[];
    employees: Employee[];
    filters: {
        status?: string;
        department_id?: string;
        employee_id?: string;
        movement_type?: string;
        from_date?: string;
        to_date?: string;
        search?: string;
    };
    canApprove: boolean;
    userPermissions: {
        canView: boolean;
        canCreate: boolean;
        canEdit: boolean;
        canApprove: boolean;
        isBranchManager: boolean;
        isBranchHead: boolean;
        isDepartmentHead: boolean;
        userBranchId: number | null;
        userDepartmentId: number | null;
        isEmployee: boolean;
        employeeId: number | null;
    };
}

export default function MovementIndex({
    movements,
    departments,
    employees,
    filters,
    canApprove,
    userPermissions
}: MovementIndexProps) {
    const [status, setStatus] = useState(filters.status || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || '');
    const [movementType, setMovementType] = useState(filters.movement_type || '');
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.from_date ? new Date(filters.from_date) : undefined
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.to_date ? new Date(filters.to_date) : undefined
    );
    const [search, setSearch] = useState(filters.search || '');
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);

    const handleSearch = () => {
        router.get(route('movements.index'), {
            status,
            department_id: departmentId,
            employee_id: employeeId,
            movement_type: movementType,
            from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
            to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
            search,
        }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const resetFilters = () => {
        setStatus('');
        setDepartmentId('');
        setEmployeeId('');
        setMovementType('');
        setFromDate(undefined);
        setToDate(undefined);
        setSearch('');
        router.get(route('movements.index'), {}, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active</Badge>;
            case 'completed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getMovementTypeBadge = (type: string) => {
        switch (type) {
            case 'official':
                return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Official</Badge>;
            case 'personal':
                return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Personal</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    // Calculate duration between from and actual return time
    const calculateDuration = (movement: Movement) => {
        if (movement.status === 'completed' && movement.actual_return_datetime) {
            const fromTime = new Date(movement.from_datetime);
            const returnTime = new Date(movement.actual_return_datetime);

            const hours = differenceInHours(returnTime, fromTime);
            const minutes = differenceInMinutes(returnTime, fromTime) % 60;

            return `${hours}h ${minutes}m`;
        }
        return null;
    };

    // Check if user can close a movement
    const canCloseMovement = (movement: Movement) => {
        return movement.status === 'active' &&
            movement.employee_id === userPermissions.employeeId;
    };

    // Check if pagination data exists
    const hasPagination = movements.meta && movements.links;

    return (
        <Layout>
            <Head title="Movement Requests" />

            <div className="container mx-auto py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Movement Requests</h1>
                        <p className="mt-1 text-gray-500">
                            Track employee movements in and out of the office
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {userPermissions.canView && (
                            <Link href={route('movements.report')}>
                                <Button variant="outline" className="flex items-center">
                                    <CalendarRange className="mr-1 h-4 w-4" />
                                    Movement Report
                                </Button>
                            </Link>
                        )}
                        <Link href={route('movements.create')}>
                            <Button className="flex items-center">
                                <Plus className="mr-1 h-4 w-4" />
                                New Movement
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </CardTitle>
                        <CardDescription>Filter movement requests by various criteria</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                    <Input
                                        placeholder="Search by employee name or ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
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

                            <div>
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

                            <div>
                                <Select value={movementType} onValueChange={setMovementType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Movement Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="official">Official</SelectItem>
                                        <SelectItem value="personal">Personal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
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
                                                <CalendarRange className="mr-2 h-4 w-4" />
                                                {fromDate ? format(fromDate, 'MMM dd, yyyy') : <span>From Date</span>}
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

                                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "justify-start text-left font-normal",
                                                    !toDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarRange className="mr-2 h-4 w-4" />
                                                {toDate ? format(toDate, 'MMM dd, yyyy') : <span>To Date</span>}
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
                                                disabled={(date) => fromDate ? date < fromDate : false}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4 space-x-2">
                            <Button variant="outline" onClick={resetFilters}>
                                <RefreshCcw className="mr-1 h-4 w-4" />
                                Reset
                            </Button>
                            <Button onClick={handleSearch}>
                                <Search className="mr-1 h-4 w-4" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Movements Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>Return Time</TableHead>
                                    <TableHead>Destination</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.data.length > 0 ? (
                                    movements.data.map((movement) => (
                                        <TableRow key={movement.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">
                                                        {movement.employee.first_name} {movement.employee.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {movement.employee.department?.name || 'No Department'} • {movement.employee.designation?.name || 'No Designation'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getMovementTypeBadge(movement.movement_type)}
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(movement.from_datetime), 'MMM dd, yyyy HH:mm')}
                                            </TableCell>
                                            <TableCell>
                                                {movement.status === 'completed' && movement.actual_return_datetime ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <span className="text-green-600 font-medium">
                                                                    {format(new Date(movement.actual_return_datetime), 'MMM dd, yyyy HH:mm')}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <div className="text-xs">
                                                                    <div>Expected: {format(new Date(movement.to_datetime), 'MMM dd, yyyy HH:mm')}</div>
                                                                    <div className="font-semibold">Actual return time</div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    <span>
                                                        {format(new Date(movement.to_datetime), 'MMM dd, yyyy HH:mm')}
                                                        {movement.status === 'active' && (
                                                            <span className="ml-1 text-xs text-blue-600">(Expected)</span>
                                                        )}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="truncate max-w-[150px] block">{movement.destination}</span>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(movement.status)}
                                            </TableCell>
                                            <TableCell>
                                                {movement.status === 'completed' && movement.actual_return_datetime ? (
                                                    <span className="text-sm text-green-600 font-medium">
                                                        {calculateDuration(movement)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-500">In progress</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => router.get(route('movements.show', movement.id))}
                                                            className="cursor-pointer"
                                                        >
                                                            <span>View Details</span>
                                                        </DropdownMenuItem>

                                                        {/* Edit option - only show for user's own active movements or admins */}
                                                        {movement.status === 'active' &&
                                                            (movement.employee_id === userPermissions.employeeId ||
                                                                userPermissions.canEdit) && (
                                                                <DropdownMenuItem
                                                                    onClick={() => router.get(route('movements.edit', movement.id))}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <span>Edit</span>
                                                                </DropdownMenuItem>
                                                            )}

                                                        {/* Close Movement - show for user's own active movements */}
                                                        {movement.status === 'active' &&
                                                            canCloseMovement(movement) && (
                                                                <DropdownMenuItem
                                                                    onClick={() => router.get(route('movements.show', movement.id))}
                                                                    className="cursor-pointer text-green-600"
                                                                >
                                                                    <Check className="mr-2 h-4 w-4" />
                                                                    <span>Close Movement</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            No movement requests found.
                                            {(search || status || departmentId || employeeId || movementType || fromDate || toDate) && (
                                                <Button
                                                    variant="link"
                                                    onClick={resetFilters}
                                                    className="px-2 font-normal"
                                                >
                                                    Clear filters
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                {/* Pagination */}
                {hasPagination && movements.meta.last_page > 1 && (
                    <div className="mt-6">
                        <Pagination>
                            <PaginationContent>
                                {movements.meta.current_page > 1 && (
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href={movements.links.prev || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(movements.links.prev || '', {
                                                    status,
                                                    department_id: departmentId,
                                                    employee_id: employeeId,
                                                    movement_type: movementType,
                                                    from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                                                    to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                                                    search,
                                                }, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}

                                {movements.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                                                            status,
                                                            department_id: departmentId,
                                                            employee_id: employeeId,
                                                            movement_type: movementType,
                                                            from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                                                            to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                                                            search,
                                                        }, { preserveState: true });
                                                    }
                                                }}
                                            >
                                                {link.label}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                })}

                                {movements.meta.current_page < movements.meta.last_page && (
                                    <PaginationItem>
                                        <PaginationNext
                                            href={movements.links.next || '#'}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                router.get(movements.links.next || '', {
                                                    status,
                                                    department_id: departmentId,
                                                    employee_id: employeeId,
                                                    movement_type: movementType,
                                                    from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                                                    to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                                                    search,
                                                }, { preserveState: true });
                                            }}
                                        />
                                    </PaginationItem>
                                )}
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {/* Active Movements Summary Card */}
                {userPermissions.isEmployee && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Your Active Movements</CardTitle>
                            <CardDescription>Movements that need to be closed upon return</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {movements.data.filter(m =>
                                m.status === 'active' &&
                                m.employee_id === userPermissions.employeeId
                            ).length > 0 ? (
                                <div className="space-y-4">
                                    {movements.data.filter(m =>
                                        m.status === 'active' &&
                                        m.employee_id === userPermissions.employeeId
                                    ).map(movement => (
                                        <div key={`active-${movement.id}`} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <div>
                                                <div className="font-medium">{movement.destination}</div>
                                                <div className="text-sm text-gray-600">
                                                    {format(new Date(movement.from_datetime), 'MMM dd, yyyy HH:mm')} - {format(new Date(movement.to_datetime), 'MMM dd, yyyy HH:mm')}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => router.get(route('movements.show', movement.id))}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Check className="mr-1 h-4 w-4" />
                                                Close
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center text-gray-500 py-4">
                                    <AlertCircle className="h-5 w-5 mr-2" />
                                    <span>No active movements found.</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
}
