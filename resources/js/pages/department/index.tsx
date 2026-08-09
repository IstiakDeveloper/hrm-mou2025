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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PageSurface } from '@/components/page-surface';
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
  User,
  ChevronLeft,
  ChevronRight,
  Trash,
  Network
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Employee extends EmployeeNameFields {
  id: number;
  employee_id: string;
}

interface Department {
  id: number;
  name: string;
  description: string | null;
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
  filters: {
    search: string;
    per_page?: string;
  };
}

export default function DepartmentIndex({ departments, filters }: DepartmentIndexProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [perPage, setPerPage] = useState(filters.per_page || '10');

  const handleSearch = () => {
    router.get(route('departments.index'), { search, per_page: perPage }, { preserveState: true });
  };

  const handlePerPageChange = (value: string) => {
    setPerPage(value);
    router.get(route('departments.index'), { search, per_page: value }, { preserveState: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setSearch('');
    setPerPage('10');
    router.get(route('departments.index'), { per_page: '10' }, { preserveState: true });
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

      <PageSurface>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-300 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Departments Directory</h1>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
              Manage your organization's departments and structural hierarchy
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search departments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 h-10 text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus-visible:ring-emerald-500 rounded-lg transition-all font-medium"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={handleSearch} size="sm" className="h-10 w-full sm:w-auto bg-slate-900 text-white font-bold hover:bg-slate-800">
                Search
              </Button>
              <Link href={route('departments.create')} className="w-full sm:w-auto">
                <Button size="sm" className="h-10 w-full sm:w-auto flex items-center bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Department
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Departments Table */}
        <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-200">
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Name</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Parent Department</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Department Head</TableHead>
                    <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {departments.data.length > 0 ? (
                  departments.data.map((department) => (
                    <TableRow key={department.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                      <TableCell className="pl-6">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center mr-3 text-emerald-600">
                            <Network className="h-4 w-4" />
                          </div>
                          <Link
                            href={route('departments.show', department.id)}
                            className="font-semibold text-[13px] text-slate-800 hover:text-emerald-600 transition-colors"
                          >
                            {department.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-slate-600">
                        {department.parentDepartment?.name ? (
                          <span className="font-medium text-slate-700">{department.parentDepartment.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {department.headEmployee ? (
                          <div className="flex items-center text-[13px] text-slate-600 font-medium">
                            <User className="h-4 w-4 mr-1.5 text-slate-400" />
                            <span>
                              {employeeDisplayName(department.headEmployee)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[13px] text-slate-400 italic">Not Assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" 
                            title="View Details"
                            onClick={() => router.get(route('departments.show', department.id))}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" 
                            title="Edit Department"
                            onClick={() => router.get(route('departments.edit', department.id))}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                            title="Delete Department"
                            onClick={() => handleDelete(department.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No departments found.
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
            
            {/* Pagination */}
            {hasPagination && departments.meta && (
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
                      Showing <span className="font-semibold text-slate-700">{departments.meta.total > 0 ? (departments.meta.current_page - 1) * departments.meta.per_page + 1 : 0}</span> to{' '}
                      <span className="font-semibold text-slate-700">
                        {Math.min(departments.meta.current_page * departments.meta.per_page, departments.meta.total)}
                      </span>{' '}
                      of <span className="font-semibold text-slate-700">{departments.meta.total}</span> entries
                    </p>
                  </div>
                </div>
                
                {departments.meta.last_page > 1 && (
                  <div className="flex items-center justify-end">
                    <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                      {departments.meta.current_page > 1 && departments.links?.prev && (
                        <Link
                          href={departments.links.prev}
                          preserveState
                          className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )}

                      {departments.meta.links && departments.meta.links.slice(1, -1).map((link, i) => {
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

                      {departments.meta.current_page < departments.meta.last_page && departments.links?.next && (
                        <Link
                          href={departments.links.next}
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
