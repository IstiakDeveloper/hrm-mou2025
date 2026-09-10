import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { ComboSelect } from '@/components/ComboSelect';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { FileText, AlertTriangle, X, Filter } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Department {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
    branch_code?: string | null;
    is_head_office?: boolean;
}

interface AttendanceReportProps {
    branches: Branch[];
    departments: Department[];
    filters: {
        start_date: string;
        end_date: string;
        branch_id: string;
        department_id: string;
        excluded_departments?: string[];
    };
    startDate: string;
    endDate: string;
    userPermissions: {
        canExportPdf: boolean;
    };
}

export default function AttendanceReport({
    branches,
    departments,
    filters,
    startDate,
    endDate,
    userPermissions,
}: AttendanceReportProps) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [excludedDepartments, setExcludedDepartments] = useState<string[]>(
        filters.excluded_departments || [],
    );
    const [dateRange, setDateRange] = useState({
        start: startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7)),
        end: endDate ? new Date(endDate) : new Date(),
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const daysDifference = differenceInDays(dateRange.end, dateRange.start);
    const isDateRangeTooLarge = daysDifference > 31;

    const branchItems = useMemo(
        () =>
            sortPayrollBranches(branches).map((branch) => ({
                value: branch.id.toString(),
                label: formatBranchSelectLabel(branch),
            })),
        [branches],
    );

    const departmentItems = useMemo(
        () => [
            { value: 'all', label: 'All Departments' },
            ...departments.map((department) => ({
                value: department.id.toString(),
                label: department.name,
            })),
        ],
        [departments],
    );

    // Show exclusion options only when "All Departments" is selected
    const showExcludeOptions = !departmentId || departmentId === 'all';

    const handleDepartmentExclusion = (deptId: string, isExcluded: boolean) => {
        if (isExcluded) {
            setExcludedDepartments((prev) => [...prev, deptId]);
        } else {
            setExcludedDepartments((prev) => prev.filter((id) => id !== deptId));
        }
    };

    const removeExcludedDepartment = (deptId: string) => {
        setExcludedDepartments((prev) => prev.filter((id) => id !== deptId));
    };

    const clearAllExclusions = () => {
        setExcludedDepartments([]);
    };

    const getDepartmentName = (deptId: string) => {
        const dept = departments.find((d) => d.id.toString() === deptId);
        return dept ? dept.name : `Dept #${deptId}`;
    };

    const includedCount = departments.length - excludedDepartments.length;
    const allDepartmentsExcluded = showExcludeOptions && excludedDepartments.length === departments.length && departments.length > 0;

    const resetFilters = () => {
        setBranchId('');
        setDepartmentId('');
        setExcludedDepartments([]);
        setDateRange({
            start: new Date(new Date().setDate(new Date().getDate() - 7)),
            end: new Date(),
        });
    };

    const generatePdf = () => {
        setIsGenerating(true);

        const params = new URLSearchParams({
            start_date: format(dateRange.start, 'yyyy-MM-dd'),
            end_date: format(dateRange.end, 'yyyy-MM-dd'),
        });

        if (branchId && branchId !== 'all') {
            params.append('branch_id', branchId);
        }

        if (departmentId && departmentId !== 'all') {
            params.append('department_id', departmentId);
        } else if (excludedDepartments.length > 0) {
            excludedDepartments.forEach((deptId) => {
                params.append('excluded_departments[]', deptId);
            });
        }

        window.open(route('attendance.pdf') + '?' + params.toString(), '_blank');
        setIsGenerating(false);
    };

    return (
        <Layout>
            <Head title="Attendance Sheet Report" />

            <PageSurface className="max-w-4xl space-y-4 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
                            Attendance Sheet Report
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Generate date-range attendance reports with movement & department filter controls
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.get(route('attendance.index'))}>
                        Back
                    </Button>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
                                <DatePicker
                                    selected={dateRange.start}
                                    onSelect={(date) => {
                                        if (date) {
                                            setDateRange((prev) => ({ ...prev, start: date }));
                                        }
                                    }}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
                                <DatePicker
                                    selected={dateRange.end}
                                    onSelect={(date) => {
                                        if (date) {
                                            setDateRange((prev) => ({ ...prev, end: date }));
                                        }
                                    }}
                                />
                            </div>

                            {branches.length > 0 && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Branch</label>
                                    <ComboSelect
                                        value={branchId || null}
                                        onChange={(value) => setBranchId(value ?? '')}
                                        items={branchItems}
                                        placeholder="All branches"
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {departments.length > 0 && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                                    <ComboSelect
                                        value={departmentId || 'all'}
                                        onChange={(value) => {
                                            setDepartmentId(value ?? '');
                                            if (value && value !== 'all') {
                                                setExcludedDepartments([]);
                                            }
                                        }}
                                        items={departmentItems}
                                        placeholder="All departments"
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Department Exclusion Section */}
                        {showExcludeOptions && departments.length > 1 && (
                            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-slate-600" />
                                        <h3 className="text-sm font-semibold text-slate-800">
                                            Exclude Departments ({includedCount} of {departments.length} included)
                                        </h3>
                                    </div>
                                    {excludedDepartments.length > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearAllExclusions}
                                            className="h-7 text-xs text-slate-600 hover:text-slate-900"
                                        >
                                            Reset Exclusions
                                        </Button>
                                    )}
                                </div>

                                {/* Excluded Badges */}
                                {excludedDepartments.length > 0 && (
                                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-medium text-slate-500 mr-1">Excluded:</span>
                                        {excludedDepartments.map((deptId) => (
                                            <Badge
                                                key={deptId}
                                                variant="secondary"
                                                className="bg-red-50 text-red-700 border border-red-200 gap-1 pl-2 pr-1 py-0.5 text-xs font-medium"
                                            >
                                                {getDepartmentName(deptId)}
                                                <button
                                                    type="button"
                                                    onClick={() => removeExcludedDepartment(deptId)}
                                                    className="rounded-full p-0.5 hover:bg-red-200 text-red-600 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Checkbox list */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
                                    {departments.map((dept) => {
                                        const deptStrId = dept.id.toString();
                                        const isExcluded = excludedDepartments.includes(deptStrId);
                                        return (
                                            <label
                                                key={dept.id}
                                                htmlFor={`exclude-${dept.id}`}
                                                className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                                                    isExcluded
                                                        ? 'border-red-300 bg-red-50/80 text-red-800 font-medium'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                                }`}
                                            >
                                                <Checkbox
                                                    id={`exclude-${dept.id}`}
                                                    checked={isExcluded}
                                                    onCheckedChange={(checked) =>
                                                        handleDepartmentExclusion(deptStrId, Boolean(checked))
                                                    }
                                                />
                                                <span className={`truncate ${isExcluded ? 'line-through text-red-700' : ''}`}>
                                                    {dept.name}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>

                                {allDepartmentsExcluded && (
                                    <Alert className="mt-3 bg-red-50 border-red-200 py-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-xs text-red-800 ml-2">
                                            Warning: All departments are excluded. The generated report will contain no employee records.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        {isDateRangeTooLarge && (
                            <p className="mt-3 text-xs text-amber-700">
                                Date range is {daysDifference + 1} days. Use 31 days or less for faster PDF generation.
                            </p>
                        )}

                        <div className="mt-5 flex justify-between gap-2">
                            <Button variant="outline" onClick={resetFilters}>
                                Reset
                            </Button>
                            <Button
                                onClick={generatePdf}
                                disabled={isGenerating || !userPermissions.canExportPdf || allDepartmentsExcluded}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                {isGenerating ? 'Generating...' : 'Generate PDF'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
