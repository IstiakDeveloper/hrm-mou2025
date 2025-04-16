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
  Building,
  ChevronDown,
  Download,
  Edit,
  Eye,
  MoreHorizontal,
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
}

interface Department {
  id: number;
  name: string;
  description: string | null;
  branch: Branch;
  parentDepartment: Department | null;
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

interface DepartmentsResponse {
  data: Department[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
}

interface DepartmentIndexProps {
  departments: DepartmentsResponse;
  branches: Branch[];
  filters: {
    search: string;
    branch_id: string;
  };
}

export default function DepartmentIndex({ departments, branches, filters }: DepartmentIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [branchId, setBranchId] = useState(filters.branch_id || '');

  const handleSearch = () => {
    router.get(route('departments.index'), { search, branch_id: branchId }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    setBranchId('');
    router.get(route('departments.index'), {}, { preserveState: true });
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      router.delete(route('departments.destroy', id));
    }
  };
// Check if pagination data exists
const hasPagination = departments.meta && departments.links;

  return (
    <Layout>
      <Head title="Departments" />

      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
            <p className="mt-1 text-gray-500">
              Manage your organization's departments
            </p>
          </div>
          <Link href={route('departments.create')}>
            <Button className="flex items-center">
              <Plus className="mr-1 h-4 w-4" />
              Add Department
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter departments by name or branch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Search departments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-full md:w-64">
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
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

        {/* Departments Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Parent Department</TableHead>
                  <TableHead>Department Head</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.data.length > 0 ? (
                  departments.data.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={route('departments.show', department.id)}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {department.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {department.branch?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {department.parentDepartment?.name || 'None'}
                      </TableCell>
                      <TableCell>
                        {department.headEmployee ? (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-gray-500" />
                            <span>
                              {department.headEmployee.first_name} {department.headEmployee.last_name}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-0">
                            Not Assigned
                          </Badge>
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
                              onClick={() => router.get(route('departments.show', department.id))}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.get(route('departments.edit', department.id))}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(department.id)}
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
                      No departments found.
                      {(search || branchId) && (
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
        {hasPagination && departments.meta.last_page > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                {departments.meta.current_page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={departments.links.prev || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(departments.links.prev || '', { search, branch_id: branchId }, { preserveState: true });
                      }}
                    />
                  </PaginationItem>
                )}

                {departments.meta.links.filter(link => !link.label.includes('&laquo;') && !link.label.includes('&raquo;')).map((link, i) => {
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
                            router.get(link.url, { search, branch_id: branchId }, { preserveState: true });
                          }
                        }}
                      >
                        {link.label}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {departments.meta.current_page < departments.meta.last_page && (
                  <PaginationItem>
                    <PaginationNext
                      href={departments.links.next || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        router.get(departments.links.next || '', { search, branch_id: branchId }, { preserveState: true });
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
