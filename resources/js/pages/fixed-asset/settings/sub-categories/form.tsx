import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboSelect } from '@/components/ComboSelect';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { ArrowLeft, Layers } from 'lucide-react';

type CategoryOpt = {
    id: number;
    name: string;
    code: string;
    depreciation_rate: string | null;
};

type SubCategoryData = {
    id: number;
    asset_category_id: number;
    name: string;
    code: string;
    depreciation_rate: string | null;
    sort_order: number;
    is_active: boolean;
};

export default function AssetSubCategoryForm({
    subCategory,
    categories,
}: {
    subCategory: SubCategoryData | null;
    categories: CategoryOpt[];
}) {
    const isEdit = Boolean(subCategory?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        asset_category_id: subCategory?.asset_category_id ? String(subCategory.asset_category_id) : '',
        code: subCategory?.code ?? '',
        name: subCategory?.name ?? '',
        depreciation_rate: subCategory?.depreciation_rate != null ? String(subCategory.depreciation_rate) : '',
        sort_order: String(subCategory?.sort_order ?? 0),
        is_active: subCategory?.is_active ?? true,
    });

    const selectedCategory = categories.find((c) => String(c.id) === data.asset_category_id);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('fixed-asset.settings.sub-categories.update', subCategory!.id));
        else post(route('fixed-asset.settings.sub-categories.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit Subcategory' : 'Add Subcategory'} />
            <AssetPage>
                <Link
                    href={route('fixed-asset.settings.sub-categories.index')}
                    className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to subcategories
                </Link>
                <AssetPageHeader icon={Layers} title={isEdit ? 'Edit Subcategory' : 'Add Subcategory'} description="Create subcategories under main asset categories to override parameters if needed." />
                <form onSubmit={submit} className="max-w-2xl">
                    <AssetSectionCard title="Subcategory Details">
                        <div className="space-y-4.5">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Main Category *</Label>
                                <ComboSelect
                                    value={Number(data.asset_category_id) || null}
                                    onChange={(v) => setData('asset_category_id', v ? String(v) : '')}
                                    items={categories.map((c) => ({
                                        value: c.id,
                                        label: `${c.code} — ${c.name}`
                                    }))}
                                    placeholder="Select main category"
                                    className="h-9 border-zinc-200"
                                />
                                {errors.asset_category_id && (
                                    <p className="text-xs text-red-500">{errors.asset_category_id}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Subcategory Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-semibold">Subcategory Code *</Label>
                                <Input
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                    required
                                    className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                />
                                {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Depreciation Rate (%)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="1"
                                    value={data.depreciation_rate}
                                    onChange={(e) => setData('depreciation_rate', e.target.value)}
                                    placeholder={
                                        selectedCategory?.depreciation_rate
                                            ? `Category default: ${selectedCategory.depreciation_rate}%`
                                            : 'Uses category default if empty'
                                    }
                                    className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                />
                                {errors.depreciation_rate && (
                                    <p className="text-xs text-red-500">{errors.depreciation_rate}</p>
                                )}
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
                                <Label htmlFor="is_active" className="text-xs font-semibold text-zinc-700 cursor-pointer">Active Subcategory Status</Label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <Link href={route('fixed-asset.settings.sub-categories.index')}>
                                    <Button type="button" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-9.5 rounded-lg cursor-pointer">Cancel</Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-9.5 rounded-lg cursor-pointer">
                                    {isEdit ? 'Update Subcategory' : 'Create Subcategory'}
                                </Button>
                            </div>
                        </div>
                    </AssetSectionCard>
                </form>
            </AssetPage>
        </Layout>
    );
}
