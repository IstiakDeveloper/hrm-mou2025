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
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Edit,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Trash,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';


interface Holiday {
  id: number;
  title: string;
  date: string;
  description: string | null;
  is_recurring: boolean;
  applicable_branches: string | null;
}

interface Branch {
  id: number;
  name: string;
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

interface HolidaysResponse {
  data: Holiday[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface HolidayIndexProps {
  holidays: HolidaysResponse;
  years: number[];
  year: number;
  filters: {
    year?: string;
    search?: string;
    per_page?: string;
  };
}

export default function HolidayIndex({ holidays, years, year, filters }: HolidayIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [selectedYear, setSelectedYear] = useState(filters.year || year.toString());
  const [perPage, setPerPage] = useState(filters.per_page || '10');
  const serialBase = (holidays.meta?.from ?? 1) - 1;

  const handleSearch = () => {
    router.get(route('holidays.index'), {
      search,
      year: selectedYear,
      per_page: perPage
    }, { preserveState: true });
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    router.get(route('holidays.index'), { search, year: selectedYear, per_page: value }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedYear(year.toString());
    setPerPage('10');
    router.get(route('holidays.index'), { year: year.toString(), per_page: '10' }, { preserveState: true });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this holiday? This action cannot be undone.')) {
      router.delete(route('holidays.destroy', id));
    }
  };

  // Check if pagination data exists
  const hasPagination = holidays.meta && holidays.meta.last_page > 1;

  return (
    <Layout>
      <Head title="Holidays" />

      <PageSurface>
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Holidays</h1>
            <p className="mt-1 text-sm text-slate-500">Manage company holidays and special events</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search holidays..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    router.get(route('holidays.index'), { search: '', year: selectedYear, per_page: perPage }, { preserveState: true });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-32">
              <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); router.get(route('holidays.index'), { search, year: val, per_page: perPage }, { preserveState: true }); }}>
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((yearOption) => (
                    <SelectItem key={yearOption} value={yearOption.toString()}>
                      {yearOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={handleSearch} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">Search</Button>
              <Link href={route('holidays.calendar')} className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto flex items-center">
                  <CalendarIcon className="mr-1 h-4 w-4" />
                  Calendar
                </Button>
              </Link>
              <Link href={route('holidays.create')} className="w-full sm:w-auto">
                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Holiday
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Holidays Table */}
        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6 w-16">SL</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Title</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Date</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Type</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Description</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.data.length > 0 ? (
                    holidays.data.map((holiday, idx) => (
                      <TableRow key={holiday.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                        <TableCell className="pl-6 text-[13px] text-slate-500 font-medium">
                          {serialBase + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center mr-3 text-emerald-600">
                              <CalendarIcon className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-[13px] text-slate-800">
                              {holiday.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px] text-slate-600 font-medium">
                          {format(new Date(holiday.date), 'MMMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {holiday.is_recurring ? (
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 font-medium text-[11px]">
                              Recurring
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 font-medium text-[11px]">
                              One-time
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-[13px] text-slate-600">
                          {holiday.description ? (
                            <span className="truncate">{holiday.description}</span>
                          ) : (
                            <span className="text-slate-400 italic">No description</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" 
                              title="Edit Holiday"
                              onClick={() => router.get(route('holidays.edit', holiday.id))}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                              title="Delete Holiday"
                              onClick={() => handleDelete(holiday.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <CalendarIcon className="h-8 w-8 mb-2 text-slate-400" />
                        <p>No holidays found for the selected criteria.</p>
                        {(search || selectedYear !== year.toString()) && (
                          <Button
                            variant="link"
                            onClick={resetFilters}
                            className="px-2 font-normal mt-2 text-emerald-600"
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {hasPagination && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl">
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
                  Showing <span className="font-semibold text-slate-700">{holidays.meta.total > 0 ? (holidays.meta.current_page - 1) * holidays.meta.per_page + 1 : 0}</span> to{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.min(holidays.meta.current_page * holidays.meta.per_page, holidays.meta.total)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-700">{holidays.meta.total}</span> entries
                </p>
              </div>
            </div>
            
            {holidays.meta.last_page > 1 && (
              <div className="flex items-center justify-end">
                <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                  {holidays.meta.current_page > 1 && holidays.links?.prev && (
                    <Link
                      href={holidays.links.prev}
                      preserveState
                      className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}

                  {holidays.meta.links && holidays.meta.links.slice(1, -1).map((link, i) => {
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

                  {holidays.meta.current_page < holidays.meta.last_page && holidays.links?.next && (
                    <Link
                      href={holidays.links.next}
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
