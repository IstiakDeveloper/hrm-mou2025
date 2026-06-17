import React, { useCallback, useEffect, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboSelect } from '@/components/ComboSelect';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { BranchScopeAlert } from '@/components/fixed-asset/BranchScopeAlert';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { displayDateToServer, todayDisplayDate } from '@/lib/display-date';
import { ArrowLeft, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';

type CategoryOpt = { id: number; code: string; name: string; depreciation_rate: string | null };
type SubCategoryOpt = { id: number; code: string; name: string; depreciation_rate: string | null };
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

export default function AssetPurchaseForm({
    branches,
    projects,
    vendors,
    categories,
    custodians,
    purchaseTypes,
    branchScoped,
    scopedBranchId,
}: {
    purchase: null;
    branches: { id: number; name: string; branch_code: string }[];
    projects: { id: number; name: string; code: string }[];
    vendors: { id: number; name: string; code: string }[];
    categories: CategoryOpt[];
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

    const [subCategoriesByItem, setSubCategoriesByItem] = useState<Record<number, SubCategoryOpt[]>>({});

    const loadSubCategories = useCallback(async (itemIndex: number, categoryId: string) => {
        if (!categoryId) {
            setSubCategoriesByItem((prev) => ({ ...prev, [itemIndex]: [] }));
            return;
        }
        const res = await fetch(`${route('fixed-asset.purchases.sub-categories')}?category_id=${categoryId}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        });
        const json = await res.json();
        setSubCategoriesByItem((prev) => ({ ...prev, [itemIndex]: json.sub_categories ?? [] }));

        const sub = (json.sub_categories as SubCategoryOpt[] | undefined)?.find(
            (s) => String(s.id) === data.items[itemIndex]?.asset_sub_category_id,
        );
        const rate = sub?.depreciation_rate ?? json.category_depreciation_rate ?? '';
        updateItem(itemIndex, { depreciation_rate: rate != null ? String(rate) : '' });
    }, [data.items]);

    const previewCodes = useCallback(async (itemIndex: number, branchId: string, categoryId: string, quantity: number) => {
        if (!branchId || !categoryId || quantity < 1) return;
        const res = await fetch(
            `${route('fixed-asset.purchases.preview-codes')}?branch_id=${branchId}&asset_category_id=${categoryId}&quantity=${quantity}`,
            { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' },
        );
        const json = await res.json();
        const codes: string[] = json.codes ?? [];
        updateItem(itemIndex, { manual_asset_codes: codes });
    }, []);

    const updateItem = (index: number, patch: Partial<ItemForm>) => {
        const items = [...data.items];
        items[index] = { ...items[index], ...patch };
        setData('items', items);
    };

    const addItem = () => setData('items', [...data.items, emptyItem()]);
    const removeItem = (index: number) => {
        if (data.items.length <= 1) return;
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const onCategoryChange = (index: number, categoryId: string) => {
        updateItem(index, { asset_category_id: categoryId, asset_sub_category_id: '', depreciation_rate: '' });
        const cat = categories.find((c) => String(c.id) === categoryId);
        if (cat?.depreciation_rate != null) {
            updateItem(index, { depreciation_rate: String(cat.depreciation_rate) });
        }
        loadSubCategories(index, categoryId);
        const qty = Number(data.items[index]?.quantity || 1);
        if (data.branch_id && categoryId) {
            previewCodes(index, data.branch_id, categoryId, qty);
        }
    };

    const onSubCategoryChange = (index: number, subId: string) => {
        updateItem(index, { asset_sub_category_id: subId });
        const subs = subCategoriesByItem[index] ?? [];
        const sub = subs.find((s) => String(s.id) === subId);
        const cat = categories.find((c) => String(c.id) === data.items[index]?.asset_category_id);
        const rate = sub?.depreciation_rate ?? cat?.depreciation_rate ?? '';
        updateItem(index, { depreciation_rate: rate != null ? String(rate) : '' });
    };

    const onQuantityChange = (index: number, qty: string) => {
        const quantity = Math.max(1, Number(qty) || 1);
        updateItem(index, { quantity: String(quantity) });
        if (data.branch_id && data.items[index]?.asset_category_id) {
            previewCodes(index, data.branch_id, data.items[index].asset_category_id, quantity);
        }
    };

    useEffect(() => {
        data.items.forEach((item, index) => {
            if (item.asset_category_id && !subCategoriesByItem[index]) {
                loadSubCategories(index, item.asset_category_id);
            }
        });
    }, []);

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

    return (
        <Layout>
            <Head title="New asset purchase" />
            <PayrollPage>
                <Link href={route('fixed-asset.purchases.index')} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <PayrollPageHeader icon={ShoppingCart} title="New purchase" description="Purchase details will create fixed asset register entries per quantity." />
                {branchScoped && <BranchScopeAlert className="mb-4" />}
                <form onSubmit={submit} className="space-y-4">
                    <PayrollSectionCard title="Purchase header">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <Label>Branch *</Label>
                                <ComboSelect
                                    value={data.branch_id ? Number(data.branch_id) : null}
                                    onChange={(v) => {
                                        if (v) {
                                            setData('branch_id', String(v));
                                            data.items.forEach((item, i) => {
                                                if (item.asset_category_id) {
                                                    previewCodes(i, String(v), item.asset_category_id, Number(item.quantity || 1));
                                                }
                                            });
                                        }
                                    }}
                                    items={branches.map((b) => ({ value: b.id, label: b.name }))}
                                    disabled={branchScoped}
                                />
                                {errors.branch_id && <p className="text-sm text-red-500">{errors.branch_id}</p>}
                            </div>
                            <div>
                                <Label>Project</Label>
                                <ComboSelect value={data.project_id ? Number(data.project_id) : null} onChange={(v) => setData('project_id', v ? String(v) : '')} items={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} placeholder="Optional" />
                            </div>
                            <div>
                                <Label>Vendor</Label>
                                <ComboSelect value={data.vendor_id ? Number(data.vendor_id) : null} onChange={(v) => setData('vendor_id', v ? String(v) : '')} items={vendors.map((v) => ({ value: v.id, label: v.name }))} placeholder="Optional" />
                            </div>
                            <div>
                                <Label>Purchase date *</Label>
                            <FormDateField
                                label="Purchase date"
                                value={data.purchase_date}
                                onChange={(v) => setData('purchase_date', v)}
                                required
                            />
                            </div>
                            <div>
                                <Label>Purchase type *</Label>
                                <select className="flex h-9 w-full rounded-md border px-2 text-sm" value={data.purchase_type} onChange={(e) => setData('purchase_type', e.target.value)}>
                                    {purchaseTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Account head</Label>
                                <Input value={data.account_head} onChange={(e) => setData('account_head', e.target.value)} />
                            </div>
                            <div>
                                <Label>Voucher no</Label>
                                <Input value={data.voucher_no} onChange={(e) => setData('voucher_no', e.target.value)} />
                            </div>
                            <div>
                                <Label>Ledger no</Label>
                                <Input value={data.ledger_no} onChange={(e) => setData('ledger_no', e.target.value)} />
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                                <Label>Description</Label>
                                <Textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={2} />
                            </div>
                        </div>
                    </PayrollSectionCard>

                    {data.items.map((item, index) => (
                        <PayrollSectionCard
                            key={index}
                            title={`Item ${index + 1}`}
                            className="relative"
                        >
                            {data.items.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" className="absolute right-4 top-4" onClick={() => removeItem(index)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            )}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <Label>Category *</Label>
                                    <ComboSelect
                                        value={item.asset_category_id ? Number(item.asset_category_id) : null}
                                        onChange={(v) => v && onCategoryChange(index, String(v))}
                                        items={categories.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                                    />
                                </div>
                                <div>
                                    <Label>Sub category</Label>
                                    <ComboSelect
                                        value={item.asset_sub_category_id ? Number(item.asset_sub_category_id) : null}
                                        onChange={(v) => onSubCategoryChange(index, v ? String(v) : '')}
                                        items={(subCategoriesByItem[index] ?? []).map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <Label>Depreciation rate (%)</Label>
                                    <Input value={item.depreciation_rate} readOnly className="bg-muted" placeholder="Auto" />
                                </div>
                                <div>
                                    <Label>Quantity *</Label>
                                    <Input type="number" min={1} max={100} value={item.quantity} onChange={(e) => onQuantityChange(index, e.target.value)} />
                                </div>
                                <div>
                                    <Label>Model no</Label>
                                    <Input value={item.model_no} onChange={(e) => updateItem(index, { model_no: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Unit purchase amount *</Label>
                                    <Input type="number" min={0} step="0.01" value={item.unit_purchase_amount} onChange={(e) => updateItem(index, { unit_purchase_amount: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Custodian</Label>
                                    <ComboSelect
                                        value={item.asset_custodian_id ? Number(item.asset_custodian_id) : null}
                                        onChange={(v) => updateItem(index, { asset_custodian_id: v ? String(v) : '' })}
                                        items={filteredCustodians(data.branch_id).map((c) => ({
                                            value: c.id,
                                            label: c.employee ? `${c.name} (${c.employee.employee_id})` : c.name,
                                        }))}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <Label>Floor no</Label>
                                    <Input value={item.floor_no} onChange={(e) => updateItem(index, { floor_no: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Room no</Label>
                                    <Input value={item.room_no} onChange={(e) => updateItem(index, { room_no: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Photo</Label>
                                    <Input type="file" accept="image/*" onChange={(e) => updateItem(index, { photo: e.target.files?.[0] ?? null })} />
                                </div>
                                <div className="flex flex-wrap items-center gap-4 lg:col-span-3">
                                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={item.is_insurance} onCheckedChange={(v) => updateItem(index, { is_insurance: Boolean(v) })} />Insurance</label>
                                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={item.is_warranty} onCheckedChange={(v) => updateItem(index, { is_warranty: Boolean(v) })} />Warranty</label>
                                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={item.is_guarantee} onCheckedChange={(v) => updateItem(index, { is_guarantee: Boolean(v) })} />Guarantee</label>
                                </div>
                                <div className="lg:col-span-3">
                                    <Label>Manual asset codes (editable)</Label>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {item.manual_asset_codes.map((code, codeIndex) => (
                                            <Input
                                                key={codeIndex}
                                                value={code}
                                                onChange={(e) => {
                                                    const codes = [...item.manual_asset_codes];
                                                    codes[codeIndex] = e.target.value.toUpperCase();
                                                    updateItem(index, { manual_asset_codes: codes });
                                                }}
                                                className="font-mono text-xs"
                                                placeholder={`Unit ${codeIndex + 1}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </PayrollSectionCard>
                    ))}

                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={addItem}><Plus className="mr-2 h-4 w-4" />Add item</Button>
                        <Button type="submit" disabled={processing || !data.branch_id}>Save purchase & create assets</Button>
                    </div>
                </form>
            </PayrollPage>
        </Layout>
    );
}
