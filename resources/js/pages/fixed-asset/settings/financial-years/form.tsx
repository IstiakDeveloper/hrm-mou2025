import React, { useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { displayDateToServer, toFormDisplayDate } from '@/lib/display-date';
import { ArrowLeft, CalendarRange } from 'lucide-react';

type YearData = {
    id: number;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_closed: boolean;
};

type Suggested = {
    label: string;
    start_date: string;
    end_date: string;
};

export default function AssetFinancialYearForm({
    financialYear,
    suggested,
}: {
    financialYear: YearData | null;
    suggested: Suggested | null;
}) {
    const isEdit = Boolean(financialYear?.id);
    const isClosed = Boolean(financialYear?.is_closed);

    const { data, setData, post, put, processing, errors, transform } = useForm({
        label: financialYear?.label ?? suggested?.label ?? '',
        start_date: toFormDisplayDate(financialYear?.start_date ?? suggested?.start_date ?? ''),
        end_date: toFormDisplayDate(financialYear?.end_date ?? suggested?.end_date ?? ''),
        is_active: financialYear?.is_active ?? false,
        is_closed: financialYear?.is_closed ?? false,
    });

    useEffect(() => {
        if (!isEdit && suggested) {
            setData({
                label: suggested.label,
                start_date: toFormDisplayDate(suggested.start_date),
                end_date: toFormDisplayDate(suggested.end_date),
                is_active: false,
                is_closed: false,
            });
        }
    }, [suggested, isEdit, setData]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            start_date: displayDateToServer(payload.start_date),
            end_date: displayDateToServer(payload.end_date),
        }));
        if (isEdit) put(route('fixed-asset.settings.financial-years.update', financialYear!.id));
        else post(route('fixed-asset.settings.financial-years.store'));
    };

    return (
        <Layout>
            <Head title={isEdit ? 'Edit Financial Year' : 'Add Financial Year'} />
            <AssetPage>
                <Link
                    href={route('fixed-asset.settings.financial-years.index')}
                    className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to financial years
                </Link>
                <AssetPageHeader
                    icon={CalendarRange}
                    title={isEdit ? 'Edit Financial Year' : 'Add Financial Year'}
                    description="Financial year runs from 1 July to 30 June (Bangladesh). Dates use DD/MM/YYYY."
                />
                <form onSubmit={submit} className="max-w-2xl">
                    <AssetSectionCard title="Year Details">
                        <div className="space-y-4.5">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Label *</Label>
                                <Input
                                    value={data.label}
                                    onChange={(e) => setData('label', e.target.value)}
                                    placeholder="2025-26"
                                    disabled={isClosed}
                                    required
                                    className="h-9 border-zinc-200 focus-visible:ring-emerald-500"
                                />
                                {errors.label && <p className="text-xs text-red-500">{errors.label}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <FormDateField
                                        label="Start Date"
                                        value={data.start_date}
                                        onChange={(v) => setData('start_date', v)}
                                        required
                                        disabled={isClosed}
                                        error={errors.start_date}
                                        className="h-9 border-zinc-200"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <FormDateField
                                        label="End Date"
                                        value={data.end_date}
                                        onChange={(v) => setData('end_date', v)}
                                        required
                                        disabled={isClosed}
                                        error={errors.end_date}
                                        className="h-9 border-zinc-200"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2 cursor-pointer select-none">
                                    <Checkbox
                                        id="is_active"
                                        checked={data.is_active}
                                        onCheckedChange={(v) => setData('is_active', Boolean(v))}
                                        disabled={isClosed}
                                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <Label htmlFor="is_active" className="text-xs font-semibold text-zinc-700 cursor-pointer">Set as active financial year</Label>
                                </div>
                                {isEdit && (
                                    <div className="flex items-center gap-2 cursor-pointer select-none">
                                        <Checkbox
                                            id="is_closed"
                                            checked={data.is_closed}
                                            onCheckedChange={(v) => setData('is_closed', Boolean(v))}
                                            disabled={isClosed}
                                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <Label htmlFor="is_closed" className="text-xs font-semibold text-zinc-700 cursor-pointer">Mark as closed (no further edits or posting)</Label>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                                <Link href={route('fixed-asset.settings.financial-years.index')}>
                                    <Button type="button" variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-9.5 rounded-lg cursor-pointer">Cancel</Button>
                                </Link>
                                <Button type="submit" disabled={processing || isClosed} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs h-9.5 rounded-lg cursor-pointer">
                                    {isEdit ? 'Update Year' : 'Create Year'}
                                </Button>
                            </div>
                        </div>
                    </AssetSectionCard>
                </form>
            </AssetPage>
        </Layout>
    );
}
