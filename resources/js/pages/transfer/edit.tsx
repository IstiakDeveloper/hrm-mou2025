import React, { useMemo, useState, FormEvent, useEffect } from 'react';
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
import { DatePicker } from '@/components/ui/date-picker';
import { format, addDays } from 'date-fns';
import {
    ArrowLeft,
    ArrowRight,
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
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

interface Employee extends EmployeeNameFields {
    id: number;
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

interface Transfer {
    id: number;
    employee_id: number;
    from_branch_id: number;
    to_branch_id: number;
    from_department_id: number | null;
    to_department_id: number | null;
    from_designation_id: number | null;
    to_designation_id: number | null;
    effective_date: string;
    transfer_order_no: string | null;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
}

interface EditTransferProps {
    transfer: Transfer;
    employees: Employee[];
    branches: Branch[];
    departments: Department[];
    designations: Designation[];
}

export default function EditTransfer({
    transfer,
    employees,
    branches,
    departments,
    designations
}: EditTransferProps) {
    const branchItems = useMemo(() => branchComboSelectItems(branches), [branches]);
    const [employeeId, setEmployeeId] = useState(transfer.employee_id.toString());
    const [fromBranchId, setFromBranchId] = useState(transfer.from_branch_id.toString());
    const [toBranchId, setToBranchId] = useState(transfer.to_branch_id.toString());
    const [fromDepartmentId, setFromDepartmentId] = useState(transfer.from_department_id?.toString() || '');
    const [toDepartmentId, setToDepartmentId] = useState(transfer.to_department_id?.toString() || '');
    const [fromDesignationId, setFromDesignationId] = useState(transfer.from_designation_id?.toString() || '');
    const [toDesignationId, setToDesignationId] = useState(transfer.to_designation_id?.toString() || '');
    const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(
        new Date(transfer.effective_date)
    );
    const [transferOrderNo, setTransferOrderNo] = useState(transfer.transfer_order_no || '');
    const [reason, setReason] = useState(transfer.reason);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Selected employee details
    const selectedEmployee = employees.find(emp => emp.id.toString() === employeeId);

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

        router.put(route('transfers.update', transfer.id), {
            employee_id: employeeId,
            from_branch_id: fromBranchId,
            to_branch_id: toBranchId,
            from_department_id: fromDepartmentId || null,
            to_department_id: toDepartmentId || null,
            from_designation_id: fromDesignationId || null,
            to_designation_id: toDesignationId || null,
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
            <Head title="Edit Transfer Request" />

            <div className="container mx-auto py-8">
                <div className="mb-6">
                    <Link href={route('transfers.index')} className="text-blue-600 hover:text-blue-800 flex items-center">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Transfers
                    </Link>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Transfer Request</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Transfer Details</CardTitle>
                                <CardDescription>Update this transfer request</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="employee">Employee</Label>
                                        <ComboSelect<number>
                                            value={employeeId ? Number(employeeId) : null}
                                            onChange={(v) => {
                                                // Transfer employee cannot be changed on edit; keep consistent UI.
                                                if (!v) return;
                                                setEmployeeId(String(v));
                                            }}
                                            placeholder="Employee"
                                            disabled
                                            items={employees.map((e) => ({
                                                value: e.id,
                                                label: `${e.employee_id} — ${employeeDisplayName(e)}`.trim(),
                                                keywords: `${e.employee_id} ${employeeDisplayName(e)}`,
                                            }))}
                                        />
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
                                                <ComboSelect<string>
                                                    value={fromBranchId || null}
                                                    onChange={(v) => setFromBranchId(v ?? '')}
                                                    placeholder="Select branch…"
                                                    items={branchItems}
                                                />
                                                {errors.from_branch_id && (
                                                    <p className="text-sm font-medium text-red-500">{errors.from_branch_id}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="fromDepartment">Current Department</Label>
                                                <ComboSelect<string>
                                                    value={fromDepartmentId || null}
                                                    onChange={(v) => setFromDepartmentId(v ?? '')}
                                                    placeholder="Select department…"
                                                    items={[
                                                        { value: '', label: 'None' },
                                                        ...departments.map((d) => ({
                                                            value: String(d.id),
                                                            label: d.name,
                                                            keywords: d.name,
                                                        })),
                                                    ]}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="fromDesignation">Current Designation</Label>
                                                <ComboSelect<string>
                                                    value={fromDesignationId || null}
                                                    onChange={(v) => setFromDesignationId(v ?? '')}
                                                    placeholder="Select designation…"
                                                    items={[
                                                        { value: '', label: 'None' },
                                                        ...designations.map((d) => ({
                                                            value: String(d.id),
                                                            label: d.name,
                                                            keywords: d.name,
                                                        })),
                                                    ]}
                                                />
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
                                                <ComboSelect<string>
                                                    value={toBranchId || null}
                                                    onChange={(v) => setToBranchId(v ?? '')}
                                                    placeholder="Select destination branch…"
                                                    items={branchItems}
                                                />
                                                {errors.to_branch_id && (
                                                    <p className="text-sm font-medium text-red-500">{errors.to_branch_id}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="toDepartment">Destination Department</Label>
                                                <ComboSelect<string>
                                                    value={toDepartmentId || null}
                                                    onChange={(v) => setToDepartmentId(v ?? '')}
                                                    placeholder="Select destination department…"
                                                    items={[
                                                        { value: '', label: 'Same as current' },
                                                        ...departments.map((d) => ({
                                                            value: String(d.id),
                                                            label: d.name,
                                                            keywords: d.name,
                                                        })),
                                                    ]}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="toDesignation">Destination Designation</Label>
                                                <ComboSelect<string>
                                                    value={toDesignationId || null}
                                                    onChange={(v) => setToDesignationId(v ?? '')}
                                                    placeholder="Select destination designation…"
                                                    items={[
                                                        { value: '', label: 'Same as current' },
                                                        ...designations.map((d) => ({
                                                            value: String(d.id),
                                                            label: d.name,
                                                            keywords: d.name,
                                                        })),
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Effective Date</Label>
                                            <DatePicker
                                                selected={effectiveDate ?? null}
                                                onSelect={(d) => setEffectiveDate(d ?? undefined)}
                                                placeholderText="DD/MM/YYYY"
                                            />
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
                                        <Link href={route('transfers.show', transfer.id)}>
                                            <Button variant="outline" type="button">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button type="submit" disabled={submitting || !selectedEmployee}>
                                            {submitting ? 'Updating...' : 'Update Transfer Request'}
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
                                            <p className="font-medium">{employeeDisplayName(selectedEmployee)}</p>
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
                                            Only pending transfer requests can be modified. Once approved, further changes cannot be made.
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
                                            <p>Employee information not available</p>
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
