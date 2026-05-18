import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { ArrowLeft, Award } from 'lucide-react';

type BonusTypeData = {
    id: number;
    code: string;
    name: string;
    name_bn: string | null;
    description: string | null;
    sort_order: number;
    is_active: boolean;
};

export default function BonusTypeForm({ bonusType }: { bonusType: BonusTypeData | null }) {
    const isEdit = Boolean(bonusType?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        code: bonusType?.code ?? '',
        name: bonusType?.name ?? '',
        name_bn: bonusType?.name_bn ?? '',
        description: bonusType?.description ?? '',
        sort_order: String(bonusType?.sort_order ?? 0),
        is_active: bonusType?.is_active ?? true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) put(route('bonus-types.update', bonusType!.id));
        else post(route('bonus-types.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit bonus type' : 'Add bonus type'} />
            <PayrollPage>
                <Link href={route('bonus-types.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back to bonus types
                </Link>
                <PayrollPageHeader
                    icon={Award}
                    title={isEdit ? 'Edit bonus type' : 'Add bonus type'}
                    description="Define a category such as Festival Bonus or Performance Bonus."
                />
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
                                <Label>Sort order</Label>
                                <Input type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('bonus-types.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>{processing ? 'Saving…' : 'Save'}</Button>
                        </div>
                    </PayrollSectionCard>
                </form>
            </PayrollPage>
        </Layout>
    );
}
