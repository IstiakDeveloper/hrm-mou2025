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
import { PageSurface } from '@/components/page-surface';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Plus,
  RefreshCcw,
  Search,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
    per_page?: string;
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
  const [perPage, setPerPage] = useState(filters.per_page || '15');

  const yearNumber = Number(selectedYear) || year;

  const leaveTypesForDetails = useMemo(() => leaveTypes || [], [leaveTypes]);

  const handleSearch = () => {
    router.get(route('leave.balances.index'), {
      search,
      year: selectedYear,
      branch_id: branchId === 'all' ? '' : branchId,
      per_page: perPage
    }, { preserveState: true });
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    router.get(route('leave.balances.index'), {
      search,
      year: selectedYear,
      branch_id: branchId === 'all' ? '' : branchId,
      per_page: value
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
    setPerPage('15');
    router.get(route('leave.balances.index'), { year: selectedYear, per_page: '15' }, { preserveState: true });
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    router.get(route('leave.balances.index'), {
      year,
      branch_id: branchId === 'all' ? '' : branchId,
      search,
      per_page: perPage
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

            <PageSurface>
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
        <Card className="mb-6 shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardHeader className="pb-5 pt-6 px-6 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800 tracking-wide">Filters</CardTitle>
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
          <CardContent className="p-6">
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
                <Button variant="outline" onClick={resetFilters} className="h-10 rounded-lg">
                  Reset
                </Button>
                <Button onClick={handleSearch} className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700">
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="w-10 pl-4" />
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Employee</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Branch</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Department</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Designation</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Total Used</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Total Remaining</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
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
                        <TableRow className={`hover:bg-slate-50 transition-colors ${expanded ? 'bg-slate-50 border-b-0' : 'border-b border-slate-100'} group`}>
                          <TableCell className="align-middle pl-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              onClick={() => toggleExpanded(employee.id)}
                              aria-label={expanded ? 'Collapse' : 'Expand'}
                            >
                              {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
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
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" 
                            title="Manage"
                            onClick={() => router.get(route('leave.balances.allocate-bulk'))}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                        {expanded ? (
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            <TableCell colSpan={8} className="p-0">
                              <div className="px-14 py-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <div className="text-sm font-semibold text-slate-800">
                                    Leave balances ({yearNumber})
                                  </div>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider">Leave type</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider text-right">Allocated</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider text-right">Used</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-10 uppercase text-[10px] tracking-wider text-right pr-4">Remaining</TableHead>
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
                                          <TableRow key={lt.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                                            <TableCell className="font-medium text-[13px]">{lt.name}</TableCell>
                                            <TableCell className="text-right font-mono text-[13px]">{allocated}</TableCell>
                                            <TableCell className="text-right font-mono text-[13px] text-orange-600">{used}</TableCell>
                                            <TableCell className="text-right pr-4">
                                              <div className="flex items-center justify-end gap-3">
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
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                                    onClick={() => router.get(route('leave.balances.edit', bal.id))}
                                                    aria-label="Edit leave balance"
                                                  >
                                                    <Edit className="h-3.5 w-3.5" />
                                                  </Button>
                                                ) : <div className="w-7"></div>}
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
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {employees.meta && employees.meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span className="hidden sm:inline">Rows per page:</span>
                <Select
                  value={perPage}
                  onValueChange={handlePerPageChange}
                >
                  <SelectTrigger className="h-8 w-[70px] text-[13px] bg-white border-slate-200">
                    <SelectValue placeholder="15" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden sm:block">
                <p className="text-[13px] text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{employees.meta.total > 0 ? (employees.meta.current_page - 1) * employees.meta.per_page + 1 : 0}</span> to{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.min(employees.meta.current_page * employees.meta.per_page, employees.meta.total)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-700">{employees.meta.total}</span> entries
                </p>
              </div>
            </div>

            {employees.meta.last_page > 1 && (
              <div className="flex items-center justify-end">
                <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                  {employees.meta.current_page > 1 && employees.links?.prev && (
                    <Link
                      href={employees.links.prev}
                      preserveState
                      className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}

                  {employees.meta.links && employees.meta.links.slice(1, -1).map((link, i) => {
                    const isActive = link.active;
                    const isDots = link.label === '...';

                    if (isDots) {
                      return (
                        <span key={i} className="relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-medium text-slate-400">
                          ...
                        </span>
                      );
                    }

                    return (
                      <Link
                        key={i}
                        href={link.url || '#'}
                        preserveState
                        className={`relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-semibold rounded-lg transition-all duration-200 shadow-sm ${isActive
                            ? 'z-10 bg-emerald-600 text-white shadow-sm border border-emerald-600'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 focus:z-20'
                          }`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    );
                  })}

                  {employees.meta.current_page < employees.meta.last_page && employees.links?.next && (
                    <Link
                      href={employees.links.next}
                      preserveState
                      className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
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
            </PageSurface>
    </Layout>
  );
}
