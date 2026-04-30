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

interface Zone {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  zone_manager?: {
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

interface ZonesResponse {
  data: Zone[];
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: PaginationMeta;
}

interface ZoneIndexProps {
  zones: ZonesResponse;
  filters: { search?: string };
}

export default function ZoneIndex({ zones, filters }: ZoneIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const hasPagination = zones.meta && zones.links;

  const handleSearch = () => {
    router.get(route('zones.index'), { search }, { preserveState: true });
  };

  const resetFilters = () => {
    setSearch('');
    router.get(route('zones.index'), {}, { preserveState: true });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this zone? This action cannot be undone.')) {
      router.delete(route('zones.destroy', id));
    }
  };

  return (
    <Layout>
      <Head title="Zones" />

      <PageSurface>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Zones</h1>
            <p className="mt-1 text-gray-500">Manage zones (Head Office → Zone → Regional Office → Branch)</p>
          </div>
          <Link href={route('zones.create')}>
            <Button className="flex items-center">
              <Plus className="mr-1 h-4 w-4" />
              Add Zone
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Search</CardTitle>
            <CardDescription>Find zones by name or code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search zones..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={resetFilters}>Reset</Button>
                <Button onClick={handleSearch}>Search</Button>
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
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.data.length > 0 ? (
                  zones.data.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell>{zone.code}</TableCell>
                      <TableCell>
                        {zone.zone_manager ? (
                          <span>
                            {zone.zone_manager.first_name} {zone.zone_manager.last_name || ''} ({zone.zone_manager.employee_id})
                          </span>
                        ) : (
                          <span className="text-gray-500">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {zone.is_active ? (
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
                            <DropdownMenuItem
                              onClick={() => router.get(route('zones.edit', zone.id))}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(zone.id)}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
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
                    <TableCell colSpan={5} className="h-24 text-center">
                      No zones found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {hasPagination && zones.meta && zones.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {zones.meta.current_page > 1 && zones.links?.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={zones.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (zones.links?.prev) router.get(zones.links.prev, { search }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {zones.meta.links && zones.meta.links.filter(l => !l.label.includes('&laquo;') && !l.label.includes('&raquo;')).map((link, i) => {
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
                          if (link.url) router.get(link.url, { search }, { preserveState: true });
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {zones.meta.current_page < zones.meta.last_page && zones.links?.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={zones.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (zones.links?.next) router.get(zones.links.next, { search }, { preserveState: true });
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

