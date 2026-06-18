import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import Layout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageSurface } from '@/components/page-surface';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BranchTypeSelect } from '@/components/inventory/BranchTypeSelect';
import { ComboSelect } from '@/components/ComboSelect';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { displayDateToServer, formatDisplayDate, todayDisplayDate } from '@/lib/display-date';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { hasAppPermission } from '@/lib/permissions';
import { lockedBranchId, type InventoryBranchScope } from '@/lib/inventory-branch-scope';
import { ArrowDownToLine, Edit, Send, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SharedData } from '@/types';

type Product = { id: number; name: string; unit: string };
type StockRow = { branch_id: number; product_id: number; balance: number; branch_name: string; product_name: string };
type Employee = EmployeeNameFields & { id: number; employee_id: string; current_branch_id: number | null };
type SavedRecipient = { id: number; name: string };
type ApiEmployee = { id: number; employee_id: string; name: string; label: string };

type Movement = {
    id: number;
    type: 'in' | 'out';
    branch_id: number;
    product_id: number;
    recipient_id: number | null;
    quantity: number;
    movement_date: string;
    remarks: string | null;
    branch: { name: string };
    product: { name: string; unit: string };
    employee: (EmployeeNameFields & { employee_id: string }) | null;
    recipient?: { id: number; name: string; employee_id: number | null; employee?: EmployeeNameFields & { employee_id: string } | null } | null;
};

type Props = {
    movements: { data: Movement[] };
    filters: { tab?: string; branch_id?: string; product_id?: string; date_from?: string; date_to?: string };
    branches: { headOffice: { id: number; name: string }[]; branches: { id: number; name: string }[] };
    branchScope?: InventoryBranchScope;
    products: Product[];
    stocks: StockRow[];
    employees: Employee[];
    units: Record<string, string>;
};

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'in', label: 'Stock In' },
    { id: 'out', label: 'Disburse' },
] as const;

