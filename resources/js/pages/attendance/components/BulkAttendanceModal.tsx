import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Users,
    Clock,
    Calendar as CalendarIcon,
    Search,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ShieldAlert,
    RefreshCw,
    Sparkles,
    CalendarOff,
    CheckSquare,
    Square,
    Save,
    RotateCcw
} from 'lucide-react';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';

interface Branch {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

interface EmployeeBulkRow {
    employee_id: number;
    name_en: string | null;
    name_bn: string | null;
    display_name: string;
    employee_code: string;
    branch_name: string;
    department_name: string;
    designation_name: string;
    has_history: boolean;
    history_days_count: number;
    check_in: string;
    check_out: string;
    is_on_leave: boolean;
    leave_type: string | null;
    already_recorded: boolean;
    existing_check_in: string | null;
    is_weekend: boolean;
    has_movement: boolean;
    is_eligible: boolean;
    exclusion_reason: string | null;
    selected: boolean;
}

interface PreviewSummary {
    total: number;
    eligible: number;
    on_leave: number;
    already_recorded: number;
    weekend: number;
}

interface BulkAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentDate: string;
    branches: Branch[];
    departments: Department[];
}

export default function BulkAttendanceModal({
    isOpen,
    onClose,
    currentDate,
    branches,
    departments,
}: BulkAttendanceModalProps) {
    const [targetDate, setTargetDate] = useState(currentDate || new Date().toISOString().split('T')[0]);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [tableSearch, setTableSearch] = useState('');
    const [remarks, setRemarks] = useState('Bulk Attendance (Super Admin)');

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [employees, setEmployees] = useState<EmployeeBulkRow[]>([]);
    const [originalAverages, setOriginalAverages] = useState<Record<number, { check_in: string; check_out: string }>>({});
    const [summary, setSummary] = useState<PreviewSummary>({
        total: 0,
        eligible: 0,
        on_leave: 0,
        already_recorded: 0,
        weekend: 0,
    });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Quick bulk override inputs
    const [bulkCheckIn, setBulkCheckIn] = useState('');
    const [bulkCheckOut, setBulkCheckOut] = useState('');

    const sortedBranches = useMemo(() => sortPayrollBranches(branches), [branches]);

    const fetchPreview = async (dateVal = targetDate, branchVal = selectedBranch, deptVal = selectedDepartment) => {
        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            const response = await axios.get(route('attendance.bulk-preview'), {
                params: {
                    date: dateVal,
                    branch_id: branchVal,
                    department_id: deptVal,
                }
            });

            const data = response.data;
            setSummary(data.summary || { total: 0, eligible: 0, on_leave: 0, already_recorded: 0, weekend: 0 });
            const list: EmployeeBulkRow[] = data.employees || [];
            setEmployees(list);

            const origMap: Record<number, { check_in: string; check_out: string }> = {};
            list.forEach(emp => {
                origMap[emp.employee_id] = { check_in: emp.check_in, check_out: emp.check_out };
            });
            setOriginalAverages(origMap);
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Failed to load bulk attendance preview.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setTargetDate(currentDate || new Date().toISOString().split('T')[0]);
            fetchPreview(currentDate || new Date().toISOString().split('T')[0], selectedBranch, selectedDepartment);
        }
    }, [isOpen, currentDate]);

    const handleToggleSelectAll = (checked: boolean) => {
        setEmployees(prev =>
            prev.map(emp => {
                // If checking all, check eligible employees (or all non-leave if admin insists)
                if (checked) {
                    return { ...emp, selected: emp.is_eligible };
                }
                return { ...emp, selected: false };
            })
        );
    };

    const handleToggleSingle = (empId: number) => {
        setEmployees(prev =>
            prev.map(emp => (emp.employee_id === empId ? { ...emp, selected: !emp.selected } : emp))
        );
    };

    const handleTimeChange = (empId: number, field: 'check_in' | 'check_out', value: string) => {
        setEmployees(prev =>
            prev.map(emp => (emp.employee_id === empId ? { ...emp, [field]: value } : emp))
        );
    };

    const handleApplyBulkTimes = () => {
        if (!bulkCheckIn && !bulkCheckOut) return;
        setEmployees(prev =>
            prev.map(emp => {
                if (!emp.selected) return emp;
                return {
                    ...emp,
                    ...(bulkCheckIn ? { check_in: bulkCheckIn } : {}),
                    ...(bulkCheckOut ? { check_out: bulkCheckOut } : {}),
                };
            })
        );
    };

    const handleClearAllCheckOut = () => {
        setEmployees(prev =>
            prev.map(emp => ({
                ...emp,
                check_out: '',
            }))
        );
        setBulkCheckOut('');
    };

    const handleClearSelectedCheckOut = () => {
        setEmployees(prev =>
            prev.map(emp => (emp.selected ? { ...emp, check_out: '' } : emp))
        );
        setBulkCheckOut('');
    };

    const handleResetTo1MonthAverage = () => {
        setEmployees(prev =>
            prev.map(emp => {
                const orig = originalAverages[emp.employee_id];
                if (!orig) return emp;
                return {
                    ...emp,
                    check_in: orig.check_in,
                    check_out: orig.check_out,
                };
            })
        );
        setBulkCheckIn('');
        setBulkCheckOut('');
    };

    const filteredEmployees = useMemo(() => {
        if (!tableSearch.trim()) return employees;
        const q = tableSearch.toLowerCase();
        return employees.filter(
            emp =>
                emp.display_name.toLowerCase().includes(q) ||
                emp.employee_code.toLowerCase().includes(q) ||
                emp.branch_name.toLowerCase().includes(q) ||
                emp.designation_name.toLowerCase().includes(q)
        );
    }, [employees, tableSearch]);

    const selectedEmployees = useMemo(() => employees.filter(e => e.selected), [employees]);
    const selectedCount = selectedEmployees.length;
    const isAllEligibleSelected =
        employees.filter(e => e.is_eligible).length > 0 &&
        employees.filter(e => e.is_eligible).every(e => e.selected);

    const handleSubmit = async () => {
        if (selectedCount === 0) {
            setErrorMessage('Please select at least one employee to create attendance.');
            return;
        }

        setSubmitting(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const payload = {
            date: targetDate,
            attendances: selectedEmployees.map(emp => ({
                employee_id: emp.employee_id,
                check_in: emp.check_in,
                check_out: emp.check_out || null,
                remarks: remarks || 'Bulk Attendance (Super Admin)',
            })),
        };

        try {
            const response = await axios.post(route('attendance.bulk-store'), payload);
            setSuccessMessage(response.data?.message || `${selectedCount} attendance records created successfully.`);
            setTimeout(() => {
                onClose();
                router.get(route('attendance.index'), { date: targetDate }, { preserveState: false });
            }, 1200);
        } catch (err: any) {
            setErrorMessage(err.response?.data?.message || 'Failed to submit bulk attendance.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && !submitting && onClose()}>
            <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-white shadow-2xl rounded-xl border border-slate-200">
                {/* Header */}
                <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30 text-indigo-300">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                                    Super Admin Bulk Attendance Generator
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-semibold uppercase tracking-wider">
                                        Super Admin Only
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs sm:text-sm text-slate-300 mt-0.5">
                                    Generates attendance using each employee's 1-month average present time. Employees on approved leave or already recorded are automatically excluded.
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Filter & Controls Bar */}
                <div className="p-3 sm:p-4 bg-slate-50/90 border-b border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div>
                            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" /> Attendance Date
                            </Label>
                            <Input
                                type="date"
                                value={targetDate}
                                onChange={e => {
                                    setTargetDate(e.target.value);
                                    fetchPreview(e.target.value, selectedBranch, selectedDepartment);
                                }}
                                className="h-8 text-xs bg-white"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                                Branch Filter
                            </Label>
                            <select
                                value={selectedBranch}
                                onChange={e => {
                                    setSelectedBranch(e.target.value);
                                    fetchPreview(targetDate, e.target.value, selectedDepartment);
                                }}
                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="all">All Branches</option>
                                {sortedBranches.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {formatBranchSelectLabel(b)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                                Department Filter
                            </Label>
                            <select
                                value={selectedDepartment}
                                onChange={e => {
                                    setSelectedDepartment(e.target.value);
                                    fetchPreview(targetDate, selectedBranch, e.target.value);
                                }}
                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="all">All Departments</option>
                                {departments.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                onClick={() => fetchPreview(targetDate, selectedBranch, selectedDepartment)}
                                disabled={loading}
                                size="sm"
                                variant="outline"
                                className="w-full h-8 text-xs font-medium border-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} />
                                Reload Preview
                            </Button>
                        </div>
                    </div>

                    {/* KPI Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/70 text-xs">
                        <span className="font-semibold text-slate-600 mr-1">Summary:</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md shadow-xs">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-slate-600">Total:</span>
                            <span className="font-bold text-slate-900">{summary.total}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-800">Eligible & Ready:</span>
                            <span className="font-bold text-emerald-900">{summary.eligible}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md shadow-xs">
                            <CalendarOff className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-blue-800">Auto Excluded (On Leave):</span>
                            <span className="font-bold text-blue-900">{summary.on_leave}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md shadow-xs">
                            <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-slate-700">Already Recorded:</span>
                            <span className="font-bold text-slate-900">{summary.already_recorded}</span>
                        </div>
                        {summary.weekend > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-md shadow-xs">
                                <CalendarIcon className="w-3.5 h-3.5 text-purple-600" />
                                <span className="text-purple-800">Weekend:</span>
                                <span className="font-bold text-purple-900">{summary.weekend}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-tools & Bulk Override */}
                <div className="px-4 py-2 bg-indigo-50/40 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleSelectAll(!isAllEligibleSelected)}
                            className="h-7 px-2 text-xs border-indigo-200 hover:bg-indigo-100 text-indigo-900"
                        >
                            {isAllEligibleSelected ? (
                                <>
                                    <Square className="w-3 h-3 mr-1 text-slate-500" /> Deselect All
                                </>
                            ) : (
                                <>
                                    <CheckSquare className="w-3 h-3 mr-1 text-indigo-600" /> Select All Eligible ({summary.eligible})
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleClearAllCheckOut}
                            className="h-7 px-2 text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-medium"
                            title="Remove all check-out times and submit check-in only"
                        >
                            <XCircle className="w-3 h-3 mr-1 text-amber-600" /> Clear Check-Out (Check-In Only)
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleResetTo1MonthAverage}
                            className="h-7 px-2 text-xs text-slate-600 hover:bg-slate-200/60"
                        >
                            <RotateCcw className="w-3 h-3 mr-1" /> Reset 1-Mo Average
                        </Button>
                    </div>

                    {/* Bulk Override Time Inputs */}
                    <div className="flex items-center gap-2 bg-white/80 border border-indigo-200 px-2.5 py-1 rounded-md">
                        <span className="text-slate-600 font-medium">Quick Override Selected:</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500">In:</span>
                            <Input
                                type="time"
                                value={bulkCheckIn}
                                onChange={e => setBulkCheckIn(e.target.value)}
                                className="h-6 w-24 text-[11px] px-1.5 py-0 bg-white"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-500">Out:</span>
                            <Input
                                type="time"
                                value={bulkCheckOut}
                                onChange={e => setBulkCheckOut(e.target.value)}
                                className="h-6 w-24 text-[11px] px-1.5 py-0 bg-white"
                            />
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleApplyBulkTimes}
                            disabled={!bulkCheckIn && !bulkCheckOut}
                            className="h-6 px-2 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                        >
                            Apply
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleClearSelectedCheckOut}
                            className="h-6 px-1.5 text-[10px] text-amber-700 hover:bg-amber-50"
                            title="Clear check-out time for selected employees"
                        >
                            Clear Out
                        </Button>
                    </div>

                    {/* Search inside table */}
                    <div className="relative w-44">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                        <Input
                            placeholder="Filter list..."
                            value={tableSearch}
                            onChange={e => setTableSearch(e.target.value)}
                            className="h-7 pl-7 text-xs bg-white"
                        />
                    </div>
                </div>

                {/* Error / Success Notifications */}
                {errorMessage && (
                    <div className="p-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Table Area (Scrollable) */}
                <div className="flex-1 overflow-y-auto min-h-[260px] max-h-[46vh] border-b border-slate-200 bg-slate-50/40">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="text-xs font-medium">Analyzing 1-month attendance patterns & calculating averages...</span>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 text-xs">
                            No employees found matching the current filters.
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 select-none">
                                <tr>
                                    <th className="py-2 px-3 w-10 text-center">
                                        <Checkbox
                                            checked={isAllEligibleSelected}
                                            onCheckedChange={checked => handleToggleSelectAll(Boolean(checked))}
                                            aria-label="Select all eligible"
                                        />
                                    </th>
                                    <th className="py-2 px-3 font-semibold">Employee</th>
                                    <th className="py-2 px-3 font-semibold">Branch & Designation</th>
                                    <th className="py-2 px-3 font-semibold">1-Month Pattern</th>
                                    <th className="py-2 px-3 font-semibold w-28">Check-In Time</th>
                                    <th className="py-2 px-3 font-semibold w-36">
                                        <div className="flex items-center justify-between">
                                            <span>Check-Out Time</span>
                                            <button
                                                type="button"
                                                onClick={handleClearAllCheckOut}
                                                className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-normal cursor-pointer"
                                                title="Clear all check-out times"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </th>
                                    <th className="py-2 px-3 font-semibold">Status / Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {filteredEmployees.map(emp => {
                                    const rowClass = emp.is_on_leave
                                        ? 'bg-blue-50/30'
                                        : emp.already_recorded
                                        ? 'bg-slate-50/60'
                                        : emp.selected
                                        ? 'bg-indigo-50/40'
                                        : 'hover:bg-slate-50';

                                    return (
                                        <tr key={emp.employee_id} className={`transition-colors ${rowClass}`}>
                                            <td className="py-2 px-3 text-center">
                                                <Checkbox
                                                    checked={emp.selected}
                                                    onCheckedChange={() => handleToggleSingle(emp.employee_id)}
                                                    aria-label={`Select ${emp.display_name}`}
                                                />
                                            </td>

                                            <td className="py-2 px-3">
                                                <div className="font-medium text-slate-900">
                                                    {emp.display_name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-mono">
                                                    ID: {emp.employee_code}
                                                </div>
                                            </td>

                                            <td className="py-2 px-3">
                                                <div className="text-slate-800 font-medium">
                                                    {emp.branch_name}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    {emp.designation_name} • {emp.department_name}
                                                </div>
                                            </td>

                                            <td className="py-2 px-3">
                                                {emp.has_history ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] w-fit font-normal">
                                                            <Sparkles className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                                                            1-Mo Avg ({emp.history_days_count} days)
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] w-fit font-normal">
                                                        <Clock className="w-2.5 h-2.5 mr-1 text-slate-400" />
                                                        Shift Default
                                                    </Badge>
                                                )}
                                            </td>

                                            <td className="py-2 px-3">
                                                <Input
                                                    type="time"
                                                    value={emp.check_in || ''}
                                                    onChange={e => handleTimeChange(emp.employee_id, 'check_in', e.target.value)}
                                                    disabled={!emp.selected}
                                                    className="h-7 text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                />
                                            </td>

                                            <td className="py-2 px-3">
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="time"
                                                        value={emp.check_out || ''}
                                                        onChange={e => handleTimeChange(emp.employee_id, 'check_out', e.target.value)}
                                                        disabled={!emp.selected}
                                                        className="h-7 text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                    {emp.check_out && emp.selected && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTimeChange(emp.employee_id, 'check_out', '')}
                                                            className="text-slate-400 hover:text-rose-600 p-0.5 shrink-0"
                                                            title="Clear check-out"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-2 px-3">
                                                {emp.is_on_leave ? (
                                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium text-[11px]">
                                                        <CalendarOff className="w-3 h-3 mr-1 text-blue-600" />
                                                        On Leave ({emp.leave_type || 'Approved'})
                                                    </Badge>
                                                ) : emp.already_recorded ? (
                                                    <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-medium text-[11px]">
                                                        <CheckCircle2 className="w-3 h-3 mr-1 text-slate-500" />
                                                        Already Recorded ({emp.existing_check_in})
                                                    </Badge>
                                                ) : emp.is_weekend ? (
                                                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-medium text-[11px]">
                                                        Weekend
                                                    </Badge>
                                                ) : emp.selected ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium text-[11px]">
                                                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                                        Ready ({emp.check_in})
                                                    </Badge>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 italic">Excluded</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Bar */}
                <DialogFooter className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                        <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-bold">
                                {selectedCount}
                            </span>
                            employees selected for attendance creation on
                            <span className="font-semibold text-slate-900">{targetDate}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            disabled={submitting}
                            className="h-8 text-xs font-medium border-slate-300 text-slate-700"
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSubmit}
                            disabled={submitting || selectedCount === 0 || loading}
                            className="h-8 px-4 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-sm flex items-center gap-1.5"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Creating Attendance...
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    Generate Bulk Attendance ({selectedCount})
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
