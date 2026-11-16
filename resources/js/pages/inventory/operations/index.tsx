import { ComboSelect } from '@/components/ComboSelect';
import { FormDateField } from '@/components/fixed-asset/FormDateField';
import { BranchTypeSelect } from '@/components/inventory/BranchTypeSelect';
import { PageSurface } from '@/components/page-surface';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Layout from '@/layouts/AdminLayout';
import { displayDateToServer, formatDisplayDate, todayDisplayDate } from '@/lib/display-date';
import { employeeDisplayName, type EmployeeNameFields } from '@/lib/employee-name';
import { lockedBranchId, type InventoryBranchScope } from '@/lib/inventory-branch-scope';
import { hasAppPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowDownToLine,
    ArrowRightLeft,
    Calendar,
    Edit,
    Filter,
    Info,
    Package,
    Search,
    Send,
    Sparkles,
    Trash2,
    TrendingUp,
    User,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
    recipient?: { id: number; name: string; employee_id: number | null; employee?: (EmployeeNameFields & { employee_id: string }) | null } | null;
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
                <ul className="list-disc space-y-0.5 pl-4 text-xs">
                    {messages.map((msg, i) => (
                        <li key={i}>{msg}</li>
                    ))}
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
    const serverErrorMessages = useMemo(() => Object.values(pageErrors).filter((msg): msg is string => Boolean(msg)), [pageErrors]);
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
    const [stockSearch, setStockSearch] = useState('');

    const stats = useMemo(() => {
        const list = movements.data || [];
        const stockIn = list.filter((m) => m.type === 'in');
        const disburse = list.filter((m) => m.type === 'out');

        return {
            stockInCount: stockIn.length,
            stockInQty: stockIn.reduce((sum, m) => sum + m.quantity, 0),
            disburseCount: disburse.length,
            disburseQty: disburse.reduce((sum, m) => sum + m.quantity, 0),
            uniqueProducts: new Set(list.map((m) => m.product_id)).size,
        };
    }, [movements.data]);

    const filteredStocks = useMemo(() => {
        if (!stockSearch.trim()) return stocks;
        const q = stockSearch.toLowerCase();
        return stocks.filter((s) => s.product_name.toLowerCase().includes(q) || s.branch_name.toLowerCase().includes(q));
    }, [stocks, stockSearch]);

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
        if (editingMovement?.type === 'out' && String(editingMovement.branch_id) === bid && String(editingMovement.product_id) === pid) {
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
        () =>
            productList.map((p) => ({
                value: String(p.id),
                label: `${p.name} (${units[p.unit] || p.unit})`,
                keywords: p.name,
            })),
        [productList, units],
    );

    const disburseProductItems = useMemo(() => {
        const bid = disburseForm.data.branch_id;
        return productList.map((p) => {
            const row = bid ? stocks.find((s) => String(s.branch_id) === bid && String(s.product_id) === String(p.id)) : null;
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
        axios
            .get(route('inventory.operations.recipients'), { params: { branch_id: bid } })
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

    const withFixedBranch = (branchValue = '') => fixedBranchId ?? branchValue;

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
        router.get(
            route('inventory.operations.index'),
            {
                tab: nextTab,
                branch_id: branchId || undefined,
                product_id: productId || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true },
        );
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

    const criticalStockCount = useMemo(() => stocks.filter((s) => s.balance <= 0).length, [stocks]);

    return (
        <Layout>
            <Head title="Stock & Disburse Dashboard" />
            <PageSurface className="max-w-7xl space-y-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4 border-b border-zinc-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3.5">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white shadow-md ring-4 ring-zinc-500/10">
                            <ArrowRightLeft className="h-6 w-6 text-zinc-100" />
                        </span>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Stock &amp; Disburse</h1>
                            <p className="mt-1 text-xs font-medium text-zinc-500">
                                Inventory movement, stock ingestion, and branch disbursements dashboard.
                                {branchLocked && branchScope?.branch_name ? (
                                    <span className="font-semibold text-sky-600"> — {branchScope.branch_name}</span>
                                ) : null}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                        {canCreate && (
                            <Button
                                size="sm"
                                className="h-9.5 cursor-pointer rounded-xl bg-sky-600 px-4 font-bold text-white shadow-md transition-all duration-150 hover:bg-sky-700 active:scale-95"
                                onClick={openCreateStockIn}
                            >
                                <ArrowDownToLine className="mr-2 h-4 w-4" />
                                Stock In
                            </Button>
                        )}
                        {canCreate && (
                            <Button
                                size="sm"
                                className="h-9.5 cursor-pointer rounded-xl bg-emerald-600 px-4 font-bold text-white shadow-md transition-all duration-150 hover:bg-emerald-700 active:scale-95"
                                onClick={openCreateDisburse}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Disburse
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notifications */}
                {flash?.success && (
                    <Alert className="animate-in fade-in slide-in-from-top-2 rounded-2xl border-emerald-100 bg-emerald-50/50 text-emerald-950 shadow-xs duration-300">
                        <AlertTitle className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-800 uppercase">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Success
                        </AlertTitle>
                        <AlertDescription className="mt-1 text-xs font-semibold text-emerald-700">{flash.success}</AlertDescription>
                    </Alert>
                )}
                {(flash?.error || serverErrorMessages.length > 0) && (
                    <Alert
                        variant="destructive"
                        className="animate-in fade-in slide-in-from-top-2 rounded-2xl border-rose-100 bg-rose-50/50 shadow-xs duration-300"
                    >
                        <AlertTitle className="text-xs font-bold tracking-wider text-rose-800 uppercase">Error</AlertTitle>
                        <AlertDescription className="mt-1 text-xs font-semibold text-rose-700">
                            {flash?.error ? (
                                flash.error
                            ) : (
                                <ul className="list-disc space-y-0.5 pl-4">
                                    {serverErrorMessages.map((msg, i) => (
                                        <li key={i}>{msg}</li>
                                    ))}
                                </ul>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Dashboard Key Metrics Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-sky-500/5 to-sky-600/[0.01] p-4 shadow-2xs">
                        <div className="space-y-1.5">
                            <span className="block text-[10px] font-bold tracking-wider text-sky-700 uppercase">Stock In Logs</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-extrabold text-zinc-950">{stats.stockInCount}</span>
                                <span className="text-xs font-medium text-zinc-500">operations</span>
                            </div>
                            <span className="block text-[10px] font-semibold text-zinc-400">
                                Total Quantity: <strong className="text-zinc-700">{stats.stockInQty}</strong>
                            </span>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                            <ArrowDownToLine className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-emerald-500/5 to-emerald-600/[0.01] p-4 shadow-2xs">
                        <div className="space-y-1.5">
                            <span className="block text-[10px] font-bold tracking-wider text-emerald-700 uppercase">Disbursements</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-extrabold text-zinc-950">{stats.disburseCount}</span>
                                <span className="text-xs font-medium text-zinc-500">disbursed</span>
                            </div>
                            <span className="block text-[10px] font-semibold text-zinc-400">
                                Total Quantity: <strong className="text-zinc-700">{stats.disburseQty}</strong>
                            </span>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                            <Send className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-purple-500/5 to-purple-600/[0.01] p-4 shadow-2xs">
                        <div className="space-y-1.5">
                            <span className="block text-[10px] font-bold tracking-wider text-purple-700 uppercase">Active Products</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-extrabold text-zinc-950">{stats.uniqueProducts}</span>
                                <span className="text-xs font-medium text-zinc-500">types</span>
                            </div>
                            <span className="block text-[10px] font-semibold text-zinc-400">In current movements log</span>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-100">
                            <Package className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-gradient-to-br from-amber-500/5 to-amber-600/[0.01] p-4 shadow-2xs">
                        <div className="space-y-1.5">
                            <span className="block text-[10px] font-bold tracking-wider text-amber-700 uppercase">Stock Depletion</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-extrabold text-zinc-950">{criticalStockCount}</span>
                                <span className="text-xs font-medium text-zinc-500">depleted</span>
                            </div>
                            <span className="block text-[10px] font-semibold text-zinc-400">Branches out of stock</span>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {/* Two-Column Responsive Workspace Grid */}
                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
                    {/* Left Column: Filter and Operations Log (Takes 2/3 weight) */}
                    <div className="space-y-4 lg:col-span-2">
                        {/* Compact Toolbar / Filters */}
                        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all hover:border-zinc-200">
                            <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-zinc-100 p-1 text-zinc-600">
                                        <Filter className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-xs font-bold text-zinc-800">Filter Operations</span>
                                </div>

                                {/* Compact Segmented Control / Tabs */}
                                <div className="flex items-center rounded-lg border border-zinc-200/50 bg-zinc-100 p-0.5">
                                    {TABS.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => applyFilters(t.id)}
                                            className={cn(
                                                'cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                                                tab === t.id
                                                    ? 'border border-zinc-200/20 bg-white text-zinc-900 shadow-xs'
                                                    : 'text-zinc-500 hover:bg-zinc-50/50 hover:text-zinc-900',
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 md:grid-cols-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Branch</label>
                                    <BranchTypeSelect
                                        value={branchId}
                                        onChange={setBranchId}
                                        branches={branches}
                                        placeholder="All branches"
                                        disabled={branchLocked}
                                        clearable={!branchLocked}
                                        className="h-8.5 border-zinc-200 bg-zinc-50/50 text-xs focus:ring-zinc-400"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Product</label>
                                    <ComboSelect
                                        value={productId}
                                        onChange={setProductId}
                                        items={filterProductItems}
                                        placeholder="All products"
                                        clearable
                                        className="h-8.5 border-zinc-200 bg-zinc-50/50 text-xs focus:ring-zinc-400"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">From Date</label>
                                    <div className="relative">
                                        <Calendar className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                                        <Input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="h-8.5 rounded-lg border-zinc-200 bg-zinc-50/50 pl-8.5 text-xs focus-visible:ring-zinc-400"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">To Date</label>
                                    <div className="relative">
                                        <Calendar className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                                        <Input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="h-8.5 rounded-lg border-zinc-200 bg-zinc-50/50 pl-8.5 text-xs focus-visible:ring-zinc-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/30 px-4 py-2.5">
                                <span className="text-[10px] font-medium text-zinc-400">
                                    Viewing:{' '}
                                    <span className="font-semibold text-zinc-700 capitalize">
                                        {tab === 'all' ? 'All Operations' : tab === 'in' ? 'Stock In Records' : 'Disbursements'}
                                    </span>
                                </span>
                                <div className="flex gap-2">
                                    {(branchId || productId || dateFrom || dateTo) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBranchId(null);
                                                setProductId(null);
                                                setDateFrom('');
                                                setDateTo('');
                                                router.get(route('inventory.operations.index'), { tab }, { preserveState: true });
                                            }}
                                            className="cursor-pointer rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-500 transition-all hover:bg-zinc-50"
                                        >
                                            Reset Filters
                                        </button>
                                    )}
                                    <Button
                                        onClick={() => applyFilters()}
                                        className="flex h-7.5 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800"
                                    >
                                        Filter
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Operations History Log Card */}
                        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all hover:border-zinc-200">
                            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-5 py-3.5">
                                <span className="text-xs font-bold text-zinc-800">Operations History Log</span>
                                <Badge
                                    variant="outline"
                                    className="border-zinc-200/60 bg-zinc-100 px-2 py-0.5 text-[9px] font-bold tracking-wider text-zinc-600 uppercase"
                                >
                                    {movements.data.length} Records Listed
                                </Badge>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-zinc-50/20">
                                        <TableRow className="border-zinc-100 hover:bg-transparent">
                                            <TableHead className="py-3 pl-6 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                                Date
                                            </TableHead>
                                            <TableHead className="py-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">Type</TableHead>
                                            <TableHead className="py-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                                Branch
                                            </TableHead>
                                            <TableHead className="py-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                                Product
                                            </TableHead>
                                            <TableHead className="py-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                                Recipient
                                            </TableHead>
                                            <TableHead className="py-3 text-right text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                                Qty
                                            </TableHead>
                                            <TableHead className="py-3 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                                Remarks
                                            </TableHead>
                                            {(canEdit || canDelete) && (
                                                <TableHead className="py-3 pr-6 text-right text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                                                    Actions
                                                </TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {movements.data.length ? (
                                            movements.data.map((row) => (
                                                <TableRow key={row.id} className="group border-zinc-100 transition-colors hover:bg-zinc-50/40">
                                                    <TableCell className="py-3 pl-6 font-mono text-[12px] font-semibold text-zinc-500">
                                                        {formatDisplayDate(row.movement_date)}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        {row.type === 'in' ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="rounded-md border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 shadow-2xs hover:bg-sky-50"
                                                            >
                                                                Stock In
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="rounded-md border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 shadow-2xs hover:bg-purple-50"
                                                            >
                                                                Disburse
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-[13px] font-semibold text-zinc-800">{row.branch.name}</TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[13px] font-bold text-zinc-900">{row.product.name}</span>
                                                            <Badge
                                                                variant="secondary"
                                                                className="origin-left scale-90 rounded-sm border-zinc-200/50 bg-zinc-100 px-1 py-0 text-[9px] font-semibold text-zinc-600"
                                                            >
                                                                {units[row.product.unit] || row.product.unit}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-[12px] font-semibold text-zinc-600">
                                                        {row.type === 'out' ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <User className="h-3.5 w-3.5 text-zinc-400" />
                                                                <span className="text-zinc-700">{movementRecipientLabel(row)}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-zinc-400">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right font-mono text-xs font-bold text-zinc-900 tabular-nums">
                                                        {row.quantity}{' '}
                                                        <span className="text-[9px] font-normal text-zinc-500">
                                                            {units[row.product.unit] || row.product.unit}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell
                                                        className="max-w-[140px] truncate py-3 text-[12px] text-zinc-500"
                                                        title={row.remarks || undefined}
                                                    >
                                                        {row.remarks || '—'}
                                                    </TableCell>
                                                    {(canEdit || canDelete) && (
                                                        <TableCell className="py-3 pr-6 text-right">
                                                            <div className="flex justify-end gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                                                {canEdit && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 cursor-pointer rounded-lg bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200"
                                                                        onClick={() =>
                                                                            row.type === 'in' ? openEditStockIn(row) : openEditDisburse(row)
                                                                        }
                                                                        title="Edit record"
                                                                    >
                                                                        <Edit className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                                {canDelete && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 cursor-pointer rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700"
                                                                        onClick={() => deleteMovement(row)}
                                                                        title="Delete record"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={canEdit || canDelete ? 8 : 7}
                                                    className="bg-zinc-50/10 py-16 text-center font-medium text-zinc-400"
                                                >
                                                    No operations logs found matching current filters.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Real-time Branch Stock Levels (Takes 1/3 weight) */}
                    <div className="space-y-4 lg:col-span-1">
                        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all hover:border-zinc-200">
                            <div className="space-y-2.5 border-b border-zinc-100 bg-zinc-50/50 px-5 py-3.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md bg-zinc-100 p-1 text-zinc-600">
                                            <Package className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="text-xs font-bold text-zinc-800">Current Stock Levels</span>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-700 uppercase"
                                    >
                                        Real-time
                                    </Badge>
                                </div>

                                {/* Stock Filter Input */}
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search stock level..."
                                        value={stockSearch}
                                        onChange={(e) => setStockSearch(e.target.value)}
                                        className="h-8 rounded-lg border-zinc-200 bg-white pl-8.5 text-xs focus-visible:ring-zinc-400"
                                    />
                                </div>
                            </div>

                            <div className="scrollbar-thin max-h-[500px] space-y-2 overflow-y-auto p-4 pr-1">
                                {filteredStocks.length > 0 ? (
                                    filteredStocks.map((s, idx) => (
                                        <div
                                            key={idx}
                                            className="group flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/20 p-2.5 text-xs transition-all hover:border-zinc-200/80 hover:bg-zinc-50/80"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="block font-bold text-zinc-800 transition-colors group-hover:text-zinc-950">
                                                    {s.product_name}
                                                </span>
                                                <span className="block text-[10px] font-semibold text-zinc-400">{s.branch_name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span
                                                    className={cn(
                                                        'rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold shadow-2xs transition-all',
                                                        s.balance > 5
                                                            ? 'border-emerald-100/50 bg-emerald-50 text-emerald-700'
                                                            : s.balance > 0
                                                              ? 'border-amber-100/50 bg-amber-50 text-amber-700'
                                                              : 'border-rose-100/50 bg-rose-50 text-rose-700',
                                                    )}
                                                >
                                                    {s.balance}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-zinc-400">
                                        <Info className="h-6 w-6 text-zinc-300" />
                                        <p className="text-xs font-semibold">No stock balances found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stock In Modal */}
                <Dialog
                    open={stockInOpen}
                    onOpenChange={(open) => {
                        setStockInOpen(open);
                        if (!open) {
                            setEditingMovement(null);
                            stockInForm.reset();
                            stockInForm.setData('movement_date', todayDisplayDate());
                        }
                    }}
                >
                    <DialogContent className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 sm:max-w-md">
                        <DialogHeader className="border-b border-zinc-100 bg-zinc-50 px-6 py-4">
                            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                                <span className="rounded-md bg-sky-100 p-1 text-sky-700">
                                    <ArrowDownToLine className="h-4 w-4" />
                                </span>
                                {editingMovement?.type === 'in' ? 'Edit Stock In Record' : 'Create Stock In Operation'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submitStockIn} className="space-y-4 p-6">
                            <FormErrors errors={stockInForm.errors} />
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-zinc-700">Branch</Label>
                                    <BranchTypeSelect
                                        value={stockInForm.data.branch_id || null}
                                        onChange={(v) => stockInForm.setData('branch_id', v ?? '')}
                                        branches={branches}
                                        portal={false}
                                        disabled={branchLocked}
                                        clearable={!branchLocked}
                                        className="h-9 text-xs"
                                    />
                                    {stockInForm.errors.branch_id && (
                                        <p className="text-[11px] font-medium text-red-600">{stockInForm.errors.branch_id}</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-zinc-700">Product</Label>
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
                                        className="h-9 text-xs"
                                    />
                                    {savingProduct && <p className="animate-pulse text-[10px] text-zinc-400">Saving new product to database...</p>}
                                    {stockInForm.errors.product_id && (
                                        <p className="text-[11px] font-medium text-red-600">{stockInForm.errors.product_id}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-zinc-700">Quantity</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={stockInForm.data.quantity}
                                            onChange={(e) => stockInForm.setData('quantity', e.target.value)}
                                            className="h-9 border-zinc-200 text-xs focus:ring-zinc-400"
                                        />
                                        {stockInForm.errors.quantity && (
                                            <p className="text-[11px] font-medium text-red-600">{stockInForm.errors.quantity}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <FormDateField
                                            label="Operation Date"
                                            value={stockInForm.data.movement_date}
                                            onChange={(v) => stockInForm.setData('movement_date', v)}
                                            required
                                            nested
                                            error={stockInForm.errors.movement_date}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-normal font-semibold text-zinc-500 text-zinc-700">Remarks / Description</Label>
                                    <Input
                                        value={stockInForm.data.remarks}
                                        onChange={(e) => stockInForm.setData('remarks', e.target.value)}
                                        placeholder="Optional details about this stock in..."
                                        className="h-9 border-zinc-200 text-xs focus:ring-zinc-400"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="-mx-6 -mb-6 flex items-center justify-end gap-2.5 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStockInOpen(false)}
                                    className="h-9 cursor-pointer border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={stockInForm.processing}
                                    className="h-9 cursor-pointer bg-sky-600 text-xs font-semibold text-white shadow-xs hover:bg-sky-700"
                                >
                                    {editingMovement?.type === 'in' ? 'Update Details' : 'Save Stock In'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Disburse Modal */}
                <Dialog
                    open={disburseOpen}
                    onOpenChange={(open) => {
                        setDisburseOpen(open);
                        if (!open) {
                            setEditingMovement(null);
                            disburseForm.reset();
                            disburseForm.setData('movement_date', todayDisplayDate());
                            setRecipientSaveError(null);
                        }
                    }}
                >
                    <DialogContent className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 sm:max-w-md">
                        <DialogHeader className="border-b border-zinc-100 bg-zinc-50 px-6 py-4">
                            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                                <span className="rounded-md bg-purple-100 p-1 text-purple-700">
                                    <Send className="h-4 w-4" />
                                </span>
                                {editingMovement?.type === 'out' ? 'Edit Disbursement' : 'Create Disbursement'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submitDisburse} className="space-y-4 p-6">
                            <FormErrors errors={disburseForm.errors} />
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-zinc-700">From Branch</Label>
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
                                        className="h-9 text-xs"
                                    />
                                    {disburseForm.errors.branch_id && (
                                        <p className="text-[11px] font-medium text-red-600">{disburseForm.errors.branch_id}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-zinc-700">Product</Label>
                                        <ComboSelect
                                            value={disburseForm.data.product_id || null}
                                            onChange={(v) => disburseForm.setData('product_id', v ?? '')}
                                            items={disburseProductItems}
                                            placeholder="Select product"
                                            portal={false}
                                            disabled={!disburseForm.data.branch_id}
                                            className="h-9 text-xs"
                                        />
                                        {availableAtBranch !== null && (
                                            <p className="text-[10px] font-medium text-zinc-500">
                                                Available stock: <strong className="text-zinc-800">{availableAtBranch}</strong>
                                            </p>
                                        )}
                                        {disburseForm.errors.product_id && (
                                            <p className="text-[11px] font-medium text-red-600">{disburseForm.errors.product_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-zinc-700">Recipient</Label>
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
                                            className="h-9 text-xs"
                                        />
                                        {savingRecipient && (
                                            <p className="animate-pulse text-[10px] text-zinc-400">Adding new recipient to database...</p>
                                        )}
                                        {recipientSaveError && <p className="text-[11px] font-medium text-red-600">{recipientSaveError}</p>}
                                        {disburseForm.errors.recipient_key && (
                                            <p className="text-[11px] font-medium text-red-600">{disburseForm.errors.recipient_key}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-zinc-700">Quantity</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={disburseForm.data.quantity}
                                            onChange={(e) => disburseForm.setData('quantity', e.target.value)}
                                            className="h-9 border-zinc-200 text-xs focus:ring-zinc-400"
                                        />
                                        {disburseForm.errors.quantity && (
                                            <p className="text-[11px] font-medium text-red-600">{disburseForm.errors.quantity}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <FormDateField
                                            label="Operation Date"
                                            value={disburseForm.data.movement_date}
                                            onChange={(v) => disburseForm.setData('movement_date', v)}
                                            required
                                            nested
                                            error={disburseForm.errors.movement_date}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-normal font-semibold text-zinc-500 text-zinc-700">Remarks / Description</Label>
                                    <Input
                                        value={disburseForm.data.remarks}
                                        onChange={(e) => disburseForm.setData('remarks', e.target.value)}
                                        placeholder="Optional details about this disbursement..."
                                        className="h-9 border-zinc-200 text-xs focus:ring-zinc-400"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="-mx-6 -mb-6 flex items-center justify-end gap-2.5 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDisburseOpen(false)}
                                    className="h-9 cursor-pointer border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={disburseForm.processing || savingRecipient}
                                    className="h-9 cursor-pointer bg-purple-600 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
                                >
                                    {editingMovement?.type === 'out' ? 'Update Disbursement' : 'Disburse'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageSurface>
        </Layout>
    );
}
