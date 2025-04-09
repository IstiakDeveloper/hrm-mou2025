import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
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
    AlertTriangle
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, differenceInDays } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    const [dateRange, setDateRange] = useState({
        start: startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7)),
        end: endDate ? new Date(endDate) : new Date()
    });
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

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

    const resetFilters = () => {
        setBranchId('');
        setDepartmentId('');
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

        // Create the URL with query parameters
        const url = route('attendance.pdf', {
            start_date: startDateStr,
            end_date: endDateStr,
            branch_id: branchId || '',
            department_id: departmentId || ''
        });

        // Open the PDF in a new tab/window
        window.open(url, '_blank');

        setIsGenerating(false);
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
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                    {branch.name}
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
                                disabled={isGenerating || !userPermissions.canExportPdf}
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
