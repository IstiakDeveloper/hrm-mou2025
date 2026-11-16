import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    ShieldAlert, Plus, Search, Filter, Calendar, User, Eye, Trash2,
    Building, AlertTriangle, AlertCircle, FileText, RefreshCw, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { employeeDisplayName, employeeInitials } from '@/lib/employee-name';

interface DisciplinaryActionItem {
    id: number;
    employee_id: number;
    action_type: string;
    action_date: string;
    details: string | null;
    created_at: string;
    employee?: {
        id: number;
        pin: string;
        employee_id: string;
        name_en: string;
        name_bn?: string;
        photo?: string | null;
        designation?: { id: number; name: string } | null;
        branch?: { id: number; name: string } | null;
    } | null;
    creator?: {
        id: number;
        name: string;
    } | null;
}

interface PageProps {
    disciplinaryActions: {
        data: DisciplinaryActionItem[];
        current_page: number;
        last_page: number;
        total: number;
        from: number;
        to: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    actionTypes: Array<{ value: string; label: string }>;
    branches: Array<{ id: number; name: string }>;
    filters: {
        search: string;
        action_type: string;
        branch_id: string;
        date_from: string;
        date_to: string;
    };
}

const getDisciplinaryBadge = (type: string) => {
    let cls = 'bg-slate-100 text-slate-900 border-slate-300';
    if (type.includes('Warning')) cls = 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
    else if (type.includes('Show Cause')) cls = 'bg-amber-100 text-amber-950 border-amber-300 font-bold';
    else if (type.includes('Explanation')) cls = 'bg-blue-100 text-blue-950 border-blue-300 font-bold';
    else if (type.includes('Suspension')) cls = 'bg-orange-100 text-orange-950 border-orange-300 font-bold';
    else if (type.includes('Deduction')) cls = 'bg-rose-100 text-rose-950 border-rose-300 font-bold';
    else if (type.includes('Fine')) cls = 'bg-purple-100 text-purple-950 border-purple-300 font-bold';
    else if (type.includes('Embezzlement') || type.includes('Irregularity')) cls = 'bg-red-100 text-red-950 border-red-400 font-black';

    return (
        <Badge variant="outline" className={`${cls} text-xs py-0.5 px-2 font-extrabold shadow-2xs`}>
            {type}
        </Badge>
    );
};

export default function DisciplinaryActionIndex({
    disciplinaryActions,
    actionTypes,
    branches,
    filters,
}: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [actionType, setActionType] = useState(filters.action_type || '');
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const handleFilterSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get(
            route('disciplinary-actions.index'),
            {
                search,
                action_type: actionType,
                branch_id: branchId,
                date_from: dateFrom,
                date_to: dateTo,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setActionType('');
        setBranchId('');
        setDateFrom('');
        setDateTo('');
        router.get(route('disciplinary-actions.index'), {}, { replace: true });
    };

    const handleDelete = (id: number, empName: string) => {
        if (confirm(`Are you sure you want to delete this disciplinary action record for ${empName}?`)) {
            router.delete(route('disciplinary-actions.destroy', id), {
                preserveScroll: true,
            });
        }
    };

    return (
        <Layout>
            <Head title="Disciplinary Actions" />

            <div className="container mx-auto py-4 px-3 sm:px-4 max-w-6xl space-y-4">
                
                {/* Header Title Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-300 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-100 text-rose-800 rounded-lg shrink-0">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black text-slate-950 flex items-center gap-1.5">
                                Disciplinary Actions <span className="text-xs text-rose-800 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">শৃঙ্খলা সংক্রান্ত পদক্ষেপ</span>
                            </h1>
                            <p className="text-xs text-slate-600 font-semibold mt-0.5">
                                Manage employee warnings, show cause notices, suspensions, fines & disciplinary records
                            </p>
                        </div>
                    </div>

                    <Link href={route('disciplinary-actions.create')}>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-3.5 shadow-2xs flex items-center gap-1.5 shrink-0">
                            <Plus className="w-4 h-4" /> Issue Disciplinary Action
                        </Button>
                    </Link>
                </div>

                {/* Filter Controls Card */}
                <Card className="border border-slate-300 shadow-2xs rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-100/80 border-b border-slate-200 py-2.5 px-3.5">
                        <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5 text-rose-700" /> Filter Disciplinary Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3.5">
                        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                            <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Employee (PIN / Name)
                                </label>
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search PIN or Name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="h-8 text-xs pl-8 border-slate-300 focus:border-rose-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Action Type
                                </label>
                                <select
                                    value={actionType}
                                    onChange={(e) => setActionType(e.target.value)}
                                    className="w-full h-8 text-xs border border-slate-300 rounded-md bg-white px-2 focus:border-rose-500 font-semibold"
                                >
                                    <option value="">All Action Types</option>
                                    {actionTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Branch
                                </label>
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    className="w-full h-8 text-xs border border-slate-300 rounded-md bg-white px-2 focus:border-rose-500 font-semibold"
                                >
                                    <option value="">All Branches</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Date From
                                </label>
                                <Input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="h-8 text-xs border-slate-300 focus:border-rose-500"
                                />
                            </div>

                            <div className="flex items-end gap-1.5">
                                <Button type="submit" size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold flex-1">
                                    <Filter className="w-3.5 h-3.5 mr-1" /> Filter
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleResetFilters} className="h-8 text-xs border-slate-300 text-slate-700 font-bold px-2.5">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Table Records Card */}
                <Card className="border border-slate-300 shadow-2xs rounded-xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-100/90 border-b border-slate-200 py-2.5 px-3.5 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-rose-700" /> Action Records List ({disciplinaryActions.total})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {disciplinaryActions.data.length === 0 ? (
                            <div className="text-center py-10 text-xs text-slate-500 font-medium">
                                <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                No disciplinary action records found matching criteria.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                                        <TableRow>
                                            <TableHead className="text-[11px] font-bold text-slate-800 uppercase tracking-wider py-2">Employee</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-800 uppercase tracking-wider py-2">Action Type</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-800 uppercase tracking-wider py-2">Date</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-800 uppercase tracking-wider py-2">Details & Remarks</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-800 uppercase tracking-wider py-2">Issued By</TableHead>
                                            <TableHead className="text-[11px] font-bold text-slate-800 uppercase tracking-wider py-2 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {disciplinaryActions.data.map((item) => {
                                            const emp = item.employee;
                                            const displayName = emp ? employeeDisplayName(emp, String(emp.pin || emp.employee_id)) : '—';
                                            const initials = emp ? employeeInitials(emp, 'E') : 'E';

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/80 border-b border-slate-200/80">
                                                    {/* Employee */}
                                                    <TableCell className="py-2.5">
                                                        {emp ? (
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar className="h-8 w-8 rounded-full border border-slate-200 shrink-0">
                                                                    {emp.photo ? (
                                                                        <AvatarImage src={`/storage/${emp.photo}`} alt={displayName} />
                                                                    ) : (
                                                                        <AvatarFallback className="text-xs font-bold bg-rose-50 text-rose-800">
                                                                            {initials}
                                                                        </AvatarFallback>
                                                                    )}
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Link href={route('employees.show', emp.id)} className="text-xs font-extrabold text-slate-950 hover:text-rose-700 truncate">
                                                                            {displayName}
                                                                        </Link>
                                                                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                                                            PIN: {emp.pin || emp.employee_id}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-600 font-semibold truncate mt-0.5">
                                                                        {emp.designation?.name || '—'} • {emp.branch?.name || '—'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Employee Deleted</span>
                                                        )}
                                                    </TableCell>

                                                    {/* Action Type */}
                                                    <TableCell className="py-2.5">
                                                        {getDisciplinaryBadge(item.action_type)}
                                                    </TableCell>

                                                    {/* Action Date */}
                                                    <TableCell className="py-2.5 text-xs font-bold text-slate-900 whitespace-nowrap">
                                                        {item.action_date ? format(new Date(item.action_date), 'PP') : '—'}
                                                    </TableCell>

                                                    {/* Details */}
                                                    <TableCell className="py-2.5 text-xs text-slate-800 max-w-xs">
                                                        {item.details ? (
                                                            <p className="line-clamp-2 leading-tight font-medium">
                                                                {item.details}
                                                            </p>
                                                        ) : (
                                                            <span className="text-slate-400 italic">No notes provided</span>
                                                        )}
                                                    </TableCell>

                                                    {/* Creator */}
                                                    <TableCell className="py-2.5 text-xs text-slate-700 font-semibold whitespace-nowrap">
                                                        {item.creator?.name || 'HR Admin'}
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell className="py-2.5 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {emp && (
                                                                <Link href={route('employees.show', emp.id)}>
                                                                    <Button variant="outline" size="sm" className="h-7 text-[11px] px-2 border-slate-300 font-bold hover:bg-emerald-50 text-slate-700">
                                                                        <Eye className="w-3 h-3 mr-1 text-emerald-700" /> View Profile
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDelete(item.id, displayName)}
                                                                className="h-7 text-[11px] px-2 border-rose-200 text-rose-700 font-bold hover:bg-rose-50"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Pagination */}
                        {disciplinaryActions.last_page > 1 && (
                            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                                <span className="text-slate-600 font-semibold">
                                    Showing {disciplinaryActions.from} to {disciplinaryActions.to} of {disciplinaryActions.total} records
                                </span>
                                <div className="flex gap-1">
                                    {disciplinaryActions.links.map((link, idx) => (
                                        <Link
                                            key={idx}
                                            href={link.url || '#'}
                                            className={`px-2.5 py-1 rounded font-bold text-xs ${
                                                link.active
                                                    ? 'bg-rose-600 text-white'
                                                    : link.url
                                                    ? 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                                                    : 'text-slate-400 cursor-not-allowed'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
