import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, History } from 'lucide-react';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { displayDateToServer, todayDisplayDate } from '@/lib/display-date';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type AssetOpt = { id: number; asset_tag: string; name: string; branch_id: number; asset_custodian_id: number | null };
type CustodianOpt = { id: number; name: string; employee_id: number | null; branch_id: number | null; employee?: (EmployeeNameFields & { employee_id: string }) | null };
type Prefill = {
    id: number;
    asset_tag: string;
    name: string;
    branch_id: number;
    asset_custodian_id: number | null;
    current_custodian?: CustodianOpt | null;
};

export default function CustodianChangeForm({
    prefillAsset,
    assets,
    custodians,
}: {
    prefillAsset: Prefill | null;
    assets: AssetOpt[];
    custodians: CustodianOpt[];
}) {
    const { data, setData, post, processing, errors, transform } = useForm({
        fixed_asset_id: prefillAsset?.id ?? ('' as const),
        to_custodian_id: '' as const,
        change_date: todayDisplayDate(),
        reason: '',
        notes: '',
        release_only: false,
    });

    const selectedAsset = useMemo(
        () => assets.find((a) => a.id === Number(data.fixed_asset_id)) ?? prefillAsset,
        [assets, data.fixed_asset_id, prefillAsset],
    );

    const currentCustodian = prefillAsset?.current_custodian ?? null;
    const filteredCustodians = custodians.filter((c) => {
        if (selectedAsset && c.branch_id && c.branch_id !== selectedAsset.branch_id) return false;
        if (selectedAsset?.asset_custodian_id === c.id) return false;
        return true;
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            change_date: displayDateToServer(payload.change_date),
        }));
        post(route('fixed-asset.custodian.changes.store'));
    };

    return (
        <Layout>
            <Head title="Custodian change" />
            <PayrollPage>
                <Link href={route('fixed-asset.custodian.changes.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
                <PayrollPageHeader icon={History} title="Custodian change" description="Assign a new custodian or release the current one." />
                {currentCustodian && (
                    <Alert className="mb-4">
                        <AlertTitle>Current custodian</AlertTitle>
                        <AlertDescription>
                            {currentCustodian.employee
                                ? `${employeeDisplayName(currentCustodian.employee)} (${currentCustodian.employee.employee_id})`
                                : currentCustodian.name}
                        </AlertDescription>
                    </Alert>
                )}
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Change details" className="max-w-xl">
                        <div className="space-y-4">
                            <div>
                                <Label>Asset *</Label>
                                <ComboSelect
                                    value={Number(data.fixed_asset_id) || null}
                                    onChange={(v) => {
                                        if (v) setData({ ...data, fixed_asset_id: v, to_custodian_id: '' });
                                    }}
                                    items={assets.map((a) => ({ value: a.id, label: `${a.asset_tag} — ${a.name}` }))}
                                    disabled={Boolean(prefillAsset)}
                                />
                                {errors.fixed_asset_id && <p className="text-sm text-red-500">{errors.fixed_asset_id}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.release_only} onCheckedChange={(v) => setData('release_only', Boolean(v))} />
                                <Label>Release custodian only (no new custodian)</Label>
                            </div>
                            {!data.release_only && (
                                <div>
                                    <Label>New custodian *</Label>
                                    <ComboSelect
                                        value={Number(data.to_custodian_id) || null}
                                        onChange={(v) => v && setData('to_custodian_id', v)}
                                        items={filteredCustodians.map((c) => ({
                                            value: c.id,
                                            label: c.employee ? `${c.name} (${c.employee.employee_id})` : c.name,
                                        }))}
                                        placeholder="Select custodian"
                                    />
                                    {errors.to_custodian_id && <p className="text-sm text-red-500">{errors.to_custodian_id}</p>}
                                </div>
                            )}
                            <FormDateField
                                label="Change date"
                                value={data.change_date}
                                onChange={(v) => setData('change_date', v)}
                                required
                                error={errors.change_date}
                            />
                            <div>
                                <Label>Reason</Label>
                                <Input value={data.reason} onChange={(e) => setData('reason', e.target.value)} />
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                            </div>
                            <Button type="submit" disabled={processing}>{data.release_only ? 'Release custodian' : 'Change custodian'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