function csrfPost<T>(url: string, data: Record<string, unknown>) {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    return axios.post<T>(url, data, {
        headers: { 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
    });
}

function FormErrors({ errors }: { errors: Record<string, string> }) {
    const messages = Object.values(errors).filter(Boolean);
    if (!messages.length) return null;
    return (
        <Alert variant="destructive" className="py-2">
            <AlertDescription>
                <ul className="list-disc pl-4 text-xs space-y-0.5">
                    {messages.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
            </AlertDescription>
        </Alert>
    );
}

function movementRecipientLabel(row: Movement): string {
    if (row.recipient) {
        if (row.recipient.employee) {
            return `${row.recipient.employee.employee_id} — ${employeeDisplayName(row.recipient.employee)}`;
        }
        return row.recipient.name;
    }
    if (row.employee) {
        return `${row.employee.employee_id} — ${employeeDisplayName(row.employee)}`;
    }
    return '—';
}

function movementRecipientKey(row: Movement): string {
    if (row.recipient?.employee_id) {
        return `e:${row.recipient.employee_id}`;
    }
    if (row.recipient_id) {
        return `r:${row.recipient_id}`;
    }
    return '';
}

export default function InventoryOperationsIndex({ movements, filters, branches, branchScope, products: initialProducts, stocks, units }: Props) {
    const { auth, flash, errors: pageErrors } = usePage<SharedData>().props;
    const canCreate = hasAppPermission(auth, 'inventory.create');
    const canEdit = hasAppPermission(auth, 'inventory.edit');
    const canDelete = hasAppPermission(auth, 'inventory.delete');
    const branchLocked = Boolean(branchScope?.locked);
    const fixedBranchId = lockedBranchId(branchScope);
    const serverErrorMessages = useMemo(
        () => Object.values(pageErrors).filter((msg): msg is string => Boolean(msg)),
        [pageErrors],
    );
    const tab = filters.tab || 'all';
    const [productList, setProductList] = useState(initialProducts);
    const [branchId, setBranchId] = useState<string | null>(fixedBranchId ?? (filters.branch_id || null));
    const [productId, setProductId] = useState<string | null>(filters.product_id || null);
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [stockInOpen, setStockInOpen] = useState(false);
    const [disburseOpen, setDisburseOpen] = useState(false);
    const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
    const [savingProduct, setSavingProduct] = useState(false);
    const [savingRecipient, setSavingRecipient] = useState(false);
    const [recipientSaveError, setRecipientSaveError] = useState<string | null>(null);

    const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
    const [branchEmployees, setBranchEmployees] = useState<ApiEmployee[]>([]);

    const stockInForm = useForm({
        branch_id: '',
        product_id: '',
        quantity: '',
        movement_date: todayDisplayDate(),
        remarks: '',
    });

    const disburseForm = useForm({
        branch_id: '',
        product_id: '',
        recipient_key: '',
        quantity: '',
        movement_date: todayDisplayDate(),
        remarks: '',
    });

    const availableAtBranch = useMemo(() => {
        const bid = disburseForm.data.branch_id;
        const pid = disburseForm.data.product_id;
        if (!bid || !pid) return null;
        const row = stocks.find((s) => String(s.branch_id) === bid && String(s.product_id) === pid);
        let avail = row?.balance ?? 0;
        if (
            editingMovement?.type === 'out'
            && String(editingMovement.branch_id) === bid
            && String(editingMovement.product_id) === pid
        ) {
            avail += editingMovement.quantity;
        }
        return avail;
    }, [disburseForm.data.branch_id, disburseForm.data.product_id, stocks, editingMovement]);

    useEffect(() => {
        setProductList(initialProducts);
    }, [initialProducts]);

    useEffect(() => {
        if (Object.keys(disburseForm.errors).length > 0) setDisburseOpen(true);
    }, [disburseForm.errors]);

    useEffect(() => {
        if (Object.keys(stockInForm.errors).length > 0) setStockInOpen(true);
    }, [stockInForm.errors]);

    const productItems = useMemo(
        () => productList.map((p) => ({
            value: String(p.id),
            label: `${p.name} (${units[p.unit] || p.unit})`,
            keywords: p.name,
        })),
        [productList, units],
    );

    const disburseProductItems = useMemo(() => {
        const bid = disburseForm.data.branch_id;
        return productList.map((p) => {
            const row = bid
                ? stocks.find((s) => String(s.branch_id) === bid && String(s.product_id) === String(p.id))
                : null;
            const avail = row?.balance ?? 0;
            const suffix = bid ? ` — ${avail} in stock` : '';
            return {
                value: String(p.id),
                label: `${p.name} (${units[p.unit] || p.unit})${suffix}`,
                keywords: p.name,
            };
        });
    }, [productList, units, stocks, disburseForm.data.branch_id]);

    const filterProductItems = useMemo(() => productItems, [productItems]);

    const loadRecipients = useCallback((bid: string) => {
        if (!bid) {
            setSavedRecipients([]);
            setBranchEmployees([]);
            return;
        }
        axios.get(route('inventory.operations.recipients'), { params: { branch_id: bid } })
            .then((res) => {
                setSavedRecipients(res.data.saved ?? []);
                setBranchEmployees(res.data.employees ?? []);
            })
            .catch(() => {
                setSavedRecipients([]);
                setBranchEmployees([]);
            });
    }, []);

    useEffect(() => {
        if (disburseForm.data.branch_id) {
            loadRecipients(disburseForm.data.branch_id);
        }
    }, [disburseForm.data.branch_id, loadRecipients]);

    useEffect(() => {
        if (!fixedBranchId) return;
        setBranchId(fixedBranchId);
    }, [fixedBranchId]);

    const withFixedBranch = (branchValue = '') => (fixedBranchId ?? branchValue);

    const recipientItems = useMemo(() => {
        const items: { value: string; label: string; keywords?: string }[] = [];
        savedRecipients.forEach((r) => {
            items.push({ value: `r:${r.id}`, label: r.name, keywords: `saved ${r.name}` });
        });
        branchEmployees.forEach((e) => {
            items.push({ value: `e:${e.id}`, label: e.label, keywords: `employee ${e.employee_id} ${e.name}` });
        });
        return items;
    }, [savedRecipients, branchEmployees]);

    const applyFilters = (nextTab = tab) => {
        router.get(route('inventory.operations.index'), {
            tab: nextTab,
            branch_id: branchId || undefined,
            product_id: productId || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true });
    };

    const quickAddProduct = async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed || savingProduct) return;

        const existing = productList.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
            stockInForm.setData('product_id', String(existing.id));
            return;
        }

        setSavingProduct(true);
        try {
            const res = await csrfPost<Product>(route('inventory.products.quick'), { name: trimmed, unit: 'pcs' });
            const p = res.data;
            setProductList((prev) => {
                if (prev.some((x) => x.id === p.id)) return prev;
                return [...prev, p].sort((a, b) => a.name.localeCompare(b.name));
            });
            stockInForm.setData('product_id', String(p.id));
        } catch {
            stockInForm.setError('product_id', 'Could not save product. Try again.');
        } finally {
            setSavingProduct(false);
        }
    };

    const quickAddRecipient = async (name: string) => {
        const branch = disburseForm.data.branch_id;
        const trimmed = name.trim();
        if (!branch || !trimmed || savingRecipient) return;

        setRecipientSaveError(null);

        const existing = savedRecipients.find((r) => r.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
            disburseForm.setData('recipient_key', `r:${existing.id}`);
            return;
        }

        setSavingRecipient(true);
        try {
            const res = await csrfPost<SavedRecipient>(route('inventory.operations.recipients.store'), {
                branch_id: branch,
                name: trimmed,
            });
            const r = res.data;
            setSavedRecipients((prev) => {
                if (prev.some((x) => x.id === r.id)) return prev;
                return [...prev, r].sort((a, b) => a.name.localeCompare(b.name));
            });
            disburseForm.setData('recipient_key', `r:${r.id}`);
        } catch {
            setRecipientSaveError('Could not save name. Try again.');
        } finally {
            setSavingRecipient(false);
        }
    };

    const openCreateStockIn = () => {
        setEditingMovement(null);
        stockInForm.reset();
        stockInForm.setData({
            branch_id: withFixedBranch(),
            movement_date: todayDisplayDate(),
        });
        stockInForm.clearErrors();
        setStockInOpen(true);
    };

    const openEditStockIn = (row: Movement) => {
        setEditingMovement(row);
        stockInForm.setData({
            branch_id: String(row.branch_id),
            product_id: String(row.product_id),
            quantity: String(row.quantity),
            movement_date: formatDisplayDate(row.movement_date),
            remarks: row.remarks || '',
        });
        stockInForm.clearErrors();
        setStockInOpen(true);
    };

    const openCreateDisburse = () => {
        setEditingMovement(null);
        disburseForm.reset();
        disburseForm.setData({
            branch_id: withFixedBranch(),
            movement_date: todayDisplayDate(),
        });
        disburseForm.clearErrors();
        setRecipientSaveError(null);
        if (fixedBranchId) {
            loadRecipients(fixedBranchId);
        }
        setDisburseOpen(true);
    };

    const openEditDisburse = (row: Movement) => {
        setEditingMovement(row);
        const branchId = String(row.branch_id);
        disburseForm.setData({
            branch_id: branchId,
            product_id: String(row.product_id),
            recipient_key: movementRecipientKey(row),
            quantity: String(row.quantity),
            movement_date: formatDisplayDate(row.movement_date),
            remarks: row.remarks || '',
        });
        disburseForm.clearErrors();
        setRecipientSaveError(null);
        loadRecipients(branchId);
        setDisburseOpen(true);
    };

    const deleteMovement = (row: Movement) => {
        const label = row.type === 'in' ? 'stock in' : 'disburse';
        if (!confirm(`Delete this ${label} record?`)) return;
        router.delete(route('inventory.operations.movements.destroy', row.id), { preserveScroll: true });
    };

    const submitStockIn = (e: React.FormEvent) => {
        e.preventDefault();
        stockInForm.clearErrors();

        if (!stockInForm.data.branch_id) {
            stockInForm.setError('branch_id', 'Select a branch.');
            return;
        }
        if (!stockInForm.data.product_id) {
            stockInForm.setError('product_id', 'Select or add a product.');
            return;
        }
        if (!stockInForm.data.quantity || Number(stockInForm.data.quantity) < 1) {
            stockInForm.setError('quantity', 'Enter a valid quantity.');
            return;
        }
        const movementDate = displayDateToServer(stockInForm.data.movement_date);
        if (!movementDate) {
            stockInForm.setError('movement_date', 'Select a valid date.');
            return;
        }

        stockInForm.transform((data) => ({
            ...data,
            movement_date: movementDate,
            quantity: Number(data.quantity),
        }));

        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                setStockInOpen(false);
                setEditingMovement(null);
                stockInForm.reset();
                stockInForm.setData('movement_date', todayDisplayDate());
            },
            onError: () => setStockInOpen(true),
        };

        if (editingMovement?.type === 'in') {
            stockInForm.put(route('inventory.operations.movements.update', editingMovement.id), opts);
        } else {
            stockInForm.post(route('inventory.operations.stock-in'), opts);
        }
    };

    const submitDisburse = (e: React.FormEvent) => {
        e.preventDefault();
        disburseForm.clearErrors();
        setRecipientSaveError(null);

        if (!disburseForm.data.branch_id) {
            disburseForm.setError('branch_id', 'Select a branch.');
            return;
        }
        if (!disburseForm.data.product_id) {
            disburseForm.setError('product_id', 'Select a product.');
            return;
        }
        if (!disburseForm.data.recipient_key) {
            disburseForm.setError('recipient_key', 'Select or add a recipient.');
            return;
        }
        if (!disburseForm.data.quantity || Number(disburseForm.data.quantity) < 1) {
            disburseForm.setError('quantity', 'Enter a valid quantity.');
            return;
        }
        const movementDate = displayDateToServer(disburseForm.data.movement_date);
        if (!movementDate) {
            disburseForm.setError('movement_date', 'Select a valid date.');
            return;
        }
        if (availableAtBranch !== null && Number(disburseForm.data.quantity) > availableAtBranch) {
            disburseForm.setError('quantity', `Insufficient stock. Available: ${availableAtBranch}`);
            return;
        }

        const branchBeforeReset = disburseForm.data.branch_id;

        disburseForm.transform((data) => ({
            ...data,
            movement_date: movementDate,
            quantity: Number(data.quantity),
        }));

        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                setDisburseOpen(false);
                setEditingMovement(null);
                disburseForm.reset();
                disburseForm.setData('movement_date', todayDisplayDate());
                if (branchBeforeReset) loadRecipients(branchBeforeReset);
            },
            onError: () => setDisburseOpen(true),
        };

        if (editingMovement?.type === 'out') {
            disburseForm.put(route('inventory.operations.movements.update', editingMovement.id), opts);
        } else {
            disburseForm.post(route('inventory.operations.disburse'), opts);
        }
    };

    return (
        <Layout>
            <Head title="Stock & Disburse" />
            <PageSurface>
                <div className="mb-5 flex flex-col sm:flex-row justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Stock &amp; Disburse</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Stock in and disburse on one page
                            {branchLocked && branchScope?.branch_name ? (
                                <span className="text-sky-700"> — {branchScope.branch_name}</span>
                            ) : null}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {canCreate && (
                            <Button className="bg-sky-600 hover:bg-sky-700" onClick={openCreateStockIn}>
                                <ArrowDownToLine className="h-4 w-4 mr-1" />Stock In
                            </Button>
                        )}
                        {canCreate && (
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDisburse}>
                                <Send className="h-4 w-4 mr-1" />Disburse
                            </Button>
                        )}
                    </div>
                </div>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-100 bg-emerald-50/40 text-emerald-950 rounded-xl">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Success</AlertTitle>
                        <AlertDescription className="text-xs text-emerald-700 mt-1">{flash.success}</AlertDescription>
                    </Alert>
                )}
                {(flash?.error || serverErrorMessages.length > 0) && (
                    <Alert variant="destructive" className="mb-4 rounded-xl">
                        <AlertTitle className="text-xs font-semibold uppercase tracking-wider">Error</AlertTitle>
                        <AlertDescription className="text-xs mt-1">
                            {flash?.error ? (
                                flash.error
                            ) : (
                                <ul className="list-disc pl-4 space-y-0.5">
                                    {serverErrorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                                </ul>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="mb-4 flex flex-wrap gap-2">
                    {TABS.map((t) => (
                        <Button
                            key={t.id}
                            size="sm"
                            variant={tab === t.id ? 'default' : 'outline'}
                            className={tab === t.id ? 'bg-sky-600 hover:bg-sky-700' : ''}
                            onClick={() => applyFilters(t.id)}
                        >
                            {t.label}
                        </Button>
                    ))}
                </div>

                <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                    <BranchTypeSelect
                        value={branchId}
                        onChange={setBranchId}
                        branches={branches}
                        placeholder="All branches"
                        disabled={branchLocked}
                        clearable={!branchLocked}
                    />
                    <ComboSelect
                        value={productId}
                        onChange={setProductId}
                        items={filterProductItems}
                        placeholder="All products"
                        clearable
                    />
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    <Button onClick={() => applyFilters()} className="bg-sky-600 hover:bg-sky-700">Filter</Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Recipient</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead>Remarks</TableHead>
                                {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movements.data.length ? movements.data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="text-sm">{formatDisplayDate(row.movement_date)}</TableCell>
                                    <TableCell>
                                        <Badge className={row.type === 'in' ? 'bg-sky-100 text-sky-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
                                            {row.type === 'in' ? 'Stock In' : 'Disburse'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{row.branch.name}</TableCell>
                                    <TableCell className="text-sm">{row.product.name}</TableCell>
                                    <TableCell className="text-sm">{row.type === 'out' ? movementRecipientLabel(row) : '—'}</TableCell>
                                    <TableCell className="text-right tabular-nums font-medium">{row.quantity} {row.product.unit}</TableCell>
                                    <TableCell className="text-sm text-slate-500 max-w-[140px] truncate">{row.remarks || '—'}</TableCell>
                                    {(canEdit || canDelete) && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {canEdit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => (row.type === 'in' ? openEditStockIn(row) : openEditDisburse(row))}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600"
                                                        onClick={() => deleteMovement(row)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={(canEdit || canDelete) ? 8 : 7} className="text-center py-8 text-slate-500">No records.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Stock In Modal */}
                <Dialog open={stockInOpen} onOpenChange={(open) => {
                    setStockInOpen(open);
                    if (!open) {
                        setEditingMovement(null);
                        stockInForm.reset();
                        stockInForm.setData('movement_date', todayDisplayDate());
                    }
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>{editingMovement?.type === 'in' ? 'Edit Stock In' : 'Stock In'}</DialogTitle></DialogHeader>
                        <form onSubmit={submitStockIn} className="space-y-3">
                            <FormErrors errors={stockInForm.errors} />
                            <div>
                                <Label>Branch</Label>
                                <BranchTypeSelect
                                    value={stockInForm.data.branch_id || null}
                                    onChange={(v) => stockInForm.setData('branch_id', v ?? '')}
                                    branches={branches}
                                    portal={false}
                                    disabled={branchLocked}
                                    clearable={!branchLocked}
                                />
                                {stockInForm.errors.branch_id && <p className="text-xs text-red-600">{stockInForm.errors.branch_id}</p>}
                            </div>
                            <div>
                                <Label>Product</Label>
                                <ComboSelect
                                    value={stockInForm.data.product_id || null}
                                    onChange={(v) => stockInForm.setData('product_id', v ?? '')}
                                    items={productItems}
                                    placeholder="Search or type new product…"
                                    portal={false}
                                    disabled={savingProduct || Boolean(editingMovement)}
                                    creatable={!editingMovement}
                                    onCreate={(name) => void quickAddProduct(name)}
                                    createLabel={(q) => `Add "${q}" (pcs)`}
                                />
                                {savingProduct && <p className="text-xs text-slate-500 mt-1">Product saving…</p>}
                                {stockInForm.errors.product_id && <p className="text-xs text-red-600">{stockInForm.errors.product_id}</p>}
                            </div>
                            <div>
                                <Label>Quantity</Label>
                                <Input type="number" min={1} value={stockInForm.data.quantity} onChange={(e) => stockInForm.setData('quantity', e.target.value)} />
                                {stockInForm.errors.quantity && <p className="text-xs text-red-600">{stockInForm.errors.quantity}</p>}
                            </div>
                            <FormDateField
                                label="Date"
                                value={stockInForm.data.movement_date}
                                onChange={(v) => stockInForm.setData('movement_date', v)}
                                required
                                nested
                                error={stockInForm.errors.movement_date}
                            />
                            <div>
                                <Label>Description</Label>
                                <Input value={stockInForm.data.remarks} onChange={(e) => stockInForm.setData('remarks', e.target.value)} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={stockInForm.processing} className="bg-sky-600 hover:bg-sky-700">
                                    {editingMovement?.type === 'in' ? 'Update' : 'Save Stock In'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Disburse Modal */}
                <Dialog open={disburseOpen} onOpenChange={(open) => {
                    setDisburseOpen(open);
                    if (!open) {
                        setEditingMovement(null);
                        disburseForm.reset();
                        disburseForm.setData('movement_date', todayDisplayDate());
                        setRecipientSaveError(null);
                    }
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>{editingMovement?.type === 'out' ? 'Edit Disburse' : 'Disburse'}</DialogTitle></DialogHeader>
                        <form onSubmit={submitDisburse} className="space-y-3">
                            <FormErrors errors={disburseForm.errors} />
                            <div>
                                <Label>From Branch</Label>
                                <BranchTypeSelect
                                    value={disburseForm.data.branch_id || null}
                                    onChange={(v) => {
                                        disburseForm.setData({
                                            ...disburseForm.data,
                                            branch_id: v ?? '',
                                            product_id: '',
                                            recipient_key: '',
                                        });
                                        if (v) loadRecipients(v);
                                    }}
                                    branches={branches}
                                    portal={false}
                                    disabled={branchLocked}
                                    clearable={!branchLocked}
                                />
                                {disburseForm.errors.branch_id && <p className="text-xs text-red-600">{disburseForm.errors.branch_id}</p>}
                            </div>
                            <div>
                                <Label>Product</Label>
                                <ComboSelect
                                    value={disburseForm.data.product_id || null}
                                    onChange={(v) => disburseForm.setData('product_id', v ?? '')}
                                    items={disburseProductItems}
                                    placeholder="Select product"
                                    portal={false}
                                    disabled={!disburseForm.data.branch_id}
                                />
                                {availableAtBranch !== null && (
                                    <p className="text-xs text-slate-500 mt-1">Available: <strong>{availableAtBranch}</strong></p>
                                )}
                                {disburseForm.errors.product_id && <p className="text-xs text-red-600">{disburseForm.errors.product_id}</p>}
                            </div>
                            <div>
                                <Label>Recipient</Label>
                                <ComboSelect
                                    value={disburseForm.data.recipient_key || null}
                                    onChange={(v) => disburseForm.setData('recipient_key', v ?? '')}
                                    items={recipientItems}
                                    placeholder={disburseForm.data.branch_id ? 'Employee or saved name…' : 'Select branch first'}
                                    portal={false}
                                    disabled={!disburseForm.data.branch_id || savingRecipient}
                                    creatable={Boolean(disburseForm.data.branch_id)}
                                    onCreate={(name) => void quickAddRecipient(name)}
                                    createLabel={(q) => `Add "${q}"`}
                                />
                                {savingRecipient && <p className="text-xs text-slate-500 mt-1">Saving name…</p>}
                                {recipientSaveError && <p className="text-xs text-red-600">{recipientSaveError}</p>}
                                {disburseForm.errors.recipient_key && <p className="text-xs text-red-600">{disburseForm.errors.recipient_key}</p>}
                            </div>
                            <div>
                                <Label>Quantity</Label>
                                <Input type="number" min={1} value={disburseForm.data.quantity} onChange={(e) => disburseForm.setData('quantity', e.target.value)} />
                                {disburseForm.errors.quantity && <p className="text-xs text-red-600">{disburseForm.errors.quantity}</p>}
                            </div>
                            <FormDateField
                                label="Date"
                                value={disburseForm.data.movement_date}
                                onChange={(v) => disburseForm.setData('movement_date', v)}
                                required
                                nested
                                error={disburseForm.errors.movement_date}
                            />
                            <div>
                                <Label>Description</Label>
                                <Input value={disburseForm.data.remarks} onChange={(e) => disburseForm.setData('remarks', e.target.value)} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={disburseForm.processing || savingRecipient} className="bg-emerald-600 hover:bg-emerald-700">
                                    {editingMovement?.type === 'out' ? 'Update' : 'Disburse'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageSurface>
        </Layout>
    );
}
