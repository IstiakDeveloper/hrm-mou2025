import React, { useState, FormEvent, useEffect } from 'react';
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
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    Building,
    Briefcase,
    User,
    FileText,
    CornerDownRight,
    AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Create a safe calendar component to avoid SVG props issues
const SafeCalendar = ({ disabledDates, ...props }: any) => {
    return (
        <Calendar
            {...props}
            modifiers={{
                disabled: disabledDates ? (date: Date) => disabledDates(date) : undefined,
            }}
        />
    );
};

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
    department_id: number | null;
    designation_id: number | null;
    current_branch_id: number | null;
    department?: {
        id: number;
        name: string;
    };
    designation?: {
        id: number;
        name: string;
    };
}

interface Branch {
    id: number;
    name: string;
}

interface Department {
    id: number;
    name: string;
}

interface Designation {
    id: number;
    name: string;
}

interface CreateTransferProps {
    employees: Employee[];
    branches: Branch[];
    departments: Department[];
    designations: Designation[];
}

export default function CreateTransfer({ employees, branches, departments, designations }: CreateTransferProps) {
    const [employeeId, setEmployeeId] = useState('');
    const [fromBranchId, setFromBranchId] = useState('');
    const [toBranchId, setToBranchId] = useState('');
    const [fromDepartmentId, setFromDepartmentId] = useState('');
    const [toDepartmentId, setToDepartmentId] = useState('');
    const [fromDesignationId, setFromDesignationId] = useState('none');  // Changed from '' to 'none'
    const [toDesignationId, setToDesignationId] = useState('same');
    const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(addDays(new Date(), 1));
    const [transferOrderNo, setTransferOrderNo] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [effectiveDateOpen, setEffectiveDateOpen] = useState(false);
    // Selected employee details
    const selectedEmployee = employees.find(emp => emp.id.toString() === employeeId);

    // Effect to set current employee location when selected
    useEffect(() => {
        if (selectedEmployee) {
            setFromBranchId(selectedEmployee.current_branch_id?.toString() || '');
            setFromDepartmentId(selectedEmployee.department_id?.toString() || 'none');
            setFromDesignationId(selectedEmployee.designation_id?.toString() || 'none');
        } else {
            setFromBranchId('');
            setFromDepartmentId('none');
            setFromDesignationId('none');
        }
    }, [employeeId, selectedEmployee]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!employeeId) newErrors.employee_id = 'Employee is required';
        if (!fromBranchId) newErrors.from_branch_id = 'Current branch is required';
        if (!toBranchId) newErrors.to_branch_id = 'Destination branch is required';
        if (fromBranchId === toBranchId) newErrors.to_branch_id = 'Destination branch must be different from current branch';
        if (!effectiveDate) newErrors.effective_date = 'Effective date is required';
        if (!reason.trim()) newErrors.reason = 'Reason is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);

        router.post(route('transfers.store'), {
            employee_id: employeeId,
            from_branch_id: fromBranchId,
            to_branch_id: toBranchId,
            from_department_id: fromDepartmentId === 'none' ? null : fromDepartmentId,
            to_department_id: toDepartmentId === 'same' ? null : toDepartmentId,
            from_designation_id: fromDesignationId === 'none' ? null : fromDesignationId,
            to_designation_id: toDesignationId === 'same' ? null : toDesignationId,
            effective_date: effectiveDate ? format(effectiveDate, 'yyyy-MM-dd') : '',
            transfer_order_no: transferOrderNo,
            reason,
        }, {
            onError: (errors) => {
                setErrors(errors);
                setSubmitting(false);
            },
            onFinish: () => setSubmitting(false)
        });
    };

    // Find current location details for selected employee
    const currentBranch = fromBranchId ? branches.find(branch => branch.id.toString() === fromBranchId) : null;
    const currentDepartment = fromDepartmentId ? departments.find(dept => dept.id.toString() === fromDepartmentId) : null;
    const currentDesignation = fromDesignationId ? designations.find(desig => desig.id.toString() === fromDesignationId) : null;

    // Find destination details
    const destinationBranch = toBranchId ? branches.find(branch => branch.id.toString() === toBranchId) : null;
    const destinationDepartment = toDepartmentId ? departments.find(dept => dept.id.toString() === toDepartmentId) : null;
    const destinationDesignation = toDesignationId ? designations.find(desig => desig.id.toString() === toDesignationId) : null;

    return (
        <Layout>
            <Head title="Create Transfer Request" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('transfers.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Transfers
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Create Transfer Request</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Transfer Details</CardTitle>
                                <CardDescription>Create a new employee transfer request</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="employee">Employee</Label>
                                        <Select
                                            value={employeeId}
                                            onValueChange={setEmployeeId}
                                        >
                                            <SelectTrigger id="employee">
                                                <SelectValue placeholder="Select Employee" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map((employee) => (
                                                    <SelectItem key={employee.id} value={employee.id.toString()}>
                                                        {employee.first_name} {employee.last_name} ({employee.employee_id})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.employee_id && (
                                            <p className="text-sm font-medium text-red-500">{errors.employee_id}</p>
                                        )}
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Current Location */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-gray-900 flex items-center">
                                                <Building className="h-4 w-4 mr-2 text-blue-500" />
                                                Current Location
                                            </h3>

                                            <div className="space-y-2">
                                                <Label htmlFor="fromBranch">Current Branch</Label>
                                                <Select
                                                    value={fromBranchId}
                                                    onValueChange={setFromBranchId}
                                                    disabled={!selectedEmployee}
                                                >
                                                    <SelectTrigger id="fromBranch">
                                                        <SelectValue placeholder="Select Branch" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {branches.map((branch) => (
                                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                                {branch.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.from_branch_id && (
                                                    <p className="text-sm font-medium text-red-500">{errors.from_branch_id}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="fromDepartment">Current Department</Label>
                                                <Select
                                                    value={fromDepartmentId}
                                                    onValueChange={setFromDepartmentId}
                                                    disabled={!selectedEmployee}
                                                >
                                                    <SelectTrigger id="fromDepartment">
                                                        <SelectValue placeholder="Select Department" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None</SelectItem>
                                                        {departments.map((department) => (
                                                            <SelectItem key={department.id} value={department.id.toString()}>
                                                                {department.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="fromDesignation">Current Designation</Label>
                                                <Select
                                                    value={fromDesignationId}
                                                    onValueChange={setFromDesignationId}
                                                    disabled={!selectedEmployee}
                                                >
                                                    <SelectTrigger id="fromDesignation">
                                                        <SelectValue placeholder="Select Designation" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None</SelectItem>
                                                        {designations.map((designation) => (
                                                            <SelectItem key={designation.id} value={designation.id.toString()}>
                                                                {designation.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* New Location */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-gray-900 flex items-center">
                                                <ArrowRight className="h-4 w-4 mr-2 text-green-500" />
                                                New Location
                                            </h3>

                                            <div className="space-y-2">
                                                <Label htmlFor="toBranch">Destination Branch</Label>
                                                <Select
                                                    value={toBranchId}
                                                    onValueChange={setToBranchId}
                                                    disabled={!selectedEmployee}
                                                >
                                                    <SelectTrigger id="toBranch">
                                                        <SelectValue placeholder="Select Branch" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {branches.map((branch) => (
                                                            <SelectItem key={branch.id} value={branch.id.toString()}>
                                                                {branch.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.to_branch_id && (
                                                    <p className="text-sm font-medium text-red-500">{errors.to_branch_id}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="toDepartment">Destination Department</Label>
                                                <Select
                                                    value={toDepartmentId}
                                                    onValueChange={setToDepartmentId}
                                                    disabled={!selectedEmployee}
                                                >
                                                    <SelectTrigger id="toDepartment">
                                                        <SelectValue placeholder="Select Department" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="same">Same as Current</SelectItem>
                                                        {departments.map((department) => (
                                                            <SelectItem key={department.id} value={department.id.toString()}>
                                                                {department.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="toDesignation">Destination Designation</Label>
                                                <Select
                                                    value={toDesignationId}
                                                    onValueChange={setToDesignationId}
                                                    disabled={!selectedEmployee}
                                                >
                                                    <SelectTrigger id="toDesignation">
                                                        <SelectValue placeholder="Select Designation" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="same">Same as Current</SelectItem>
                                                        {designations.map((designation) => (
                                                            <SelectItem key={designation.id} value={designation.id.toString()}>
                                                                {designation.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Effective Date</Label>
                                            <Popover open={effectiveDateOpen} onOpenChange={setEffectiveDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            !effectiveDate && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        {effectiveDate ? format(effectiveDate, 'PPP') : <span>Select date</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <SafeCalendar
                                                        mode="single"
                                                        selected={effectiveDate}
                                                        onSelect={(date: Date | undefined) => {
                                                            setEffectiveDate(date);
                                                            setEffectiveDateOpen(false);
                                                        }}
                                                        disabledDates={(date: Date) => {
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            return date < today;
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {errors.effective_date && (
                                                <p className="text-sm font-medium text-red-500">{errors.effective_date}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="transferOrderNo">Transfer Order No. (Optional)</Label>
                                            <Input
                                                id="transferOrderNo"
                                                placeholder="Enter order or reference number"
                                                value={transferOrderNo}
                                                onChange={(e) => setTransferOrderNo(e.target.value)}
                                            />
                                            {errors.transfer_order_no && (
                                                <p className="text-sm font-medium text-red-500">{errors.transfer_order_no}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reason">Reason for Transfer</Label>
                                        <Textarea
                                            id="reason"
                                            placeholder="Provide the reason for this transfer"
                                            rows={4}
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        />
                                        {errors.reason && (
                                            <p className="text-sm font-medium text-red-500">{errors.reason}</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end space-x-2">
                                        <Link href={route('transfers.index')}>
                                            <Button variant="outline" type="button">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button type="submit" disabled={submitting || !selectedEmployee}>
                                            {submitting ? 'Submitting...' : 'Submit Transfer Request'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        {selectedEmployee ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Employee Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Name</p>
                                            <p className="font-medium">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Employee ID</p>
                                            <p>{selectedEmployee.employee_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Department</p>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {selectedEmployee.department?.name || 'No Department'}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Designation</p>
                                            <p>{selectedEmployee.designation?.name || 'No Designation'}</p>
                                        </div>
                                    </div>

                                    {(toBranchId || toDepartmentId || toDesignationId) && (
                                        <>
                                            <Separator className="my-6" />

                                            <div className="space-y-4">
                                                <h3 className="font-medium">Transfer Summary</h3>

                                                <div className="space-y-3">
                                                    <div className="flex items-start">
                                                        <div className="flex flex-col items-center mr-2">
                                                            <div className="rounded-full h-6 w-6 flex items-center justify-center bg-blue-100 text-blue-600">
                                                                <Building className="h-3 w-3" />
                                                            </div>
                                                            <div className="h-10 w-0.5 bg-gray-200 my-1"></div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">Current Branch</p>
                                                            <p className="text-sm text-gray-500">{currentBranch?.name || 'Not specified'}</p>
                                                        </div>
                                                    </div>

                                                    {fromDepartmentId && (
                                                        <div className="flex items-start">
                                                            <div className="flex flex-col items-center mr-2">
                                                                <div className="rounded-full h-6 w-6 flex items-center justify-center bg-blue-100 text-blue-600">
                                                                    <Briefcase className="h-3 w-3" />
                                                                </div>
                                                                <div className="h-10 w-0.5 bg-gray-200 my-1"></div>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">Current Department</p>
                                                                <p className="text-sm text-gray-500">{currentDepartment?.name || 'Not specified'}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {fromDesignationId && (
                                                        <div className="flex items-start">
                                                            <div className="flex flex-col items-center mr-2">
                                                                <div className="rounded-full h-6 w-6 flex items-center justify-center bg-blue-100 text-blue-600">
                                                                    <User className="h-3 w-3" />
                                                                </div>
                                                                <div className="h-10 w-0.5 bg-gray-200 my-1"></div>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">Current Designation</p>
                                                                <p className="text-sm text-gray-500">{currentDesignation?.name || 'Not specified'}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-start">
                                                        <div className="flex flex-col items-center mr-2">
                                                            <div className="rounded-full h-6 w-6 flex items-center justify-center bg-green-100 text-green-600">
                                                                <ArrowRight className="h-3 w-3" />
                                                            </div>
                                                            <div className="h-10 w-0.5 bg-gray-200 my-1"></div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">New Branch</p>
                                                            <p className="text-sm text-gray-500">{destinationBranch?.name || 'Not specified'}</p>
                                                        </div>
                                                    </div>

                                                    {toDepartmentId && (
                                                        <div className="flex items-start">
                                                            <div className="flex flex-col items-center mr-2">
                                                                <div className="rounded-full h-6 w-6 flex items-center justify-center bg-green-100 text-green-600">
                                                                    <Briefcase className="h-3 w-3" />
                                                                </div>
                                                                <div className="h-10 w-0.5 bg-gray-200 my-1"></div>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">New Department</p>
                                                                <p className="text-sm text-gray-500">{destinationDepartment?.name || 'Same as current'}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {toDesignationId && (
                                                        <div className="flex items-start">
                                                            <div className="flex flex-col items-center mr-2">
                                                                <div className="rounded-full h-6 w-6 flex items-center justify-center bg-green-100 text-green-600">
                                                                    <User className="h-3 w-3" />
                                                                </div>
                                                                <div className="h-10 w-0.5 bg-gray-200 my-1"></div>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">New Designation</p>
                                                                <p className="text-sm text-gray-500">{destinationDesignation?.name || 'Same as current'}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {effectiveDate && (
                                                        <div className="flex items-start">
                                                            <div className="flex flex-col items-center mr-2">
                                                                <div className="rounded-full h-6 w-6 flex items-center justify-center bg-purple-100 text-purple-600">
                                                                    <Calendar className="h-3 w-3" />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">Effective Date</p>
                                                                <p className="text-sm text-gray-500">{format(effectiveDate, 'MMMM d, yyyy')}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <Alert className="mt-6 bg-amber-50 border-amber-200">
                                        <AlertTriangle className="h-4 w-4 text-amber-700" />
                                        <AlertDescription className="text-amber-700">
                                            Transfer requests need approval before they take effect. The employee's records will be updated only after the transfer is completed.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Transfer Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col items-center justify-center text-center p-4">
                                        <div className="text-gray-400 mb-2">
                                            <User className="h-12 w-12 mx-auto mb-2" />
                                            <p>Select an employee to proceed with transfer</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
