import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Edit, MoreHorizontal, Plus, Search, Trash2, MapPin, ChevronLeft, ChevronRight, Trash, User, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface ZoneLite {
  id: number;
  name: string;
  code: string;
}

interface RegionalOffice {
  id: number;
  zone_id: number;
  name: string;
  code: string;
  is_active: boolean;
  zone?: ZoneLite;
  regional_manager?: (EmployeeNameFields & {
    id: number;
    employee_id: string;
  }) | null;
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

interface RegionalOfficesResponse {
  data: RegionalOffice[];
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: PaginationMeta;
}

interface RegionalOfficeIndexProps {
  regionalOffices: RegionalOfficesResponse;
  zones: ZoneLite[];
  filters: { search?: string; zone_id?: string; per_page?: string };
}

export default function RegionalOfficeIndex({ regionalOffices, zones, filters }: RegionalOfficeIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [zoneId, setZoneId] = useState(filters.zone_id || '');
  const [perPage, setPerPage] = useState(filters.per_page || '10');
  const hasPagination = regionalOffices.meta && regionalOffices.links;

  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    router.get(
      route('regional-offices.index'),
      {
        search,
        ...(zoneId ? { zone_id: zoneId } : {}),
        per_page: value,
      },
      { preserveState: true }
    );
  };

  const apply = () => {
    router.get(
      route('regional-offices.index'),
      {
        search,
        ...(zoneId ? { zone_id: zoneId } : {}),
        per_page: perPage,
      },
      { preserveState: true }
    );
  };

  const reset = () => {
    setSearch('');
    setZoneId('');
    setPerPage('10');
    router.get(route('regional-offices.index'), { per_page: '10' }, { preserveState: true });
  };

  const del = (id: number) => {
    if (confirm('Are you sure you want to delete this regional office? This action cannot be undone.')) {
      router.delete(route('regional-offices.destroy', id));
    }
  };

  return (
    <Layout>
      <Head title="Regional Offices" />

      <PageSurface>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Regional Offices</h1>
            <p className="text-sm text-slate-500 mt-1">Manage regional offices under zones</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search regional offices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && apply()}
                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
              />
              {search && (
                <button
                  onClick={reset}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-48">
              <Select value={zoneId || 'all'} onValueChange={(v) => setZoneId(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 rounded-lg">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id.toString()}>
                      {z.name} ({z.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={apply} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">Apply</Button>
              <Link href={route('regional-offices.create')} className="w-full sm:w-auto">
                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Regional Office
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Name</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Code</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Zone</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Manager</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionalOffices.data.length > 0 ? (
                    regionalOffices.data.map((ro) => (
                      <TableRow key={ro.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                        <TableCell className="pl-6">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center mr-3 text-emerald-600">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-[13px] text-slate-800">
                              {ro.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[13px] text-slate-600 font-medium">{ro.code}</TableCell>
                        <TableCell className="text-[13px] text-slate-600">
                          {ro.zone ? <span className="font-medium text-slate-700">{ro.zone.name} ({ro.zone.code})</span> : <span className="text-slate-400 italic">—</span>}
                        </TableCell>
                        <TableCell>
                          {ro.regional_manager ? (
                            <div className="flex items-center text-[13px] text-slate-600 font-medium">
                              <User className="h-4 w-4 mr-1.5 text-slate-400" />
                              <span>
                                {employeeDisplayName(ro.regional_manager)} ({ro.regional_manager.employee_id})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-slate-400 italic">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ro.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-500 border-0 font-medium">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" 
                              title="Edit Regional Office"
                              onClick={() => router.get(route('regional-offices.edit', ro.id))}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                              title="Delete Regional Office"
                              onClick={() => del(ro.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">No regional offices found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {hasPagination && regionalOffices.meta && (
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
                  Showing <span className="font-semibold text-slate-700">{regionalOffices.meta.total > 0 ? (regionalOffices.meta.current_page - 1) * regionalOffices.meta.per_page + 1 : 0}</span> to{' '}
                  <span className="font-semibold text-slate-700">
                    {Math.min(regionalOffices.meta.current_page * regionalOffices.meta.per_page, regionalOffices.meta.total)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-700">{regionalOffices.meta.total}</span> entries
                </p>
              </div>
            </div>
            
            {regionalOffices.meta.last_page > 1 && (
              <div className="flex items-center justify-end">
                <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                  {regionalOffices.meta.current_page > 1 && regionalOffices.links?.prev && (
                    <Link
                      href={regionalOffices.links.prev}
                      preserveState
                      className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}

                  {regionalOffices.meta.links && regionalOffices.meta.links.slice(1, -1).map((link, i) => {
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

                  {regionalOffices.meta.current_page < regionalOffices.meta.last_page && regionalOffices.links?.next && (
                    <Link
                      href={regionalOffices.links.next}
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

