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
  Building,
  Edit,
  Eye,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface Branch {
  id: number;
  name: string;
  address: string | null;
  contact_number: string | null;
  branch_code: string;
  is_head_office: boolean;
  headEmployee: Employee | null;
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

interface BranchesResponse {
  data: Branch[];
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: PaginationMeta;
}

interface BranchIndexProps {
  branches: BranchesResponse;
  filters: {
    search: string;
  };
}

export default function BranchIndex({ branches, filters }: BranchIndexProps) {
  const [search, setSearch] = useState(filters.search || '');

  const handleSearch = () => {
    router.get(route('branches.index'), { search }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    router.get(route('branches.index'), {}, { preserveState: true });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      router.delete(route('branches.destroy', id));
    }
  };

  // Check if pagination data exists
  const hasPagination = branches.meta && branches.links;

  return (
    <Layout>
      <Head title="Branches" />

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Branches</h1>
            <p className="mt-1 text-gray-500">
              Manage your organization's office locations
            </p>
          </div>
          <Link href={route('branches.create')}>
            <Button className="flex items-center">
              <Plus className="mr-1 h-4 w-4" />
              Add Branch
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Search</CardTitle>
            <CardDescription>Find branches by name or branch code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search branches..."
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

        {/* Branches Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Branch Code</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Branch Head</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.data.length > 0 ? (
                  branches.data.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Building className="mr-2 h-4 w-4 text-gray-500" />
                          <Link
                            href={route('branches.show', branch.id)}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {branch.name}
                          </Link>
                          {branch.is_head_office && (
                            <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                              Head Office
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{branch.branch_code}</TableCell>
                      <TableCell>
                        {branch.address ? (
                          <div className="flex items-center">
                            <MapPin className="mr-1 h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-xs">{branch.address}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {branch.contact_number ? (
                          <div className="flex items-center">
                            <Phone className="mr-1 h-4 w-4 text-gray-400" />
                            {branch.contact_number}
                          </div>
                        ) : (
                          <span className="text-gray-500">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {branch.headEmployee ? (
                          <div className="flex items-center">
                            <User className="mr-1 h-4 w-4 text-gray-400" />
                            <span>
                              {branch.headEmployee.first_name} {branch.headEmployee.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Not assigned</span>
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
                              onClick={() => router.get(route('branches.show', branch.id))}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.get(route('branches.edit', branch.id))}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(branch.id)}
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
                      No branches found.
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

        {/* Pagination - Only render if pagination data exists */}
        {hasPagination && branches.meta && branches.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {branches.meta.current_page > 1 && branches.links?.prev && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={branches.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (branches.links?.prev) {
                          router.get(branches.links.prev, { search }, { preserveState: true });
                        }
                      }}
                    />
                  </PaginationItem>
                )}

                {branches.meta.links && branches.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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

                {branches.meta.current_page < branches.meta.last_page && branches.links?.next && (
                  <PaginationItem>
                    <PaginationNext
                      href={branches.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        if (branches.links?.next) {
                          router.get(branches.links.next, { search }, { preserveState: true });
                        }
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
