import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Boxes } from 'lucide-react';

type CategoryData = {
    id: number;
    code: string;
    name: string;
    name_bn: string | null;
    description: string | null;
    default_useful_life_years: number | null;
    sort_order: number;
    is_active: boolean;
};

export default function AssetCategoryForm({ category }: { category: CategoryData | null }) {
    const isEdit = Boolean(category?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        code: category?.code ?? '',
        name: category?.name ?? '',
        name_bn: category?.name_bn ?? '',
        description: category?.description ?? '',
        default_useful_life_years: category?.default_useful_life_years != null ? String(category.default_useful_life_years) : '',
        sort_order: String(category?.sort_order ?? 0),
        is_active: category?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('asset-categories.update', category!.id));
        else post(route('asset-categories.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit category' : 'Add category'} />
            <PayrollPage>
                <Link href={route('asset-categories.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to categories
                </Link>
                <PayrollPageHeader icon={Boxes} title={isEdit ? 'Edit category' : 'Add category'} />
                <form onSubmit={submit}>
                    <PayrollSectionCard title="Details" className="max-w-2xl">
                        <div className="space-y-4">
                            {isEdit && (
                                <div>
                                    <Label>Code *</Label>
                                    <Input value={data.code} onChange={(e) => setData('code', e.target.value.toUpperCase())} />
                                    {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                                </div>
                            )}
                            <div>
                                <Label>Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>
                            <div>
                                <Label>Name (Bangla)</Label>
                                <Input value={data.name_bn} onChange={(e) => setData('name_bn', e.target.value)} />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} />
                            </div>
                            <div>
                                <Label>Default useful life (years)</Label>
                                <Input type="number" min={1} value={data.default_useful_life_years} onChange={(e) => setData('default_useful_life_years', e.target.value)} />
                            </div>
                            <div>
                                <Label>Sort order</Label>
                                <Input type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                            <Button type="submit" disabled={processing}>{isEdit ? 'Update' : 'Create'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
