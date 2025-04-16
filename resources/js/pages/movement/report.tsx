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
  Filter
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

// Custom Calendar wrapper to avoid issues with the disabled prop
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
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  approved_by: number | null;
  employee: Employee;
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

interface MovementSummary {
  total: number;
  official: number;
  personal: number;
  approved: number;
  rejected: number;
  pending: number;
  completed: number;
}

interface MovementReportProps {
  movements: MovementsResponse;
  departments: Department[];
  employees: Employee[];
  filters: {
    start_date?: string;
    end_date?: string;
    status?: string;
    department_id?: string;
    movement_type?: string;
    employee_id?: string;
  };
  startDate: string;
  endDate: string;
  summary: MovementSummary;
  movementTypes: string[];
}

export default function MovementReport({
  movements,
  departments,
  employees,
  filters,
  startDate,
  endDate,
  summary,
  movementTypes
}: MovementReportProps) {
  // Initialize state with filters or default values
  // Using 'all' instead of empty strings for Select components
  const [status, setStatus] = useState(filters.status || 'all');
  const [departmentId, setDepartmentId] = useState(filters.department_id || 'all');
  const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
  const [movementType, setMovementType] = useState(filters.movement_type || 'all');
  const [fromDate, setFromDate] = useState<Date | undefined>(
    filters.start_date ? new Date(filters.start_date) : new Date(startDate)
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    filters.end_date ? new Date(filters.end_date) : new Date(endDate)
  );
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const handleApplyFilters = () => {
    router.get(route('movements.report'), {
      start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
      end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
      status: status === 'all' ? '' : status,
      department_id: departmentId === 'all' ? '' : departmentId,
      movement_type: movementType === 'all' ? '' : movementType,
      employee_id: employeeId === 'all' ? '' : employeeId,
    }, { preserveState: true });
  };

  const resetFilters = () => {
    setStatus('all');
    setDepartmentId('all');
    setEmployeeId('all');
    setMovementType('all');
    setFromDate(new Date(subDays(new Date(), 30)));
    setToDate(new Date());
    router.get(route('movements.report'), {
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

  // Calculate percentage for summary cards
  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Check if pagination data exists using optional chaining
  const hasPagination = movements?.meta && movements?.links;

  return (
    <Layout>
      <Head title="Movement Report" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href={route('movements.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Movement Requests
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Movement Report</h1>
            <p className="mt-1 text-gray-500">
              Employee movement activity analysis from {format(new Date(startDate), 'MMM dd, yyyy')} to {format(new Date(endDate), 'MMM dd, yyyy')}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Movements</p>
                  <p className="text-3xl font-bold mt-1">{summary?.total || 0}</p>
                </div>
                <BarChart3 className="h-6 w-6 text-gray-400" />
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <div>
                  <span className="text-indigo-600 font-medium">{summary?.official || 0}</span> Official
                </div>
                <div>
                  <span className="text-purple-600 font-medium">{summary?.personal || 0}</span> Personal
                </div>
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
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Report Filters
            </CardTitle>
            <CardDescription>Filter movement data by date range and categories</CardDescription>
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
                <label className="text-sm font-medium">Status & Type</label>
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

                  <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Movement Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {movementTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Department & Employee</label>
                <div className="grid grid-cols-2 gap-2">
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

                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
                          {employee.first_name} {employee.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

        {/* Movements Table */}
        <Card>
          <CardHeader>
            <CardTitle>Movement Details</CardTitle>
            <CardDescription>
              Showing {movements?.meta?.from || 0} to {movements?.meta?.to || 0} of {movements?.meta?.total || 0} movements
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements?.data?.length > 0 ? (
                  movements.data.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {movement.employee.first_name} {movement.employee.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {movement.employee.department?.name || 'No Department'}
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
                        {format(new Date(movement.to_datetime), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <span className="truncate max-w-[150px] block">{movement.destination}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(movement.status)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No movement requests found for the selected filters.
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
              Showing {movements?.meta?.from || 0} to {movements?.meta?.to || 0} of {movements?.meta?.total || 0} results
            </div>
          </CardFooter>
        </Card>

        {/* Pagination */}
        {hasPagination && movements?.meta?.last_page > 1 && (
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
                          start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                          end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                          status: status === 'all' ? '' : status,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          movement_type: movementType === 'all' ? '' : movementType,
                          employee_id: employeeId === 'all' ? '' : employeeId,
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
                              start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                              end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                              status: status === 'all' ? '' : status,
                              department_id: departmentId === 'all' ? '' : departmentId,
                              movement_type: movementType === 'all' ? '' : movementType,
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

                {movements.meta.current_page < movements.meta.last_page && (
                  <PaginationItem>
                    <PaginationNext
                      href={movements.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(movements.links.next || '', {
                          start_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                          end_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                          status: status === 'all' ? '' : status,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          movement_type: movementType === 'all' ? '' : movementType,
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
