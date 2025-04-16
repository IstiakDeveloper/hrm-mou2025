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
  CalendarDays,
  Edit,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  employee: Employee;
  leaveType: LeaveType;
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

interface LeaveBalancesResponse {
  data: LeaveBalance[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface LeaveBalancesIndexProps {
  leaveBalances: LeaveBalancesResponse;
  departments: Department[];
  leaveTypes: LeaveType[];
  filters: {
    year: string;
    department_id: string;
    leave_type_id: string;
    search: string;
  };
  year: number;
  years: number[];
}

export default function LeaveBalancesIndex({
  leaveBalances,
  departments,
  leaveTypes,
  filters,
  year,
  years
}: LeaveBalancesIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [selectedYear, setSelectedYear] = useState(filters.year || year.toString());
  const [departmentId, setDepartmentId] = useState(filters.department_id || 'all');
  const [leaveTypeId, setLeaveTypeId] = useState(filters.leave_type_id || 'all');

  const [resetYearDialogOpen, setResetYearDialogOpen] = useState(false);
  const [fromYear, setFromYear] = useState((year - 1).toString());
  const [toYear, setToYear] = useState(year.toString());

  const handleSearch = () => {
    router.get(route('leave.balances.index'), {
      search,
      year: selectedYear,
      department_id: departmentId === 'all' ? '' : departmentId,
      leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId
    }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    setDepartmentId('all');
    setLeaveTypeId('all');
    router.get(route('leave.balances.index'), { year: selectedYear }, { preserveState: true });
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    router.get(route('leave.balances.index'), {
      year,
      department_id: departmentId === 'all' ? '' : departmentId,
      leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId,
      search
    }, { preserveState: true });
  };

  const handleResetForNewYear = () => {
    if (fromYear === toYear) {
      alert('From year and to year cannot be the same.');
      return;
    }

    router.post(route('leave.balances.reset-for-new-year'), {
      from_year: parseInt(fromYear),
      to_year: parseInt(toYear)
    });

    setResetYearDialogOpen(false);
  };

  return (
    <Layout>
      <Head title="Leave Balances" />

      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Balances</h1>
            <p className="mt-1 text-gray-500">
              Manage employee leave balances and allocations
            </p>
          </div>

          <div className="mt-4 md:mt-0 flex space-x-2">
            <Link href={route('leave.balances.create')}>
              <Button className="flex items-center">
                <Plus className="mr-1 h-4 w-4" />
                Add Balance
              </Button>
            </Link>

            <Link href={route('leave.balances.allocate-bulk')}>
              <Button variant="outline" className="flex items-center">
                <Users className="mr-1 h-4 w-4" />
                Bulk Allocate
              </Button>
            </Link>

            <Dialog open={resetYearDialogOpen} onOpenChange={setResetYearDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <RefreshCcw className="mr-1 h-4 w-4" />
                  Reset for New Year
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Leave Balances for New Year</DialogTitle>
                  <DialogDescription>
                    This will create new leave balances for the selected year based on previous year balances.
                    If carry forward is enabled for a leave type, remaining days will be added to the new allocation.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromYear">From Year</Label>
                      <Select
                        value={fromYear}
                        onValueChange={setFromYear}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={`from-${y}`} value={y.toString()}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="toYear">To Year</Label>
                      <Select
                        value={toYear}
                        onValueChange={setToYear}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={`to-${y}`} value={y.toString()}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResetYearDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleResetForNewYear}>
                    Reset Balances
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Filter leave balances by year, department or leave type</CardDescription>
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="year">Year:</Label>
                <Select
                  value={selectedYear}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years && years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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

              <div className="w-full md:w-64">
                <Select
                  value={departmentId}
                  onValueChange={setDepartmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
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
                  value={leaveTypeId}
                  onValueChange={setLeaveTypeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Leave Types</SelectItem>
                    {leaveTypes && leaveTypes.map((leaveType) => (
                      <SelectItem key={leaveType.id} value={leaveType.id.toString()}>
                        {leaveType.name}
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

        {/* Leave Balances Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Allocated Days</TableHead>
                  <TableHead>Used Days</TableHead>
                  <TableHead>Remaining Days</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveBalances.data && leaveBalances.data.length > 0 ? (
                  leaveBalances.data.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell>
                        <div className="font-medium">
                          {balance.employee && `${balance.employee.first_name} ${balance.employee.last_name}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {balance.employee && balance.employee.employee_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        {balance.employee && balance.employee.department && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {balance.employee.department.name}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{balance.leaveType && balance.leaveType.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {balance.allocated_days} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {balance.used_days} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          balance.remaining_days > 0
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }>
                          {balance.remaining_days} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarDays className="mr-1 h-4 w-4 text-gray-400" />
                          <span>{balance.year}</span>
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
                              onClick={() => router.get(route('leave.balances.edit', balance.id))}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No leave balances found for {selectedYear}.
                      {(search || departmentId !== 'all' || leaveTypeId !== 'all') && (
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
        {leaveBalances.meta && leaveBalances.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {leaveBalances.meta.current_page > 1 && leaveBalances.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={leaveBalances.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(leaveBalances.links.prev || '', {
                          search,
                          year: selectedYear,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId
                        }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {leaveBalances.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                              year: selectedYear,
                              department_id: departmentId === 'all' ? '' : departmentId,
                              leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId
                            }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {leaveBalances.meta.current_page < leaveBalances.meta.last_page && leaveBalances.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={leaveBalances.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(leaveBalances.links.next || '', {
                          search,
                          year: selectedYear,
                          department_id: departmentId === 'all' ? '' : departmentId,
                          leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId
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
