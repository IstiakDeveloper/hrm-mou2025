import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { formatBranchSelectLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    CalendarIcon,
    FileText,
    ArrowLeft,
    AlertTriangle,
    X,
    Plus
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, differenceInDays } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Department {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

interface UserPermissions {
    canExportPdf: boolean;
    canExportExcel: boolean;
    isEmployee: boolean;
    isBranchManager: boolean;
    isDepartmentHead: boolean;
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
    userPermissions: UserPermissions;
}

export default function AttendanceReport({
    branches,
    departments,
    filters,
    startDate,
    endDate,
    userPermissions
}: AttendanceReportProps) {
    const [branchId, setBranchId] = useState(filters.branch_id || '');
    const [departmentId, setDepartmentId] = useState(filters.department_id || '');
    const [excludedDepartments, setExcludedDepartments] = useState<string[]>(filters.excluded_departments || []);
    const [showExcludeOptions, setShowExcludeOptions] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7)),
        end: endDate ? new Date(endDate) : new Date()
    });
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Show exclude options when "all" departments is selected
    useEffect(() => {
        if (departmentId === 'all' || departmentId === '') {
            setShowExcludeOptions(true);
        } else {
            setShowExcludeOptions(false);
            setExcludedDepartments([]); // Clear excluded departments when specific department is selected
        }
    }, [departmentId]);

    // Calculate days difference for warning
    const daysDifference = differenceInDays(dateRange.end, dateRange.start);
    const isDateRangeTooLarge = daysDifference > 31;

    const handleStartDateChange = (date: Date | undefined) => {
        if (date) {
            setDateRange(prev => ({
                ...prev,
                start: date
            }));
            setStartDateOpen(false);
        }
    };

    const handleEndDateChange = (date: Date | undefined) => {
        if (date) {
            setDateRange(prev => ({
                ...prev,
                end: date
            }));
            setEndDateOpen(false);
        }
    };

    const handleDepartmentExclusion = (departmentIdToToggle: string, checked: boolean) => {
        if (checked) {
            // Add to excluded list
            setExcludedDepartments(prev => [...prev, departmentIdToToggle]);
        } else {
            // Remove from excluded list
            setExcludedDepartments(prev => prev.filter(id => id !== departmentIdToToggle));
        }
    };

    const removeExcludedDepartment = (departmentIdToRemove: string) => {
        setExcludedDepartments(prev => prev.filter(id => id !== departmentIdToRemove));
    };

    const resetFilters = () => {
        setBranchId('');
        setDepartmentId('');
        setExcludedDepartments([]);
        setDateRange({
            start: new Date(new Date().setDate(new Date().getDate() - 7)),
            end: new Date()
        });
    };

    const generatePdf = () => {
        setIsGenerating(true);

        // Convert dates to string format
        const startDateStr = format(dateRange.start, 'yyyy-MM-dd');
        const endDateStr = format(dateRange.end, 'yyyy-MM-dd');

        // Prepare parameters
        const params = new URLSearchParams({
            start_date: startDateStr,
            end_date: endDateStr,
        });

        // Add branch filter if selected
        if (branchId && branchId !== 'all') {
            params.append('branch_id', branchId);
        }

        // Add department filter if selected
        if (departmentId && departmentId !== 'all') {
            params.append('department_id', departmentId);
        }

        // Add excluded departments if any (IMPORTANT: Handle array properly)
        if (excludedDepartments.length > 0) {
            excludedDepartments.forEach(deptId => {
                params.append('excluded_departments[]', deptId);
            });
        }

        // Create the URL with query parameters
        const url = route('attendance.pdf') + '?' + params.toString();

        // Open the PDF in a new tab/window
        window.open(url, '_blank');

        setIsGenerating(false);
    };

    // Get included departments count for display
    const getIncludedDepartmentsCount = () => {
        if (departmentId && departmentId !== 'all') {
            return 1; // Specific department selected
        }
        return departments.length - excludedDepartments.length;
    };

    const getDepartmentName = (id: string) => {
        return departments.find(dept => dept.id.toString() === id)?.name || 'Unknown';
    };

    return (
        <Layout>
            <Head title="Daily Attendance Report" />

            <div className="container mx-auto py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Daily Attendance Report</h1>
                        <p className="mt-1 text-gray-500">
                            Generate day-by-day attendance reports with check-in/check-out details
                        </p>
                    </div>

                    <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => router.get(route('attendance.index'))}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Attendance
                        </Button>
                    </div>
                </div>

                {/* Report Generation Card */}
                <Card className="mb-6">
                    <CardHeader className="pb-3">
                        <CardTitle>Generate Daily Attendance PDF</CardTitle>
                        <CardDescription>
                            Select date range and filters to generate a detailed day-by-day attendance report
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date
                                </label>
                                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.start ? format(dateRange.start, 'dd MMM, yyyy') : 'Select date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={dateRange.start}
                                            onSelect={handleStartDateChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date
                                </label>
                                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.end ? format(dateRange.end, 'dd MMM, yyyy') : 'Select date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={dateRange.end}
                                            onSelect={handleEndDateChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Branch Select */}
                            {branches.length > 1 && (userPermissions.isBranchManager || !userPermissions.isEmployee) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Branch
                                    </label>
                                    <Select
                                        value={branchId}
                                        onValueChange={(value) => setBranchId(value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Branches" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Branches</SelectItem>
                                            {sortPayrollBranches(branches).map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {formatBranchSelectLabel(branch)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Department Select */}
                            {departments.length > 1 && (
                                userPermissions.isDepartmentHead ||
                                userPermissions.isBranchManager ||
                                !userPermissions.isEmployee
                            ) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Department
                                        </label>
                                        <Select
                                            value={departmentId}
                                            onValueChange={(value) => setDepartmentId(value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All Departments" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Departments</SelectItem>
                                                {departments.map((department) => (
                                                    <SelectItem key={department.id} value={department.id.toString()}>
                                                        {department.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                        </div>

                        {/* Department Exclusion Section */}
                        {showExcludeOptions && departments.length > 1 && (
                            <div className="mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-medium text-blue-900">
                                            Department Filters ({getIncludedDepartmentsCount()} of {departments.length} departments will be included)
                                        </h3>
                                    </div>

                                    {/* Excluded Departments Display */}
                                    {excludedDepartments.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs text-gray-600 mb-2">Excluded Departments:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {excludedDepartments.map((deptId) => (
                                                    <Badge
                                                        key={deptId}
                                                        variant="secondary"
                                                        className="bg-red-100 text-red-800 border-red-200"
                                                    >
                                                        {getDepartmentName(deptId)}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-4 w-4 ml-1 p-0 hover:bg-red-200"
                                                            onClick={() => removeExcludedDepartment(deptId)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Department Exclusion Checkboxes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {departments.map((department) => {
                                            const isExcluded = excludedDepartments.includes(department.id.toString());
                                            return (
                                                <div key={department.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`exclude-dept-${department.id}`}
                                                        checked={isExcluded}
                                                        onCheckedChange={(checked) =>
                                                            handleDepartmentExclusion(department.id.toString(), checked as boolean)
                                                        }
                                                    />
                                                    <label
                                                        htmlFor={`exclude-dept-${department.id}`}
                                                        className={`text-sm cursor-pointer ${isExcluded ? 'text-red-600 line-through' : 'text-gray-700'
                                                            }`}
                                                    >
                                                        Exclude {department.name}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {excludedDepartments.length === departments.length && (
                                        <Alert className="mt-3 bg-red-50 border-red-200">
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                            <AlertDescription className="text-red-800">
                                                Warning: All departments are excluded. The report will contain no data.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </div>
                        )}

                        {isDateRangeTooLarge && (
                            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                                <AlertTriangle className="h-4 w-4 text-yellow-800" />
                                <AlertDescription className="text-yellow-800">
                                    You've selected a date range of {daysDifference + 1} days. Large date ranges may result in slower PDF generation. For best results, choose a date range of 31 days or less.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={resetFilters}>
                                Reset Filters
                            </Button>

                            <Button
                                onClick={generatePdf}
                                disabled={isGenerating || !userPermissions.canExportPdf || (excludedDepartments.length === departments.length && showExcludeOptions)}
                                className="bg-primary text-white"
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                {isGenerating ? 'Generating...' : 'Generate PDF Report'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Instructions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>About This Report</CardTitle>
                        <CardDescription>
                            The daily attendance report provides detailed attendance information organized by date
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-gray-700 space-y-4">
                            <p>
                                This report will show attendance records for each day in your selected date range, organized by date.
                                For each day, you'll see:
                            </p>

                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Employee information</strong> - Name, ID, department and designation</li>
                                <li><strong>Check-in time</strong> - The time each employee checked in</li>
                                <li><strong>Check-out time</strong> - The time each employee checked out</li>
                                <li><strong>Status</strong> - Present, absent, late, half day or leave</li>
                                <li><strong>Device</strong> - The attendance device used</li>
                                <li><strong>Remarks</strong> - Additional information like late arrivals, overtime, etc.</li>
                            </ul>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                <h4 className="font-medium text-blue-900 mb-2">Department Filtering Options:</h4>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• <strong>All Departments:</strong> Include all departments in the report</li>
                                    <li>• <strong>Specific Department:</strong> Include only the selected department</li>
                                    <li>• <strong>Exclude Departments:</strong> When "All Departments" is selected, you can exclude specific departments from the report</li>
                                </ul>
                            </div>

                            <p>
                                The report will be generated as a PDF file that you can download, print, or share with others.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
