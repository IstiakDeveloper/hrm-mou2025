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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  Check,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X
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
  };
}

export default function LeaveTypesIndex({ leaveTypes, filters }: LeaveTypesIndexProps) {
  const [search, setSearch] = useState(filters.search || '');

  const handleSearch = () => {
    router.get(route('leave.types.index'), {
      search
    }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    router.get(route('leave.types.index'));
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this leave type? This action cannot be undone.')) {
      router.delete(route('leave.types.destroy', id));
    }
  };

  return (
    <Layout>
      <Head title="Leave Types" />

      <div className="container mx-auto py-8">
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
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search for leave types by name</CardDescription>
          </CardHeader>
          <CardContent>
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
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
                <Button onClick={handleSearch}>
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Types Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Days Allowed</TableHead>
                  <TableHead>Paid Leave</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.data && leaveTypes.data.length > 0 ? (
                  leaveTypes.data.map((leaveType) => (
                    <TableRow key={leaveType.id}>
                      <TableCell>
                        <div className="font-medium">{leaveType.name}</div>
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
                              onClick={() => router.get(route('leave.types.edit', leaveType.id))}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(leaveType.id)}
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
          </CardContent>
        </Card>

        {/* Pagination */}
        {leaveTypes.meta && leaveTypes.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {leaveTypes.meta.current_page > 1 && leaveTypes.links.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={leaveTypes.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(leaveTypes.links.prev || '', { search }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {leaveTypes.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                            router.get(link.url, { search }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {leaveTypes.meta.current_page < leaveTypes.meta.last_page && leaveTypes.links.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={leaveTypes.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(leaveTypes.links.next || '', { search }, { preserveState: true });
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
