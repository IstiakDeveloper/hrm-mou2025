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
}
