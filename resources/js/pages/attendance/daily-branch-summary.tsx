import React, { Fragment, useMemo, useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    ArrowDownAZ, 
    ArrowLeft, 
    ArrowUpAZ, 
    Building2, 
    ChevronDown, 
    Search, 
    Users,
    Grid,
    List,
    TrendingUp,
    MapPin,
    Calendar,
    Clock,
    UserCheck,
    UserX,
    CalendarDays,
    AlertTriangle,
    SlidersHorizontal,
    Info,
    ChevronRight,
    Sparkles,
    RefreshCw,
    Printer
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type Status =
    | 'present'
    | 'late'
    | 'half_day'
    | 'absent'
    | 'leave'
    | 'on_duty'
    | 'holiday'
    | 'weekend';

interface Branch {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

interface EmployeeRow {
    id: number;
    employee_id: string;
    name: string;
    department: string | null;
    designation: string | null;
    status: Status;
    check_in: string | null;
    check_out: string | null;
    leave_type: string | null;
}

interface BranchSummary {
    id: number;
    name: string;
    counts: Record<Status, number>;
    employeesByStatus: Record<Status, EmployeeRow[]>;
}

interface Props {
    date: string;
    readableDate: string;
    branchesSummary: BranchSummary[];
    branches: Branch[];
    departments: Department[];
    statuses: Status[];
    filters: {
        date?: string;
        branch_id?: string;
        department_id?: string;
        search?: string;
    };
}

function statusLabel(s: Status) {
    switch (s) {
        case 'present': return 'Present';
        case 'late': return 'Late';
        case 'half_day': return 'Half Day';
        case 'absent': return 'Absent';
        case 'leave': return 'Leave';
        case 'on_duty': return 'On Duty';
        case 'holiday': return 'Holiday';
        case 'weekend': return 'Weekend';
        default: return s;
    }
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function pct(part: number, total: number) {
    if (!total || total <= 0) return 0;
    return (part / total) * 100;
}

function formatPct(n: number) {
    if (Number.isNaN(n) || !Number.isFinite(n)) return '0%';
    return `${Math.round(n)}%`;
}

function scoreColor(score: number) {
    if (score < 0.75) return 'bg-rose-500';
    if (score < 0.9) return 'bg-amber-500';
    return 'bg-emerald-500';
}

function scoreRingClass(score: number) {
    if (score < 0.75) return 'ring-rose-200';
    if (score < 0.9) return 'ring-amber-200';
    return 'ring-emerald-200';
}

function scoreTextClass(score: number) {
    if (score < 0.75) return 'text-rose-600';
    if (score < 0.9) return 'text-amber-600';
    return 'text-emerald-600';
}

function scoreBgClass(score: number) {
    if (score < 0.75) return 'bg-rose-50 border-rose-200 text-rose-700';
    if (score < 0.9) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
}

function MiniStackBar({
    segments,
    ariaLabel,
}: {
    segments: Array<{ key: string; label: string; value: number; className: string }>;
    ariaLabel: string;
}) {
    const total = segments.reduce((a, s) => a + (s.value ?? 0), 0);
    return (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={ariaLabel}>
            {segments.map((s) => {
                const w = total > 0 ? (s.value / total) * 100 : 0;
                if (w <= 0) return null;
                return <div key={s.key} className={cn('h-full transition-all duration-300', s.className)} style={{ width: `${w}%` }} title={`${s.label}: ${s.value}`} />;
            })}
        </div>
    );
}

export default function DailyBranchSummary({
    date,
    readableDate,
    branchesSummary,
    branches,
    departments,
    statuses,
    filters,
}: Props) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => (date ? parseISO(date) : new Date()));
    const [branch, setBranch] = useState(filters.branch_id || 'all');
    const [department, setDepartment] = useState(filters.department_id || 'all');
    const [search, setSearch] = useState(filters.search || '');
    const [sortMode, setSortMode] = useState<'attention' | 'name_asc' | 'name_desc'>('attention');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<Status>('absent');
    const [localSearch, setLocalSearch] = useState('');

    const totals = useMemo(() => {
        const base: Record<Status, number> = {
            present: 0,
            late: 0,
            half_day: 0,
            absent: 0,
            leave: 0,
            on_duty: 0,
            holiday: 0,
            weekend: 0,
        };
        for (const b of branchesSummary) {
            for (const s of statuses) {
                base[s] += b.counts?.[s] ?? 0;
            }
        }
        return base;
    }, [branchesSummary, statuses]);

    const derived = useMemo(() => {
        return branchesSummary.map((b) => {
            const c = b.counts ?? ({} as Record<Status, number>);
            const present = (c.present ?? 0) + (c.late ?? 0) + (c.half_day ?? 0) + (c.on_duty ?? 0);
            const absent = c.absent ?? 0;
            const leave = c.leave ?? 0;
            const other = (c.holiday ?? 0) + (c.weekend ?? 0);
            const total = statuses.reduce((a, s) => a + (c[s] ?? 0), 0);
            const workingTotal = clamp(total - other, 0, total);
            const presentRate = workingTotal > 0 ? present / workingTotal : 1;
            const attention = (1 - presentRate) * 1000 + absent * 2 + leave * 0.5;

            return { branch: b, present, absent, leave, total, workingTotal, presentRate, attention };
        });
    }, [branchesSummary, statuses]);

    const sorted = useMemo(() => {
        const rows = [...derived];
        if (sortMode === 'name_asc') {
            rows.sort((a, b) => a.branch.name.localeCompare(b.branch.name));
            return rows;
        }
        if (sortMode === 'name_desc') {
            rows.sort((a, b) => b.branch.name.localeCompare(a.branch.name));
            return rows;
        }

        // Default: "attention-first"
        rows.sort((a, b) => {
            if (a.attention !== b.attention) return b.attention - a.attention;
            if (a.presentRate !== b.presentRate) return a.presentRate - b.presentRate;
            if (a.absent !== b.absent) return b.absent - a.absent;
            return a.branch.name.localeCompare(b.branch.name);
        });
        return rows;
    }, [derived, sortMode]);

    // Track active branch and handle default selection
    const activeBranch = useMemo(() => {
        if (selectedBranchId !== null) {
            const found = sorted.find((r) => r.branch.id === selectedBranchId);
            if (found) return found;
        }
        return sorted[0] || null;
    }, [sorted, selectedBranchId]);

    // Handle auto selecting the first branch and updating initial status
    useEffect(() => {
        if (sorted.length > 0) {
            const exists = sorted.some((r) => r.branch.id === selectedBranchId);
            if (!exists) {
                setSelectedBranchId(sorted[0].branch.id);
            }
        } else {
            setSelectedBranchId(null);
        }
    }, [sorted, selectedBranchId]);

    // Smart default selection of status tab on branch change
    useEffect(() => {
        if (activeBranch) {
            const counts = activeBranch.branch.counts || ({} as Record<Status, number>);
            if ((counts.absent ?? 0) > 0) {
                setSelectedStatus('absent');
            } else if ((counts.late ?? 0) > 0) {
                setSelectedStatus('late');
            } else if ((counts.present ?? 0) > 0) {
                setSelectedStatus('present');
            } else {
                const primaryTabs: Status[] = ['present', 'absent', 'leave', 'late', 'half_day', 'on_duty', 'holiday', 'weekend'];
                const firstWithCount = primaryTabs.find((s) => (counts[s] ?? 0) > 0);
                setSelectedStatus(firstWithCount || 'present');
            }
            setLocalSearch(''); // Reset local search on branch change
        }
    }, [activeBranch?.branch.id]);

    const applyFilters = () => {
        router.get(
            route('attendance.daily-branch-summary'),
            {
                date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
                branch_id: branch !== 'all' ? branch : '',
                department_id: department !== 'all' ? department : '',
                search: search || '',
            },
            { preserveState: true },
        );
    };

    const resetFilters = () => {
        setBranch('all');
        setDepartment('all');
        setSearch('');
        router.get(
            route('attendance.daily-branch-summary'),
            { date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '' },
            { preserveState: true },
        );
    };

    // Calculate overall stats for the ribbon
    const overallWorkingTotal = useMemo(() => derived.reduce((sum, r) => sum + r.workingTotal, 0), [derived]);
    const overallPresentCount = useMemo(() => derived.reduce((sum, r) => sum + r.present, 0), [derived]);
    const overallAbsentCount = useMemo(() => derived.reduce((sum, r) => sum + r.absent, 0), [derived]);
    const overallLeaveCount = useMemo(() => derived.reduce((sum, r) => sum + r.leave, 0), [derived]);
    const overallAttendancePct = overallWorkingTotal > 0 ? (overallPresentCount / overallWorkingTotal) * 100 : 0;

    // Filter local employee search within active branch
    const filteredEmployees = useMemo(() => {
        if (!activeBranch) return [];
        const list = activeBranch.branch.employeesByStatus?.[selectedStatus] ?? [];
        if (!localSearch.trim()) return list;
        const query = localSearch.toLowerCase().trim();
        return list.filter((r) => 
            r.name.toLowerCase().includes(query) || 
            r.employee_id.toLowerCase().includes(query) ||
            (r.department && r.department.toLowerCase().includes(query)) ||
            (r.designation && r.designation.toLowerCase().includes(query))
        );
    }, [activeBranch, selectedStatus, localSearch]);

    return (
        <Layout>
            <Head title="Daily Branch Attendance Summary" />

            <div className="container mx-auto py-5 px-4 max-w-7xl animate-in fade-in duration-300 print:hidden">
                {/* Back Link */}
                <div className="mb-4">
                    <Link
                        href={route('attendance.index')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                        <span>Back to Daily Attendance</span>
                    </Link>
                </div>

                {/* Header Title Area */}
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-5">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-emerald-600" />
                            Daily Branch Summary
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Real-time attendance health across <span className="font-semibold text-slate-700">{branchesSummary.length} branches</span> for <span className="font-semibold text-emerald-600 underline decoration-dotted">{readableDate}</span>
                        </p>
                    </div>

                    {/* Quick Legend Badges & Print Summary */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            onClick={() => window.print()}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-8.5 px-3 inline-flex items-center gap-1.5 shadow-sm rounded-lg transition-all duration-200"
                        >
                            <Printer className="h-3.5 w-3.5" /> Print Summary
                        </Button>

                        <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg select-none">
                            <span className="font-medium text-slate-550 mr-1 text-[10px] uppercase tracking-wider">Legend:</span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Healthy (90%+)
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <span className="h-2 w-2 rounded-full bg-amber-500" /> Watch (75-90%)
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical (&lt;75%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Overall Summary Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
                    {/* Attendance Health Card */}
                    <div className="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-100 p-3.5 rounded-xl shadow-xs relative overflow-hidden group">
                        <div className="absolute right-3 top-3 bg-emerald-100 text-emerald-700 p-1.5 rounded-lg">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Avg Attendance</span>
                        <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                            {formatPct(overallAttendancePct)}
                        </div>
                        <div className="mt-2 w-full bg-emerald-100/50 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${overallAttendancePct}%` }} />
                        </div>
                    </div>

                    {/* Present strength Card */}
                    <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-xs relative overflow-hidden">
                        <div className="absolute right-3 top-3 bg-slate-100 text-slate-600 p-1.5 rounded-lg">
                            <UserCheck className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Present</span>
                        <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                            {overallPresentCount}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">Out of {overallWorkingTotal} scheduled staff</p>
                    </div>

                    {/* Absent Count Card */}
                    <div className={cn(
                        "border p-3.5 rounded-xl shadow-xs relative overflow-hidden transition-all duration-300",
                        overallAbsentCount > 0 
                            ? "bg-gradient-to-br from-rose-50/30 to-white border-rose-100" 
                            : "bg-white border-slate-200/80"
                    )}>
                        <div className={cn("absolute right-3 top-3 p-1.5 rounded-lg", overallAbsentCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>
                            <UserX className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Absences</span>
                        <div className={cn("text-2xl font-black tracking-tight mt-1", overallAbsentCount > 0 ? "text-rose-600" : "text-slate-900")}>
                            {overallAbsentCount}
                        </div>
                        <p className="text-[10px] mt-2 font-semibold">
                            {overallAbsentCount > 0 
                                ? "🚨 Attention suggested" 
                                : "✅ Schedule compliance OK"}
                        </p>
                    </div>

                    {/* Leaves & Duty Card */}
                    <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl shadow-xs relative overflow-hidden">
                        <div className="absolute right-3 top-3 bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                            <CalendarDays className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Leaves & Duty</span>
                        <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
                            {overallLeaveCount} <span className="text-xs text-slate-400 font-medium">Leave</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">
                            {derived.reduce((sum, r) => sum + (r.branch.counts?.on_duty ?? 0), 0)} on duty today
                        </p>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 mb-5 shadow-xs">
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-12 md:items-end">
                        {/* Date field */}
                        <div className="md:col-span-2">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Date</label>
                            <div className="mt-1">
                                <DatePicker selected={selectedDate} onSelect={setSelectedDate} />
                            </div>
                        </div>

                        {/* Branch Selector */}
                        <div className="md:col-span-3">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Filter Branch</label>
                            <div className="mt-1">
                                <Select value={branch} onValueChange={setBranch}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All branches" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Branches</SelectItem>
                                        {branches.map((b) => (
                                            <SelectItem key={b.id} value={b.id.toString()}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Department Selector */}
                        <div className="md:col-span-3">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Filter Dept</label>
                            <div className="mt-1">
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="All departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departments.map((d) => (
                                            <SelectItem key={d.id} value={d.id.toString()}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="md:col-span-3">
                            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Search Staff</label>
                            <div className="mt-1 relative">
                                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Name or Employee ID"
                                    className="h-9 pl-8 text-xs"
                                />
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="md:col-span-1 flex gap-1.5 justify-end">
                            <Button variant="outline" onClick={resetFilters} className="h-9 text-xs font-semibold px-2 flex-1">
                                Reset
                            </Button>
                            <Button onClick={applyFilters} className="h-9 text-xs font-bold px-2.5 flex-1 bg-emerald-600 hover:bg-emerald-700">
                                Apply
                            </Button>
                        </div>
                    </div>

                    {/* Sorting & Layout View Controls */}
                    <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-3 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Sorting:</span>
                            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setSortMode('attention')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                                        sortMode === 'attention'
                                            ? "bg-white text-slate-800 shadow-xs"
                                            : "text-slate-500 hover:text-slate-900"
                                    )}
                                    title="Prioritize branches needing attention"
                                >
                                    Needing Attention
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortMode('name_asc')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-all",
                                        sortMode === 'name_asc'
                                            ? "bg-white text-slate-800 shadow-xs"
                                            : "text-slate-500 hover:text-slate-900"
                                    )}
                                >
                                    <ArrowDownAZ className="h-3 w-3" /> A-Z
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSortMode('name_desc')}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-all",
                                        sortMode === 'name_desc'
                                            ? "bg-white text-slate-800 shadow-xs"
                                            : "text-slate-500 hover:text-slate-900"
                                    )}
                                >
                                    <ArrowUpAZ className="h-3 w-3" /> Z-A
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Layout Switcher (Heatmap vs Table) */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Layout:</span>
                                <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        className={cn(
                                            "p-1 rounded-md transition-all",
                                            viewMode === 'grid' ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-900"
                                        )}
                                        title="Status Heatmap Grid"
                                    >
                                        <Grid className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('table')}
                                        className={cn(
                                            "p-1 rounded-md transition-all",
                                            viewMode === 'table' ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-900"
                                        )}
                                        title="Dense Grid List"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Split Panel Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    
                    {/* Left Pane: Branches List / Visual Heatmap */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
                        {sorted.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-xl py-14 text-center text-sm text-slate-400 shadow-xs">
                                <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                No branch summaries found for the active filters.
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* Visual Heatmap Board Layout */
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[70vh] overflow-y-auto pr-1">
                                {sorted.map((row) => {
                                    const b = row.branch;
                                    const isActive = activeBranch?.branch.id === b.id;
                                    const presentPct = pct(row.present, row.workingTotal);
                                    const healthAccentBg = scoreColor(row.presentRate);
                                    const cardBorderColor = isActive 
                                        ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm" 
                                        : "border-slate-200/80 hover:border-slate-350 hover:shadow-xs";
                                        
                                    return (
                                        <div
                                            key={b.id}
                                            onClick={() => setSelectedBranchId(b.id)}
                                            className={cn(
                                                "relative flex flex-col justify-between p-3 rounded-xl border cursor-pointer bg-white transition-all duration-200 select-none",
                                                cardBorderColor
                                            )}
                                        >
                                            {/* Status accent border line on the left side */}
                                            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl", healthAccentBg)} />
                                            
                                            <div className="pl-1">
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <span className="text-xs font-bold text-slate-800 truncate block leading-tight max-w-[70%]" title={b.name}>
                                                        {b.name}
                                                    </span>
                                                    <span className={cn("text-xs font-black tabular-nums leading-none shrink-0", scoreTextClass(row.presentRate))}>
                                                        {formatPct(presentPct)}
                                                    </span>
                                                </div>

                                                {/* Mini Stack bar sparkline */}
                                                <div className="mt-2.5">
                                                    <MiniStackBar
                                                        ariaLabel={`${b.name} Present / Absent / Leave`}
                                                        segments={[
                                                            { key: 'present', label: 'Present', value: row.present, className: 'bg-emerald-500' },
                                                            { key: 'absent', label: 'Absent', value: row.absent, className: 'bg-rose-500' },
                                                            { key: 'leave', label: 'Leave', value: row.leave, className: 'bg-blue-500' },
                                                        ]}
                                                    />
                                                </div>

                                                {/* Mini Stats row */}
                                                <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-slate-500 tabular-nums">
                                                    <span>P: <strong className="text-emerald-600">{row.present}</strong></span>
                                                    <span>A: <strong className="text-rose-600">{row.absent}</strong></span>
                                                    <span>L: <strong className="text-blue-500">{row.leave}</strong></span>
                                                    <span className="text-slate-400 font-normal">Tot: {row.workingTotal}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Dense Table View */
                            <div className="max-h-[70vh] overflow-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-white">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[30px] px-3.5 py-2.5 text-[10px] uppercase font-bold text-slate-400"></TableHead>
                                            <TableHead className="px-3.5 py-2.5 text-[10px] uppercase font-bold text-slate-400">Branch Location</TableHead>
                                            <TableHead className="w-[70px] text-right px-3.5 py-2.5 text-[10px] uppercase font-bold text-slate-400">Staff</TableHead>
                                            <TableHead className="w-[90px] text-right px-3.5 py-2.5 text-[10px] uppercase font-bold text-slate-400">Present %</TableHead>
                                            <TableHead className="w-[120px] px-3.5 py-2.5 text-[10px] uppercase font-bold text-slate-400">Visual Breakdown</TableHead>
                                            <TableHead className="w-[60px] text-right px-3.5 py-2.5 text-[10px] uppercase font-bold text-slate-400">Absent</TableHead>
                                            <TableHead className="w-[60px] text-right px-3.5 py-2.5 text-[10px] uppercase font-bold text-slate-400">Leave</TableHead>
                                            <TableHead className="w-[40px] px-3.5 py-2.5 text-[10px] uppercase font-bold text-slate-400"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sorted.map((row) => {
                                            const b = row.branch;
                                            const isActive = activeBranch?.branch.id === b.id;
                                            const presentPct = pct(row.present, row.workingTotal);
                                            const indicatorColor = scoreColor(row.presentRate);

                                            return (
                                                <TableRow
                                                    key={b.id}
                                                    onClick={() => setSelectedBranchId(b.id)}
                                                    className={cn(
                                                        "group cursor-pointer transition-colors border-b last:border-0 hover:bg-slate-50/50",
                                                        isActive ? "bg-emerald-50/10 hover:bg-emerald-50/20" : ""
                                                    )}
                                                >
                                                    <TableCell className="px-3.5 py-2 align-middle">
                                                        <div className={cn('h-2 w-2 rounded-full ring-2', indicatorColor, scoreRingClass(row.presentRate))} />
                                                    </TableCell>
                                                    
                                                    <TableCell className="px-3.5 py-2 align-middle">
                                                        <div className="font-bold text-xs text-slate-800 leading-tight">
                                                            {b.name}
                                                        </div>
                                                        {((b.counts?.holiday ?? 0) > 0 || (b.counts?.weekend ?? 0) > 0) && (
                                                            <div className="mt-0.5 flex gap-1">
                                                                {(b.counts.holiday ?? 0) > 0 && <span className="text-[8px] font-bold text-purple-700 bg-purple-50 px-1 rounded">Holiday: {b.counts.holiday}</span>}
                                                                {(b.counts.weekend ?? 0) > 0 && <span className="text-[8px] font-bold text-teal-700 bg-teal-50 px-1 rounded">Weekend: {b.counts.weekend}</span>}
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="px-3.5 py-2 align-middle text-right text-xs font-semibold tabular-nums text-slate-600">
                                                        {row.workingTotal}
                                                    </TableCell>

                                                    <TableCell className="px-3.5 py-2 align-middle text-right">
                                                        <span className={cn("text-xs font-extrabold tabular-nums", scoreTextClass(row.presentRate))}>
                                                            {formatPct(presentPct)}
                                                        </span>
                                                        <div className="text-[9px] text-slate-400 tabular-nums font-medium">{row.present} in</div>
                                                    </TableCell>

                                                    <TableCell className="px-3.5 py-2 align-middle">
                                                        <MiniStackBar
                                                            ariaLabel={`${b.name} distribution`}
                                                            segments={[
                                                                { key: 'present', label: 'Present', value: row.present, className: 'bg-emerald-500' },
                                                                { key: 'absent', label: 'Absent', value: row.absent, className: 'bg-rose-500' },
                                                                { key: 'leave', label: 'Leave', value: row.leave, className: 'bg-blue-500' },
                                                            ]}
                                                        />
                                                    </TableCell>

                                                    <TableCell className="px-3.5 py-2 align-middle text-right text-xs font-bold tabular-nums">
                                                        <span className={row.absent > 0 ? "text-rose-600" : "text-slate-500"}>
                                                            {row.absent}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell className="px-3.5 py-2 align-middle text-right text-xs font-semibold text-slate-500 tabular-nums">
                                                        {row.leave}
                                                    </TableCell>

                                                    <TableCell className="px-3.5 py-2 align-middle text-right">
                                                        <ChevronRight className={cn("h-4 w-4 text-slate-300 transition-transform", isActive ? "text-emerald-500 translate-x-0.5" : "group-hover:translate-x-0.5")} />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Selected Branch Details / Inspector Card */}
                    <div className="lg:col-span-5 xl:col-span-4 sticky top-4">
                        {activeBranch ? (
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-right duration-250">
                                
                                {/* Inspector Header Banner */}
                                <div className="bg-slate-900 text-white p-4">
                                    <div className="flex items-center justify-between gap-2.5">
                                        <div className="min-w-0">
                                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400">Branch Inspector</span>
                                            <h2 className="text-base font-black truncate leading-tight mt-0.5">{activeBranch.branch.name}</h2>
                                        </div>
                                        
                                        {/* Color Badge representing overall health */}
                                        <span className={cn("px-2 py-0.5 text-[10px] font-black rounded-full border shrink-0", scoreBgClass(activeBranch.presentRate))}>
                                            {activeBranch.presentRate < 0.75 ? 'Critical' : activeBranch.presentRate < 0.9 ? 'Warning' : 'Healthy'}
                                        </span>
                                    </div>

                                    {/* Stats grid widget inside banner */}
                                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/10 text-center font-mono">
                                        <div>
                                            <div className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">Attendance</div>
                                            <div className={cn("text-base font-black mt-0.5", scoreTextClass(activeBranch.presentRate))}>
                                                {formatPct(pct(activeBranch.present, activeBranch.workingTotal))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">Present/Total</div>
                                            <div className="text-white text-base font-black mt-0.5">
                                                {activeBranch.present}<span className="text-white/40 text-xs">/{activeBranch.workingTotal}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">Absent</div>
                                            <div className={cn("text-base font-black mt-0.5", activeBranch.absent > 0 ? "text-rose-450" : "text-white")}>
                                                {activeBranch.absent}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Inspector Workspace Body */}
                                <div className="p-4">
                                    <h3 className="text-xs font-bold text-slate-800 mb-2">Staff Distribution by Status</h3>
                                    
                                    {/* Sub-status filter buttons */}
                                    <div className="flex flex-wrap gap-1">
                                        {([
                                            { key: 'present', label: 'Present', tone: 'good' },
                                            { key: 'absent', label: 'Absent', tone: 'bad' },
                                            { key: 'leave', label: 'Leave', tone: 'info' },
                                            { key: 'late', label: 'Late', tone: 'warn' },
                                            { key: 'half_day', label: 'Half Day', tone: 'warn' },
                                            { key: 'on_duty', label: 'On Duty', tone: 'neutral' },
                                            { key: 'holiday', label: 'Holiday', tone: 'neutral' },
                                            { key: 'weekend', label: 'Weekend', tone: 'neutral' },
                                        ] as Array<{ key: Status; label: string; tone: 'good' | 'warn' | 'bad' | 'info' | 'neutral' }>).map((s) => {
                                            const count = activeBranch.branch.counts?.[s.key] ?? 0;
                                            const isSelected = selectedStatus === s.key;
                                            
                                            let badgeStyle = "";
                                            if (isSelected) {
                                                if (s.tone === 'good') badgeStyle = "bg-emerald-600 border-emerald-600 text-white";
                                                else if (s.tone === 'warn') badgeStyle = "bg-amber-500 border-amber-500 text-white";
                                                else if (s.tone === 'bad') badgeStyle = "bg-rose-600 border-rose-600 text-white";
                                                else if (s.tone === 'info') badgeStyle = "bg-blue-600 border-blue-600 text-white";
                                                else badgeStyle = "bg-slate-800 border-slate-800 text-white";
                                            } else {
                                                if (s.tone === 'good') badgeStyle = "bg-emerald-50/80 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50";
                                                else if (s.tone === 'warn') badgeStyle = "bg-amber-50/80 text-amber-700 border-amber-100 hover:bg-amber-100/50";
                                                else if (s.tone === 'bad') badgeStyle = "bg-rose-50/80 text-rose-700 border-rose-100 hover:bg-rose-100/50";
                                                else if (s.tone === 'info') badgeStyle = "bg-blue-50/80 text-blue-700 border-blue-100 hover:bg-blue-100/50";
                                                else badgeStyle = "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/60";
                                            }
                                            
                                            return (
                                                <button
                                                    key={s.key}
                                                    onClick={() => setSelectedStatus(s.key)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all duration-150 select-none",
                                                        badgeStyle
                                                    )}
                                                >
                                                    <span>{statusLabel(s.key)}</span>
                                                    <span className={cn(
                                                        "px-1 rounded-full text-[9px] font-black",
                                                        isSelected ? "bg-black/15 text-white" : "bg-black/5 text-slate-500"
                                                    )}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Local search field */}
                                    <div className="relative mt-3">
                                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            type="text"
                                            value={localSearch}
                                            onChange={(e) => setLocalSearch(e.target.value)}
                                            placeholder={`Search employee name, ID, or post...`}
                                            className="h-8.5 pl-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                                        />
                                        {localSearch && (
                                            <button 
                                                onClick={() => setLocalSearch('')}
                                                className="absolute right-2.5 top-2.5 text-[10px] text-slate-400 hover:text-slate-700 font-semibold"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    {/* Employee list container */}
                                    <div className="mt-3 max-h-[350px] overflow-y-auto pr-1 space-y-1.5">
                                        {filteredEmployees.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                                                <Info className="h-5 w-5 text-slate-300" />
                                                <span>No employees found under status: <strong>{statusLabel(selectedStatus)}</strong></span>
                                            </div>
                                        ) : (
                                            filteredEmployees.map((r) => (
                                                <div 
                                                    key={r.id} 
                                                    className="flex items-center justify-between gap-3 p-2 rounded-xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 select-none">
                                                            {r.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 leading-tight">
                                                            <div className="text-xs font-bold text-slate-800 truncate" title={r.name}>{r.name}</div>
                                                            <div className="text-[9px] text-slate-400 font-mono tracking-wider">{r.employee_id}</div>
                                                            {r.designation && (
                                                                <div className="text-[9px] text-slate-400 truncate mt-0.5 font-medium">
                                                                    {r.designation} {r.department ? `• ${r.department}` : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="text-right shrink-0 flex flex-col items-end justify-center font-mono">
                                                        {selectedStatus === 'leave' && r.leave_type ? (
                                                            <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-md">
                                                                {r.leave_type}
                                                            </span>
                                                        ) : ['present', 'late', 'half_day', 'on_duty'].includes(selectedStatus) ? (
                                                            <div className="text-[9px] text-slate-600 font-bold leading-normal">
                                                                {r.check_in && (
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <span className="text-slate-400 font-normal">IN:</span>
                                                                        <span>{r.check_in}</span>
                                                                    </div>
                                                                )}
                                                                {r.check_out && (
                                                                    <div className="flex items-center justify-end gap-1 text-slate-400">
                                                                        <span>OUT:</span>
                                                                        <span>{r.check_out}</span>
                                                                    </div>
                                                                )}
                                                                {!r.check_in && !r.check_out && <span className="text-slate-300">-</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs font-bold">-</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400 text-xs">
                                <Info className="h-6 w-6 mx-auto text-slate-300 mb-2" />
                                Select a branch from the list to inspect staff details.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Print Only Executive Layout */}
            <div id="print-root-container" className="hidden print:block print-color-exact w-full bg-white p-2">
                {/* Print Stylesheet */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        /* Reset height and overflow of layout scrollable containers to allow printing */
                        html, body, #app, main, .flex, div {
                            height: auto !important;
                            overflow: visible !important;
                        }

                        /* Hide sidebars, headers, and navigation menus */
                        header,
                        nav,
                        aside,
                        [role="navigation"],
                        .print-hide {
                            display: none !important;
                        }
                        
                        /* Reset layout main padding and backgrounds */
                        main {
                            padding: 0 !important;
                            margin: 0 !important;
                            background: transparent !important;
                        }
                        
                        main > div {
                            border: none !important;
                            background: transparent !important;
                            box-shadow: none !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        
                        /* Force position the report at the very top of the page */
                        #print-root-container {
                            display: block !important;
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            color: black !important;
                            z-index: 99999 !important;
                        }
                        
                        @page {
                            size: A4 portrait;
                            margin: 8mm 12mm 8mm 12mm;
                        }
                        
                        .print-color-exact {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                `}} />

                {/* Print Header */}
                <div className="border-b-2 border-slate-950 pb-2.5 mb-3 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-1">
                            <Building2 className="h-4.5 w-4.5 text-slate-900" />
                            <span className="text-[10px] font-black tracking-wider text-slate-800 uppercase">HRM System Portal</span>
                        </div>
                        <h1 className="text-base font-black text-slate-900 mt-0.5 uppercase tracking-tight">
                            Daily Branch Attendance Report
                        </h1>
                        <p className="text-[9px] text-slate-500 font-medium">
                            Status evaluation of all operational branch offices
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-855">Date: <span className="underline font-extrabold text-slate-950">{readableDate}</span></div>
                        <div className="text-[8px] text-slate-400 font-medium mt-0.5">Printed: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</div>
                    </div>
                </div>

                {/* Print KPIs Ribbon */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="border border-slate-300 p-2 rounded-lg bg-slate-50 print-color-exact">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-450 block leading-none">Avg Attendance</span>
                        <div className="text-base font-black text-slate-850 mt-1 leading-none">{formatPct(overallAttendancePct)}</div>
                    </div>
                    <div className="border border-slate-300 p-2 rounded-lg bg-slate-50 print-color-exact">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-455 block leading-none">Active Present</span>
                        <div className="text-base font-black text-slate-850 mt-1 leading-none">
                            {overallPresentCount} <span className="text-[9px] font-normal text-slate-500">/ {overallWorkingTotal}</span>
                        </div>
                    </div>
                    <div className="border border-slate-300 p-2 rounded-lg bg-slate-50 print-color-exact">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-455 block leading-none">Total Absences</span>
                        <div className="text-base font-black text-rose-650 mt-1 leading-none">{overallAbsentCount}</div>
                    </div>
                    <div className="border border-slate-300 p-2 rounded-lg bg-slate-50 print-color-exact">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-455 block leading-none">Leaves & Duty</span>
                        <div className="text-base font-black text-blue-650 mt-1 leading-none">{overallLeaveCount}</div>
                    </div>
                </div>

                {/* Print Instruction / Subtitle */}
                <div className="text-[9px] text-slate-655 mb-3 bg-slate-50 p-2 rounded border border-slate-200 print-color-exact leading-tight flex justify-between items-center">
                    <div>
                        <strong>Report Details:</strong> Total of <strong>{branchesSummary.length} branches</strong> analyzed, sorted by <strong>{sortMode === 'attention' ? 'Attention Priority' : sortMode === 'name_asc' ? 'Name (A-Z)' : 'Name (Z-A)'}</strong>. Attendance rates under <strong>75%</strong> are color-coded in <span className="text-rose-650 font-bold">Red</span>, and under <strong>90%</strong> in <span className="text-amber-650 font-bold">Amber</span>.
                    </div>
                    <div className="flex items-center gap-3 border-l border-slate-200 pl-3 shrink-0 text-[8px] font-bold text-slate-500">
                        <span>Bar Legend:</span>
                        <span className="flex items-center gap-1">
                            <svg width="12" height="6" viewBox="0 0 12 6" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <rect width="12" height="6" rx="1.5" ry="1.5" fill="#00c58d" />
                            </svg>
                            Present
                        </span>
                        <span className="flex items-center gap-1">
                            <svg width="12" height="6" viewBox="0 0 12 6" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <rect width="12" height="6" rx="1.5" ry="1.5" fill="#f43f5e" />
                            </svg>
                            Absent / Other
                        </span>
                    </div>
                </div>

                {/* Print Multi-column List */}
                <div className="columns-3 gap-6 gap-y-0 text-[10px]">
                    {sorted.map((row) => {
                        const b = row.branch;
                        const presentPct = pct(row.present, row.workingTotal);
                        const dotColor = row.presentRate < 0.75 ? "#ef4444" : row.presentRate < 0.9 ? "#f59e0b" : "#10b981";

                        return (
                            <div 
                                key={b.id} 
                                className="break-inside-avoid flex items-center justify-between py-1.5 border-b border-slate-200 text-[10px] leading-tight"
                            >
                                <div className="min-w-0 flex items-center gap-1.5 pr-1">
                                    {/* Circle dot as SVG to guarantee printing in all settings */}
                                    <svg width="6" height="6" viewBox="0 0 6 6" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="3" cy="3" r="3" fill={dotColor} />
                                    </svg>
                                    <span className="font-bold text-slate-800 truncate" title={b.name}>{b.name}</span>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-1.5">
                                    {/* SVG Progress Bar: Guaranteed to print regardless of 'background graphics' checkbox */}
                                    <svg width="48" height="6" viewBox="0 0 48 6" className="shrink-0" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <clipPath id={`pill-clip-${b.id}`}>
                                                <rect width="48" height="6" rx="3" ry="3" />
                                            </clipPath>
                                        </defs>
                                        <g clipPath={`url(#pill-clip-${b.id})`}>
                                            <rect width="48" height="6" fill="#f43f5e" />
                                            <rect width={Math.max(0, Math.min(48, (presentPct / 100) * 48))} height="6" fill="#00c58d" />
                                        </g>
                                    </svg>
                                    <span className="text-[8px] text-slate-500 font-mono tracking-tighter w-[30px] text-left shrink-0">
                                        P:{row.present} A:{row.absent}
                                    </span>
                                    <span className={cn("font-black font-mono w-[30px] text-right shrink-0", scoreTextClass(row.presentRate))}>
                                        {formatPct(presentPct)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Print Footer */}
                <div className="border-t border-slate-300 mt-5 pt-1.5 flex items-center justify-between text-[8px] text-slate-400 font-medium">
                    <span>Confidential - For Internal Use Only</span>
                    <span>Daily Branch Summary Report</span>
                    <span>Page 1 of 1</span>
                </div>
            </div>
        </Layout>
    );
}
