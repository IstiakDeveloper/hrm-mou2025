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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PageSurface } from '@/components/page-surface';
  Check,
  Edit,
  Plus,
  Search,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeaveType {
  id: number;
  name: string;
  days_allowed: number;
  is_paid: boolean;
  description: string | null;
  carry_forward: boolean;
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

interface LeaveTypesResponse {
  data: LeaveType[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface LeaveTypesIndexProps {
  leaveTypes: LeaveTypesResponse;
  filters: {
    search: string;
    per_page?: string;
  };
}

export default function LeaveTypesIndex({ leaveTypes, filters }: LeaveTypesIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [perPage, setPerPage] = useState(filters.per_page || '10');

  const handleSearch = () => {
    router.get(route('leave.types.index'), {
      search,
      per_page: perPage
    }, { preserveState: true });
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    router.get(route('leave.types.index'), {
      search,
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
    setPerPage('10');
    router.get(route('leave.types.index'), { per_page: '10' }, { preserveState: true });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this leave type? This action cannot be undone.')) {
      router.delete(route('leave.types.destroy', id));
    }
  };

  return (
    <Layout>
      <Head title="Leave Types" />

            <PageSurface>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Types</h1>
            <p className="mt-1 text-gray-500">
              Manage leave types, accruals, and policies
            </p>
          </div>

          <div className="mt-4 md:mt-0">
            <Link href={route('leave.types.create')}>
              <Button className="flex items-center">
                <Plus className="mr-1 h-4 w-4" />
                Add Leave Type
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Filter */}
        <Card className="mb-6 shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardHeader className="pb-5 pt-6 px-6 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-800 tracking-wide">Filters</CardTitle>
            <CardDescription>Search for leave types by name</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search leave types..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={resetFilters} className="h-10 rounded-lg">
                  Reset
                </Button>
                <Button onClick={handleSearch} className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700">
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Types Table */}
        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Name</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Days Allowed</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Paid Leave</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Carry Forward</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Description</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.data && leaveTypes.data.length > 0 ? (
                    leaveTypes.data.map((leaveType) => (
                      <TableRow 
                        key={leaveType.id}
                        className="hover:bg-slate-50 transition-colors border-b border-slate-100 group"
                      >
                        <TableCell className="pl-6">
                          <div className="font-semibold text-[13px] text-slate-800">{leaveType.name}</div>
                        </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {leaveType.days_allowed} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {leaveType.is_paid ? (
                          <div className="flex items-center text-green-600">
                            <Check className="mr-1 h-4 w-4" />
                            <span>Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <X className="mr-1 h-4 w-4" />
                            <span>No</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {leaveType.carry_forward ? (
                          <div className="flex items-center text-green-600">
                            <Check className="mr-1 h-4 w-4" />
                            <span>Yes</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <X className="mr-1 h-4 w-4" />
                            <span>No</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {leaveType.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" 
                            title="Edit"
                            onClick={() => router.get(route('leave.types.edit', leaveType.id))}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                            title="Delete"
                            onClick={() => handleDelete(leaveType.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No leave types found.
                      {search && (
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
        {leaveTypes.meta && leaveTypes.meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span className="hidden sm:inline">Rows per page:</span>
                <Select
                  value={perPage}
                  onValueChange={handlePerPageChange}
                >
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
                  Showing <span className="font-semibold text-slate-700">{leaveTypes.meta.total > 0 ? (leaveTypes.meta.current_page - 1) * leaveTypes.meta.per_page + 1 : 0}</span> to{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.min(leaveTypes.meta.current_page * leaveTypes.meta.per_page, leaveTypes.meta.total)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-700">{leaveTypes.meta.total}</span> entries
                </p>
              </div>
            </div>

            {leaveTypes.meta.last_page > 1 && (
              <div className="flex items-center justify-end">
                <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                  {leaveTypes.meta.current_page > 1 && leaveTypes.links?.prev && (
                    <Link
                      href={leaveTypes.links.prev}
                      data={{ search, per_page: perPage }}
                      preserveState
                      className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}

                  {leaveTypes.meta.links && leaveTypes.meta.links.slice(1, -1).map((link, i) => {
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
                        data={{ search, per_page: perPage }}
                        preserveState
                        className={`relative inline-flex items-center justify-center w-8 h-8 text-[13px] font-semibold rounded-lg transition-all duration-200 shadow-sm ${isActive
                            ? 'z-10 bg-emerald-600 text-white shadow-sm border border-emerald-600'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 focus:z-20'
                          }`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    );
                  })}

                  {leaveTypes.meta.current_page < leaveTypes.meta.last_page && leaveTypes.links?.next && (
                    <Link
                      href={leaveTypes.links.next}
                      data={{ search, per_page: perPage }}
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
