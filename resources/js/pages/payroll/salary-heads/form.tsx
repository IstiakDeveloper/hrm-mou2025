import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, MinusCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Head = {
    id: number;
    name: string;
    name_bn: string | null;
    type: string;
    default_amount_type: string;
    default_amount: string | number;
    is_active: boolean;
};

export default function SalaryHeadForm({ head }: { head: Head | null }) {
    const isEdit = Boolean(head?.id);
    const { data, setData, post, put, processing, errors } = useForm({
        name: head?.name || '',
        name_bn: head?.name_bn || '',
        type: head?.type || 'earning',
        default_amount_type: head?.default_amount_type || 'fixed',
        default_amount: String(head?.default_amount ?? 0),
        is_active: head?.is_active ?? true,
    });

    const isAddition = data.type === 'earning';
    const isPercent = data.default_amount_type === 'percentage';

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && head) {
            put(route('salary-heads.update', head.id));
        } else {
            post(route('salary-heads.store'));
        }
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit salary component' : 'New salary component'} />
            <div className="container mx-auto max-w-lg py-8">
                <Link
                    href={route('salary-heads.index')}
                    className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back to salary components
                </Link>

                <form onSubmit={submit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{isEdit ? 'Edit' : 'Add'} salary component</CardTitle>
                            <CardDescription>
                                Each component appears in salary structure (e.g. Basic, House Rent, PF). You set a default
                                value here; amounts can be changed per grade/step later.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</p>
                                <div>
                                    <Label htmlFor="name">Component name (English) *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g. House Rent, Medical Allowance"
                                        required
                                    />
                                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="name_bn">Name (Bangla)</Label>
                                    <Input
                                        id="name_bn"
                                        value={data.name_bn}
                                        onChange={(e) => setData('name_bn', e.target.value)}
                                        placeholder="ঐচ্ছিক"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Addition or deduction?
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setData('type', 'earning')}
                                        className={cn(
                                            'flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors',
                                            isAddition
                                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                                        )}
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                        Addition
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData('type', 'deduction')}
                                        className={cn(
                                            'flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors',
                                            !isAddition
                                                ? 'border-rose-600 bg-rose-50 text-rose-800'
                                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                                        )}
                                    >
                                        <MinusCircle className="h-4 w-4" />
                                        Deduction
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Addition increases pay (basic, allowances). Deduction reduces pay (PF, tax, loans).
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Default amount (for new structures)
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setData('default_amount_type', 'percentage')}
                                        className={cn(
                                            'rounded-lg border-2 px-3 py-2.5 text-sm font-medium',
                                            isPercent
                                                ? 'border-violet-600 bg-violet-50 text-violet-800'
                                                : 'border-gray-200 hover:bg-gray-50',
                                        )}
                                    >
                                        % of Basic
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData('default_amount_type', 'fixed')}
                                        className={cn(
                                            'rounded-lg border-2 px-3 py-2.5 text-sm font-medium',
                                            !isPercent
                                                ? 'border-violet-600 bg-violet-50 text-violet-800'
                                                : 'border-gray-200 hover:bg-gray-50',
                                        )}
                                    >
                                        Fixed (৳)
                                    </button>
                                </div>
                                <div>
                                    <Label htmlFor="default_amount">
                                        {isPercent ? 'Percentage of basic salary' : 'Fixed amount (৳)'}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="default_amount"
                                            type="number"
                                            min={0}
                                            step="any"
                                            className={cn(isPercent && 'pr-10')}
                                            value={data.default_amount}
                                            onChange={(e) => setData('default_amount', e.target.value)}
                                        />
                                        {isPercent && (
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                %
                                            </span>
                                        )}
                                    </div>
                                    {errors.default_amount && (
                                        <p className="text-sm text-red-500">{errors.default_amount}</p>
                                    )}
                                </div>
                            </div>

                            <label className="flex items-center gap-2 border-t pt-4">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <span className="text-sm">Active (show in salary structure)</span>
                            </label>
                        </CardContent>

                        <CardFooter className="flex justify-end gap-2 border-t bg-muted/30">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('salary-heads.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving…' : isEdit ? 'Save changes' : 'Add component'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
