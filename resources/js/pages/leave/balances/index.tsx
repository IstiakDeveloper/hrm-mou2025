import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
  ChevronDown,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isSuperAdmin } from '@/lib/permissions';
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

interface Branch {
  id: number;
  name: string;
}

interface LeaveType {
  id: number;
  name: string;
  days_allowed?: number;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
  gender?: string | null;
  department: Department | null;
  designation: { id: number; name: string } | null;
  currentBranch?: Branch | null;
  /** Inertia/Laravel may serialize relations as snake_case. Support both. */
  leaveBalances?: LeaveBalance[];
  leave_balances?: LeaveBalance[];
}

interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
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

interface LeaveBalancesIndexProps {
  employees: EmployeesResponse;
  branches: Branch[];
  leaveTypes: LeaveType[];
  filters: {
    year: string;
    branch_id: string;
    search: string;
  };
  year: number;
  years: number[];
}

export default function LeaveBalancesIndex({
  employees,
  branches,
  leaveTypes,
  filters,
  year,
  years
}: LeaveBalancesIndexProps) {
  const { auth } = usePage().props as { auth?: unknown };
  const canEditBalances = isSuperAdmin(auth as any);
  const [search, setSearch] = useState(filters.search || '');
  const [selectedYear, setSelectedYear] = useState(filters.year || year.toString());
  const [branchId, setBranchId] = useState(filters.branch_id || 'all');
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<Record<number, boolean>>({});

  const [resetYearDialogOpen, setResetYearDialogOpen] = useState(false);
  const [fromYear, setFromYear] = useState((year - 1).toString());
  const [toYear, setToYear] = useState(year.toString());

  const yearNumber = Number(selectedYear) || year;

  const leaveTypesForDetails = useMemo(() => leaveTypes || [], [leaveTypes]);

  const handleSearch = () => {
    router.get(route('leave.balances.index'), {
      search,
      year: selectedYear,
      branch_id: branchId === 'all' ? '' : branchId,
    }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    setBranchId('all');
    router.get(route('leave.balances.index'), { year: selectedYear }, { preserveState: true });
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    router.get(route('leave.balances.index'), {
      year,
      branch_id: branchId === 'all' ? '' : branchId,
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

  const toggleExpanded = (employeeId: number) => {
    setExpandedEmployeeIds((prev) => ({
      ...prev,
      [employeeId]: !prev[employeeId],
    }));
  };

  const normalizedGender = (g: string | null | undefined) => (g ?? '').toString().trim().toLowerCase();
  const isMale = (g: string | null | undefined) => {
    const ng = normalizedGender(g);
    return ng === 'male' || ng === 'm';
  };
  const isFemale = (g: string | null | undefined) => {
    const ng = normalizedGender(g);
    return ng === 'female' || ng === 'f';
  };
  const isApplicableLeaveTypeForEmployee = (leaveTypeName: string, employeeGender: string | null | undefined) => {
    const n = leaveTypeName.trim().toLowerCase();
    if (n.includes('maternity')) {
      return isFemale(employeeGender);
    }
    if (n.includes('paternity')) {
      return isMale(employeeGender);
    }
    return true;
  };

  const computeEmployeeLeaveTotals = (employee: Employee) => {
    const balances = employee.leaveBalances || employee.leave_balances || [];
    let totalRemaining = 0;
    let totalUsed = 0;

    for (const lt of leaveTypesForDetails) {
      if (!isApplicableLeaveTypeForEmployee(lt.name, employee.gender)) continue;
      const bal = balances.find((b) => b.leave_type_id === lt.id);
      const allocated = bal?.allocated_days ?? lt.days_allowed ?? 0;
      const used = bal?.used_days ?? 0;
      const remaining = bal?.remaining_days ?? Math.max(0, allocated - used);
      totalUsed += used;
      totalRemaining += remaining;
    }

    return { totalRemaining, totalUsed };
  };

  return (
    <Layout>
      <Head title="Leave Balances" />

      <div className="container mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Leave Balances</h1>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                {employees?.meta?.total ?? 0} employee{(employees?.meta?.total ?? 0) === 1 ? '' : 's'}
              </Badge>
            </div>
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
                <CardDescription>Filter employees by year and branch</CardDescription>
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
                    placeholder="Search by employee name, ID or PIN..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-full md:w-64">
                <Select
                  value={branchId}
                  onValueChange={setBranchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches && branches.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
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

        {/* Employees Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Total Used</TableHead>
                  <TableHead>Total Remaining</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.data && employees.data.length > 0 ? (
                  employees.data.map((employee) => {
                    const balances = employee.leaveBalances || employee.leave_balances || [];
                    const { totalRemaining, totalUsed } = computeEmployeeLeaveTotals(employee);
                    const expanded = expandedEmployeeIds[employee.id] === true;

                    return (
                      <React.Fragment key={employee.id}>
                        <TableRow>
                          <TableCell className="align-top">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleExpanded(employee.id)}
                              aria-label={expanded ? 'Collapse' : 'Expand'}
                            >
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {`${employee.first_name || ''} ${employee.last_name || ''}`.trim()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.employee_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        {employee.currentBranch?.name ? (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                            {employee.currentBranch.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.department?.name ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {employee.department.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.designation?.name ? (
                          <span className="font-medium">{employee.designation.name}</span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {totalUsed} day{totalUsed === 1 ? '' : 's'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={totalRemaining > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}
                        >
                          {totalRemaining} day{totalRemaining === 1 ? '' : 's'}
                        </Badge>
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
                              onClick={() => router.get(route('leave.balances.allocate-bulk'))}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Manage</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                        {expanded ? (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-slate-50/50">
                              <div className="p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <div className="text-sm font-medium text-gray-900">
                                    Leave balances ({yearNumber})
                                  </div>
                                  <div className="text-xs text-gray-600 flex items-center">
                                    <CalendarDays className="mr-1 h-4 w-4 text-gray-400" />
                                    Year: {yearNumber}
                                  </div>
                                </div>

                                <div className="overflow-x-auto rounded-md border bg-white">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Leave type</TableHead>
                                        <TableHead className="text-right">Allocated</TableHead>
                                        <TableHead className="text-right">Used</TableHead>
                                        <TableHead className="text-right">Remaining</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {leaveTypesForDetails
                                        .filter((lt) => isApplicableLeaveTypeForEmployee(lt.name, employee.gender))
                                        .map((lt) => {
                                        const bal = balances.find((b) => b.leave_type_id === lt.id);
                                        const allocated = bal?.allocated_days ?? lt.days_allowed ?? 0;
                                        const used = bal?.used_days ?? 0;
                                        const remaining = bal?.remaining_days ?? Math.max(0, allocated - used);
                                        return (
                                          <TableRow key={lt.id}>
                                            <TableCell className="font-medium">{lt.name}</TableCell>
                                            <TableCell className="text-right">{allocated}</TableCell>
                                            <TableCell className="text-right">{used}</TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                <Badge
                                                  variant="outline"
                                                  className={
                                                    remaining > 0
                                                      ? 'bg-green-50 text-green-700 border-green-200'
                                                      : 'bg-red-50 text-red-700 border-red-200'
                                                  }
                                                >
                                                  {remaining}
                                                </Badge>
                                                {canEditBalances && bal?.id ? (
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 w-7 p-0"
                                                    onClick={() => router.get(route('leave.balances.edit', bal.id))}
                                                    aria-label="Edit leave balance"
                                                  >
                                                    <Edit className="h-4 w-4" />
                                                  </Button>
                                                ) : null}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No employees found for {selectedYear}.
                      {(search || branchId !== 'all') && (
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
        {employees.meta && employees.meta.last_page > 1 && (
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
                          year: selectedYear,
                          branch_id: branchId === 'all' ? '' : branchId,
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
                              year: selectedYear,
                              branch_id: branchId === 'all' ? '' : branchId,
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
                          year: selectedYear,
                          branch_id: branchId === 'all' ? '' : branchId,
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
