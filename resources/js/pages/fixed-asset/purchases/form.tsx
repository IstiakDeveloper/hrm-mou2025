import React, { useCallback, useEffect, useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboSelect } from '@/components/ComboSelect';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { AssetPage, AssetPageHeader, AssetSectionCard } from '@/components/fixed-asset/AssetPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { DISPLAY_DATE_FMT, displayDateToServer, parseFormDateValue, todayDisplayDate } from '@/lib/display-date';
import { branchComboSelectItems } from '@/lib/payroll-branches';
import { formatTakaWithSymbol } from '@/lib/taka-format';
import { cn } from '@/lib/utils';
import { ArrowLeft, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { type EmployeeNameFields } from '@/lib/employee-name';

type CategoryOpt = { id: number; code: string; name: string; depreciation_rate: string | null };
type SubCategoryOpt = { id: number; asset_category_id: number; code: string; name: string; depreciation_rate: string | null };
type CustodianOpt = { id: number; name: string; employee_id: number | null; branch_id: number | null; employee?: EmployeeNameFields & { employee_id: string } | null };

type ItemForm = {
    asset_category_id: string;
    asset_sub_category_id: string;
    quantity: string;
    model_no: string;
    unit_purchase_amount: string;
    manual_asset_codes: string[];
    depreciation_rate: string;
    is_insurance: boolean;
    is_warranty: boolean;
    is_guarantee: boolean;
    floor_no: string;
    room_no: string;
    asset_custodian_id: string;
    photo: File | null;
};

const emptyItem = (): ItemForm => ({
    asset_category_id: '',
    asset_sub_category_id: '',
    quantity: '1',
    model_no: '',
    unit_purchase_amount: '',
    manual_asset_codes: [''],
    depreciation_rate: '',
    is_insurance: false,
    is_warranty: false,
    is_guarantee: false,
    floor_no: '',
    room_no: '',
    asset_custodian_id: '',
    photo: null,
});

function Field({
    label,
    required,
    error,
    className,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={cn('space-y-1', className)}>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {label}{required ? ' *' : ''}
            </Label>
            {children}
            {error && <p className="text-[11px] text-red-500">{error}</p>}
        </div>
    );
}

export default function AssetPurchaseForm({
    branches,
    projects,
    vendors,
    categories,
    subCategories,
    custodians,
    purchaseTypes,
    branchScoped,
    scopedBranchId,
}: {
    purchase: null;
    branches: { id: number; name: string; branch_code: string | null; is_head_office?: boolean }[];
    projects: { id: number; name: string; code: string }[];
    vendors: { id: number; name: string; code: string }[];
    categories: CategoryOpt[];
    subCategories: SubCategoryOpt[];
    custodians: CustodianOpt[];
    purchaseTypes: { value: string; label: string }[];
    branchScoped: boolean;
    scopedBranchId: number | null;
}) {
    const { data, setData, post, processing, errors, transform } = useForm({
        branch_id: scopedBranchId ? String(scopedBranchId) : '',
        project_id: '',
        vendor_id: '',
        purchase_date: todayDisplayDate(),
        purchase_type: 'new',
        voucher_no: '',
        ledger_no: '',
        account_head: '',
        description: '',
        items: [emptyItem()] as ItemForm[],
    });

    const updateItem = (index: number, patch: Partial<ItemForm>) => {
        setData('items', data.items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    };

    const fetchPreviewCodes = useCallback(async (branchId: string, categoryId: string, quantity: number): Promise<string[]> => {
        if (!branchId || !categoryId || quantity < 1) return [''];
        const res = await fetch(
            `${route('fixed-asset.purchases.preview-codes')}?branch_id=${branchId}&asset_category_id=${categoryId}&quantity=${quantity}`,
            { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' },
        );
        const json = await res.json();
        return json.codes?.length ? json.codes : [''];
    }, []);

    const subCategoriesByCategory = useMemo(() => {
        return subCategories.reduce<Record<string, SubCategoryOpt[]>>((acc, subCategory) => {
            const key = String(subCategory.asset_category_id);
            if (!acc[key]) acc[key] = [];
            acc[key].push(subCategory);
            return acc;
        }, {});
    }, [subCategories]);

    const accountHeadOptions = useMemo(() => {
        const seen = new Set<string>();
        return data.items
            .map((item) => categories.find((category) => String(category.id) === item.asset_category_id))
            .filter((category): category is CategoryOpt => Boolean(category))
            .filter((category) => {
                if (seen.has(category.name)) return false;
                seen.add(category.name);
                return true;
            })
            .map((category) => ({
                value: category.name,
                label: `${category.code} — ${category.name}`,
            }));
    }, [categories, data.items]);

    const categoryItems = useMemo(
        () => categories.map((c) => ({
            value: c.id,
            label: `${c.code} — ${c.name}`,
            keywords: `${c.code} ${c.name}`,
        })),
        [categories],
    );

    const purchaseTotal = useMemo(
        () => data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_purchase_amount) || 0), 0),
        [data.items],
    );

    const assetCount = useMemo(
        () => data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        [data.items],
    );

    const addItem = () => setData('items', [...data.items, emptyItem()]);
    const removeItem = (index: number) => {
        if (data.items.length <= 1) return;
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const onCategoryChange = async (index: number, categoryId: string) => {
        const cat = categories.find((c) => String(c.id) === categoryId);
        const qty = Number(data.items[index]?.quantity || 1);
        const manual_asset_codes = data.branch_id
            ? await fetchPreviewCodes(data.branch_id, categoryId, qty)
            : data.items[index]?.manual_asset_codes ?? [''];

        setData('items', data.items.map((item, i) => (
            i === index
                ? {
                    ...item,
                    asset_category_id: categoryId,
                    asset_sub_category_id: '',
                    depreciation_rate: cat?.depreciation_rate != null ? String(cat.depreciation_rate) : '',
                    manual_asset_codes,
                }
                : item
        )));
    };

    const onSubCategoryChange = (index: number, subId: string) => {
        const item = data.items[index];
        const subs = subCategoriesByCategory[item?.asset_category_id ?? ''] ?? [];
        const sub = subs.find((s) => String(s.id) === subId);
        const cat = categories.find((c) => String(c.id) === item?.asset_category_id);
        const rate = sub?.depreciation_rate ?? cat?.depreciation_rate ?? '';
        updateItem(index, {
            asset_sub_category_id: subId,
            depreciation_rate: rate != null ? String(rate) : '',
        });
    };

    const onQuantityChange = async (index: number, qty: string) => {
        const quantity = Math.max(1, Number(qty) || 1);
        const item = data.items[index];
        const manual_asset_codes = data.branch_id && item?.asset_category_id
            ? await fetchPreviewCodes(data.branch_id, item.asset_category_id, quantity)
            : item?.manual_asset_codes ?? [''];

        setData('items', data.items.map((row, i) => (
            i === index
                ? { ...row, quantity: String(quantity), manual_asset_codes }
                : row
        )));
    };

    const onBranchChange = async (branchId: string) => {
        setData('branch_id', branchId);

        const nextItems = await Promise.all(data.items.map(async (item) => {
            if (!item.asset_category_id) return item;
            const manual_asset_codes = await fetchPreviewCodes(branchId, item.asset_category_id, Number(item.quantity || 1));
            return { ...item, manual_asset_codes };
        }));

        setData('items', nextItems);
    };

    useEffect(() => {
        if (accountHeadOptions.length === 0) {
            if (data.account_head) setData('account_head', '');
            return;
        }
        const valid = accountHeadOptions.some((o) => o.value === data.account_head);
        if (valid) return;
        if (accountHeadOptions.length === 1) {
            setData('account_head', accountHeadOptions[0].value);
        } else if (data.account_head) {
            setData('account_head', '');
        }
    }, [accountHeadOptions, data.account_head, setData]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            purchase_date: displayDateToServer(payload.purchase_date),
        }));
        post(route('fixed-asset.purchases.store'), { forceFormData: true });
    };

    const filteredCustodians = (branchId: string) =>
        custodians.filter((c) => !branchId || !c.branch_id || String(c.branch_id) === branchId);

    const selectClass = 'flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20';

    return (
        <Layout>
            <Head title="New asset purchase" />
            <AssetPage className="max-w-[1400px] space-y-4 py-3">
                <Link
                    href={route('fixed-asset.purchases.index')}
                    className="inline-flex items-center text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-800"
                >
                    <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to purchases
                </Link>

                <AssetPageHeader
                    icon={ShoppingCart}
                    title="New purchase"
                    description="Left: purchase voucher details. Right: asset line items. Save creates purchase record + assets."
                >
                    <Button
                        type="submit"
                        form="purchase-form"
                        disabled={processing || !data.branch_id}
                        className="h-8.5 rounded-lg bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700"
                    >
                        {processing ? 'Saving…' : 'Save & create assets'}
                    </Button>
                </AssetPageHeader>

                {branchScoped && <BranchScopeAlert branchScoped={branchScoped} />}

                <form id="purchase-form" onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                        {/* LEFT — Purchase header */}
                        <AssetSectionCard title="Purchase details" description="Voucher, branch & accounting" className="lg:sticky lg:top-4">
                            <div className="space-y-3">
                                <Field label="Branch" required error={errors.branch_id}>
                                    <ComboSelect
                                        value={data.branch_id ? Number(data.branch_id) : null}
                                        onChange={(v) => v && onBranchChange(String(v))}
                                        items={branchComboSelectItems(branches, { numericValue: true })}
                                        placeholder="Select branch"
                                        disabled={branchScoped}
                                        className="h-9 border-zinc-200"
                                    />
                                </Field>
                                <Field label="Purchase date" required>
                                    <DatePicker
                                        selected={parseFormDateValue(data.purchase_date)}
                                        onSelect={(d) => setData('purchase_date', d ? format(d, DISPLAY_DATE_FMT) : '')}
                                        nested
                                    />
                                </Field>
                                <Field label="Purchase type" required>
                                    <select className={selectClass} value={data.purchase_type} onChange={(e) => setData('purchase_type', e.target.value)}>
                                        {purchaseTypes.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Project">
                                    <ComboSelect
                                        value={data.project_id ? Number(data.project_id) : null}
                                        onChange={(v) => setData('project_id', v ? String(v) : '')}
                                        items={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                                        placeholder="Optional"
                                        className="h-9 border-zinc-200"
                                    />
                                </Field>
                                <Field label="Vendor">
                                    <ComboSelect
                                        value={data.vendor_id ? Number(data.vendor_id) : null}
                                        onChange={(v) => setData('vendor_id', v ? String(v) : '')}
                                        items={vendors.map((v) => ({ value: v.id, label: v.name }))}
                                        placeholder="Optional"
                                        className="h-9 border-zinc-200"
                                    />
                                </Field>
                                <Field label="Account head">
                                    <ComboSelect
                                        value={data.account_head || null}
                                        onChange={(v) => setData('account_head', v ? String(v) : '')}
                                        items={accountHeadOptions}
                                        placeholder={accountHeadOptions.length ? 'From item category' : 'Select category first'}
                                        disabled={accountHeadOptions.length === 0}
                                        clearable={accountHeadOptions.length > 1}
                                        className="h-9 border-zinc-200"
                                    />
                                </Field>
                                <Field label="Voucher no">
                                    <Input className="h-9 border-zinc-200" value={data.voucher_no} onChange={(e) => setData('voucher_no', e.target.value)} />
                                </Field>
                                <Field label="Ledger no">
                                    <Input className="h-9 border-zinc-200" value={data.ledger_no} onChange={(e) => setData('ledger_no', e.target.value)} />
                                </Field>
                                <Field label="Description">
                                    <Textarea
                                        className="min-h-[72px] resize-none border-zinc-200 text-sm"
                                        rows={3}
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Optional notes"
                                    />
                                </Field>

                                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-xs text-emerald-900">
                                    <p className="font-semibold">Summary</p>
                                    <div className="mt-1.5 space-y-1 text-emerald-800">
                                        <p>{data.items.length} line item(s)</p>
                                        <p>{assetCount} asset(s) to create</p>
                                        <p className="font-mono text-sm font-bold tabular-nums">{formatTakaWithSymbol(purchaseTotal)}</p>
                                    </div>
                                </div>
                            </div>
                        </AssetSectionCard>

                        {/* RIGHT — Line items */}
                        <AssetSectionCard
                            title="Asset line items"
                            description="Category, quantity & codes per item"
                            headerActions={
                                <Button type="button" variant="outline" size="sm" className="h-7.5 rounded-md border-zinc-200 text-xs" onClick={addItem}>
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Add item
                                </Button>
                            }
                        >
                            <div className="max-h-[calc(100vh-220px)] space-y-3 overflow-y-auto pr-1">
                                {data.items.map((item, index) => {
                                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_purchase_amount) || 0);
                                    const subs = subCategoriesByCategory[item.asset_category_id] ?? [];

                                    return (
                                        <div key={index} className="rounded-lg border border-zinc-200/80 bg-zinc-50/30 p-3">
                                            <div className="mb-2.5 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                                                        {index + 1}
                                                    </span>
                                                    <span className="text-xs font-semibold text-zinc-700">
                                                        {categories.find((c) => String(c.id) === item.asset_category_id)?.name ?? 'New line item'}
                                                    </span>
                                                    {lineTotal > 0 && (
                                                        <span className="font-mono text-[11px] font-semibold text-emerald-700 tabular-nums">
                                                            {formatTakaWithSymbol(lineTotal)}
                                                        </span>
                                                    )}
                                                </div>
                                                {data.items.length > 1 && (
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeItem(index)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="space-y-2.5">
                                                <Field label="Category" required>
                                                    <ComboSelect
                                                        value={item.asset_category_id ? Number(item.asset_category_id) : null}
                                                        onChange={(v) => v && onCategoryChange(index, String(v))}
                                                        items={categoryItems}
                                                        placeholder="Select"
                                                        className="h-9 border-zinc-200"
                                                    />
                                                </Field>
                                                <Field label="Sub category">
                                                    <ComboSelect
                                                        value={item.asset_sub_category_id ? Number(item.asset_sub_category_id) : null}
                                                        onChange={(v) => onSubCategoryChange(index, v ? String(v) : '')}
                                                        items={subs.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
                                                        placeholder={item.asset_category_id ? 'Optional' : 'Select category first'}
                                                        disabled={!item.asset_category_id}
                                                        className="h-9 border-zinc-200"
                                                    />
                                                </Field>
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <Field label="Quantity" required>
                                                        <Input type="number" min={1} max={100} className="h-9 border-zinc-200" value={item.quantity} onChange={(e) => onQuantityChange(index, e.target.value)} />
                                                    </Field>
                                                    <Field label="Unit amount" required>
                                                        <Input type="number" min={0} step="0.01" className="h-9 border-zinc-200 font-mono" value={item.unit_purchase_amount} onChange={(e) => updateItem(index, { unit_purchase_amount: e.target.value })} />
                                                    </Field>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <Field label="Dep. rate %">
                                                        <Input value={item.depreciation_rate} readOnly className="h-9 border-zinc-200 bg-zinc-100 font-mono text-xs" placeholder="Auto" />
                                                    </Field>
                                                    <Field label="Model no">
                                                        <Input className="h-9 border-zinc-200" value={item.model_no} onChange={(e) => updateItem(index, { model_no: e.target.value })} />
                                                    </Field>
                                                </div>
                                                <Field label="Custodian">
                                                    <ComboSelect
                                                        value={item.asset_custodian_id ? Number(item.asset_custodian_id) : null}
                                                        onChange={(v) => updateItem(index, { asset_custodian_id: v ? String(v) : '' })}
                                                        items={filteredCustodians(data.branch_id).map((c) => ({
                                                            value: c.id,
                                                            label: c.employee ? `${c.name} (${c.employee.employee_id})` : c.name,
                                                        }))}
                                                        placeholder="Optional"
                                                        className="h-9 border-zinc-200"
                                                    />
                                                </Field>
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    <Field label="Floor">
                                                        <Input className="h-9 border-zinc-200" value={item.floor_no} onChange={(e) => updateItem(index, { floor_no: e.target.value })} />
                                                    </Field>
                                                    <Field label="Room">
                                                        <Input className="h-9 border-zinc-200" value={item.room_no} onChange={(e) => updateItem(index, { room_no: e.target.value })} />
                                                    </Field>
                                                </div>
                                                <Field label="Photo">
                                                    <Input type="file" accept="image/*" className="h-9 border-zinc-200 text-xs file:mr-2 file:rounded file:border-0 file:bg-emerald-50 file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-emerald-700" onChange={(e) => updateItem(index, { photo: e.target.files?.[0] ?? null })} />
                                                </Field>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-zinc-600">
                                                        <Checkbox checked={item.is_insurance} onCheckedChange={(v) => updateItem(index, { is_insurance: Boolean(v) })} className="h-3.5 w-3.5" />
                                                        Insurance
                                                    </label>
                                                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-zinc-600">
                                                        <Checkbox checked={item.is_warranty} onCheckedChange={(v) => updateItem(index, { is_warranty: Boolean(v) })} className="h-3.5 w-3.5" />
                                                        Warranty
                                                    </label>
                                                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-zinc-600">
                                                        <Checkbox checked={item.is_guarantee} onCheckedChange={(v) => updateItem(index, { is_guarantee: Boolean(v) })} className="h-3.5 w-3.5" />
                                                        Guarantee
                                                    </label>
                                                </div>
                                                <Field label="Asset codes">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {item.manual_asset_codes.map((code, codeIndex) => (
                                                            <Input
                                                                key={codeIndex}
                                                                value={code}
                                                                onChange={(e) => {
                                                                    const codes = [...item.manual_asset_codes];
                                                                    codes[codeIndex] = e.target.value.toUpperCase();
                                                                    updateItem(index, { manual_asset_codes: codes });
                                                                }}
                                                                className="h-8 border-zinc-200 font-mono text-[11px]"
                                                                placeholder={`#${codeIndex + 1}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </Field>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </AssetSectionCard>
                    </div>

                    <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white/95 px-4 py-3 shadow-md backdrop-blur-sm">
                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
                            <span><strong className="text-zinc-900">{data.items.length}</strong> line(s)</span>
                            <span><strong className="text-zinc-900">{assetCount}</strong> asset(s)</span>
                            <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">{formatTakaWithSymbol(purchaseTotal)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" className="h-8.5 rounded-lg border-zinc-200" onClick={addItem}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add item
                            </Button>
                            <Button type="submit" disabled={processing || !data.branch_id} className="h-8.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                                {processing ? 'Saving…' : 'Save & create assets'}
                            </Button>
                        </div>
                    </div>
                </form>
            </AssetPage>
        </Layout>
    );
}
