import React from 'react';
import { Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginationMeta {
    current_page: number;
    from: number;
    last_page: number;
    links: PaginationLinks[];
    path: string;
    per_page: number;
    to: number;
    total: number;
}

export interface PaginationProps {
    meta?: PaginationMeta;
    links?: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    perPage: string;
    onPerPageChange: (value: string) => void;
}

export function DataTablePagination({ meta, links, perPage, onPerPageChange }: PaginationProps) {
    if (!meta || !links) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 rounded-b-xl gap-4">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[13px] text-slate-500">
                    <span className="hidden sm:inline">Rows per page:</span>
                    <Select value={perPage} onValueChange={onPerPageChange}>
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
                        Showing <span className="font-semibold text-slate-700">{meta.total > 0 ? (meta.current_page - 1) * meta.per_page + 1 : 0}</span> to{' '}
                        <span className="font-semibold text-slate-700">
                            {Math.min(meta.current_page * meta.per_page, meta.total)}
                        </span>{' '}
                        of <span className="font-semibold text-slate-700">{meta.total}</span> entries
                    </p>
                </div>
            </div>

            {meta.last_page > 1 && (
                <div className="flex items-center justify-end">
                    <nav className="isolate inline-flex -space-x-px gap-1.5" aria-label="Pagination">
                        {meta.current_page > 1 && links?.prev && (
                            <Link
                                href={links.prev}
                                preserveState
                                className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 focus:z-20 transition-all duration-200 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
                            >
                                <span className="sr-only">Previous</span>
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        )}

                        {meta.links && meta.links.slice(1, -1).map((link, i) => {
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

                        {meta.current_page < meta.last_page && links?.next && (
                            <Link
                                href={links.next}
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
    );
}
