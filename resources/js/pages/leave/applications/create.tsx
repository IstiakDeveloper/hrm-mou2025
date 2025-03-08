import React, { useState, FormEvent, useRef, ChangeEvent } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { format, addDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, CalendarIcon, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    department: {
        id: number;
        name: string;
    };
    designation: {
        id: number;
        name: string;
    };
}

interface LeaveType {
    id: number;
    name: string;
    is_paid: boolean;
    days_allowed: number;
}

interface LeaveBalance {
    id: number;
    employee_id: number;
    leave_type_id: number;
    year: number;
    allocated_days: number;
    used_days: number;
    remaining_days: number;
    leaveType: LeaveType;
}

interface CreateProps {
    employee: Employee;
    leaveTypes: LeaveType[];
    balances: LeaveBalance[];
}

export default function Create({ employee, leaveTypes, balances }: CreateProps) {
    const [leaveTypeId, setLeaveTypeId] = useState('');
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [reason, setReason] = useState('');
    const [documents, setDocuments] = useState<File[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate days
    const leaveDays = startDate && endDate
        ? differenceInDays(endDate, startDate) + 1
        : 0;

    // Find selected leave type balance
    const selectedLeaveBalance = leaveTypeId
        ? balances.find(b => b.leave_type_id.toString() === leaveTypeId)
        : null;

    // Find selected leave type
    const selectedLeaveType = leaveTypeId
        ? leaveTypes.find(lt => lt.id.toString() === leaveTypeId)
        : null;

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const fileList = Array.from(e.target.files);

            // Check file size (max 2MB)
            const invalidFiles = fileList.filter(file => file.size > 2 * 1024 * 1024);
            if (invalidFiles.length > 0) {
                setErrors({
                    ...errors,
                    documents: 'Some files exceed the maximum size of 2MB'
                });
                return;
            }

            setDocuments(prev => [...prev, ...fileList]);
            // Clear any previous file errors
            if (errors.documents) {
                const newErrors = { ...errors };
                delete newErrors.documents;
                setErrors(newErrors);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        if (e.dataTransfer.files) {
            const fileList = Array.from(e.dataTransfer.files);

            // Check file size and type
            const validTypes = ['.pdf', '.jpeg', '.jpg', '.png', '.doc', '.docx'];
            const isValidType = (file: File) => {
                return validTypes.some(type => file.name.toLowerCase().endsWith(type));
            };

            const invalidSizeFiles = fileList.filter(file => file.size > 2 * 1024 * 1024);
            const invalidTypeFiles = fileList.filter(file => !isValidType(file));

            if (invalidSizeFiles.length > 0 || invalidTypeFiles.length > 0) {
                setErrors({
                    ...errors,
                    documents: 'Some files exceed the maximum size or have invalid formats'
                });
                return;
            }

            setDocuments(prev => [...prev, ...fileList]);
            // Clear any previous file errors
            if (errors.documents) {
                const newErrors = { ...errors };
                delete newErrors.documents;
                setErrors(newErrors);
            }
        }
    };

    const removeFile = (index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!leaveTypeId) newErrors.leaveTypeId = 'Leave type is required';
        if (!startDate) newErrors.startDate = 'Start date is required';
        if (!endDate) newErrors.endDate = 'End date is required';
        if (!reason.trim()) newErrors.reason = 'Reason is required';

        // Check if dates are in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate && startDate < today) {
            newErrors.startDate = 'Start date must be in the future';
        }

        if (endDate && startDate && endDate < startDate) {
            newErrors.endDate = 'End date cannot be before start date';
        }

        // Check leave balance
        if (selectedLeaveBalance && leaveDays > selectedLeaveBalance.remaining_days) {
            newErrors.leaveTypeId = `Not enough leave balance. Available: ${selectedLeaveBalance.remaining_days} days`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);

        const formData = new FormData();
        formData.append('leave_type_id', leaveTypeId);
        formData.append('start_date', format(startDate as Date, 'yyyy-MM-dd'));
        formData.append('end_date', format(endDate as Date, 'yyyy-MM-dd'));
        formData.append('reason', reason);

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

    return (
        <Layout>
            <Head title="Apply for Leave" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('leave.applications.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Leave Applications
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Apply for Leave</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Leave Application</CardTitle>
                                <CardDescription>Submit your leave request for approval</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Leave Days</Label>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {leaveDays} {leaveDays === 1 ? 'day' : 'days'}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Total number of leave days requested
                                        </div>
                                    </div>

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

                                    <div className="space-y-2">
                                        <Label>Supporting Documents (Optional)</Label>
                                        <div
                                            className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                        >
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <p className="text-sm text-center text-gray-500">
                                                Click to upload documents or drag and drop<br />
                                                PDF, JPEG, PNG, DOC up to 2MB
                                            </p>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept=".pdf,.jpeg,.jpg,.png,.doc,.docx"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                        {errors.documents && (
                                            <p className="text-sm font-medium text-red-500">{errors.documents}</p>
                                        )}

                                        {documents.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                <Label>Uploaded Documents</Label>
                                                <div className="space-y-2">
                                                    {documents.map((file, index) => (
                                                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                                                            <div className="flex-1 truncate mr-2">
                                                                <span className="text-sm">{file.name}</span>
                                                                <span className="text-xs text-gray-500 ml-2">
                                                                    ({(file.size / 1024).toFixed(1)} KB)
                                                                </span>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeFile(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

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
