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
  User,
  Building,
  Users,
  BarChart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface EmployeesResponse {
  data: Employee[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface AttendanceMonthlyProps {
  employees: EmployeesResponse;
  attendances: Record<string, Attendance[]>;
  branches: Branch[];
  departments: Department[];
  filters: {
    month: string;
    branch_id: string;
    department_id: string;
    search: string;
  };
  month: string;
  daysInMonth: number;
}

export default function AttendanceMonthly({
  employees,
  attendances,
  branches,
  departments,
  filters,
  month,
  daysInMonth
}: AttendanceMonthlyProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [branchId, setBranchId] = useState(filters.branch_id || null);
  const [departmentId, setDepartmentId] = useState(filters.department_id || null);
  const [currentMonth, setCurrentMonth] = useState(month);

  // Generate array of days for the month
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Parse month to get year and month
  const monthDate = parse(month, 'yyyy-MM', new Date());
  const monthLabel = format(monthDate, 'MMMM yyyy');

  // Get previous and next month
  const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1);
  const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1);

  const prevMonthString = format(prevMonth, 'yyyy-MM');
  const nextMonthString = format(nextMonth, 'yyyy-MM');

  const handleSearch = () => {
    router.get(route('attendance.monthly'), {
      search,
      month: currentMonth,
      branch_id: branchId || '',
      department_id: departmentId || ''
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
    router.get(route('attendance.monthly'), { month: currentMonth }, { preserveState: true });
  };

  const handleMonthChange = (month: string) => {
    setCurrentMonth(month);
    router.get(route('attendance.monthly'), {
      month,
      search,
      branch_id: branchId || '',
      department_id: departmentId || ''
    }, { preserveState: true });
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      present: 'bg-green-100',
      absent: 'bg-red-100',
      late: 'bg-orange-100',
      half_day: 'bg-yellow-100',
      leave: 'bg-blue-100'
    };

    return statusColors[status] || 'bg-gray-100';
  };

  const getStatusCode = (status: string) => {
    const statusCodes: Record<string, string> = {
      present: 'P',
      absent: 'A',
      late: 'L',
      half_day: 'H',
      leave: 'LV'
    };

    return statusCodes[status] || '-';
  };

  const getAttendanceStatus = (employeeId: number, day: number) => {
    if (!attendances[employeeId]) return null;

    const dateToFind = `${month}-${day.toString().padStart(2, '0')}`;
    const attendance = attendances[employeeId].find(a => a.date === dateToFind);

    return attendance ? attendance.status : null;
  };

  // Calculate summary for each employee
  const getEmployeeSummary = (employeeId: number) => {
    if (!attendances[employeeId]) return { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };

    const summary = {
      present: 0,
      absent: 0,
      late: 0,
      half_day: 0,
      leave: 0
    };

    attendances[employeeId].forEach(attendance => {
      if (summary.hasOwnProperty(attendance.status)) {
        summary[attendance.status as keyof typeof summary]++;
      }
    });

    return summary;
  };

  // Check if pagination data exists
  const hasPagination = employees.meta && employees.links;

  return (
    <Layout>
      <Head title="Monthly Attendance" />

      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link
            href={route('attendance.index')}
            className="flex w-fit items-center text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span>Back to Daily Attendance</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monthly Attendance</h1>
            <p className="mt-1 text-gray-500">
              View attendance records for {monthLabel}
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="flex items-center"
              onClick={() => handleMonthChange(prevMonthString)}
            >
              <Calendar className="mr-1 h-4 w-4" />
              {format(prevMonth, 'MMM yyyy')}
            </Button>

            <Button
              variant="outline"
              className="flex items-center bg-blue-50"
            >
              <Calendar className="mr-1 h-4 w-4" />
              {format(monthDate, 'MMM yyyy')}
            </Button>

            <Button
              variant="outline"
              className="flex items-center"
              onClick={() => handleMonthChange(nextMonthString)}
            >
              <Calendar className="mr-1 h-4 w-4" />
              {format(nextMonth, 'MMM yyyy')}
            </Button>

            <Link href={route('attendance.report')}>
              <Button variant="outline" className="flex items-center">
                <BarChart className="mr-1 h-4 w-4" />
                View Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter employees by name, branch or department</CardDescription>
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

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="flex items-center">
            <span className="inline-block w-5 h-5 rounded-full bg-green-100 mr-1"></span>
            <span className="text-sm">P - Present</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-5 h-5 rounded-full bg-red-100 mr-1"></span>
            <span className="text-sm">A - Absent</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-5 h-5 rounded-full bg-orange-100 mr-1"></span>
            <span className="text-sm">L - Late</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-5 h-5 rounded-full bg-yellow-100 mr-1"></span>
            <span className="text-sm">H - Half Day</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-5 h-5 rounded-full bg-blue-100 mr-1"></span>
            <span className="text-sm">LV - Leave</span>
          </div>
        </div>

        {/* Monthly Attendance Table */}
        <Card className="overflow-x-auto">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white z-10 min-w-[200px]">Employee</TableHead>
                  {days.map(day => (
                    <TableHead key={day} className="text-center min-w-[40px]">{day}</TableHead>
                  ))}
                  <TableHead className="text-center min-w-[60px]">P</TableHead>
                  <TableHead className="text-center min-w-[60px]">A</TableHead>
                  <TableHead className="text-center min-w-[60px]">L</TableHead>
                  <TableHead className="text-center min-w-[60px]">H</TableHead>
                  <TableHead className="text-center min-w-[60px]">LV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.data && employees.data.length > 0 ? (
                  employees.data.map((employee) => {
                    const summary = getEmployeeSummary(employee.id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium sticky left-0 bg-white z-10">
                          <div>
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {employee.employee_id}
                          </div>
                        </TableCell>
                        {days.map(day => {
                          const status = getAttendanceStatus(employee.id, day);
                          return (
                            <TableCell key={day} className="p-1 text-center">
                              {status ? (
                                <div
                                  className={`w-8 h-8 rounded-full ${getStatusColor(status)} flex items-center justify-center mx-auto text-xs font-medium`}
                                  title={status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                >
                                  {getStatusCode(status)}
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-xs text-gray-500">
                                  -
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Badge className="bg-green-100 text-green-800 border-0">{summary.present}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-red-100 text-red-800 border-0">{summary.absent}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-orange-100 text-orange-800 border-0">{summary.late}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-yellow-100 text-yellow-800 border-0">{summary.half_day}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-100 text-blue-800 border-0">{summary.leave}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={days.length + 6} className="h-24 text-center">
                      No employees found.
                      {(search || branchId || departmentId) && (
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
        {hasPagination && employees.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {employees.meta.current_page > 1 && employees.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={employees.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(employees.links.prev || '', {
                          search,
                          month: currentMonth,
                          branch_id: branchId || '',
                          department_id: departmentId || ''
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {employees.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                              search,
                              month: currentMonth,
                              branch_id: branchId || '',
                              department_id: departmentId || ''
                            }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {employees.meta.current_page < employees.meta.last_page && employees.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={employees.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(employees.links.next || '', {
                          search,
                          month: currentMonth,
                          branch_id: branchId || '',
                          department_id: departmentId || ''
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
