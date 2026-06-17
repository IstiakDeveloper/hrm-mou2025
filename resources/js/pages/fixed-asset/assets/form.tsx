import React, { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ComboSelect } from '@/components/ComboSelect';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
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
            <AssetPage>
                <Link href={route('fixed-assets.index')} className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to register
                </Link>
                <AssetPageHeader
                    icon={Boxes}
                    title={isEdit ? `Edit — ${asset?.asset_tag}` : 'Register Fixed Asset'}
                    description={isEdit ? undefined : 'Asset tag is generated automatically from branch and year.'}
                />
                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
                    <AssetSectionCard title="Identification">
                        <div className="space-y-4.5">
                            {isEdit && (
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Asset tag</Label>
                                    <Input value={asset?.asset_tag} disabled className="font-mono h-9 bg-zinc-50 border-zinc-200" />
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Category *</Label>
                                <ComboSelect
                                    value={Number(data.asset_category_id) || null}
                                    onChange={(v) => v && setData('asset_category_id', v)}
                                    items={categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                                    className="h-9 border-zinc-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Branch *</Label>
                                <ComboSelect
                                    value={Number(data.branch_id) || null}
                                    onChange={(v) => v && setData('branch_id', v)}
                                    items={branchComboSelectItems(branches, { numericValue: true })}
                                    className="h-9 border-zinc-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status *</Label>
                                <ComboSelect
                                    value={data.status}
                                    onChange={(v) => v && setData('status', String(v))}
                                    items={statusOptions.map((s) => ({ value: s.value, label: s.label }))}
                                    className="h-9 border-zinc-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</Label>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} className="border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>
                        </div>
                    </AssetSectionCard>

                    <AssetSectionCard title="Purchase & Value Details">
                        <div className="space-y-4.5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Purchase date</Label>
                                    <Input type="date" value={data.purchase_date} onChange={(e) => setData('purchase_date', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Warranty expiry</Label>
                                    <Input type="date" value={data.warranty_expiry} onChange={(e) => setData('warranty_expiry', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Purchase cost (৳)</Label>
                                    <Input type="number" min={0} step="0.01" value={data.purchase_cost} onChange={(e) => setData('purchase_cost', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Book value (৳)</Label>
                                    <Input type="number" min={0} step="0.01" value={data.book_value} onChange={(e) => setData('book_value', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Serial no.</Label>
                                    <Input value={data.serial_number} onChange={(e) => setData('serial_number', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Useful life (years)</Label>
                                    <Input type="number" min={1} value={data.useful_life_years} onChange={(e) => setData('useful_life_years', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Model</Label>
                                    <Input value={data.model} onChange={(e) => setData('model', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Manufacturer</Label>
                                    <Input value={data.manufacturer} onChange={(e) => setData('manufacturer', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Vendor</Label>
                                <Input value={data.vendor} onChange={(e) => setData('vendor', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Invoice no.</Label>
                                <Input value={data.invoice_no} onChange={(e) => setData('invoice_no', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>
                        </div>
                    </AssetSectionCard>

                    <AssetSectionCard title="Depreciation Configuration">
                        <div className="space-y-4.5">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Method</Label>
                                <ComboSelect
                                    value={data.depreciation_method || null}
                                    onChange={(v) => setData('depreciation_method', v ? String(v) : '')}
                                    items={depreciationMethodOptions.map((o) => ({ value: o.value, label: o.label }))}
                                    className="h-9 border-zinc-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Salvage value (৳)</Label>
                                    <Input type="number" min={0} step="0.01" value={data.salvage_value} onChange={(e) => setData('salvage_value', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Depreciation start</Label>
                                    <Input type="date" value={data.depreciation_start_date} onChange={(e) => setData('depreciation_start_date', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                            </div>
                        </div>
                    </AssetSectionCard>

                    <AssetSectionCard title="Asset Custodian">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Custodian Employee</Label>
                            <ComboSelect
                                value={data.custodian_employee_id ? Number(data.custodian_employee_id) : null}
                                onChange={(v) => setData('custodian_employee_id', v ?? '')}
                                items={employees.map((e) => ({
                                    value: e.id,
                                    label: `${e.employee_id} — ${employeeDisplayName(e)}`,
                                }))}
                                placeholder="No custodian assigned"
                                className="h-9 border-zinc-200"
                            />
                        </div>
                    </AssetSectionCard>

                    {data.status === 'disposed' && (
                        <AssetSectionCard title="Disposal Details" className="lg:col-span-2">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Disposal date</Label>
                                    <Input type="date" value={data.disposal_date} onChange={(e) => setData('disposal_date', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Disposal amount (৳)</Label>
                                    <Input type="number" min={0} step="0.01" value={data.disposal_amount} onChange={(e) => setData('disposal_amount', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Notes</Label>
                                    <Textarea value={data.disposal_notes} onChange={(e) => setData('disposal_notes', e.target.value)} rows={2} className="border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                            </div>
                        </AssetSectionCard>
                    )}

                    <div className="lg:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-100">
                        <Link href={route('fixed-assets.index')}>
                            <Button type="button" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-9.5 rounded-lg cursor-pointer">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-9.5 rounded-lg cursor-pointer">
                            {isEdit ? 'Save Changes' : 'Register Asset'}
                        </Button>
                    </div>
                </form>
            </AssetPage>
        </Layout>
    );
}
