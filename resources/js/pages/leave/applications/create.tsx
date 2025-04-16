import React, { useState, FormEvent, useRef, ChangeEvent, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, CalendarIcon, Trash2, Upload, InfoIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

// Rest of the imports and interfaces remain the same

export default function Create({ employee, leaveTypes, balances, userPermissions }) {
    const { auth } = usePage().props as any;
    const [leaveTypeId, setLeaveTypeId] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [reason, setReason] = useState('');
    const [documents, setDocuments] = useState([]);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);
    const [autoApprove, setAutoApprove] = useState(false);
    const fileInputRef = useRef(null);

    // Calculate leave days - FIXED DATE CALCULATION
    const calculateLeaveDays = () => {
        if (!startDate || !endDate) return 0;

        // Add 1 to include both the start and end day
        return differenceInDays(endDate, startDate) + 1;
    };

    const leaveDays = calculateLeaveDays();

    // Update calculation whenever dates change
    useEffect(() => {
        // Add debugging to see dates and calculation
        if (startDate && endDate) {
            console.log("Start date:", format(startDate, 'yyyy-MM-dd'));
            console.log("End date:", format(endDate, 'yyyy-MM-dd'));
            console.log("Days calculated:", leaveDays);
        }
    }, [startDate, endDate, leaveDays]);

    // Find selected leave type balance
    const selectedLeaveBalance = leaveTypeId
        ? balances.find(b => b.leave_type_id.toString() === leaveTypeId)
        : null;

    // Find selected leave type
    const selectedLeaveType = leaveTypeId
        ? leaveTypes.find(lt => lt.id.toString() === leaveTypeId)
        : null;

    // Handle various events (file upload, drag/drop, form submission)
    // These functions remain mostly the same, with validation adjusted

    const validateForm = () => {
        const newErrors = {};

        if (!leaveTypeId) newErrors.leaveTypeId = 'Leave type is required';
        if (!startDate) newErrors.startDate = 'Start date is required';
        if (!endDate) newErrors.endDate = 'End date is required';
        if (!reason.trim()) newErrors.reason = 'Reason is required';

        // Check dates - only for non-admins
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate && !userPermissions.canEdit && startDate < today) {
            newErrors.startDate = 'Start date must be in the future';
        }

        if (endDate && startDate && endDate < startDate) {
            newErrors.endDate = 'End date cannot be before start date';
        }

        // Check leave balance - skip for admins with edit permission
        if (!userPermissions.canEdit && selectedLeaveBalance && leaveDays > selectedLeaveBalance.remaining_days) {
            newErrors.leaveTypeId = `Not enough leave balance. Available: ${selectedLeaveBalance.remaining_days} days, Requested: ${leaveDays} days`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);

        const formData = new FormData();
        formData.append('leave_type_id', leaveTypeId);
        formData.append('start_date', format(startDate, 'yyyy-MM-dd'));
        formData.append('end_date', format(endDate, 'yyyy-MM-dd'));
        formData.append('reason', reason);

        // Add debugging help - send calculated days to compare with server
        formData.append('client_calculated_days', leaveDays.toString());

        // Add auto-approve flag if admin is creating
        if (userPermissions.canApprove) {
            formData.append('auto_approve', autoApprove ? '1' : '0');
        }

        documents.forEach(file => {
            formData.append('documents[]', file);
        });

        router.post(route('leave.applications.store'), formData, {
            onError: (errors) => {
                setErrors(errors);
                setSubmitting(false);
            },
            onFinish: () => setSubmitting(false)
        });
    };

    // Rest of the component remains the same

    return (
        <Layout>
            <Head title="Apply for Leave" />

            <div className="container mx-auto py-8">
                {/* Header and navigation */}
                <div className="mb-6">
                    <Link href={route('leave.applications.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Leave Applications
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Apply for Leave</h1>
                </div>

                {/* Help information based on user role */}
                {userPermissions.canApprove && (
                    <Alert className="mb-6">
                        <InfoIcon className="h-4 w-4" />
                        <AlertDescription>
                            You are creating a leave application as an administrator. You can optionally auto-approve this application.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main form layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Leave Application</CardTitle>
                                <CardDescription>Submit your leave request for approval</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Leave type selector */}
                                    <div className="space-y-2">
                                        <Label htmlFor="leaveType">Leave Type</Label>
                                        <Select
                                            value={leaveTypeId}
                                            onValueChange={setLeaveTypeId}
                                        >
                                            <SelectTrigger id="leaveType">
                                                <SelectValue placeholder="Select Leave Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {leaveTypes.map((leaveType) => (
                                                    <SelectItem key={leaveType.id} value={leaveType.id.toString()}>
                                                        {leaveType.name} {leaveType.is_paid ? '(Paid)' : '(Unpaid)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.leaveTypeId && (
                                            <p className="text-sm font-medium text-red-500">{errors.leaveTypeId}</p>
                                        )}
                                        {errors.leave_type_id && (
                                            <p className="text-sm font-medium text-red-500">{errors.leave_type_id}</p>
                                        )}
                                    </div>

                                    {/* Date selection fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Start date picker */}
                                        <div className="space-y-2">
                                            <Label>Start Date</Label>
                                            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !startDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={startDate}
                                                        onSelect={(date) => {
                                                            setStartDate(date);
                                                            if (date && (!endDate || endDate < date)) {
                                                                setEndDate(date);
                                                            }
                                                            setStartDateOpen(false);
                                                        }}
                                                        initialFocus
                                                        disabled={(date) => {
                                                            // Admin users with edit permission can select past dates
                                                            if (userPermissions.canEdit) return false;

                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            return date < today;
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.startDate && (
                                                <p className="text-sm font-medium text-red-500">{errors.startDate}</p>
                                            )}
                                            {errors.start_date && (
                                                <p className="text-sm font-medium text-red-500">{errors.start_date}</p>
                                            )}
                                        </div>

                                        {/* End date picker */}
                                        <div className="space-y-2">
                                            <Label>End Date</Label>
                                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !endDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={endDate}
                                                        onSelect={(date) => {
                                                            setEndDate(date);
                                                            setEndDateOpen(false);
                                                        }}
                                                        initialFocus
                                                        disabled={(date) => {
                                                            // Admin users with edit permission have more flexibility
                                                            if (userPermissions.canEdit) {
                                                                return startDate ? date < startDate : false;
                                                            }

                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            return startDate ? date < startDate : date < today;
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.endDate && (
                                                <p className="text-sm font-medium text-red-500">{errors.endDate}</p>
                                            )}
                                            {errors.end_date && (
                                                <p className="text-sm font-medium text-red-500">{errors.end_date}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Leave days calculation - with debug info */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Leave Days</Label>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {leaveDays} {leaveDays === 1 ? 'day' : 'days'}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {startDate && endDate ? (
                                                <span>
                                                    From {format(startDate, 'MMM d, yyyy')} to {format(endDate, 'MMM d, yyyy')}
                                                    {" "}- {leaveDays} {leaveDays === 1 ? 'day' : 'days'} (inclusive)
                                                </span>
                                            ) : (
                                                "Total number of leave days requested"
                                            )}
                                        </div>
                                    </div>

                                    {/* Rest of the form remains the same */}
                                    <div className="space-y-2">
                                        <Label htmlFor="reason">Reason for Leave</Label>
                                        <Textarea
                                            id="reason"
                                            placeholder="Provide a detailed reason for your leave request"
                                            rows={4}
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        />
                                        {errors.reason && (
                                            <p className="text-sm font-medium text-red-500">{errors.reason}</p>
                                        )}
                                    </div>

                                    {/* File upload section */}
                                    {/* Rest of the form remains the same */}

                                    {/* Auto-approve option for admins */}
                                    {userPermissions.canApprove && (
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="auto-approve"
                                                checked={autoApprove}
                                                onCheckedChange={(checked) => {
                                                    setAutoApprove(checked);
                                                }}
                                            />
                                            <label
                                                htmlFor="auto-approve"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                Auto-approve this leave application
                                            </label>
                                        </div>
                                    )}

                                    {/* Submit buttons */}
                                    <div className="flex justify-end space-x-2">
                                        <Link href={route('leave.applications.index')}>
                                            <Button variant="outline" type="button">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button type="submit" disabled={submitting}>
                                            {submitting ? 'Submitting...' : 'Submit Application'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>Employee Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Name</p>
                                        <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Employee ID</p>
                                        <p>{employee.employee_id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Department</p>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            {employee.department?.name || 'No Department'}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Designation</p>
                                        <p>{employee.designation?.name}</p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <h3 className="font-medium">Leave Balances</h3>
                                    <div className="mt-2 space-y-2">
                                        {balances.length > 0 ? (
                                            balances.map(balance => (
                                                <div
                                                    key={balance.id}
                                                    className={cn(
                                                        "p-3 rounded-md border",
                                                        selectedLeaveBalance?.id === balance.id ? "border-blue-500 bg-blue-50" : ""
                                                    )}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium">{balance.leaveType?.name}</span>
                                                        <Badge variant={balance.remaining_days > 0 ? "outline" : "destructive"} className={balance.remaining_days > 0 ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                                            {balance.remaining_days} left
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-1 text-sm text-gray-500">
                                                        {balance.used_days} used of {balance.allocated_days} days
                                                    </div>
                                                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-blue-600 h-2 rounded-full"
                                                            style={{ width: `${Math.min(100, (balance.used_days / balance.allocated_days) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800">
                                                No leave balances found for the current year.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// Additional component for administrators to create leave applications for any employee
export function AdminCreate({ employees, leaveTypes }: { employees: Employee[], leaveTypes: LeaveType[] }) {
    const [employeeId, setEmployeeId] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeeBalances, setEmployeeBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(false);

    // Load employee data when selected
    useEffect(() => {
        if (employeeId) {
            setLoading(true);

            // Fetch employee details and leave balances
            fetch(`/api/employees/${employeeId}/leave-balances`)
                .then(response => response.json())
                .then(data => {
                    setSelectedEmployee(data.employee);
                    setEmployeeBalances(data.balances);
                })
                .catch(error => {
                    console.error('Error loading employee data:', error);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setSelectedEmployee(null);
            setEmployeeBalances([]);
        }
    }, [employeeId]);

    // If an employee is selected, render the regular create form with their data
    if (selectedEmployee) {
        return (
            <Create
                employee={selectedEmployee}
                leaveTypes={leaveTypes}
                balances={employeeBalances}
                userPermissions={{
                    canCreate: true,
                    canEdit: true,
                    canApprove: true,
                    isEmployee: false
                }}
            />
        );
    }

    // Otherwise show the employee selection form
    return (
        <Layout>
            <Head title="Create Leave Application" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('leave.applications.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Leave Applications
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Create Leave Application</h1>
                </div>

                <Alert className="mb-6">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                        As an administrator, you can create leave applications for any employee.
                    </AlertDescription>
                </Alert>

                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle>Select Employee</CardTitle>
                        <CardDescription>Choose an employee to create a leave application for</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="employee">Employee</Label>
                                <Select
                                    value={employeeId}
                                    onValueChange={setEmployeeId}
                                >
                                    <SelectTrigger id="employee">
                                        <SelectValue placeholder="Select an employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((employee) => (
                                            <SelectItem key={employee.id} value={employee.id.toString()}>
                                                {employee.first_name} {employee.last_name} ({employee.employee_id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    disabled={!employeeId || loading}
                                    onClick={() => {/* Selection happens automatically via the useEffect */ }}
                                >
                                    {loading ? 'Loading...' : 'Continue'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
