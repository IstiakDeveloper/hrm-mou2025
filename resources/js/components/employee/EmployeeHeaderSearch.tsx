import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Building2, CornerDownLeft, Loader2, Phone, Search, User, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export type SearchEmployeeItem = {
    id: number;
    pin: string | null;
    employee_id: string | null;
    name_en: string | null;
    name_bn: string | null;
    display_name: string;
    mobile_personal: string | null;
    mobile_official: string | null;
    photo_url: string | null;
    status: 'active' | 'inactive' | 'on_leave' | 'terminated' | string;
    designation: string | null;
    department: string | null;
    branch: string | null;
    url: string;
};

interface EmployeeHeaderSearchProps {
    className?: string;
    placeholder?: string;
    onSelect?: (employee: SearchEmployeeItem) => void;
}

export function EmployeeHeaderSearch({
    className,
    placeholder = 'Search by PIN, name, or phone...',
    onSelect,
}: EmployeeHeaderSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchEmployeeItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Fetch search results with abort of previous requests
    const performSearch = useCallback(async (searchTerm: string) => {
        const trimmed = searchTerm.trim();
        if (!trimmed) {
            setResults([]);
            setLoading(false);
            setIsOpen(false);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        try {
            const res = await fetch(`/employees/global-search?q=${encodeURIComponent(trimmed)}&limit=10`, {
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!res.ok) {
                throw new Error('Search failed');
            }

            const data: SearchEmployeeItem[] = await res.json();
            setResults(data);
            setIsOpen(true);
            setSelectedIndex(data.length > 0 ? 0 : -1);
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                setResults([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search on query change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                performSearch(query);
            } else {
                setResults([]);
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        }, 220);

        return () => clearTimeout(timer);
    }, [query, performSearch]);

    // Handle outside clicks to close dropdown
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Global keyboard shortcut ('/' or 'Ctrl+K') to focus search box
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement;
            const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

            if ((e.key === '/' && !isInput) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Scroll active item into view
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const activeElem = listRef.current.children[selectedIndex] as HTMLElement;
            if (activeElem) {
                activeElem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const handleSelect = (emp: SearchEmployeeItem) => {
        setIsOpen(false);
        if (onSelect) {
            onSelect(emp);
        } else {
            router.visit(emp.url);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || results.length === 0) {
            if (e.key === 'ArrowDown' && results.length > 0) {
                setIsOpen(true);
                setSelectedIndex(0);
                e.preventDefault();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            } else if (results.length > 0) {
                handleSelect(results[0]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active':
                return (
                    <Badge variant="outline" className="border-emerald-200/80 bg-emerald-50/80 text-[10px] font-semibold text-emerald-700">
                        Active
                    </Badge>
                );
            case 'on_leave':
                return (
                    <Badge variant="outline" className="border-amber-200/80 bg-amber-50/80 text-[10px] font-semibold text-amber-700">
                        On Leave
                    </Badge>
                );
            case 'terminated':
                return (
                    <Badge variant="outline" className="border-rose-200/80 bg-rose-50/80 text-[10px] font-semibold text-rose-700">
                        Terminated
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="border-zinc-200 bg-zinc-50 text-[10px] font-semibold text-zinc-600 capitalize">
                        {status || 'Inactive'}
                    </Badge>
                );
        }
    };

    return (
        <div ref={containerRef} className={cn('relative w-full', className)}>
            <div className="group relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-400 transition-colors group-focus-within:text-emerald-600" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen && e.target.value.trim()) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (query.trim() && results.length > 0) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={cn(
                        'h-9 w-full rounded-lg border border-zinc-200/90 bg-zinc-50/70 pl-9 pr-14 text-xs font-medium text-zinc-900 shadow-2xs',
                        'placeholder:text-zinc-400 transition-all duration-200',
                        'hover:border-zinc-300 hover:bg-white',
                        'focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
                    )}
                />

                <div className="absolute right-2 flex items-center gap-1">
                    {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : query ? (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    ) : (
                        <kbd className="hidden select-none items-center gap-0.5 rounded border border-zinc-200 bg-zinc-100/80 px-1.5 py-0.5 font-mono text-[9px] font-medium text-zinc-400 sm:inline-flex">
                            /
                        </kbd>
                    )}
                </div>
            </div>

            {/* Results Popover Dropdown */}
            {isOpen && query.trim() !== '' && (
                <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-0 sm:top-full z-50 sm:mt-1.5 max-h-[75vh] sm:max-h-[420px] overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95">
                    <div className="border-b border-zinc-100 bg-zinc-50/80 px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Employee Match Results</span>
                        <span className="font-normal lowercase text-zinc-400">
                            {results.length} {results.length === 1 ? 'employee' : 'employees'} found
                        </span>
                    </div>

                    {results.length > 0 ? (
                        <>
                            <ul ref={listRef} className="max-h-[340px] overflow-y-auto divide-y divide-zinc-100/80 py-1">
                                {results.map((emp, idx) => {
                                    const isSelected = idx === selectedIndex;
                                    const pinVal = emp.pin || emp.employee_id;
                                    const isPinMatched = query.trim() && pinVal?.toLowerCase().includes(query.trim().toLowerCase());
                                    const isPhoneMatched =
                                        query.trim() &&
                                        ((emp.mobile_personal && emp.mobile_personal.includes(query.trim())) ||
                                            (emp.mobile_official && emp.mobile_official.includes(query.trim())));

                                    return (
                                        <li
                                            key={emp.id}
                                            onClick={() => handleSelect(emp)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={cn(
                                                'group flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-150',
                                                isSelected ? 'bg-emerald-50/70' : 'hover:bg-zinc-50',
                                            )}
                                        >
                                            {/* Avatar */}
                                            <div className="relative shrink-0">
                                                <Avatar className="h-9 w-9 rounded-lg border border-zinc-200/80 bg-zinc-100">
                                                    {emp.photo_url ? (
                                                        <AvatarImage src={emp.photo_url} alt={emp.display_name} className="object-cover" />
                                                    ) : null}
                                                    <AvatarFallback className="rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-800">
                                                        {emp.name_en ? emp.name_en.substring(0, 2).toUpperCase() : <User className="h-4 w-4" />}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span
                                                    className={cn(
                                                        'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white',
                                                        emp.status === 'active'
                                                            ? 'bg-emerald-500'
                                                            : emp.status === 'on_leave'
                                                              ? 'bg-amber-500'
                                                              : 'bg-zinc-400',
                                                    )}
                                                />
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="truncate text-xs font-bold text-zinc-900 group-hover:text-emerald-700">
                                                        {emp.name_en || emp.name_bn || 'Unnamed Employee'}
                                                    </span>
                                                    {emp.name_bn && emp.name_en && (
                                                        <span className="hidden truncate text-[10px] text-zinc-400 sm:inline">
                                                            ({emp.name_bn})
                                                        </span>
                                                    )}
                                                    {pinVal && (
                                                        <span
                                                            className={cn(
                                                                'ml-auto shrink-0 rounded px-1.5 py-0.2 font-mono text-[10px] font-bold tracking-tight',
                                                                isPinMatched
                                                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                                                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200',
                                                            )}
                                                            title="Employee PIN"
                                                        >
                                                            PIN: {pinVal}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                                                    {emp.designation && (
                                                        <span className="truncate font-medium text-zinc-700">{emp.designation}</span>
                                                    )}
                                                    {emp.department && (
                                                        <span className="truncate text-zinc-400">
                                                            {emp.designation ? '• ' : ''}
                                                            {emp.department}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[10px] text-zinc-400">
                                                    {emp.branch && (
                                                        <span className="flex items-center gap-1 truncate text-zinc-500">
                                                            <Building2 className="h-3 w-3 shrink-0 text-zinc-400" />
                                                            {emp.branch}
                                                        </span>
                                                    )}
                                                    {(emp.mobile_personal || emp.mobile_official) && (
                                                        <span
                                                            className={cn(
                                                                'flex items-center gap-1 truncate font-mono',
                                                                isPhoneMatched ? 'font-bold text-emerald-700' : 'text-zinc-500',
                                                            )}
                                                        >
                                                            <Phone className="h-2.5 w-2.5 shrink-0 text-zinc-400" />
                                                            {emp.mobile_personal || emp.mobile_official}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Badge & Enter icon */}
                                            <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                                                {getStatusBadge(emp.status)}
                                                {isSelected && (
                                                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                                                        <span>Open</span>
                                                        <CornerDownLeft className="h-2.5 w-2.5" />
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/90 px-3 py-1.5 text-[10px] text-zinc-400">
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1">
                                        <kbd className="rounded border border-zinc-200 bg-white px-1 py-0.2 font-mono text-[9px]">↑</kbd>
                                        <kbd className="rounded border border-zinc-200 bg-white px-1 py-0.2 font-mono text-[9px]">↓</kbd>
                                        <span>Navigate</span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="rounded border border-zinc-200 bg-white px-1 py-0.2 font-mono text-[9px]">↵</kbd>
                                        <span>Select</span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="rounded border border-zinc-200 bg-white px-1 py-0.2 font-mono text-[9px]">Esc</kbd>
                                        <span>Close</span>
                                    </span>
                                </div>
                                <span className="text-[9px] font-medium text-emerald-700">PIN matches appear first</span>
                            </div>
                        </>
                    ) : (
                        !loading && (
                            <div className="p-6 text-center text-xs text-zinc-500">
                                <p className="font-semibold text-zinc-700">No matching employee found</p>
                                <p className="mt-1 text-[11px] text-zinc-400">
                                    Try searching by PIN number, exact name, or 11-digit mobile number.
                                </p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
