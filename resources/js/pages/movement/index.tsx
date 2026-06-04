import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageSurface } from '@/components/page-surface';
import {
    Activity,
    AlertCircle,
    CalendarRange,
    Check,
    ChevronLeft,
    ChevronRight,
    Edit,
    Eye,
    Filter,
    Plus,
    RefreshCcw,
    Search,
    Trash,
    X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

interface Movement {
    id: number;
    employee_id: number;
    movement_type: 'official' | 'personal';
    from_datetime: string;
    to_datetime: string;
    purpose: string;
    destination: string;
    remarks: string | null;
    status: 'active' | 'completed' | 'pending' | 'approved' | 'rejected' | 'cancelled';
    is_returned: boolean;
    actual_return_datetime: string | null;
    employee: Employee;
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
    links?: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta?: PaginationMeta;
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
        per_page?: string;
    };
    canApprove: boolean;
    userPermissions: {
        canView: boolean;
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
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
    userPermissions,
}: MovementIndexProps) {
    const [status, setStatus] = useState(filters.status || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [employeeId, setEmployeeId] = useState(filters.employee_id || '');
    const [movementType, setMovementType] = useState(filters.movement_type || '');
    const [fromDate, setFromDate] = useState<Date | undefined>(
        filters.from_date ? new Date(filters.from_date) : undefined,
    );
    const [toDate, setToDate] = useState<Date | undefined>(
        filters.to_date ? new Date(filters.to_date) : undefined,
    );
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    const buildFilterParams = () => ({
        status: status && status !== 'all' ? status : '',
        department_id: departmentId && departmentId !== 'all' ? departmentId : '',
        employee_id: employeeId && employeeId !== 'all' ? employeeId : '',
        movement_type: movementType && movementType !== 'all' ? movementType : '',
        from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
        to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
        search,
        per_page: perPage,
    });

    const handleSearch = () => {
        router.get(route('movements.index'), buildFilterParams(), { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('movements.index'), { ...buildFilterParams(), per_page: value }, { preserveState: true });
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
        setPerPage('10');
        setShowFilters(false);
        setFilterSheetOpen(false);
        router.get(route('movements.index'), { per_page: '10' }, { preserveState: true });
    };

    const hasActiveFilters = Boolean(
        search || status || departmentId || employeeId || movementType || fromDate || toDate,
    );

    const activeFilterCount = [
        search,
        status && status !== 'all',
        departmentId && departmentId !== 'all',
        employeeId && employeeId !== 'all',
        movementType && movementType !== 'all',
        fromDate,
        toDate,
    ].filter(Boolean).length;

    const applyFiltersAndClose = () => {
        handleSearch();
        setFilterSheetOpen(false);
    };

    const filterFields = (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={status || 'all'} onValueChange={setStatus}>
                <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
            </Select>

            <Select value={departmentId || 'all'} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-9 border-slate-200">
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

            <Select value={employeeId || 'all'} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-9 border-slate-200">
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

            <Select value={movementType || 'all'} onValueChange={setMovementType}>
                <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue placeholder="Movement Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="official">Official</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
            </Select>

            <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            'h-9 w-full justify-start border-slate-200 text-left text-sm font-normal',
                            !fromDate && 'text-muted-foreground',
                        )}
                    >
                        <CalendarRange className="mr-2 h-4 w-4 shrink-0" />
                        {fromDate ? format(fromDate, 'MMM dd, yyyy') : 'From Date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
                            'h-9 w-full justify-start border-slate-200 text-left text-sm font-normal',
                            !toDate && 'text-muted-foreground',
                        )}
                    >
                        <CalendarRange className="mr-2 h-4 w-4 shrink-0" />
                        {toDate ? format(toDate, 'MMM dd, yyyy') : 'To Date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={(date) => {
                            setToDate(date);
                            setToDateOpen(false);
                        }}
                        initialFocus
                        disabled={(date) => (fromDate ? date < fromDate : false)}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );

    const getStatusBadge = (movementStatus: string) => {
        switch (movementStatus) {
            case 'active':
                return (
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                        Active
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Completed
                    </Badge>
                );
            default:
                return <Badge variant="outline">{movementStatus}</Badge>;
        }
    };

    const getMovementTypeBadge = (type: string) => {
        switch (type) {
            case 'official':
                return (
                    <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                        Official
                    </Badge>
                );
            case 'personal':
                return (
                    <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                        Personal
                    </Badge>
                );
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

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

    const canCloseMovement = (movement: Movement) =>
        movement.status === 'active' && movement.employee_id === userPermissions.employeeId;

    const canEditMovement = (movement: Movement) =>
        (userPermissions.canEdit &&
            ['active', 'completed', 'pending', 'approved'].includes(movement.status)) ||
        (movement.status === 'pending' && movement.employee_id === userPermissions.employeeId);

    const hasPagination = movements.meta && movements.links;
    const activeMovementsOnPage = movements.data.filter(
        (m) => m.status === 'active' && m.employee_id === userPermissions.employeeId,
    );

    return (
        <Layout>
            <Head title="Movement Requests" />

            <PageSurface>
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200 pb-3 md:mb-4 md:pb-4">
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 md:text-2xl">
                            Movement Requests
                        </h1>
                        <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
                            Track employee movements in and out of the office
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        {userPermissions.canView && (
                            <Link href={route('movements.report')}>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 border-slate-200 sm:h-9 sm:w-9"
                                    title="Movement Report"
                                >
                                    <CalendarRange className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                        {userPermissions.canCreate && (
                            <Link href={route('movements.create')}>
                                <Button
                                    size="icon"
                                    className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 sm:h-9 sm:w-9"
                                    title="New Movement"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 md:px-4 md:py-2.5">
                        <form
                            className="relative min-w-0 flex-1"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSearch();
                            }}
                        >
                            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Search employee..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-8 rounded-lg border-slate-200 bg-slate-50/80 pr-8 pl-8 text-sm focus-visible:ring-emerald-500 md:h-9"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </form>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                                'relative h-8 w-8 shrink-0 rounded-lg border-slate-200 md:hidden',
                                (filterSheetOpen || activeFilterCount > 0) &&
                                    'border-emerald-200 bg-emerald-50 text-emerald-600',
                            )}
                            onClick={() => setFilterSheetOpen(true)}
                            title="Filters"
                        >
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                                'relative hidden h-9 w-9 shrink-0 rounded-lg border-slate-200 md:inline-flex',
                                showFilters && 'border-emerald-200 bg-emerald-50 text-emerald-600',
                            )}
                            onClick={() => setShowFilters((v) => !v)}
                            title="Toggle filters"
                        >
                            <Filter className="h-4 w-4" />
                            {activeFilterCount > 0 && !showFilters && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            className="hidden h-9 shrink-0 bg-emerald-600 px-3 hover:bg-emerald-700 sm:inline-flex"
                            onClick={handleSearch}
                        >
                            <Search className="mr-1 h-4 w-4" />
                            Search
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="hidden border-b border-slate-100 bg-slate-50/40 px-4 py-3 md:block">
                            {filterFields}
                            <div className="mt-3 flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8" onClick={resetFilters}>
                                    <RefreshCcw className="mr-1 h-3.5 w-3.5" />
                                    Reset
                                </Button>
                                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleSearch}>
                                    <Search className="mr-1 h-3.5 w-3.5" />
                                    Apply
                                </Button>
                            </div>
                        </div>
                    )}

                    <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                        <SheetContent side="bottom" className="max-h-[88vh] rounded-t-2xl px-4 pb-6">
                            <SheetHeader className="text-left">
                                <SheetTitle>Filter movements</SheetTitle>
                                <SheetDescription>Narrow the list by status, department, dates, and more.</SheetDescription>
                            </SheetHeader>
                            <div className="mt-4 max-h-[58vh] overflow-y-auto py-1">{filterFields}</div>
                            <SheetFooter className="mt-4 flex flex-row gap-2 sm:justify-stretch">
                                <Button variant="outline" className="flex-1" onClick={resetFilters}>
                                    Reset
                                </Button>
                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={applyFiltersAndClose}>
                                    Apply filters
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-200 bg-slate-50/80">
                                        <TableHead className="h-11 pl-6 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Employee
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Type
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            From
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Return
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Destination
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Status
                                        </TableHead>
                                        <TableHead className="h-11 text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Duration
                                        </TableHead>
                                        <TableHead className="h-11 pr-6 text-right text-[11px] font-semibold tracking-wider text-slate-700 uppercase">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.data.length > 0 ? (
                                        movements.data.map((movement) => (
                                            <TableRow
                                                key={movement.id}
                                                className="group border-b border-slate-100 transition-colors hover:bg-slate-50"
                                            >
                                                <TableCell className="pl-6">
                                                    <div className="flex min-w-[180px] items-center">
                                                        <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                                            <Activity className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={route('movements.show', movement.id)}
                                                                className="block truncate text-[13px] font-semibold text-slate-800 transition-colors hover:text-emerald-600"
                                                            >
                                                                {movement.employee.first_name} {movement.employee.last_name}
                                                            </Link>
                                                            <div className="truncate text-xs text-slate-500">
                                                                {movement.employee.department?.name || 'No Department'} •{' '}
                                                                {movement.employee.designation?.name || 'No Designation'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getMovementTypeBadge(movement.movement_type)}</TableCell>
                                                <TableCell className="whitespace-nowrap text-[13px] text-slate-600">
                                                    {format(new Date(movement.from_datetime), 'MMM dd, yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-[13px] text-slate-600">
                                                    {movement.status === 'completed' && movement.actual_return_datetime ? (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <span className="font-medium text-emerald-600">
                                                                        {format(
                                                                            new Date(movement.actual_return_datetime),
                                                                            'MMM dd, yyyy HH:mm',
                                                                        )}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <div className="text-xs">
                                                                        <div>
                                                                            Expected:{' '}
                                                                            {format(new Date(movement.to_datetime), 'MMM dd, yyyy HH:mm')}
                                                                        </div>
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
                                                    <span className="block max-w-[150px] truncate text-[13px] text-slate-600">
                                                        {movement.destination}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(movement.status)}</TableCell>
                                                <TableCell>
                                                    {movement.status === 'completed' && movement.actual_return_datetime ? (
                                                        <span className="text-[13px] font-medium text-emerald-600">
                                                            {calculateDuration(movement)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">In progress</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                                                            title="View Details"
                                                            onClick={() => router.get(route('movements.show', movement.id))}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {canEditMovement(movement) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                                                                title="Edit Movement"
                                                                onClick={() => router.get(route('movements.edit', movement.id))}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {canCloseMovement(movement) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-100 hover:text-green-700"
                                                                title="Close Movement"
                                                                onClick={() => router.get(route('movements.show', movement.id))}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {userPermissions.canDelete && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                                                title="Delete Movement"
                                                                onClick={() => {
                                                                    if (
                                                                        confirm(
                                                                            'Delete this movement? Attendance links to this movement will be cleared.',
                                                                        )
                                                                    ) {
                                                                        router.delete(route('movements.destroy', movement.id));
                                                                    }
                                                                }}
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-24 text-center">
                                                No movement requests found.
                                                {hasActiveFilters && (
                                                    <Button variant="link" onClick={resetFilters} className="px-2 font-normal">
                                                        Clear filters
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {hasPagination && movements.meta && (
                            <div className="flex flex-col gap-4 rounded-b-xl border-t border-slate-200 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                    <div className="flex items-center gap-2 text-[13px] text-slate-500">
                                        <span className="hidden sm:inline">Rows per page:</span>
                                        <Select value={perPage} onValueChange={handlePerPageChange}>
                                            <SelectTrigger className="h-8 w-[70px] border-slate-200 bg-white text-[13px]">
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
                                    <p className="text-[13px] text-slate-500">
                                        Showing{' '}
                                        <span className="font-semibold text-slate-700">
                                            {movements.meta.total > 0
                                                ? (movements.meta.current_page - 1) * movements.meta.per_page + 1
                                                : 0}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-semibold text-slate-700">
                                            {Math.min(movements.meta.current_page * movements.meta.per_page, movements.meta.total)}
                                        </span>{' '}
                                        of <span className="font-semibold text-slate-700">{movements.meta.total}</span> entries
                                    </p>
                                </div>

                                {movements.meta.last_page > 1 && (
                                    <div className="flex items-center justify-center sm:justify-end">
                                        <nav className="isolate inline-flex gap-1.5" aria-label="Pagination">
                                            {movements.meta.current_page > 1 && movements.links?.prev && (
                                                <Link
                                                    href={movements.links.prev}
                                                    preserveState
                                                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}

                                            {movements.meta.links.slice(1, -1).map((link, i) => {
                                                if (link.label === '...') {
                                                    return (
                                                        <span
                                                            key={i}
                                                            className="relative inline-flex h-8 w-8 items-center justify-center text-[13px] font-medium text-slate-400"
                                                        >
                                                            ...
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <Link
                                                        key={i}
                                                        href={link.url || '#'}
                                                        preserveState
                                                        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold shadow-sm transition-all duration-200 ${
                                                            link.active
                                                                ? 'z-10 border border-emerald-600 bg-emerald-600 text-white'
                                                                : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20'
                                                        }`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                );
                                            })}

                                            {movements.meta.current_page < movements.meta.last_page && movements.links?.next && (
                                                <Link
                                                    href={movements.links.next}
                                                    preserveState
                                                    className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-slate-50 hover:text-emerald-600 focus:z-20"
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

                {userPermissions.isEmployee && (
                    <Card className="mt-6 overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-base">Your Active Movements</CardTitle>
                            <CardDescription>Movements that need to be closed upon return</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {activeMovementsOnPage.length > 0 ? (
                                <div className="space-y-3">
                                    {activeMovementsOnPage.map((movement) => (
                                        <div
                                            key={`active-${movement.id}`}
                                            className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <div className="truncate font-medium text-slate-900">{movement.destination}</div>
                                                <div className="text-sm text-slate-600">
                                                    {format(new Date(movement.from_datetime), 'MMM dd, yyyy HH:mm')} –{' '}
                                                    {format(new Date(movement.to_datetime), 'MMM dd, yyyy HH:mm')}
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => router.get(route('movements.show', movement.id))}
                                                className="h-9 w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
                                            >
                                                <Check className="mr-1 h-4 w-4" />
                                                Close
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-4 text-slate-500">
                                    <AlertCircle className="mr-2 h-5 w-5" />
                                    <span>No active movements on this page.</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </PageSurface>
        </Layout>
    );
}
