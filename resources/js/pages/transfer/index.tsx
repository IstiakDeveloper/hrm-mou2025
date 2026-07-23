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
import { formatBranchSelectLabel, formatPayrollBranchLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PageSurface } from '@/components/page-surface';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  User,
  UserX,
  XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Employee extends EmployeeNameFields {
  id: number;
  employee_id: string;
  department: { id: number; name: string } | null;
  designation: { id: number; name: string } | null;
}

interface Department {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
  branch_code?: string;
}

interface Designation {
  id: number;
  name: string;
}

interface Transfer {
  id: number;
  employee_id: number;
  effective_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  employee: Employee;
  fromBranch: Branch;
  toBranch: Branch;
  fromDepartment: Department | null;
  toDepartment: Department | null;
  fromDesignation: Designation | null;
  toDesignation: Designation | null;
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
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: PaginationMeta;
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
    per_page?: string;
  };
  canApprove: boolean;
  canViewTransferReport: boolean;
}

export default function TransferIndex({
  transfers,
  departments,
  branches,
  employees,
  filters,
  canApprove,
  canViewTransferReport,
}: TransferIndexProps) {
  const [status, setStatus] = useState(filters.status || 'all');
  const [departmentId, setDepartmentId] = useState(filters.department_id || 'all');
  const [employeeId, setEmployeeId] = useState(filters.employee_id || 'all');
  const [fromBranchId, setFromBranchId] = useState(filters.from_branch_id || 'all');
  const [toBranchId, setToBranchId] = useState(filters.to_branch_id || 'all');
  const [fromDate, setFromDate] = useState(filters.from_date || '');
  const [toDate, setToDate] = useState(filters.to_date || '');
  const [search, setSearch] = useState(filters.search || '');
  const [perPage, setPerPage] = useState(filters.per_page || '10');

  const filterParams = () => ({
    status: status === 'all' ? '' : status,
    department_id: departmentId === 'all' ? '' : departmentId,
    employee_id: employeeId === 'all' ? '' : employeeId,
    from_branch_id: fromBranchId === 'all' ? '' : fromBranchId,
    to_branch_id: toBranchId === 'all' ? '' : toBranchId,
    from_date: fromDate,
    to_date: toDate,
    search,
    per_page: perPage,
  });

  const handleSearch = () => {
    router.get(route('transfers.index'), filterParams(), { preserveState: true });
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    router.get(route('transfers.index'), { ...filterParams(), per_page: value }, { preserveState: true });
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
    setFromDate('');
    setToDate('');
    setSearch('');
    setPerPage('10');
    router.get(route('transfers.index'), { per_page: '10' }, { preserveState: true });
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

  const hasActiveFilters =
    search ||
    status !== 'all' ||
    departmentId !== 'all' ||
    employeeId !== 'all' ||
    fromBranchId !== 'all' ||
    toBranchId !== 'all' ||
    fromDate ||
    toDate;

  const hasPagination = transfers.meta && transfers.links;

  return (
    <Layout>
      <Head title="Employee Transfers" />

      <PageSurface>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employee Transfers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage employee transfers between branches, departments, and designations
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {canViewTransferReport && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex items-center bg-white"
                onClick={() => router.visit(route('reports.transfer'))}
              >
                <FileText className="mr-1 h-4 w-4" />
                Register
              </Button>
            )}
            <Link href={route('transfers.create')}>
              <Button size="sm" className="h-9 flex items-center bg-emerald-600 hover:bg-emerald-700">
                <Plus className="mr-1 h-4 w-4" />
                New Transfer
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6 shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search by employee name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>

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
                      {employeeDisplayName(employee)} ({employee.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={fromBranchId} onValueChange={setFromBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="From Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {sortPayrollBranches(branches).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {formatBranchSelectLabel(branch)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={toBranchId} onValueChange={setToBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="To Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {sortPayrollBranches(branches).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {formatBranchSelectLabel(branch)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} title="From date" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} title="To date" />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetFilters} className="h-10 rounded-lg">
                Reset
              </Button>
              <Button onClick={handleSearch} className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700">
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Employee</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">From</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">To</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Effective Date</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.data.length > 0 ? (
                    transfers.data.map((transfer) => {
                      const fBranch = transfer.fromBranch ?? (transfer as any).from_branch;
                      const tBranch = transfer.toBranch ?? (transfer as any).to_branch;
                      const fDept = transfer.fromDepartment ?? (transfer as any).from_department;
                      const tDept = transfer.toDepartment ?? (transfer as any).to_department;
                      const fDesig = transfer.fromDesignation ?? (transfer as any).from_designation;
                      const tDesig = transfer.toDesignation ?? (transfer as any).to_designation;

                      const formatBranch = (b: { name?: string; branch_code?: string | null } | null | undefined) =>
                        b ? formatPayrollBranchLabel(b) : 'N/A';

                      return (
                        <TableRow key={transfer.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                          <TableCell className="pl-6">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <Link
                                  href={route('transfers.show', transfer.id)}
                                  className="font-semibold text-[13px] text-slate-800 hover:text-emerald-600 transition-colors"
                                >
                                  {employeeDisplayName(transfer.employee)}
                                </Link>
                                <div className="text-xs text-slate-500 font-mono">
                                  ID: {transfer.employee.employee_id}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-[13px] text-slate-700">
                              <div className="font-medium flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                {formatBranch(fBranch)}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {fDept?.name || 'Same Department'} • {fDesig?.name || 'Same Designation'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-[13px] text-slate-700">
                              <div className="font-medium flex items-center gap-1">
                                <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                                {formatBranch(tBranch)}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {tDept?.name || 'Same Department'} • {tDesig?.name || 'Same Designation'}
                              </div>
                            </div>
                          </TableCell>
                        <TableCell>
                          <span className="text-[13px] text-slate-600 font-medium">
                            {format(new Date(transfer.effective_date), 'dd MMM yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors"
                              title="View Details"
                              onClick={() => router.visit(route('transfers.show', transfer.id))}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {(transfer.status === 'pending' || transfer.status === 'approved') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                                  title="Edit"
                                  onClick={() => router.visit(route('transfers.edit', transfer.id))}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                                  title="Cancel"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to cancel this transfer request?')) {
                                      router.post(route('transfers.cancel', transfer.id));
                                    }
                                  }}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {canApprove && transfer.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                                  title="Approve"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to approve this transfer request?')) {
                                      router.post(route('transfers.approve', transfer.id));
                                    }
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                                  title="Reject"
                                  onClick={() => {
                                    const reason = prompt('Please provide a reason for rejection:');
                                    if (reason) {
                                      router.post(route('transfers.reject', transfer.id), { reason });
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {transfer.status === 'approved' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors"
                                title="Complete Transfer"
                                onClick={() => {
                                  if (confirm('Complete this transfer? This will update the employee records.')) {
                                    router.post(route('transfers.complete', transfer.id));
                                  }
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No transfer requests found.
                        {hasActiveFilters && (
                          <Button variant="link" onClick={resetFilters} className="px-2 font-normal">
                            Clear filters
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {hasPagination && transfers.meta && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[13px] text-slate-500">
                    <span className="hidden sm:inline">Rows per page:</span>
                    <Select value={perPage} onValueChange={handlePerPageChange}>
                      <SelectTrigger className="h-8 w-[70px] text-[13px] bg-white border-slate-200">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
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
                      Showing{' '}
                      <span className="font-semibold text-slate-700">
                        {transfers.meta.total > 0 ? (transfers.meta.current_page - 1) * transfers.meta.per_page + 1 : 0}
                      </span>{' '}
                      to{' '}
                      <span className="font-semibold text-slate-700">
                        {Math.min(transfers.meta.current_page * transfers.meta.per_page, transfers.meta.total)}
                      </span>{' '}
                      of <span className="font-semibold text-slate-700">{transfers.meta.total}</span> entries
                    </p>
                  </div>
                </div>

                {transfers.meta.last_page > 1 && (
                  <div className="flex items-center justify-end">
                    <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                      {transfers.meta.current_page > 1 && transfers.links?.prev && (
                        <Link
                          href={transfers.links.prev}
                          preserveState
                          className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )}

                      {transfers.meta.links?.slice(1, -1).map((link, i) => {
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
                            className={`relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-semibold rounded-lg transition-all duration-200 shadow-sm ${
                              isActive
                                ? 'z-10 bg-emerald-600 text-white shadow-sm border border-emerald-600'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 focus:z-20'
                            }`}
                            dangerouslySetInnerHTML={{ __html: link.label }}
                          />
                        );
                      })}

                      {transfers.meta.current_page < transfers.meta.last_page && transfers.links?.next && (
                        <Link
                          href={transfers.links.next}
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
          </CardContent>
        </Card>
      </PageSurface>
    </Layout>
  );
}
