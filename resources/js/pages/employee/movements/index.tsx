import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    AlertCircle,
    XCircle,
    Search,
    Download,
    MapPin,
    Timer,
    Briefcase,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { PageSurface } from '@/components/page-surface';
import { DatePicker } from '@/components/ui/date-picker';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface User {
    id: number;
    name: string;
}

interface Movement {
    id: number;
    employee_id: number;
    movement_type: 'official' | 'personal';
    from_datetime: string;
    actual_return_datetime: string;
    purpose: string;
    destination: string | null;
    remarks: string | null;
    approved_by: User | null;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    created_at: string;
}

interface Department {
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
    email: string;
    department: Department;
    designation: Designation;
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface EmployeeMovementsProps {
    employee: Employee;
    movements: {
        data: Movement[];
    } & Pagination;
    filters: {
        start_date: string | null;
        end_date: string | null;
        status: string | null;
        type: string | null;
    };
}

export default function EmployeeMovements({
    employee,
    movements,
    filters
}: EmployeeMovementsProps) {
    // State for filters
    const [filterValues, setFilterValues] = useState({
        status: filters.status || 'all',
        type: filters.type || 'all',
        startDate: filters.start_date ? new Date(filters.start_date) : null,
        endDate: filters.end_date ? new Date(filters.end_date) : null,
        search: '',
    });

    // Helper function to get status badge for movements
    const getMovementStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
            approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
            rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" /> },
            completed: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return (
            <Badge variant="outline" className={`${config.color} border-0 flex items-center`}>
                {config.icon}
                <span className="capitalize">{status}</span>
            </Badge>
        );
    };

    // Helper function to get movement type badge
    const getMovementTypeBadge = (type: 'official' | 'personal') => {
        return (
            <Badge variant="outline" className={`${type === 'official' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'} border-0`}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
            </Badge>
        );
    };

    // Format datetime range for movements
    const formatDateTimeRange = (fromDatetime: string, toDatetime: string) => {
        const from = new Date(fromDatetime);
        const to = new Date(toDatetime);

        const sameDay = from.toDateString() === to.toDateString();

        if (sameDay) {
            return `${format(from, 'PP')}, ${format(from, 'p')} - ${format(to, 'p')}`;
        }

        return `${format(from, 'PP p')} - ${format(to, 'PP p')}`;
    };

    // Calculate duration in hours
    const calculateDuration = (fromDatetime: string, toDatetime: string) => {
        const from = new Date(fromDatetime);
        const to = new Date(toDatetime);

        const diffInMs = to.getTime() - from.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        return diffInHours.toFixed(1);
    };

