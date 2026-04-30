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

interface Employee {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string;
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
            <Head title={`Movements - ${employee.first_name} ${employee.last_name}`} />

            <PageSurface>
                <div className="mb-6">
                    <Link
                        href={route('employees.show', employee.id)}
                        className="flex w-fit items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        <span>Back to Employee Profile</span>
                    </Link>
                </div>

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Movement Tracking: {employee.first_name} {employee.last_name}
                    </h1>
                    <div className="mt-1 text-gray-500">
                        {employee.designation.name} • {employee.department.name} • {employee.employee_id}
                    </div>
                </div>

                {/* Movement List */}
                <Card className="shadow-sm">
                    <CardHeader className="bg-gray-50 border-b">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div>
                                <CardTitle>Movements</CardTitle>
                                <CardDescription>Official and personal movements</CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button onClick={downloadPdf} variant="outline" size="sm" className="flex items-center">
                                    <Download className="mr-1 h-4 w-4" />
                                    Export PDF
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <div className="p-4 border-b">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                                <Label htmlFor="start_date">Start Date</Label>
                                <DatePicker
                                    id="start_date"
                                    selected={filterValues.startDate}
                                    onSelect={(date) => setFilterValues({ ...filterValues, startDate: date })}
                                    placeholderText="Filter from date"
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_date">End Date</Label>
                                <DatePicker
                                    id="end_date"
                                    selected={filterValues.endDate}
                                    onSelect={(date) => setFilterValues({ ...filterValues, endDate: date })}
                                    placeholderText="Filter to date"
                                    minDate={filterValues.startDate || undefined}
                                />
                            </div>
                            <div>
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={filterValues.status}
                                    onValueChange={(value) => setFilterValues({ ...filterValues, status: value })}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Filter by Status" />
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
                                <Label htmlFor="type">Movement Type</Label>
                                <Select
                                    value={filterValues.type}
                                    onValueChange={(value) => setFilterValues({ ...filterValues, type: value })}
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder="Filter by Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="official">Official</SelectItem>
                                        <SelectItem value="personal">Personal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <Button onClick={resetFilters} variant="outline" size="sm">
                                Reset Filters
                            </Button>
                            <Button onClick={applyFilters} size="sm">
                                Apply Filters
                            </Button>
                        </div>
                    </div>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
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
                                                <TableCell>{getMovementTypeBadge(movement.movement_type)}</TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="max-w-xs truncate" title={movement.purpose}>
                                                        {movement.purpose}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-sm">
                                                        <Timer className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{formatDateTimeRange(movement.from_datetime, movement.actual_return_datetime)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{calculateDuration(movement.from_datetime, movement.actual_return_datetime)} hours</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center text-sm">
                                                        {movement.destination ? (
                                                            <>
                                                                <MapPin className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                                                <span className="truncate">{movement.destination}</span>
                                                            </>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getMovementStatusBadge(movement.status)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                                                No movement records found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {movements.last_page > 1 && (
                            <div className="flex items-center justify-end p-4 border-t">
                                <Pagination>
                                    <Link
                                        href={movements.prev_page_url || '#'}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border ${!movements.prev_page_url
                                                ? 'text-gray-300 cursor-not-allowed'
                                                : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        preserveScroll
                                    >
                                        Previous
                                    </Link>
                                    <span className="mx-2 text-sm text-gray-700">
                                        Page {movements.current_page} of {movements.last_page}
                                    </span>
                                    <Link
                                        href={movements.next_page_url || '#'}
                                        className={`relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium rounded-md border ${!movements.next_page_url
                                                ? 'text-gray-300 cursor-not-allowed'
                                                : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        preserveScroll
                                    >
                                        Next
                                    </Link>
                                </Pagination>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
