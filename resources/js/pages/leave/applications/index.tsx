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
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  UserX,
  XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Department {
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

interface LeaveType {
  id: number;
  name: string;
}

interface User {
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
  leaveType: LeaveType;
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
  };
  canApprove: boolean;
}

export default function ApplicationsIndex({
  applications,
  departments,
  employees,
  filters,
  canApprove
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

  const handleSearch = () => {
    router.get(route('leave.applications.index'), {
      search,
      status: status === 'all' ? '' : status,
      department_id: departmentId === 'all' ? '' : departmentId,
      employee_id: employeeId === 'all' ? '' : employeeId,
      from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
      to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
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
    router.get(route('leave.applications.index'));
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

      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Applications</h1>
            <p className="mt-1 text-gray-500">
              Manage employee leave requests and approvals
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex space-x-2">
            {/* Use a Button with onClick instead of Link for more reliable navigation */}
            <Button onClick={goToCreatePage} className="flex items-center">
              <Plus className="mr-1 h-4 w-4" />
              Apply for Leave
            </Button>

            <Button
              variant="outline"
              className="flex items-center"
              onClick={() => router.visit(route('leave.applications.report'))}
            >
              <FileText className="mr-1 h-4 w-4" />
              Leave Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter leave applications by status, date, department or employee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, 'PPP') : <span>Pick a date</span>}
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

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, 'PPP') : <span>Pick a date</span>}
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

            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
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

              <div className="w-full md:w-48">
                <Select
                  value={status}
                  onValueChange={setStatus}
                >
                  <SelectTrigger>
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

              <div className="w-full md:w-64">
                <Select
                  value={departmentId}
                  onValueChange={setDepartmentId}
                >
                  <SelectTrigger>
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

              <div className="w-full md:w-64">
                <Select
                  value={employeeId}
                  onValueChange={setEmployeeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees && employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.first_name} {employee.last_name}
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
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications && applications.data && applications.data.length > 0 ? (
                  applications.data.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="font-medium">
                          {application.employee && `${application.employee.first_name} ${application.employee.last_name}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {application.employee && application.employee.employee_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {application.leave_type && application.leave_type.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {application.start_date && format(new Date(application.start_date), 'dd MMM yyyy')}
                          {application.start_date !== application.end_date && (
                            <span> to {format(new Date(application.end_date), 'dd MMM yyyy')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {application.days} {application.days > 1 ? 'days' : 'day'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(application.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {application.applied_at && format(new Date(application.applied_at), 'dd MMM yyyy')}
                        </div>
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
                              onClick={() => router.visit(route('leave.applications.show', application.id))}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View Details</span>
                            </DropdownMenuItem>

                            {application.status === 'pending' && canApprove && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => router.post(route('leave.applications.approve', application.id))}
                                  className="cursor-pointer text-green-600 focus:text-green-600"
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  <span>Approve</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const reason = prompt('Please enter a reason for rejection:');
                                    if (reason) {
                                      router.post(route('leave.applications.reject', application.id), {
                                        rejection_reason: reason
                                      });
                                    }
                                  }}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  <span>Reject</span>
                                </DropdownMenuItem>
                              </>
                            )}

                            {application.status === 'pending' && application.employee_id === (window as any).auth?.user?.employee_id && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm('Are you sure you want to cancel this leave application?')) {
                                    router.post(route('leave.applications.cancel', application.id));
                                  }
                                }}
                                className="cursor-pointer text-gray-600 focus:text-gray-600"
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                <span>Cancel</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No leave applications found.
                      {(search || status !== 'all' || departmentId !== 'all' || employeeId !== 'all' || fromDate || toDate) && (
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
        {applications && applications.meta && applications.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {applications.meta.current_page > 1 && applications.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={applications.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(applications.links.prev || '', {
                          search,
                          status: status === 'all' ? '' : status,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          employee_id: employeeId === 'all' ? '' : employeeId,
                          from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                          to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {applications.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                              status: status === 'all' ? '' : status,
                              department_id: departmentId === 'all' ? '' : departmentId,
                              employee_id: employeeId === 'all' ? '' : employeeId,
                              from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                              to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                            }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {applications.meta.current_page < applications.meta.last_page && applications.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={applications.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(applications.links.next || '', {
                          search,
                          status: status === 'all' ? '' : status,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          employee_id: employeeId === 'all' ? '' : employeeId,
                          from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                          to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
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
