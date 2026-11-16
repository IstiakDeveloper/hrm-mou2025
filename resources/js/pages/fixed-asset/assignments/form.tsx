import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type AssetOpt = { id: number; asset_tag: string; name: string; branch_id: number; custodian_employee_id: number | null };
type Prefill = { id: number; asset_tag: string; name: string; branch_id: number; status: string; custodian?: EmployeeNameFields | null };
type EmployeeOpt = EmployeeNameFields & { id: number; employee_id: string };

export default function AssetAssignmentForm({
    prefillAsset,
    assets,
}: {
    prefillAsset: Prefill | null;
    assets: AssetOpt[];
    branches: { id: number; name: string; is_head_office: boolean }[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        fixed_asset_id: prefillAsset?.id ?? ('' as const),
        employee_id: '' as const,
        assigned_date: new Date().toISOString().slice(0, 10),
        notes: '',
    });

    const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    const selectedAsset = useMemo(
        () => assets.find((a) => a.id === Number(data.fixed_asset_id)) ?? prefillAsset,
        [assets, data.fixed_asset_id, prefillAsset],
    );

    const branchId = selectedAsset && 'branch_id' in selectedAsset ? selectedAsset.branch_id : null;

    useEffect(() => {
        if (!branchId) {
            setEmployees([]);
            return;
        }
        setLoadingEmployees(true);
        fetch(`${route('asset-assignments.employees')}?branch_id=${branchId}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.json())
            .then((json) => setEmployees(json.employees ?? []))
            .catch(() => setEmployees([]))
            .finally(() => setLoadingEmployees(false));
    }, [branchId]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('asset-assignments.store'));
    };

    return (
        <Layout>
            <Head title="Assign asset" />
            <PayrollPage>
                <Link href={route('asset-assignments.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <PayrollPageHeader icon={UserCheck} title="Assign asset to employee" />

                {prefillAsset?.custodian && (
                    <Alert className="mb-4">
                        <AlertTitle>Current custodian</AlertTitle>
                        <AlertDescription>
                            {employeeDisplayName(prefillAsset.custodian)} — assigning again will release the previous custodian.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit}>
                    <PayrollSectionCard title="Assignment" className="max-w-xl">
                        <div className="space-y-4">
                            <div>
                                <Label>Asset *</Label>
                                <ComboSelect
                                    value={Number(data.fixed_asset_id) || null}
                                    onChange={(v) => { if (v) { setData('fixed_asset_id', v); setData('employee_id', ''); } }}
                                    items={assets.map((a) => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }))}
                                    disabled={Boolean(prefillAsset)}
                                />
                                {errors.fixed_asset_id && <p className="text-sm text-red-500">{errors.fixed_asset_id}</p>}
                            </div>
                            <div>
                                <Label>Employee *</Label>
                                <ComboSelect
                                    value={Number(data.employee_id) || null}
                                    onChange={(v) => v && setData('employee_id', v)}
                                    items={employees.map((e) => ({
                                        value: e.id,
                                        label: `${e.employee_id} — ${employeeDisplayName(e)}`,
                                    }))}
                                    placeholder={loadingEmployees ? 'Loading…' : branchId ? 'Select employee' : 'Select asset first'}
                                    disabled={!branchId || loadingEmployees}
                                />
                                {errors.employee_id && <p className="text-sm text-red-500">{errors.employee_id}</p>}
                            </div>
                            <div>
                                <Label>Assigned date *</Label>
                                <Input type="date" value={data.assigned_date} onChange={(e) => setData('assigned_date', e.target.value)} required />
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                            </div>
                            <Button type="submit" disabled={processing}>Assign</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