    // Apply filters
    const applyFilters = () => {
        router.get(route('employees.movements.index', employee.id), {
            start_date: filterValues.startDate ? format(filterValues.startDate, 'yyyy-MM-dd') : null,
            end_date: filterValues.endDate ? format(filterValues.endDate, 'yyyy-MM-dd') : null,
            status: filterValues.status,
            type: filterValues.type,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    // Reset filters
    const resetFilters = () => {
        setFilterValues({
            status: 'all',
            type: 'all',
            startDate: null,
            endDate: null,
            search: '',
        });

        router.get(route('employees.movements.index', employee.id), {}, {
            preserveState: true,
            replace: true,
        });
    };

    // Download PDF report
    const downloadPdf = () => {
        const params = new URLSearchParams();

        if (filterValues.startDate) {
            params.append('start_date', format(filterValues.startDate, 'yyyy-MM-dd'));
        }

        if (filterValues.endDate) {
            params.append('end_date', format(filterValues.endDate, 'yyyy-MM-dd'));
        }

        if (filterValues.status !== 'all') {
            params.append('status', filterValues.status);
        }

        if (filterValues.type !== 'all') {
            params.append('type', filterValues.type);
        }

        const url = `${route('employees.movements.download', employee.id)}?${params.toString()}`;
        window.open(url, '_blank');
    };

    return (
        <Layout>
            <Head title={`Movements - ${employeeDisplayName(employee)}`} />

            <PageSurface className="max-w-7xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="mb-2">
                    <Link
                        href={route('employees.show', employee.id)}
                        className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        <span>Back to Employee Profile</span>
                    </Link>
                </div>

                <div className="mb-3">
                    <h1 className="text-base sm:text-lg font-bold text-gray-900">
                        Movement Tracking: {employeeDisplayName(employee)}
                    </h1>
                    <div className="mt-0.5 text-xs text-gray-500">
                        {employee.designation.name} • {employee.department.name} • {employee.employee_id}
                    </div>
                </div>

                {/* Movement List */}
                <Card className="shadow-xs border-slate-200">
                    <CardHeader className="bg-gray-50/80 px-3 py-2 sm:px-4 border-b">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-xs font-bold tracking-wider text-gray-900 uppercase">Movements</CardTitle>
                                <CardDescription className="text-[10px] text-gray-500">Official and personal movements</CardDescription>
                            </div>
                            <Button onClick={downloadPdf} variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs">
                                <Download className="mr-1 h-3 w-3" />
                                Export PDF
                            </Button>
                        </div>
                    </CardHeader>

                    <div className="p-2.5 sm:p-4 border-b bg-gray-50/30">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-2.5">
                            <div>
                                <Label htmlFor="start_date" className="text-[10px]">Start Date</Label>
                                <DatePicker
                                    id="start_date"
                                    selected={filterValues.startDate}
                                    onSelect={(date) => setFilterValues({ ...filterValues, startDate: date })}
                                    placeholderText="From date"
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_date" className="text-[10px]">End Date</Label>
                                <DatePicker
                                    id="end_date"
                                    selected={filterValues.endDate}
                                    onSelect={(date) => setFilterValues({ ...filterValues, endDate: date })}
                                    placeholderText="To date"
                                    minDate={filterValues.startDate || undefined}
                                />
                            </div>
                            <div>
                                <Label htmlFor="status" className="text-[10px]">Status</Label>
                                <Select
                                    value={filterValues.status}
                                    onValueChange={(value) => setFilterValues({ ...filterValues, status: value })}
                                >
                                    <SelectTrigger id="status" className="h-8 text-xs">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="type" className="text-[10px]">Movement Type</Label>
                                <Select
                                    value={filterValues.type}
                                    onValueChange={(value) => setFilterValues({ ...filterValues, type: value })}
                                >
                                    <SelectTrigger id="type" className="h-8 text-xs">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="official">Official</SelectItem>
                                        <SelectItem value="personal">Personal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 justify-end">
                            <Button onClick={resetFilters} variant="outline" size="sm" className="h-6.5 text-[10px] px-2">
                                Reset
                            </Button>
                            <Button onClick={applyFilters} size="sm" className="h-6.5 bg-emerald-600 text-[10px] px-2.5 hover:bg-emerald-700">
                                Filter
                            </Button>
                        </div>
                    </div>

                    <CardContent className="p-0">
                        {/* Mobile Card List View (sm:hidden) */}
                        <div className="p-2 space-y-2 sm:hidden">
                            {movements.data.length > 0 ? (
                                movements.data.map((movement) => (
                                    <div key={movement.id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-xs space-y-1.5">
                                        <div className="flex items-center justify-between gap-1">
                                            {getMovementTypeBadge(movement.movement_type)}
                                            {getMovementStatusBadge(movement.status)}
                                        </div>
                                        <div className="font-bold text-xs text-gray-900 truncate">
                                            {movement.purpose}
                                        </div>
                                        <div className="flex items-center text-[10px] text-gray-600">
                                            <Timer className="h-3 w-3 mr-1 text-gray-400 shrink-0" />
                                            <span className="truncate">{formatDateTimeRange(movement.from_datetime, movement.actual_return_datetime)}</span>
                                            <span className="ml-1 text-emerald-700 font-bold">({calculateDuration(movement.from_datetime, movement.actual_return_datetime)}h)</span>
                                        </div>
                                        {movement.destination && (
                                            <div className="flex items-center text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                                                <MapPin className="h-3 w-3 mr-1 text-gray-400 shrink-0" />
                                                <span className="truncate">{movement.destination}</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 text-center text-xs text-gray-500">
                                    No movement records found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View (hidden sm:block) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50 text-[10px] uppercase">
                                        <TableHead>Type</TableHead>
                                        <TableHead>Purpose</TableHead>
                                        <TableHead>Time Period</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Destination</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.data.length > 0 ? (
                                        movements.data.map((movement) => (
                                            <TableRow key={movement.id}>
                                                <TableCell className="py-2">{getMovementTypeBadge(movement.movement_type)}</TableCell>
                                                <TableCell className="font-medium text-xs py-2">
                                                    <div className="max-w-xs truncate" title={movement.purpose}>
                                                        {movement.purpose}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex items-center text-xs">
                                                        <Timer className="h-3.5 w-3.5 mr-1 text-gray-400 shrink-0" />
                                                        <span className="truncate">{formatDateTimeRange(movement.from_datetime, movement.actual_return_datetime)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs py-2">{calculateDuration(movement.from_datetime, movement.actual_return_datetime)} hours</TableCell>
                                                <TableCell className="py-2">
                                                    <div className="flex items-center text-xs">
                                                        {movement.destination ? (
                                                            <>
                                                                <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400 shrink-0" />
                                                                <span className="truncate">{movement.destination}</span>
                                                            </>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2">{getMovementStatusBadge(movement.status)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-6 text-xs text-gray-500">
                                                No movement records found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {movements.last_page > 1 && (
                            <div className="flex items-center justify-between p-2.5 border-t text-xs">
                                <span className="text-gray-500 text-[11px]">
                                    Page {movements.current_page} of {movements.last_page}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Link
                                        href={movements.prev_page_url || '#'}
                                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${!movements.prev_page_url
                                                ? 'text-gray-300 cursor-not-allowed border-gray-100 bg-gray-50'
                                                : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-200'
                                            }`}
                                        preserveScroll
                                    >
                                        Prev
                                    </Link>
                                    <Link
                                        href={movements.next_page_url || '#'}
                                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border ${!movements.next_page_url
                                                ? 'text-gray-300 cursor-not-allowed border-gray-100 bg-gray-50'
                                                : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-200'
                                            }`}
                                        preserveScroll
                                    >
                                        Next
                                    </Link>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
