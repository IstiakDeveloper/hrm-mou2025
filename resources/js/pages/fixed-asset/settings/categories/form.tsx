import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { ArrowLeft, Boxes } from 'lucide-react';

type CategoryData = {
    id: number;
    sl: number;
    code: string;
    name: string;
    name_bn: string | null;
    description: string | null;
    default_useful_life_years: number | null;
    depreciation_method: string | null;
    depreciation_rate: string | null;
    sort_order: number;
    is_active: boolean;
};

export default function AssetCategoryForm({
    category,
    nextSl,
    depreciationMethods,
}: {
    category: CategoryData | null;
    nextSl: number | null;
    depreciationMethods: Record<string, string>;
}) {
    const isEdit = Boolean(category?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        sl: String(category?.sl ?? nextSl ?? 1),
        code: category?.code ?? '',
        name: category?.name ?? '',
        name_bn: category?.name_bn ?? '',
        description: category?.description ?? '',
        default_useful_life_years:
            category?.default_useful_life_years != null ? String(category.default_useful_life_years) : '',
        depreciation_method: category?.depreciation_method ?? '',
        depreciation_rate: category?.depreciation_rate != null ? String(category.depreciation_rate) : '',
        sort_order: String(category?.sort_order ?? 0),
        is_active: category?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('fixed-asset.settings.categories.update', category!.id));
        else post(route('fixed-asset.settings.categories.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit Category' : 'Add Category'} />
            <AssetPage>
                <Link
                    href={route('fixed-asset.settings.categories.index')}
                    className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to categories
                </Link>
                <AssetPageHeader icon={Boxes} title={isEdit ? 'Edit Category' : 'Add Category'} description="Define asset categories, default depreciation modes, and useful lifetime calculations." />
                <form onSubmit={submit} className="max-w-2xl">
                    <AssetSectionCard title="Category Details">
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
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Shortcode {isEdit ? '*' : ''}</Label>
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
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Category Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-semibold">Name (Bangla)</Label>
                                <Input value={data.name_bn} onChange={(e) => setData('name_bn', e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</Label>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} className="border-zinc-200 focus-visible:ring-emerald-500" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Depreciation Method</Label>
                                    <Select
                                        value={data.depreciation_method || '__none__'}
                                        onValueChange={(v) => setData('depreciation_method', v === '__none__' ? '' : v)}
                                    >
                                        <SelectTrigger className="h-9 border-zinc-200 focus:ring-emerald-500">
                                            <SelectValue placeholder="Select method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">—</SelectItem>
                                            {Object.entries(depreciationMethods).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                        className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                    />
                                    {errors.depreciation_rate && (
                                        <p className="text-xs text-red-500">{errors.depreciation_rate}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Default Useful Life (years)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={data.default_useful_life_years}
                                        onChange={(e) => setData('default_useful_life_years', e.target.value)}
                                        className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                    />
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
                            </div>
                            <div className="flex items-center gap-2 cursor-pointer select-none pt-2">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(v) => setData('is_active', Boolean(v))}
                                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <Label htmlFor="is_active" className="text-xs font-semibold text-zinc-700 cursor-pointer">Active Category Status</Label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <Link href={route('fixed-asset.settings.categories.index')}>
                                    <Button type="button" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-9.5 rounded-lg cursor-pointer">Cancel</Button>
                                </Link>
                                <Button type="submit" disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-9.5 rounded-lg cursor-pointer">
                                    {isEdit ? 'Update Category' : 'Create Category'}
                                </Button>
                            </div>
                        </div>
                    </AssetSectionCard>
                </form>
            </AssetPage>
        </Layout>
    );
}
