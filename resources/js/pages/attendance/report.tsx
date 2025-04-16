import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
  Calendar,
  CalendarIcon,
  Search,
  ArrowLeft,
  PieChart,
  Download,
  ChevronDown,
  Clock,
  User,
  Building,
  Users
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
import { Label } from '@radix-ui/react-dropdown-menu';

interface Department {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface Designation {
  id: number;
  name: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  department: Department;
  designation: Designation;
  branch: Branch;
}

interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
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

interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
}

interface AttendanceReportProps {
  attendances: AttendancesResponse;
  branches: Branch[];
  departments: Department[];
  employees: Employee[];
  filters: {
    start_date: string;
    end_date: string;
    branch_id: string;
    department_id: string;
    status: string;
    employee_id: string;
  };
  startDate: string;
  endDate: string;
  summary: AttendanceSummary;
}

export default function AttendanceReport({
  attendances,
  branches,
  departments,
  employees,
  filters,
  startDate,
  endDate,
  summary
}: AttendanceReportProps) {
  const [branchId, setBranchId] = useState(filters.branch_id || null);
  const [departmentId, setDepartmentId] = useState(filters.department_id || null);
  const [status, setStatus] = useState(filters.status || null);
  const [employeeId, setEmployeeId] = useState(filters.employee_id || null);
  const [currentStartDate, setCurrentStartDate] = useState(startDate);
  const [currentEndDate, setCurrentEndDate] = useState(endDate);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const handleSearch = () => {
    router.get(route('attendance.report'), {
      start_date: currentStartDate,
      end_date: currentEndDate,
      branch_id: branchId || '',
      department_id: departmentId || '',
      status: status || '',
      employee_id: employeeId || ''
    }, { preserveState: true });
  };

  const resetFilters = () => {
    setBranchId(null);
    setDepartmentId(null);
    setStatus(null);
    setEmployeeId(null);
    router.get(route('attendance.report'), {
      start_date: currentStartDate,
      end_date: currentEndDate
    }, { preserveState: true });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setCurrentStartDate(formattedDate);
      setStartDateOpen(false);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      setCurrentEndDate(formattedDate);
      setEndDateOpen(false);
    }
  };

  const handleDateApply = () => {
    router.get(route('attendance.report'), {
      start_date: currentStartDate,
      end_date: currentEndDate,
      branch_id: branchId || '',
      department_id: departmentId || '',
      status: status || '',
      employee_id: employeeId || ''
    }, { preserveState: true });
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

    return (
      <Badge variant="outline" className={`${statusColor} border-0`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  // Calculate percentage
  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Check if pagination data exists
  const hasPagination = attendances.meta && attendances.links;

  return (
    <Layout>
      <Head title="Attendance Report" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('attendance.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Attendance</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Report</h1>
            <p className="mt-1 text-gray-500">
              View and analyze attendance data for the selected period
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            <Button variant="outline" className="flex items-center">
              <Download className="mr-1 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Date Range</CardTitle>
            <CardDescription>Select the period for your attendance report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-end">
              <div className="w-full md:w-1/3">
                <Label htmlFor="start_date" className="mb-2 block">
                  Start Date
                </Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentStartDate ? format(new Date(currentStartDate), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={currentStartDate ? new Date(currentStartDate) : undefined}
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="w-full md:w-1/3">
                <Label htmlFor="end_date" className="mb-2 block">
                  End Date
                </Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentEndDate ? format(new Date(currentEndDate), "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={currentEndDate ? new Date(currentEndDate) : undefined}
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Button onClick={handleDateApply}>
                  Apply Date Range
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter attendance by branch, department, employee or status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
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

              <div>
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

              <div>
                <Select
                  value={employeeId || undefined}
                  onValueChange={(value) => setEmployeeId(value === "all" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
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

              <div>
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
            </div>

            <div className="mt-4 flex justify-end">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
                <Button onClick={handleSearch}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500">Total Days</div>
              <div className="mt-1 text-2xl font-bold">{summary.totalDays}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-green-600">Present</div>
              <div className="mt-1 text-2xl font-bold">{summary.present}</div>
              <div className="mt-1 text-xs text-gray-500">
                {calculatePercentage(summary.present, summary.totalDays)}% of total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-red-600">Absent</div>
              <div className="mt-1 text-2xl font-bold">{summary.absent}</div>
              <div className="mt-1 text-xs text-gray-500">
                {calculatePercentage(summary.absent, summary.totalDays)}% of total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-orange-600">Late</div>
              <div className="mt-1 text-2xl font-bold">{summary.late}</div>
              <div className="mt-1 text-xs text-gray-500">
                {calculatePercentage(summary.late, summary.totalDays)}% of total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-yellow-600">Half Day</div>
              <div className="mt-1 text-2xl font-bold">{summary.halfDay}</div>
              <div className="mt-1 text-xs text-gray-500">
                {calculatePercentage(summary.halfDay, summary.totalDays)}% of total
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-blue-600">On Leave</div>
              <div className="mt-1 text-2xl font-bold">{summary.onLeave}</div>
              <div className="mt-1 text-xs text-gray-500">
                {calculatePercentage(summary.onLeave, summary.totalDays)}% of total
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Records Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              Showing attendance from {format(new Date(currentStartDate), "PP")} to {format(new Date(currentEndDate), "PP")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.data && attendances.data.length > 0 ? (
                  attendances.data.map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>
                        {format(new Date(attendance.date), "PP")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {attendance.employee.first_name} {attendance.employee.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {attendance.employee.employee_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {attendance.employee.department.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attendance.employee.branch.name}
                      </TableCell>
                      <TableCell>
                        {attendance.check_in ? (
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4 text-gray-400" />
                            {attendance.check_in}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {attendance.check_out ? (
                          <div className="flex items-center">
                            <Clock className="mr-1 h-4 w-4 text-gray-400" />
                            {attendance.check_out}
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(attendance.status)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No attendance records found for the selected criteria.
                      {(branchId || departmentId || status || employeeId) && (
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
        {hasPagination && attendances.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {attendances.meta.current_page > 1 && attendances.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={attendances.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(attendances.links.prev || '', {
                          start_date: currentStartDate,
                          end_date: currentEndDate,
                          branch_id: branchId || '',
                          department_id: departmentId || '',
                          status: status || '',
                          employee_id: employeeId || ''
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {attendances.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                              start_date: currentStartDate,
                              end_date: currentEndDate,
                              branch_id: branchId || '',
                              department_id: departmentId || '',
                              status: status || '',
                              employee_id: employeeId || ''
                            }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {attendances.meta.current_page < attendances.meta.last_page && attendances.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={attendances.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(attendances.links.next || '', {
                          start_date: currentStartDate,
                          end_date: currentEndDate,
                          branch_id: branchId || '',
                          department_id: departmentId || '',
                          status: status || '',
                          employee_id: employeeId || ''
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
