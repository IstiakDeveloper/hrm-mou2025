import React, { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { ComboSelect } from '@/components/ComboSelect';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent } from '@/components/ui/card';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { FileText } from 'lucide-react';
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
        () =>
            departments.map((department) => ({
                value: department.id.toString(),
                label: department.name,
            })),
        [departments],
    );

    const resetFilters = () => {
        setBranchId('');
        setDepartmentId('');
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
        }

        window.open(route('attendance.pdf') + '?' + params.toString(), '_blank');
        setIsGenerating(false);
    };

    return (
        <Layout>
            <Head title="Attendance sheet report" />

            <PageSurface className="max-w-4xl space-y-4 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
                        Attendance sheet report
                    </h1>
                    <Button variant="outline" size="sm" onClick={() => router.get(route('attendance.index'))}>
                        Back
                    </Button>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
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
                                <label className="mb-1 block text-sm font-medium text-slate-700">End date</label>
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
                                        value={departmentId || null}
                                        onChange={(value) => setDepartmentId(value ?? '')}
                                        items={departmentItems}
                                        placeholder="All departments"
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>

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
                                disabled={isGenerating || !userPermissions.canExportPdf}
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
