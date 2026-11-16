import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
<<<<<<< HEAD
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
=======
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
>>>>>>> feature/flutter-mobile-app
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
<<<<<<< HEAD
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
=======
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { PageSurface } from '@/components/page-surface';
import {
    Building,
    Edit,
    Eye,
    MapPin,
    Phone,
    Plus,
    Search,
    ChevronLeft,
    ChevronRight,
    Trash,
    X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Branch {
    id: number;
    name: string;
    address: string | null;
    contact_number: string | null;
    branch_code: string;
    is_head_office: boolean;
    geofence_latitude: number | null;
    geofence_longitude: number | null;
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
        per_page?: string;
    };
}

export default function BranchIndex({ branches, filters }: BranchIndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '10');

    const handleSearch = () => {
        router.get(route('branches.index'), { search, per_page: perPage }, { preserveState: true });
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(value);
        router.get(route('branches.index'), { search, per_page: value }, { preserveState: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const resetFilters = () => {
        setSearch('');
        setPerPage('10');
        router.get(route('branches.index'), { per_page: '10' }, { preserveState: true });
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

            <PageSurface>
                <Link
                    href={route('organization-structure.index')}
                    className="mb-4 inline-flex items-center text-sm text-slate-500 hover:text-emerald-700"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back to organization structure
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Branches</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage your organization's office locations
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search branches..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-9 h-9 text-sm bg-white border-slate-200 focus-visible:ring-emerald-500 rounded-lg transition-all"
                            />
                            {search && (
                                <button
                                    onClick={resetFilters}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={handleSearch} size="sm" className="h-9 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                                Search
                            </Button>
                            <Link href={route('branches.create')} className="w-full sm:w-auto">
                                <Button size="sm" className="h-9 w-full sm:w-auto flex items-center bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Branch
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Branches Table */}
                <Card className="shadow-sm border-slate-200 rounded-xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider pl-6">Branch Name</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Branch Code</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Address</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Contact</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Latitude</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider">Longitude</TableHead>
                                        <TableHead className="font-semibold text-slate-700 h-11 uppercase text-[11px] tracking-wider text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                            <TableBody>
                                {branches.data.length > 0 ? (
                                    branches.data.map((branch) => (
                                        <TableRow key={branch.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 group">
                                            <TableCell className="pl-6">
                                                <div className="flex items-center">
                                                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center mr-3 text-emerald-600">
                                                        <Building className="h-4 w-4" />
                                                    </div>
                                                    <Link
                                                        href={route('branches.show', branch.id)}
                                                        className="font-semibold text-[13px] text-slate-800 hover:text-emerald-600 transition-colors"
                                                    >
                                                        {branch.name}
                                                    </Link>
                                                    {branch.is_head_office && (
                                                        <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 font-medium">
                                                            Head Office
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-[13px] text-slate-600 font-medium">{branch.branch_code}</TableCell>
                                            <TableCell>
                                                {branch.address ? (
                                                    <div className="flex items-start text-[13px] text-slate-600 max-w-xs">
                                                        <MapPin className="mr-1.5 h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                                        <span className="truncate leading-relaxed">{branch.address}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[13px] text-slate-400 italic">Not specified</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {branch.contact_number ? (
                                                    <div className="flex items-center text-[13px] text-slate-600">
                                                        <Phone className="mr-1.5 h-4 w-4 text-slate-400" />
                                                        {branch.contact_number}
                                                    </div>
                                                ) : (
                                                    <span className="text-[13px] text-slate-400 italic">Not specified</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {branch.geofence_latitude !== null ? (
                                                    <span className="text-[13px] text-slate-600 font-medium">{branch.geofence_latitude}</span>
                                                ) : (
                                                    <span className="text-[13px] text-slate-400 italic">Not specified</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {branch.geofence_longitude !== null ? (
                                                    <span className="text-[13px] text-slate-600 font-medium">{branch.geofence_longitude}</span>
                                                ) : (
                                                    <span className="text-[13px] text-slate-400 italic">Not specified</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2 transition-opacity duration-200">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors" 
                                                        title="View Details"
                                                        onClick={() => router.get(route('branches.show', branch.id))}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors" 
                                                        title="Edit Branch"
                                                        onClick={() => router.get(route('branches.edit', branch.id))}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors" 
                                                        title="Delete Branch"
                                                        onClick={() => handleDelete(branch.id)}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
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
                        </div>
                        
                        {/* Pagination */}
                        {hasPagination && branches.meta && (
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
                                            Showing <span className="font-semibold text-slate-700">{branches.meta.total > 0 ? (branches.meta.current_page - 1) * branches.meta.per_page + 1 : 0}</span> to{' '}
                                            <span className="font-semibold text-slate-700">
                                                {Math.min(branches.meta.current_page * branches.meta.per_page, branches.meta.total)}
                                            </span>{' '}
                                            of <span className="font-semibold text-slate-700">{branches.meta.total}</span> entries
                                        </p>
                                    </div>
                                </div>
                                
                                {branches.meta.last_page > 1 && (
                                    <div className="flex items-center justify-end">
                                        <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                                            {branches.meta.current_page > 1 && branches.links?.prev && (
                                                <Link
                                                    href={branches.links.prev}
                                                    preserveState
                                                    className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                                                >
                                                    <span className="sr-only">Previous</span>
                                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                                </Link>
                                            )}

                                            {branches.meta.links && branches.meta.links.slice(1, -1).map((link, i) => {
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

                                            {branches.meta.current_page < branches.meta.last_page && branches.links?.next && (
                                                <Link
                                                    href={branches.links.next}
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
>>>>>>> feature/flutter-mobile-app
}
