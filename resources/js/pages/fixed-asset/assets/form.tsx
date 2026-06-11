import React, { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Boxes } from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type AssetData = {
    id: number;
    asset_tag: string;
    name: string;
    asset_category_id: number;
    branch_id: number;
    status: string;
    description: string | null;
    serial_number: string | null;
    model: string | null;
    manufacturer: string | null;
    purchase_date: string | null;
    purchase_cost: string | null;
    book_value: string | null;
    warranty_expiry: string | null;
    custodian_employee_id: number | null;
    vendor: string | null;
    invoice_no: string | null;
    useful_life_years: number | null;
    depreciation_method: string | null;
    salvage_value: string | null;
    depreciation_start_date: string | null;
    disposal_date: string | null;
    disposal_amount: string | null;
    disposal_notes: string | null;
};

type BranchOpt = { id: number; name: string; branch_code: string | null; is_head_office: boolean };
type CategoryOpt = { id: number; code: string; name: string; default_useful_life_years: number | null };
type EmployeeOpt = EmployeeNameFields & { id: number; employee_id: string };
type StatusOpt = { value: string; label: string };

export default function FixedAssetForm({
    asset,
    branches,
    categories,
    statusOptions,
    depreciationMethodOptions,
    employees,
}: {
    asset: AssetData | null;
    branches: BranchOpt[];
    categories: CategoryOpt[];
    statusOptions: StatusOpt[];
    depreciationMethodOptions: StatusOpt[];
    employees: EmployeeOpt[];
}) {
    const isEdit = Boolean(asset?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        name: asset?.name ?? '',
        asset_category_id: asset?.asset_category_id ?? (categories[0]?.id ?? ''),
        branch_id: asset?.branch_id ?? (branches.find((b) => b.is_head_office)?.id ?? branches[0]?.id ?? ''),
        status: asset?.status ?? 'active',
        description: asset?.description ?? '',
        serial_number: asset?.serial_number ?? '',
        model: asset?.model ?? '',
        manufacturer: asset?.manufacturer ?? '',
        purchase_date: asset?.purchase_date ?? '',
        purchase_cost: asset?.purchase_cost != null ? String(asset.purchase_cost) : '',
        book_value: asset?.book_value != null ? String(asset.book_value) : '',
        warranty_expiry: asset?.warranty_expiry ?? '',
        custodian_employee_id: asset?.custodian_employee_id ?? ('' as const),
        vendor: asset?.vendor ?? '',
        invoice_no: asset?.invoice_no ?? '',
        useful_life_years: asset?.useful_life_years != null ? String(asset.useful_life_years) : '',
        depreciation_method: asset?.depreciation_method ?? 'straight_line',
        salvage_value: asset?.salvage_value != null ? String(asset.salvage_value) : '',
        depreciation_start_date: asset?.depreciation_start_date ?? asset?.purchase_date ?? '',
        disposal_date: asset?.disposal_date ?? '',
        disposal_amount: asset?.disposal_amount != null ? String(asset.disposal_amount) : '',
        disposal_notes: asset?.disposal_notes ?? '',
    });

    useEffect(() => {
        if (!isEdit && data.asset_category_id) {
            const cat = categories.find((c) => c.id === Number(data.asset_category_id));
            if (cat?.default_useful_life_years && !data.useful_life_years) {
                setData('useful_life_years', String(cat.default_useful_life_years));
            }
            if (!asset?.depreciation_method && data.useful_life_years) {
                setData('depreciation_method', 'straight_line');
            }
        }
    }, [data.asset_category_id]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('fixed-assets.update', asset!.id));
        else post(route('fixed-assets.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? `Edit ${asset?.asset_tag}` : 'Register asset'} />
            <PayrollPage>
                <Link href={route('fixed-assets.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to register
                </Link>
                <PayrollPageHeader
                    icon={Boxes}
                    title={isEdit ? `Edit — ${asset?.asset_tag}` : 'Register fixed asset'}
                    description={isEdit ? undefined : 'Asset tag is generated automatically from branch and year.'}
                />
                <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
                    <PayrollSectionCard title="Identification">
                        <div className="space-y-4">
                            {isEdit && (
                                <div>
                                    <Label>Asset tag</Label>
                                    <Input value={asset?.asset_tag} disabled className="font-mono" />
                                </div>
                            )}
                            <div>
                                <Label>Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <div>
                                <Label>Category *</Label>
                                <ComboSelect
                                    value={Number(data.asset_category_id) || null}
                                    onChange={(v) => v && setData('asset_category_id', v)}
                                    items={categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                                />
                            </div>
                            <div>
                                <Label>Branch *</Label>
                                <ComboSelect
                                    value={Number(data.branch_id) || null}
                                    onChange={(v) => v && setData('branch_id', v)}
                                    items={branchComboSelectItems(branches, { numericValue: true })}
                                />
                            </div>
                            <div>
                                <Label>Status *</Label>
                                <ComboSelect
                                    value={data.status}
                                    onChange={(v) => v && setData('status', String(v))}
                                    items={statusOptions.map((s) => ({ value: s.value, label: s.label }))}
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} />
                            </div>
                        </div>
                    </PayrollSectionCard>

                    <PayrollSectionCard title="Purchase & value">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Purchase date</Label>
                                    <Input type="date" value={data.purchase_date} onChange={(e) => setData('purchase_date', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Warranty expiry</Label>
                                    <Input type="date" value={data.warranty_expiry} onChange={(e) => setData('warranty_expiry', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Purchase cost</Label>
                                    <Input type="number" min={0} step="0.01" value={data.purchase_cost} onChange={(e) => setData('purchase_cost', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Book value</Label>
                                    <Input type="number" min={0} step="0.01" value={data.book_value} onChange={(e) => setData('book_value', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Serial no.</Label>
                                    <Input value={data.serial_number} onChange={(e) => setData('serial_number', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Useful life (years)</Label>
                                    <Input type="number" min={1} value={data.useful_life_years} onChange={(e) => setData('useful_life_years', e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Model</Label>
                                    <Input value={data.model} onChange={(e) => setData('model', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Manufacturer</Label>
                                    <Input value={data.manufacturer} onChange={(e) => setData('manufacturer', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <Label>Vendor</Label>
                                <Input value={data.vendor} onChange={(e) => setData('vendor', e.target.value)} />
                            </div>
                            <div>
                                <Label>Invoice no.</Label>
                                <Input value={data.invoice_no} onChange={(e) => setData('invoice_no', e.target.value)} />
                            </div>
                        </div>
                    </PayrollSectionCard>

                    <PayrollSectionCard title="Depreciation">
                        <div className="space-y-4">
                            <div>
                                <Label>Method</Label>
                                <ComboSelect
                                    value={data.depreciation_method || null}
                                    onChange={(v) => setData('depreciation_method', v ? String(v) : '')}
                                    items={depreciationMethodOptions.map((o) => ({ value: o.value, label: o.label }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Salvage value</Label>
                                    <Input type="number" min={0} step="0.01" value={data.salvage_value} onChange={(e) => setData('salvage_value', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Depreciation start</Label>
                                    <Input type="date" value={data.depreciation_start_date} onChange={(e) => setData('depreciation_start_date', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </PayrollSectionCard>

                    <PayrollSectionCard title="Custodian" className="lg:col-span-2">
                        <ComboSelect
                            value={data.custodian_employee_id ? Number(data.custodian_employee_id) : null}
                            onChange={(v) => setData('custodian_employee_id', v ?? '')}
                            items={employees.map((e) => ({
                                value: e.id,
                                label: `${e.employee_id} — ${employeeDisplayName(e)}`,
                            }))}
                            placeholder="No custodian assigned"
                        />
                    </PayrollSectionCard>

                    {data.status === 'disposed' && (
                        <PayrollSectionCard title="Disposal" className="lg:col-span-2">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                    <Label>Disposal date</Label>
                                    <Input type="date" value={data.disposal_date} onChange={(e) => setData('disposal_date', e.target.value)} />
                                </div>
                                <div>
                                    <Label>Disposal amount</Label>
                                    <Input type="number" min={0} step="0.01" value={data.disposal_amount} onChange={(e) => setData('disposal_amount', e.target.value)} />
                                </div>
                                <div className="md:col-span-1">
                                    <Label>Notes</Label>
                                    <Textarea value={data.disposal_notes} onChange={(e) => setData('disposal_notes', e.target.value)} rows={2} />
                                </div>
                            </div>
                        </PayrollSectionCard>
                    )}

                    <div className="lg:col-span-2">
                        <Button type="submit" disabled={processing}>{isEdit ? 'Save changes' : 'Register asset'}</Button>
                    </div>
                </form>
            </PayrollPage>
        </Layout>
    );
}
