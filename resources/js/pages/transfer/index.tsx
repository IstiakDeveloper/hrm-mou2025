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
  CheckCircle,
  ChevronDown,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  X,
  XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Create a safe calendar component to avoid SVG props issues
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
  } | null;
  designation: {
    id: number;
    name: string;
  } | null;
}

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

interface User {
  id: number;
  name: string;
  email: string;
}

interface Transfer {
  id: number;
  employee_id: number;
  from_branch_id: number;
  to_branch_id: number;
  from_department_id: number | null;
  to_department_id: number | null;
  from_designation_id: number | null;
  to_designation_id: number | null;
  effective_date: string;
  transfer_order_no: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  approved_by: number | null;
  employee: Employee;
  fromBranch: Branch;
  toBranch: Branch;
  fromDepartment: Department | null;
  toDepartment: Department | null;
  fromDesignation: Designation | null;
  toDesignation: Designation | null;
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

interface TransfersResponse {
  data: Transfer[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface TransferIndexProps {
  transfers: TransfersResponse;
  departments: Department[];
  branches: Branch[];
  employees: Employee[];
  filters: {
    status?: string;
    department_id?: string;
    employee_id?: string;
    from_branch_id?: string;
    to_branch_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
  };
  canApprove: boolean;
}

export default function TransferIndex({
  transfers,
  departments,
  branches,
  employees,
  filters,
  canApprove
}: TransferIndexProps) {
  // Initialize state with filters or "all" for select components
  const [status, setStatus] = useState(filters.status || 'all');
  const [departmentId, setDepartmentId] = useState(filters.department_id || 'all');
  const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
  const [fromBranchId, setFromBranchId] = useState(filters.from_branch_id || 'all');
  const [toBranchId, setToBranchId] = useState(filters.to_branch_id || 'all');
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
    router.get(route('transfers.index'), {
      status: status === 'all' ? '' : status,
      department_id: departmentId === 'all' ? '' : departmentId,
      employee_id: employeeId === 'all' ? '' : employeeId,
      from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
      to_branch_id: toBranchId === 'all' ? '' : toBranchId,
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
    setStatus('all');
    setDepartmentId('all');
    setEmployeeId('all');
    setFromBranchId('all');
    setToBranchId('all');
    setFromDate(undefined);
    setToDate(undefined);
    setSearch('');
    router.get(route('transfers.index'), {}, { preserveState: true });
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

  // Check if pagination data exists
  const hasPagination = transfers?.meta && transfers?.links;

  return (
    <Layout>
      <Head title="Employee Transfers" />

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Transfers</h1>
            <p className="mt-1 text-gray-500">
              Manage employee transfers between branches, departments, and designations
            </p>
          </div>
          <div className="flex gap-2">
            {canApprove && (
              <Link href={route('transfers.report')}>
                <Button variant="outline" className="flex items-center">
                  <CalendarRange className="mr-1 h-4 w-4" />
                  Transfer Report
                </Button>
              </Link>
            )}
            <Link href={route('transfers.create')}>
              <Button className="flex items-center">
                <Plus className="mr-1 h-4 w-4" />
                New Transfer
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
            <CardDescription>Filter transfer requests by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
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
                <Select value={fromBranchId} onValueChange={setFromBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="From Branch" />
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
                <Select value={toBranchId} onValueChange={setToBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="To Branch" />
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
                <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarRange className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, 'MMM dd, yyyy') : <span>From Date</span>}
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
              </div>

              <div>
                <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarRange className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, 'MMM dd, yyyy') : <span>To Date</span>}
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

        {/* Transfers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.data.length > 0 ? (
                  transfers.data.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {transfer.employee.first_name} {transfer.employee.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transfer.employee.department?.name || 'No Department'} • {transfer.employee.designation?.name || 'No Designation'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transfer.fromBranch?.name}</div>
                          <div className="text-xs text-gray-500">
                            {transfer.fromDepartment?.name || 'Same Department'} • {transfer.fromDesignation?.name || 'Same Designation'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transfer.toBranch?.name}</div>
                          <div className="text-xs text-gray-500">
                            {transfer.toDepartment?.name || 'Same Department'} • {transfer.toDesignation?.name || 'Same Designation'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(transfer.effective_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transfer.status)}
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
                              onClick={() => router.get(route('transfers.show', transfer.id))}
                              className="cursor-pointer"
                            >
                              <span>View Details</span>
                            </DropdownMenuItem>

                            {transfer.status === 'pending' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => router.get(route('transfers.edit', transfer.id))}
                                  className="cursor-pointer"
                                >
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm('Are you sure you want to cancel this transfer request?')) {
                                      router.post(route('transfers.cancel', transfer.id));
                                    }
                                  }}
                                  className="cursor-pointer text-red-600"
                                >
                                  <span>Cancel</span>
                                </DropdownMenuItem>
                              </>
                            )}

                            {canApprove && transfer.status === 'pending' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (confirm('Are you sure you want to approve this transfer request?')) {
                                      router.post(route('transfers.approve', transfer.id));
                                    }
                                  }}
                                  className="cursor-pointer text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  <span>Approve</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const reason = prompt('Please provide a reason for rejection:');
                                    if (reason) {
                                      router.post(route('transfers.reject', transfer.id), { reason });
                                    }
                                  }}
                                  className="cursor-pointer text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  <span>Reject</span>
                                </DropdownMenuItem>
                              </>
                            )}

                            {transfer.status === 'approved' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm('Complete this transfer? This will update the employee records.')) {
                                    router.post(route('transfers.complete', transfer.id));
                                  }
                                }}
                                className="cursor-pointer text-green-600"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                <span>Complete Transfer</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No transfer requests found.
                      {(search || status !== 'all' || departmentId !== 'all' || employeeId !== 'all' ||
                        fromBranchId !== 'all' || toBranchId !== 'all' || fromDate || toDate) && (
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
        {hasPagination && transfers.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {transfers.meta.current_page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={transfers.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(transfers.links.prev || '', {
                          status: status === 'all' ? '' : status,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          employee_id: employeeId === 'all' ? '' : employeeId,
                          from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
                          to_branch_id: toBranchId === 'all' ? '' : toBranchId,
                          from_date: fromDate ? format(fromDate, 'yyyy-MM-dd') : '',
                          to_date: toDate ? format(toDate, 'yyyy-MM-dd') : '',
                          search,
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {transfers.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                              status: status === 'all' ? '' : status,
                              department_id: departmentId === 'all' ? '' : departmentId,
                              employee_id: employeeId === 'all' ? '' : employeeId,
                              from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
                              to_branch_id: toBranchId === 'all' ? '' : toBranchId,
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

                {transfers.meta.current_page < transfers.meta.last_page && (
                  <PaginationItem>
                    <PaginationNext
                      href={transfers.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(transfers.links.next || '', {
                          status: status === 'all' ? '' : status,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          employee_id: employeeId === 'all' ? '' : employeeId,
                          from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
                          to_branch_id: toBranchId === 'all' ? '' : toBranchId,
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
      </div>
    </Layout>
  );
}
