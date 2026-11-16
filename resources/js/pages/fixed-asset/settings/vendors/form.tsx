import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { ArrowLeft, Truck } from 'lucide-react';

type VendorData = {
    id: number;
    sl: number;
    code: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    sort_order: number;
    is_active: boolean;
};

export default function AssetVendorForm({
    vendor,
    nextSl,
}: {
    vendor: VendorData | null;
    nextSl: number | null;
}) {
    const isEdit = Boolean(vendor?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        sl: String(vendor?.sl ?? nextSl ?? 1),
        code: vendor?.code ?? '',
        name: vendor?.name ?? '',
        contact_person: vendor?.contact_person ?? '',
        phone: vendor?.phone ?? '',
        email: vendor?.email ?? '',
        address: vendor?.address ?? '',
        sort_order: String(vendor?.sort_order ?? 0),
        is_active: vendor?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('fixed-asset.settings.vendors.update', vendor!.id));
        else post(route('fixed-asset.settings.vendors.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit Vendor' : 'Add Vendor'} />
            <AssetPage>
                <Link
                    href={route('fixed-asset.settings.vendors.index')}
                    className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to vendors
                </Link>
                <AssetPageHeader icon={Truck} title={isEdit ? 'Edit Vendor' : 'Add Vendor'} description="Register supplier details for purchase invoice entries." />
                <form onSubmit={submit} className="max-w-2xl">
                    <AssetSectionCard title="Vendor Details">
                        <div className="space-y-4.5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Serial (SL)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={data.sl}
                                        onChange={(e) => setData('sl', e.target.value)}
                                        className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                    />
                                    {errors.sl && <p className="text-xs text-red-500">{errors.sl}</p>}
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-semibold">Vendor Code {isEdit ? '*' : ''}</Label>
                                    <Input
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        required={isEdit}
                                        placeholder={isEdit ? undefined : 'Auto-generated if empty'}
                                        className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                    />
                                    {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Vendor Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Contact Person</Label>
                                    <Input
                                        value={data.contact_person}
                                        onChange={(e) => setData('contact_person', e.target.value)}
                                        className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Phone</Label>
                                    <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</Label>
                                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Address</Label>
                                <Textarea value={data.address} onChange={(e) => setData('address', e.target.value)} rows={3} className="border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sort Order</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={data.sort_order}
                                    onChange={(e) => setData('sort_order', e.target.value)}
                                    className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                />
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer select-none pt-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(v) => setData('is_active', Boolean(v))}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <Label htmlFor="is_active" className="text-xs font-semibold text-zinc-700 cursor-pointer">Active Vendor Status</Label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <Link href={route('fixed-asset.settings.vendors.index')}>
                                    <Button type="button" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-9.5 rounded-lg cursor-pointer">Cancel</Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-9.5 rounded-lg cursor-pointer">
                                    {isEdit ? 'Update Vendor' : 'Create Vendor'}
                                </Button>
                            </div>
                        </div>
                    </AssetSectionCard>
                </form>
            </AssetPage>
        </Layout>
    );
}
