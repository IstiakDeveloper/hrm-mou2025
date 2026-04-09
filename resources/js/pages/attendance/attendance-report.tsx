import React, { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import AppLayout from '@/layouts/AdminLayout';
import { format, parseISO } from 'date-fns';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
    AlertCircle,
    AlertTriangle,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    Clock,
    Download,
    FileText,
    Info,
    LogOut,
    MessageSquare,
    XCircle
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Employee {
    id: number;
    name: string;
}

interface Attendance {
    id?: number;
    employee_id?: number;
    date?: string;
    check_in?: string | null;
    check_out?: string | null;
    check_in_formatted?: string | null;
    check_out_formatted?: string | null;
    status?: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'on_duty';
    remarks?: string | null;
    auto_remarks?: string | null;
    device?: {
        id: number;
        name: string;
    } | null;
}

interface Leave {
    id: number;
    type: string;
    reason: string;
}

interface Movement {
    id: number;
    type: 'official' | 'personal';
    purpose: string;
    destination: string | null;
}

interface ReportItem {
    date: string;
    day: string;
    attendance: Attendance | null;
    leave: Leave | null;
    movement: Movement | null;
}

interface UserPermissions {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canSyncDevices: boolean;
    isEmployee: boolean;
    isBranchManager: boolean;
    isDepartmentHead: boolean;
}

interface AttendanceReportProps extends PageProps {
    employees: Employee[];
    reports: ReportItem[];
    employee_name: string;
    from_date: string;
    to_date: string;
    userPermissions: UserPermissions;
}

export default function AttendanceReport({ auth, employees, reports, employee_name, from_date, to_date, userPermissions }: AttendanceReportProps) {
    const { data, setData, post, processing, errors } = useForm({
        employee_id: '',
        from_date: '',
        to_date: '',
    });

    // Debug logs
    useEffect(() => {
        console.log('Reports data received:', reports);
        console.log('Employee name:', employee_name);
        console.log('Date range:', from_date, 'to', to_date);
    }, [reports, employee_name, from_date, to_date]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting form with data:', data);
        post(route('attendance.report'));
    };


    // Formatting functions
    const formatTime = (time: string | null | undefined) => {
        if (!time) return '-';
        try {
            // Parse time string in 24-hour format and convert to AM/PM
            return format(parseISO(`2000-01-01T${time}`), 'hh:mm a');
        } catch (error) {
            console.error('Error formatting time:', time, error);
            return time; // Fallback to original format if parsing fails
        }
    };

    const handleDownloadPdf = () => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route('attendance.report.pdf');
        form.target = '_blank'; // open in new tab

        // Add CSRF token
        const csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = '_token';
        csrfInput.value = csrf;
        form.appendChild(csrfInput);

        // Add form data
        const formData = {
            employee_id: data.employee_id || '',
            from_date: data.from_date || from_date || '',
            to_date: data.to_date || to_date || '',
        };

        Object.entries(formData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });

        // Append and submit form
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form); // cleanup
    };


    const formatDate = (date: string) => {
        try {
            return format(parseISO(date), 'dd MMM yyyy');
        } catch (error) {
            console.error('Error formatting date:', date, error);
            return date;
        }
    };

    // Helper functions for UI elements
    const getStatusBadgeVariant = (status: string | undefined) => {
        if (!status) return "secondary";

        const statusVariants: Record<string, "default" | "destructive" | "outline" | "secondary" | "success" | "warning"> = {
            present: "success",
            absent: "destructive",
            late: "warning",
            half_day: "warning",
            leave: "secondary",
            on_duty: "outline",
        };

        return statusVariants[status] || "secondary";
    };

    const getStatusBadge = (status: string | undefined) => {
        if (!status) {
            console.log('No status provided for badge');
            return null;
        }

        const statusColors: Record<string, string> = {
            present: 'bg-green-100 text-green-800',
            absent: 'bg-red-100 text-red-800',
            late: 'bg-orange-100 text-orange-800',
            half_day: 'bg-yellow-100 text-yellow-800',
            leave: 'bg-blue-100 text-blue-800',
            on_duty: 'bg-purple-100 text-purple-800'
        };

        const statusColor = statusColors[status] || 'bg-gray-100 text-gray-800';
        console.log('Status badge for:', status, 'using color:', statusColor);

        // Icon based on status
        const getStatusIcon = () => {
            switch (status) {
                case 'present':
                    return <CheckCircle className="mr-1 h-3 w-3" />;
                case 'absent':
                    return <XCircle className="mr-1 h-3 w-3" />;
                case 'late':
                    return <Clock className="mr-1 h-3 w-3" />;
                case 'on_duty':
                    return <Info className="mr-1 h-3 w-3" />;
                default:
                    return null;
            }
        };

        return (
            <Badge variant="outline" className={`${statusColor} border-0 flex items-center`}>
                {getStatusIcon()}
                <span>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</span>
            </Badge>
        );
    };

    const getRemarksIcon = (remarks: string) => {
        if (remarks.includes('Late')) {
            return <Clock className="mr-1 h-4 w-4 text-orange-500" />;
        } else if (remarks.includes('Overtime')) {
            return <Clock className="mr-1 h-4 w-4 text-blue-500" />;
        } else if (remarks.includes('Half day')) {
            return <AlertTriangle className="mr-1 h-4 w-4 text-yellow-500" />;
        } else if (remarks.includes('Weekend')) {
            return <CalendarIcon className="mr-1 h-4 w-4 text-purple-500" />;
        } else if (remarks === 'Regular') {
            return <CheckCircle className="mr-1 h-4 w-4 text-green-500" />;
        } else if (remarks === 'Absent') {
            return <XCircle className="mr-1 h-4 w-4 text-red-500" />;
        } else if (remarks.includes('Left early')) {
            return <LogOut className="mr-1 h-4 w-4 text-red-500" />;
        } else if (remarks.includes('Missing')) {
            return <AlertCircle className="mr-1 h-4 w-4 text-orange-500" />;
        } else {
            return <MessageSquare className="mr-1 h-4 w-4 text-gray-500" />;
        }
    };

    const hasReports = reports && reports.length > 0;
    console.log('Has reports:', hasReports, 'Count:', reports?.length);

    return (
        <AppLayout
            title="Attendance Report"
            renderHeader={() => (
                <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">
                    Attendance Report
                </h2>
            )}
        >
            <Head title="Attendance Report" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employee Attendance Report</CardTitle>
                            <CardDescription>
                                Select an employee and date range to view attendance records
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="employee_id">Select Employee</Label>
                                        <Select
                                            value={data.employee_id}
                                            onValueChange={(value) => {
                                                console.log('Selected employee ID:', value);
                                                setData('employee_id', value);
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select an employee" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectLabel>Employees</SelectLabel>
                                                    {employees.map((employee) => (
                                                        <SelectItem key={employee.id} value={employee.id.toString()}>
                                                            {employee.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        {errors.employee_id && (
                                            <p className="text-sm text-red-500">{errors.employee_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="from_date">From Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                    id="from_date"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {data.from_date ? formatDate(data.from_date) : <span>Select from date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={data.from_date ? new Date(data.from_date) : undefined}
                                                    onSelect={(date) => {
                                                        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                        console.log('Selected from date:', formattedDate);
                                                        setData('from_date', formattedDate);
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.from_date && (
                                            <p className="text-sm text-red-500">{errors.from_date}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="to_date">To Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                    id="to_date"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {data.to_date ? formatDate(data.to_date) : <span>Select to date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={data.to_date ? new Date(data.to_date) : undefined}
                                                    onSelect={(date) => {
                                                        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                        console.log('Selected to date:', formattedDate);
                                                        setData('to_date', formattedDate);
                                                    }}
                                                    disabled={(date) => {
                                                        if (!data.from_date) return false;
                                                        return date < new Date(data.from_date);
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {errors.to_date && (
                                            <p className="text-sm text-red-500">{errors.to_date}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={processing}>
                                        Generate Report
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {hasReports && (
                        <Card className="mt-6">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleDownloadPdf} className="flex items-center gap-2">
                                        <Download className="h-4 w-4" />
                                        <span>Download PDF</span>
                                    </Button>
                                </div>
                                <div>
                                    <CardTitle>Attendance Report for {employee_name}</CardTitle>
                                    <CardDescription>
                                        Period: {formatDate(from_date)} to {formatDate(to_date)}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50">
                                                <TableHead className="w-[100px]">Date</TableHead>
                                                <TableHead>Day</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Check In</TableHead>
                                                <TableHead>Check Out</TableHead>
                                                <TableHead>Device</TableHead>
                                                <TableHead>Remarks</TableHead>
                                                <TableHead>Leave</TableHead>
                                                <TableHead>Movement</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reports.map((report, index) => {
                                                console.log(`Rendering report item ${index}:`, report);
                                                return (
                                                    <TableRow key={report.date} className="hover:bg-gray-50">
                                                        <TableCell className="font-medium">
                                                            {formatDate(report.date)}
                                                        </TableCell>
                                                        <TableCell>{report.day}</TableCell>
                                                        <TableCell>
                                                            {report.attendance?.status ? (
                                                                getStatusBadge(report.attendance.status)
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {report.attendance?.check_in_formatted ? (
                                                                <div className="flex items-center text-green-700 font-medium">
                                                                    <Clock className="mr-1 h-4 w-4 text-green-500" />
                                                                    {report.attendance.check_in_formatted}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {report.attendance?.check_out_formatted ? (
                                                                <div className="flex items-center text-orange-700 font-medium">
                                                                    <Clock className="mr-1 h-4 w-4 text-orange-500" />
                                                                    {report.attendance.check_out_formatted}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {report.attendance?.device ? (
                                                                <div className="text-sm font-medium">
                                                                    {report.attendance.device.name}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {report.attendance?.auto_remarks ? (
                                                                <div className="flex items-center">
                                                                    {getRemarksIcon(report.attendance.auto_remarks)}
                                                                    <span className="text-sm">{report.attendance.auto_remarks}</span>
                                                                </div>
                                                            ) : report.attendance?.remarks ? (
                                                                <div className="flex items-center">
                                                                    <MessageSquare className="mr-1 h-4 w-4 text-gray-500" />
                                                                    <span className="text-sm">{report.attendance.remarks}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {report.leave ? (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Badge variant="secondary" className="cursor-help">
                                                                                {report.leave.type}
                                                                            </Badge>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p><strong>Reason:</strong> {report.leave.reason || 'No reason provided'}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {report.movement ? (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Badge variant="outline" className="cursor-help">
                                                                                {report.movement.type}
                                                                            </Badge>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p><strong>Purpose:</strong> {report.movement.purpose}</p>
                                                                            {report.movement.destination && (
                                                                                <p><strong>Destination:</strong> {report.movement.destination}</p>
                                                                            )}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ) : (
                                                                <span className="text-gray-500">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {reports.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-24 text-center">
                                                        No attendance records found for this period.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <div className="flex gap-4">
                                    <Badge variant="success" className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-current"></span>
                                        Present
                                    </Badge>
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-current"></span>
                                        Absent
                                    </Badge>
                                    <Badge variant="warning" className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-current"></span>
                                        Late
                                    </Badge>
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-current"></span>
                                        Leave
                                    </Badge>
                                    <Badge variant="outline" className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-current"></span>
                                        On Duty
                                    </Badge>
                                </div>

                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
