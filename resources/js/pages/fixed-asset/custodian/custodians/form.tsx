import React, { useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';

type MasterOpt = { id: number; name: string; code: string };
type BranchOpt = { id: number; name: string };
type CustodianData = {
    id: number;
    employee_id: number | null;
    name: string;
    asset_custodian_department_id: number | null;
    asset_custodian_designation_id: number | null;
    branch_id: number | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
};
type EmployeeOpt = EmployeeNameFields & {
    id: number;
    employee_id: string;
    current_branch_id: number | null;
    phone: string | null;
    email: string | null;
    already_custodian: boolean;
};

export default function CustodianForm({
    custodian,
    departments,
    designations,
    branches,
    branchScoped = false,
    scopedBranchId = null,
}: {
    custodian: CustodianData | null;
    departments: MasterOpt[];
    designations: MasterOpt[];
    branches: BranchOpt[];
    branchScoped?: boolean;
    scopedBranchId?: number | null;
}) {
    const isEdit = Boolean(custodian?.id);
    const { data, setData, post, put, processing, errors } = useForm({
        employee_id: custodian?.employee_id ? String(custodian.employee_id) : '',
        name: custodian?.name ?? '',
        asset_custodian_department_id: custodian?.asset_custodian_department_id ? String(custodian.asset_custodian_department_id) : '',
        asset_custodian_designation_id: custodian?.asset_custodian_designation_id ? String(custodian.asset_custodian_designation_id) : '',
        branch_id: custodian?.branch_id ? String(custodian.branch_id) : (scopedBranchId ? String(scopedBranchId) : ''),
        phone: custodian?.phone ?? '',
        email: custodian?.email ?? '',
        is_active: custodian?.is_active ?? true,
    });

    const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    useEffect(() => {
        setLoadingEmployees(true);
        const params = new URLSearchParams();
        if (data.branch_id) params.set('branch_id', data.branch_id);
        if (custodian?.id) params.set('exclude_custodian_id', String(custodian.id));
        fetch(`${route('fixed-asset.custodian.custodians.employees')}?${params}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((json) => setEmployees(json.employees ?? []))
            .catch(() => setEmployees([]))
            .finally(() => setLoadingEmployees(false));
    }, [data.branch_id, custodian?.id]);

    const onEmployeeSelect = (employeeId: number | null) => {
        if (!employeeId) {
            setData('employee_id', '');
            return;
        }
        const emp = employees.find((e) => e.id === employeeId);
        if (!emp || emp.already_custodian) return;
        setData({
            ...data,
            employee_id: String(employeeId),
            name: employeeDisplayName(emp),
            branch_id: branchScoped ? data.branch_id : (emp.current_branch_id ? String(emp.current_branch_id) : data.branch_id),
            phone: emp.phone || data.phone,
            email: emp.email || data.email,
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('fixed-asset.custodian.custodians.update', custodian!.id));
        else post(route('fixed-asset.custodian.custodians.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit custodian' : 'Add custodian'} />
            <PayrollPage>
                <Link href={route('fixed-asset.custodian.custodians.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
                <PayrollPageHeader icon={UserCheck} title={isEdit ? 'Edit custodian' : 'Add custodian'} description="Link an employee or register an external custodian." />
                <BranchScopeAlert branchScoped={branchScoped} />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Details" className="max-w-2xl">
                        <div className="space-y-4">
                            <div>
                                <Label>Branch</Label>
                                <ComboSelect
                                    value={data.branch_id ? Number(data.branch_id) : null}
                                    onChange={(v) => setData('branch_id', v ? String(v) : '')}
                                    items={branches.map((b) => ({ value: b.id, label: b.name }))}
                                    placeholder="Select branch"
                                    disabled={branchScoped}
                                />
                            </div>
                            <div>
                                <Label>Employee (optional)</Label>
                                <ComboSelect
                                    value={data.employee_id ? Number(data.employee_id) : null}
                                    onChange={onEmployeeSelect}
                                    items={employees.map((e) => ({
                                        value: e.id,
                                        label: `${e.employee_id} — ${employeeDisplayName(e)}${e.already_custodian ? ' (already custodian)' : ''}`,
                                        disabled: e.already_custodian && String(e.id) !== data.employee_id,
                                    }))}
                                    placeholder={loadingEmployees ? 'Loading…' : 'Select employee or leave blank'}
                                />
                                {errors.employee_id && <p className="text-sm text-red-500">{errors.employee_id}</p>}
                            </div>
                            <div>
                                <Label>Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>Department</Label>
                                    <ComboSelect
                                        value={data.asset_custodian_department_id ? Number(data.asset_custodian_department_id) : null}
                                        onChange={(v) => setData('asset_custodian_department_id', v ? String(v) : '')}
                                        items={departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))}
                                        placeholder="Select department"
                                    />
                                </div>
                                <div>
                                    <Label>Designation</Label>
                                    <ComboSelect
                                        value={data.asset_custodian_designation_id ? Number(data.asset_custodian_designation_id) : null}
                                        onChange={(v) => setData('asset_custodian_designation_id', v ? String(v) : '')}
                                        items={designations.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))}
                                        placeholder="Select designation"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div><Label>Phone</Label><Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} /></div>
                                <div><Label>Email</Label><Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />{errors.email && <p className="text-sm text-red-500">{errors.email}</p>}</div>
                            </div>
                            <div className="flex items-center gap-2"><Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} /><Label>Active</Label></div>
                            <Button type="submit" disabled={processing}>{isEdit ? 'Update' : 'Create'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
