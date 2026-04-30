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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { Edit, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';

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
  regional_manager?: {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string | null;
  } | null;
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
  filters: { search?: string; zone_id?: string };
}

export default function RegionalOfficeIndex({ regionalOffices, zones, filters }: RegionalOfficeIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [zoneId, setZoneId] = useState(filters.zone_id || '');
  const hasPagination = regionalOffices.meta && regionalOffices.links;

  const apply = () => {
    router.get(
      route('regional-offices.index'),
      {
        search,
        ...(zoneId ? { zone_id: zoneId } : {}),
      },
      { preserveState: true }
    );
  };

  const reset = () => {
    setSearch('');
    setZoneId('');
    router.get(route('regional-offices.index'), {}, { preserveState: true });
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Regional Offices</h1>
            <p className="mt-1 text-gray-500">Manage regional offices under zones</p>
          </div>
          <Link href={route('regional-offices.create')}>
            <Button className="flex items-center">
              <Plus className="mr-1 h-4 w-4" />
              Add Regional Office
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter by name/code and zone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search regional offices..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && apply()}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-full md:w-72">
                <Select value={zoneId || 'all'} onValueChange={(v) => setZoneId(v === 'all' ? '' : v)}>
                  <SelectTrigger>
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

              <div className="flex space-x-2">
                <Button variant="outline" onClick={reset}>Reset</Button>
                <Button onClick={apply}>Apply</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regionalOffices.data.length > 0 ? (
                  regionalOffices.data.map((ro) => (
                    <TableRow key={ro.id}>
                      <TableCell className="font-medium">{ro.name}</TableCell>
                      <TableCell>{ro.code}</TableCell>
                      <TableCell>{ro.zone ? `${ro.zone.name} (${ro.zone.code})` : '—'}</TableCell>
                      <TableCell>
                        {ro.regional_manager ? (
                          <span>
                            {ro.regional_manager.first_name} {ro.regional_manager.last_name || ''} ({ro.regional_manager.employee_id})
                          </span>
                        ) : (
                          <span className="text-gray-500">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ro.is_active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-0">Inactive</Badge>
                        )}
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
                            <DropdownMenuItem onClick={() => router.get(route('regional-offices.edit', ro.id))} className="cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => del(ro.id)} className="cursor-pointer text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          </CardContent>
        </Card>

        {hasPagination && regionalOffices.meta && regionalOffices.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {regionalOffices.meta.current_page > 1 && regionalOffices.links?.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={regionalOffices.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (regionalOffices.links?.prev) router.get(regionalOffices.links.prev, { search, zone_id: zoneId }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {regionalOffices.meta.links && regionalOffices.meta.links.filter(l => !l.label.includes('&laquo;') && !l.label.includes('&raquo;')).map((link, i) => {
                  const isPageNumber = !isNaN(Number(link.label));
                  if (!isPageNumber && link.label === '...') {
                    return <PaginationItem key={i}><PaginationEllipsis /></PaginationItem>;
                  }
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href={link.url || '#'}
                        isActive={link.active}
                        onClick={(e) => {
                          e.preventDefault();
                          if (link.url) router.get(link.url, { search, zone_id: zoneId }, { preserveState: true });
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {regionalOffices.meta.current_page < regionalOffices.meta.last_page && regionalOffices.links?.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={regionalOffices.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (regionalOffices.links?.next) router.get(regionalOffices.links.next, { search, zone_id: zoneId }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </PageSurface>
    </Layout>
  );
}

