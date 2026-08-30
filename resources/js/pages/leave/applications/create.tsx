import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
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
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, CalendarIcon, Trash2, Upload, InfoIcon, Paperclip, AlertCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { employeeDisplayName } from '@/lib/employee-name';

interface LeaveType {
    id: number;
    name: string;
    days_allowed: number;
    is_paid: boolean;
    description: string | null;
}

interface LeaveBalance {
    id: number;
    employee_id: number;
    leave_type_id: number;
    year: number;
    allocated_days: number;
    used_days: number;
    remaining_days: number;
    leaveType?: LeaveType;
    leave_type?: LeaveType;
}

interface Employee {
    id: number;
    employee_id: string;
    name_en?: string;
    full_name_en?: string;
    full_name?: string;
    department?: { id: number; name: string };
    designation?: { id: number; name: string };
}

interface UserPermissions {
    canCreate: boolean;
    canEdit: boolean;
    canApprove: boolean;
    isEmployee: boolean;
}

interface CreateProps {
    employee: Employee;
    leaveTypes: LeaveType[];
    balances: LeaveBalance[];
    userPermissions: UserPermissions;
}

export default function Create({ employee, leaveTypes, balances, userPermissions }: CreateProps) {
    const { auth } = usePage().props as any;
    const [leaveTypeId, setLeaveTypeId] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [reason, setReason] = useState('');
    const [documents, setDocuments] = useState<File[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);
    const [autoApprove, setAutoApprove] = useState(false);
    const [autoApproveEligible, setAutoApproveEligible] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calculate leave days
    const calculateLeaveDays = () => {
        if (!startDate || !endDate) return 0;
        return differenceInDays(endDate, startDate) + 1;
    };

    const leaveDays = calculateLeaveDays();

    // Selected leave type
    const selectedLeaveType = leaveTypeId
        ? leaveTypes.find(lt => lt.id.toString() === leaveTypeId)
        : null;

    const isUnpaidLeave = selectedLeaveType && !selectedLeaveType.is_paid;
    const isMedicalLeave = selectedLeaveType && (
        selectedLeaveType.name?.toLowerCase().includes('medical') ||
        selectedLeaveType.name?.toLowerCase().includes('sick') ||
        selectedLeaveType.name?.includes('চিকিৎসা')
    );

    // Find selected leave type balance
    const selectedLeaveBalance = leaveTypeId
        ? balances.find(b => (b.leave_type_id?.toString() === leaveTypeId || b.leaveType?.id?.toString() === leaveTypeId))
        : null;

    // Check auto approve eligibility only when creating on behalf of someone else
    const isCreatingForOther = !userPermissions.isEmployee || (auth?.user?.employee_id && auth.user.employee_id !== employee.id);

    useEffect(() => {
        if (!isCreatingForOther || !userPermissions.canApprove || leaveDays < 1) {
            setAutoApproveEligible(false);
            setAutoApprove(false);
            return;
        }

        let cancelled = false;
        const url = route('leave.applications.auto-approve-eligibility', { days: leaveDays });

        fetch(url, {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((r) => r.json())
            .then((data: { eligible?: boolean }) => {
                if (cancelled) return;
                const ok = !!data.eligible;
                setAutoApproveEligible(ok);
                if (!ok) setAutoApprove(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setAutoApproveEligible(false);
                    setAutoApprove(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [leaveDays, userPermissions.canApprove, isCreatingForOther]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setDocuments(prev => [...prev, ...newFiles]);
            if (errors.documents) {
                setErrors(prev => {
                    const next = { ...prev };
                    delete next.documents;
                    return next;
                });
            }
        }
    };

    const removeDocument = (index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!leaveTypeId) newErrors.leaveTypeId = 'Leave type is required';
        if (!startDate) newErrors.startDate = 'Start date is required';
        if (!endDate) newErrors.endDate = 'End date is required';
        if (!reason.trim()) newErrors.reason = 'Reason is required';

        // Check date order
        if (endDate && startDate && endDate < startDate) {
            newErrors.endDate = 'End date cannot be before start date';
        }

        // Mandatory attachment for Medical Leave
        if (isMedicalLeave && documents.length === 0) {
            newErrors.documents = 'Medical certificate / supporting document is mandatory for Medical Leave application.';
        }

        // Check leave balance only for paid leaves (skip for unpaid leaves or admins with edit permission)
        if (!isUnpaidLeave && !userPermissions.canEdit) {
            if (!selectedLeaveBalance) {
                newErrors.leaveTypeId = 'You do not have an active leave balance for this paid leave type.';
            } else if (leaveDays > selectedLeaveBalance.remaining_days) {
                newErrors.leaveTypeId = `Not enough leave balance. Available: ${selectedLeaveBalance.remaining_days} days, Requested: ${leaveDays} days`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);

        const formData = new FormData();
        formData.append('employee_id', employee.id.toString());
        formData.append('leave_type_id', leaveTypeId);
        formData.append('start_date', startDate ? format(startDate, 'yyyy-MM-dd') : '');
        formData.append('end_date', endDate ? format(endDate, 'yyyy-MM-dd') : '');
        formData.append('reason', reason);
        formData.append('client_calculated_days', leaveDays.toString());

        if (isCreatingForOther && userPermissions.canApprove) {
            formData.append('auto_approve', autoApprove ? '1' : '0');
        }

        documents.forEach(file => {
            formData.append('documents[]', file);
        });

        router.post(route('leave.applications.store'), formData, {
            onError: (errs) => {
                setErrors(errs as Record<string, string>);
                setSubmitting(false);
            },
            onFinish: () => setSubmitting(false)
        });
    };

    return (
        <Layout>
            <Head title="Apply for Leave" />

            <PageSurface className="max-w-4xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="mb-2">
                    <Link
                        href={route('leave.applications.index')}
                        className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        <span>Back to Leave Applications</span>
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-base sm:text-xl font-bold text-gray-900">Apply for Leave</h1>
                        <p className="text-xs text-gray-500">Submit your leave request for supervisor review & approval</p>
                    </div>
                </div>

                {/* Main form layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="lg:col-span-2">
                        <Card className="shadow-xs border-slate-200">
                            <CardHeader className="bg-gray-50/80 px-3 py-2 sm:px-4 border-b">
                                <CardTitle className="text-xs font-bold tracking-wider text-gray-900 uppercase">Leave Application Form</CardTitle>
                                <CardDescription className="text-[10px] text-gray-500">Fill in the leave details below</CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-5">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Leave type selector */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="leaveType" className="text-xs font-medium text-gray-700">Leave Type *</Label>
                                            {isUnpaidLeave && (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                                                    Unpaid Leave (বিনা বেতনে ছুটি)
                                                </Badge>
                                            )}
                                        </div>
                                        <Select
                                            value={leaveTypeId}
                                            onValueChange={(val) => {
                                                setLeaveTypeId(val);
                                                if (errors.leaveTypeId || errors.leave_type_id) {
                                                    setErrors(prev => {
                                                        const next = { ...prev };
                                                        delete next.leaveTypeId;
                                                        delete next.leave_type_id;
                                                        return next;
                                                    });
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="leaveType" className="h-9 text-xs">
                                                <SelectValue placeholder="Select Leave Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {leaveTypes.map((lt) => (
                                                    <SelectItem key={lt.id} value={lt.id.toString()}>
                                                        <span className="font-medium">{lt.name}</span>
                                                        <span className="ml-1.5 text-slate-500">
                                                            {lt.is_paid ? `(Paid · ${lt.days_allowed}d)` : '(Unpaid / বিনা বেতন)'}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.leaveTypeId && (
                                            <p className="text-xs font-medium text-red-500">{errors.leaveTypeId}</p>
                                        )}
                                        {errors.leave_type_id && (
                                            <p className="text-xs font-medium text-red-500">{errors.leave_type_id}</p>
                                        )}
                                        {isUnpaidLeave && (
                                            <p className="text-[11px] text-amber-700 bg-amber-50/70 p-2 rounded border border-amber-200 mt-1">
                                                Unpaid Leave allows you to apply for any required duration without balance deduction. Upon supervisor approval, this leave will be marked as without pay.
                                            </p>
                                        )}
                                    </div>

                                    {/* Date selection fields */}
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                        {/* Start date picker */}
                                        <div className="space-y-1">
                                            <Label className="text-xs font-medium text-gray-700">Start Date *</Label>
                                            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal text-xs h-9",
                                                            !startDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-500" />
                                                        {startDate ? format(startDate, 'dd MMM yyyy') : <span>Select start date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={startDate || undefined}
                                                        onSelect={(date) => {
                                                            setStartDate(date || null);
                                                            if (date && (!endDate || endDate < date)) {
                                                                setEndDate(date);
                                                            }
                                                            setStartDateOpen(false);
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.startDate && (
                                                <p className="text-xs font-medium text-red-500">{errors.startDate}</p>
                                            )}
                                            {errors.start_date && (
                                                <p className="text-xs font-medium text-red-500">{errors.start_date}</p>
                                            )}
                                        </div>

                                        {/* End date picker */}
                                        <div className="space-y-1">
                                            <Label className="text-xs font-medium text-gray-700">End Date *</Label>
                                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal text-xs h-9",
                                                            !endDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-500" />
                                                        {endDate ? format(endDate, 'dd MMM yyyy') : <span>Select end date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={endDate || undefined}
                                                        onSelect={(date) => {
                                                            setEndDate(date || null);
                                                            setEndDateOpen(false);
                                                        }}
                                                        disabled={(date) => (startDate ? date < startDate : false)}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.endDate && (
                                                <p className="text-xs font-medium text-red-500">{errors.endDate}</p>
                                            )}
                                            {errors.end_date && (
                                                <p className="text-xs font-medium text-red-500">{errors.end_date}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Leave days summary */}
                                    <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                                        <span className="text-slate-600">Total Requested Duration:</span>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold px-2 py-0.5">
                                            {leaveDays} {leaveDays === 1 ? 'day' : 'days'}
                                        </Badge>
                                    </div>

                                    {/* Reason field */}
                                    <div className="space-y-1">
                                        <Label htmlFor="reason" className="text-xs font-medium text-gray-700">Reason for Leave *</Label>
                                        <Textarea
                                            id="reason"
                                            placeholder="Please describe the reason for your leave request in detail..."
                                            rows={3}
                                            className="text-xs"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        />
                                        {errors.reason && (
                                            <p className="text-xs font-medium text-red-500">{errors.reason}</p>
                                        )}
                                    </div>

                                    {/* Document Upload Section */}
                                    <div className="space-y-2 pt-1 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <Label className={cn("text-xs font-medium", isMedicalLeave ? "text-rose-600 font-semibold" : "text-gray-700")}>
                                                Supporting Documents / Attachments {isMedicalLeave ? <span className="text-rose-600">* (Mandatory for Medical Leave)</span> : <span className="text-gray-400 font-normal">(Optional)</span>}
                                            </Label>
                                            {isMedicalLeave && (
                                                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                                                    Certificate Required
                                                </Badge>
                                            )}
                                        </div>

                                        {isMedicalLeave && (
                                            <Alert className="p-2.5 text-xs bg-rose-50 border-rose-200 text-rose-800">
                                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mr-1.5" />
                                                <AlertDescription className="text-[11px] leading-snug">
                                                    Medical Leave requires a medical certificate, prescription, or hospital document to be submitted. Approver will review this document before approval.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            multiple
                                            accept=".jpeg,.jpg,.png,.pdf,.doc,.docx"
                                            className="hidden"
                                        />

                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className={cn(
                                                "border-2 border-dashed rounded-lg p-3 sm:p-4 text-center cursor-pointer transition-colors",
                                                isMedicalLeave && documents.length === 0
                                                    ? "border-rose-300 bg-rose-50/40 hover:bg-rose-50"
                                                    : "border-gray-200 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30"
                                            )}
                                        >
                                            <Upload className={cn("mx-auto h-5 w-5 mb-1", isMedicalLeave && documents.length === 0 ? "text-rose-500" : "text-gray-400")} />
                                            <p className="text-xs font-medium text-gray-700">Click to browse or upload documents</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Supports PDF, JPG, PNG, DOC, DOCX (Max: 2MB each)</p>
                                        </div>

                                        {errors.documents && (
                                            <p className="text-xs font-medium text-red-500">{errors.documents}</p>
                                        )}

                                        {/* Uploaded Documents List */}
                                        {documents.length > 0 && (
                                            <div className="space-y-1.5 mt-2">
                                                <p className="text-[11px] font-medium text-slate-700">Selected Files ({documents.length}):</p>
                                                {documents.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 text-xs">
                                                        <div className="flex items-center space-x-2 truncate">
                                                            <Paperclip className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                                            <span className="truncate max-w-[220px] font-medium text-slate-800">{file.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">({(file.size / 1024).toFixed(1)} KB)</span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => removeDocument(index)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Auto-approve (Only available when an authorized admin is creating on behalf of someone else) */}
                                    {isCreatingForOther && userPermissions.canApprove && autoApproveEligible && leaveDays >= 1 && (
                                        <div className="space-y-2 p-3 rounded-md bg-emerald-50/70 border border-emerald-200">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="auto-approve"
                                                    checked={autoApprove}
                                                    onCheckedChange={(checked) => setAutoApprove(!!checked)}
                                                />
                                                <label
                                                    htmlFor="auto-approve"
                                                    className="text-xs font-medium text-emerald-900 cursor-pointer"
                                                >
                                                    Auto-approve this leave application (as authorized administrator)
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit buttons */}
                                    <div className="flex justify-end space-x-2 pt-3 border-t">
                                        <Link href={route('leave.applications.index')}>
                                            <Button variant="outline" type="button" size="sm" className="text-xs">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button type="submit" disabled={submitting} size="sm" className="text-xs">
                                            {submitting ? 'Submitting...' : 'Submit Application'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Panel: Employee & Leave Balance Information */}
                    <div className="lg:col-span-1 space-y-3">
                        <Card className="shadow-xs border-slate-200">
                            <CardHeader className="bg-gray-50/80 px-3 py-2 border-b">
                                <CardTitle className="text-xs font-bold tracking-wider text-gray-900 uppercase">Applicant Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 text-xs space-y-2.5">
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Name</p>
                                    <p className="font-semibold text-slate-900">{employeeDisplayName(employee)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Employee ID</p>
                                        <p className="font-mono text-slate-800">{employee.employee_id}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Department</p>
                                        <p className="truncate text-slate-800">{employee.department?.name || '—'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Designation</p>
                                    <p className="text-slate-800 font-medium">{employee.designation?.name || '—'}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs border-slate-200">
                            <CardHeader className="bg-gray-50/80 px-3 py-2 border-b">
                                <CardTitle className="text-xs font-bold tracking-wider text-gray-900 uppercase">Leave Balances ({new Date().getFullYear()})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2">
                                {balances.length > 0 ? (
                                    balances.map(balance => {
                                        const typeName = balance.leaveType?.name || balance.leave_type?.name;
                                        const isPaid = balance.leaveType?.is_paid ?? balance.leave_type?.is_paid ?? true;
                                        const isSelected = selectedLeaveBalance?.id === balance.id;

                                        return (
                                            <div
                                                key={balance.id}
                                                className={cn(
                                                    "p-2 rounded-md border text-xs transition-colors",
                                                    isSelected ? "border-blue-500 bg-blue-50/60" : "border-slate-200 bg-slate-50/40"
                                                )}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-slate-800">{typeName}</span>
                                                    {isPaid ? (
                                                        <Badge variant={balance.remaining_days > 0 ? "outline" : "destructive"} className={balance.remaining_days > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0" : "text-[10px] py-0"}>
                                                            {balance.remaining_days} left
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] py-0">
                                                            Unpaid
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                                                    <span>Used: {balance.used_days} days</span>
                                                    {isPaid && <span>Allocated: {balance.allocated_days} days</span>}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                                        No paid leave balances assigned for current year.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageSurface>
        </Layout>
    );
}

// Additional component for administrators to create leave applications for any employee
export function AdminCreate({ employees, leaveTypes }: { employees: Employee[], leaveTypes: LeaveType[] }) {
    const [employeeId, setEmployeeId] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeeBalances, setEmployeeBalances] = useState<LeaveBalance[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (employeeId) {
            setLoading(true);

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

    return (
        <Layout>
            <Head title="Create Leave Application" />

            <PageSurface className="max-w-xl space-y-3 px-1.5 py-1.5 sm:px-3 sm:py-2.5">
                <div className="mb-2">
                    <Link href={route('leave.applications.index')} className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                        <span>Back to Leave Applications</span>
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold text-gray-900">Create Leave Application</h1>
                </div>

                <Alert className="mb-4 text-xs">
                    <InfoIcon className="h-4 w-4" />
                    <AlertDescription>
                        As an administrator, you can create leave applications on behalf of any employee.
                    </AlertDescription>
                </Alert>

                <Card className="max-w-xl mx-auto shadow-xs border-slate-200">
                    <CardHeader className="bg-gray-50/80 px-4 py-3 border-b">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-900">Select Employee</CardTitle>
                        <CardDescription className="text-xs text-gray-500">Choose an employee to create a leave application for</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="employee" className="text-xs font-medium text-gray-700">Employee</Label>
                                <Select
                                    value={employeeId}
                                    onValueChange={setEmployeeId}
                                >
                                    <SelectTrigger id="employee" className="h-9 text-xs">
                                        <SelectValue placeholder="Select an employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id.toString()}>
                                                {employeeDisplayName(emp)} ({emp.employee_id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    size="sm"
                                    className="text-xs"
                                    disabled={!employeeId || loading}
                                >
                                    {loading ? 'Loading...' : 'Continue'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
