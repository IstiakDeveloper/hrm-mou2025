import React, { useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Download,
    Eye,
    FileText,
    FileSpreadsheet,
    FileArchive,
    FileImage,
    FileCode,
    File,
    FolderArchive,
    FolderPlus,
    MoreVertical,
    Pencil,
    Pin,
    PinOff,
    Plus,
    Search,
    Trash2,
    UploadCloud,
    CheckCircle2,
    X,
    Filter,
    ArrowUpDown,
    RotateCcw,
} from 'lucide-react';

export interface DocumentItem {
    id: number;
    category_id: number;
    title: string;
    description: string | null;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size_bytes: number;
    formatted_file_size: string;
    mime_type: string | null;
    is_pinned: boolean;
    pinned_at: string | null;
    download_count: number;
    uploaded_by: number;
    created_at: string;
    updated_at: string;
    category?: {
        id: number;
        name: string;
        slug: string;
    };
    uploader?: {
        id: number;
        name: string;
    };
    updater?: {
        id: number;
        name: string;
    };
}

export interface DocumentCategoryItem {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    documents_count?: number;
}

interface Props {
    documents: {
        data: DocumentItem[];
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    categories: DocumentCategoryItem[];
    filters: {
        search: string;
        category_id: string;
        file_type: string;
        pinned_only: boolean;
    };
    stats: {
        total_documents: number;
        total_pinned: number;
        total_downloads: number;
        total_categories: number;
    };
    canManage: boolean;
    canEditDelete?: boolean;
    isDepartmentHead: boolean;
    isSuperAdmin: boolean;
}

// Helpers for file badges and styling
function getFileBadge(fileType: string) {
    const ext = (fileType || '').toLowerCase();

    if (ext === 'pdf') {
        return {
            label: 'PDF',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
            iconClass: 'text-rose-600 bg-rose-50 border-rose-200',
            icon: FileText,
            previewable: true,
        };
    }
    if (['doc', 'docx', 'rtf', 'odt', 'txt'].includes(ext)) {
        return {
            label: ext.toUpperCase(),
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
            iconClass: 'text-blue-600 bg-blue-50 border-blue-200',
            icon: FileText,
            previewable: false,
        };
    }
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
        return {
            label: ext.toUpperCase(),
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
            iconClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            icon: FileSpreadsheet,
            previewable: false,
        };
    }
    if (['ppt', 'pptx', 'odp'].includes(ext)) {
        return {
            label: ext.toUpperCase(),
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
            iconClass: 'text-amber-600 bg-amber-50 border-amber-200',
            icon: FileCode,
            previewable: false,
        };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return {
            label: 'ZIP',
            badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
            iconClass: 'text-purple-600 bg-purple-50 border-purple-200',
            icon: FileArchive,
            previewable: false,
        };
    }
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
        return {
            label: ext.toUpperCase(),
            badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
            iconClass: 'text-teal-600 bg-teal-50 border-teal-200',
            icon: FileImage,
            previewable: true,
        };
    }

    return {
        label: (ext || 'FILE').toUpperCase(),
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200/80',
        iconClass: 'text-slate-600 bg-slate-50 border-slate-200',
        icon: File,
        previewable: false,
    };
}

export default function DocumentCenterIndex({
    documents,
    categories: initialCategories,
    filters,
    stats,
    canManage,
    canEditDelete,
    isDepartmentHead,
    isSuperAdmin,
}: Props) {
    const { flash, auth } = usePage().props as any;
    const isSuperAdminUser = Boolean(isSuperAdmin || canEditDelete);

    const [categories, setCategories] = useState<DocumentCategoryItem[]>(initialCategories);
    const [search, setSearch] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState<string>(filters.category_id || 'all');
    const [selectedFileType, setSelectedFileType] = useState<string>(filters.file_type || 'all');
    const [pinnedOnly, setPinnedOnly] = useState<boolean>(Boolean(filters.pinned_only));

    // Modals
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
    const [deletingDoc, setDeletingDoc] = useState<DocumentItem | null>(null);

    // Upload Form
    const uploadForm = useForm<{
        title: string;
        category_id: string | number;
        description: string;
        file: File | null;
        is_pinned: boolean;
    }>({
        title: '',
        category_id: '',
        description: '',
        file: null,
        is_pinned: false,
    });

    // Edit Form
    const editForm = useForm<{
        title: string;
        category_id: string | number;
        description: string;
        file: File | null;
        is_pinned: boolean;
    }>({
        title: '',
        category_id: '',
        description: '',
        file: null,
        is_pinned: false,
    });

    // New Category Form
    const categoryForm = useForm({
        name: '',
        description: '',
    });

    // ComboSelect options for categories
    const categoryOptions = useMemo<ComboSelectItem<number>[]>(() => {
        return categories.map((c) => ({
            value: c.id,
            label: c.name,
            keywords: c.description || '',
        }));
    }, [categories]);

    // Fast Filter trigger
    const applyFilters = (overrides?: Partial<typeof filters>) => {
        const query: Record<string, any> = {
            search: overrides?.search !== undefined ? overrides.search : search,
            category_id: overrides?.category_id !== undefined ? overrides.category_id : selectedCategory,
            file_type: overrides?.file_type !== undefined ? overrides.file_type : selectedFileType,
            pinned_only: overrides?.pinned_only !== undefined ? overrides.pinned_only : pinnedOnly,
        };

        if (query.category_id === 'all') delete query.category_id;
        if (query.file_type === 'all') delete query.file_type;
        if (!query.pinned_only) delete query.pinned_only;
        if (!query.search) delete query.search;

        router.get('/sections/documents', query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedCategory('all');
        setSelectedFileType('all');
        setPinnedOnly(false);
        router.get('/sections/documents', {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Quick on-the-fly category creation inside Combobox
    const handleCreateCategoryOnTheFly = async (categoryName: string) => {
        const trimmed = categoryName.trim();
        if (!trimmed) return;

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/document-categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ name: trimmed }),
            });

            const data = await res.json();
            if (data?.success && data.category) {
                const newCat: DocumentCategoryItem = {
                    id: data.category.id,
                    name: data.category.name,
                    slug: data.category.slug,
                    description: data.category.description,
                    documents_count: 0,
                };
                setCategories((prev) => [...prev, newCat]);

                if (isUploadOpen) {
                    uploadForm.setData('category_id', newCat.id);
                } else if (editingDoc) {
                    editForm.setData('category_id', newCat.id);
                }
            }
        } catch (err) {
            console.error('Failed to create category on the fly:', err);
        }
    };

    // Category form submission
    const handleCategorySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        categoryForm.post('/document-categories', {
            onSuccess: () => {
                categoryForm.reset();
                setIsNewCategoryOpen(false);
                router.reload({ only: ['categories'] });
            },
        });
    };

    // Upload submit
    const handleUploadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        uploadForm.post('/documents', {
            forceFormData: true,
            onSuccess: () => {
                uploadForm.reset();
                setIsUploadOpen(false);
            },
        });
    };

    // Edit open & submit
    const handleOpenEdit = (doc: DocumentItem) => {
        if (!isSuperAdminUser) return;
        setEditingDoc(doc);
        editForm.setData({
            title: doc.title,
            category_id: doc.category_id,
            description: doc.description || '',
            file: null,
            is_pinned: doc.is_pinned,
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSuperAdminUser || !editingDoc) return;

        editForm.post(`/documents/${editingDoc.id}`, {
            forceFormData: true,
            onSuccess: () => {
                setEditingDoc(null);
                editForm.reset();
            },
        });
    };

    // Toggle Pin
    const handleTogglePin = (doc: DocumentItem) => {
        if (!isSuperAdminUser) return;
        router.post(`/documents/${doc.id}/toggle-pin`, {}, {
            preserveScroll: true,
        });
    };

    // Delete submit
    const handleDeleteSubmit = () => {
        if (!isSuperAdminUser || !deletingDoc) return;
        router.delete(`/documents/${deletingDoc.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingDoc(null),
        });
    };

    const isFiltered = Boolean(search || selectedCategory !== 'all' || selectedFileType !== 'all' || pinnedOnly);

    return (
        <Layout>
            <Head title="Document Dashboard" />

            <div className="space-y-4">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900 shadow-2xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-900 shadow-2xs">
                        <X className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Professional Minimal Header matching other ERP sections */}
                <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 shadow-xs ring-1 ring-teal-600/10">
                                <FolderArchive className="h-5 w-5" />
                            </span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-bold tracking-tight text-zinc-950 sm:text-xl">
                                        Document Dashboard
                                    </h1>
                                    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200/60">
                                        {stats.total_documents} {stats.total_documents === 1 ? 'File' : 'Files'}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs text-zinc-500">
                                    Official policies, guidelines, templates and resources repository.
                                </p>
                            </div>
                        </div>

                        {/* Top Action buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href="/sections">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8.5 cursor-pointer rounded-lg border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50"
                                >
                                    All Sections
                                </Button>
                            </Link>

                            {canManage && (
                                <>
                                    <Button
                                        onClick={() => setIsNewCategoryOpen(true)}
                                        variant="outline"
                                        size="sm"
                                        className="h-8.5 cursor-pointer rounded-lg border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50"
                                    >
                                        <FolderPlus className="mr-1.5 h-3.5 w-3.5 text-zinc-500" />
                                        Category
                                    </Button>

                                    <Button
                                        onClick={() => setIsUploadOpen(true)}
                                        size="sm"
                                        className="h-8.5 cursor-pointer rounded-lg bg-teal-600 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 active:translate-y-px"
                                    >
                                        <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                                        Upload Document
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Compact KPI Mini Row */}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 sm:grid-cols-4 sm:gap-3">
                        <div className="flex items-center justify-between rounded-lg bg-zinc-50/70 px-3 py-2 text-xs">
                            <span className="text-zinc-500">Total Documents</span>
                            <span className="font-bold text-zinc-900">{stats.total_documents}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-amber-50/50 px-3 py-2 text-xs border border-amber-100">
                            <span className="flex items-center gap-1 text-amber-800">
                                <Pin className="h-3 w-3 fill-amber-600 text-amber-600" /> Pinned
                            </span>
                            <span className="font-bold text-amber-900">{stats.total_pinned}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-zinc-50/70 px-3 py-2 text-xs">
                            <span className="text-zinc-500">Downloads</span>
                            <span className="font-bold text-zinc-900">{stats.total_downloads}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-zinc-50/70 px-3 py-2 text-xs">
                            <span className="text-zinc-500">Categories</span>
                            <span className="font-bold text-zinc-900">{stats.total_categories}</span>
                        </div>
                    </div>
                </div>

                {/* Filter and Table Container */}
                <div className="rounded-xl border border-zinc-200/80 bg-white shadow-2xs overflow-hidden">
                    {/* Filter Bar */}
                    <div className="border-b border-zinc-100 bg-zinc-50/50 p-3 sm:p-4">
                        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                            {/* Search bar */}
                            <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search documents…"
                                    className="h-8.5 w-full pl-8 pr-8 text-xs bg-white border-zinc-200 rounded-lg focus:bg-white"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            applyFilters({ search: '' });
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </form>

                            {/* Dropdown / Button Filters */}
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center w-full lg:w-auto">
                                {/* Category Filter */}
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        setSelectedCategory(e.target.value);
                                        applyFilters({ category_id: e.target.value });
                                    }}
                                    className="h-8.5 w-full sm:w-auto rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 shadow-2xs focus:border-teal-500 focus:outline-none"
                                >
                                    <option value="all">All Categories ({stats.total_documents})</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.documents_count !== undefined ? `(${c.documents_count})` : ''}
                                        </option>
                                    ))}
                                </select>

                                {/* Format Filter */}
                                <select
                                    value={selectedFileType}
                                    onChange={(e) => {
                                        setSelectedFileType(e.target.value);
                                        applyFilters({ file_type: e.target.value });
                                    }}
                                    className="h-8.5 w-full sm:w-auto rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 shadow-2xs focus:border-teal-500 focus:outline-none"
                                >
                                    <option value="all">All Formats</option>
                                    <option value="pdf">PDF Documents</option>
                                    <option value="docx">Word (DOC/DOCX)</option>
                                    <option value="xlsx">Excel (XLSX/CSV)</option>
                                    <option value="pptx">PowerPoint</option>
                                    <option value="zip">Archive (ZIP)</option>
                                </select>

                                {/* Pinned Only Toggle */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !pinnedOnly;
                                        setPinnedOnly(next);
                                        applyFilters({ pinned_only: next });
                                    }}
                                    className={`inline-flex h-8.5 w-full sm:w-auto cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all ${
                                        pinnedOnly
                                            ? 'border-amber-300 bg-amber-50 text-amber-900 shadow-2xs'
                                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                                    }`}
                                >
                                    <Pin className={`h-3 w-3 ${pinnedOnly ? 'fill-amber-600 text-amber-600' : 'text-zinc-400'}`} />
                                    <span>Pinned ({stats.total_pinned})</span>
                                </button>

                                {isFiltered && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        title="Reset filters"
                                        className="inline-flex h-8.5 w-full sm:w-auto cursor-pointer items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ======================================================== */}
                    {/* 1. MOBILE NATIVE LIST VIEW (Zero Horizontal Scroll on phones) */}
                    {/* ======================================================== */}
                    <div className="block md:hidden divide-y divide-zinc-100">
                        {documents.data.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                                    <FolderArchive className="h-5 w-5" />
                                </div>
                                <p className="mt-2 text-xs font-semibold text-zinc-700">No documents found</p>
                                <p className="mt-0.5 text-[11px] text-zinc-400">
                                    {isFiltered
                                        ? 'No results match your active filter criteria.'
                                        : 'No documents have been uploaded yet.'}
                                </p>
                                {canManage && (
                                    <Button
                                        onClick={() => setIsUploadOpen(true)}
                                        size="sm"
                                        className="mt-3 h-7.5 cursor-pointer bg-teal-600 text-xs text-white hover:bg-teal-700"
                                    >
                                        <Plus className="mr-1 h-3 w-3" /> Upload File
                                    </Button>
                                )}
                            </div>
                        ) : (
                            documents.data.map((doc) => {
                                const badge = getFileBadge(doc.file_type);
                                const Icon = badge.icon;

                                return (
                                    <div
                                        key={`mobile-${doc.id}`}
                                        className={`p-3.5 transition-colors ${
                                            doc.is_pinned ? 'bg-amber-50/30 border-l-4 border-l-amber-500' : 'bg-white'
                                        }`}
                                    >
                                        {/* Top row: Icon + Title & Badges + More Menu */}
                                        <div className="flex items-start justify-between gap-2.5">
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs ${badge.iconClass}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {doc.is_pinned && (
                                                            <span className="inline-flex items-center gap-0.5 rounded-sm bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                                                <Pin className="h-2.5 w-2.5 fill-amber-700" /> PINNED
                                                            </span>
                                                        )}
                                                        <span className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${badge.badgeClass}`}>
                                                            {badge.label}
                                                        </span>
                                                        {doc.category && (
                                                            <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-medium text-zinc-600 truncate max-w-[130px]">
                                                                {doc.category.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="mt-1 font-semibold text-zinc-900 text-xs leading-snug break-words">
                                                        {doc.title}
                                                    </h3>
                                                    <p className="mt-0.5 text-[11px] text-zinc-400 truncate">
                                                        {doc.file_name}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Dropdown strictly for Super Admin */}
                                            {isSuperAdminUser && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                                                        >
                                                            <MoreVertical className="h-3.5 w-3.5" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-38">
                                                        <DropdownMenuItem
                                                            onClick={() => handleTogglePin(doc)}
                                                            className="cursor-pointer text-xs"
                                                        >
                                                            {doc.is_pinned ? (
                                                                <>
                                                                    <PinOff className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                                                    <span>Unpin</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Pin className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                                                    <span>Pin to Top</span>
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleOpenEdit(doc)}
                                                            className="cursor-pointer text-xs"
                                                        >
                                                            <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                                            <span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => setDeletingDoc(doc)}
                                                            className="cursor-pointer text-xs text-rose-600 focus:text-rose-600"
                                                        >
                                                            <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600" />
                                                            <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>

                                        {/* Bottom row: Meta info + Download & Preview actions */}
                                        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                                            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                                <span className="font-semibold text-zinc-600">{doc.formatted_file_size}</span>
                                                <span>•</span>
                                                <span>{doc.download_count} DL</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {badge.previewable && (
                                                    <a
                                                        href={`/documents/${doc.id}/preview`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Preview in browser"
                                                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                                <a
                                                    href={`/documents/${doc.id}/download`}
                                                    title="Download file"
                                                    className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg bg-teal-600 px-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 active:translate-y-px"
                                                >
                                                    <Download className="h-3 w-3" />
                                                    <span>Download</span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* ======================================================== */}
                    {/* 2. DESKTOP DATA TABLE VIEW (for md: screens and above)    */}
                    {/* ======================================================== */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs text-zinc-600">
                            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                                <tr>
                                    <th className="px-4 py-2.5">Document Title</th>
                                    <th className="px-4 py-2.5">Category</th>
                                    <th className="px-4 py-2.5">Type & Size</th>
                                    <th className="px-4 py-2.5">Downloads</th>
                                    <th className="px-4 py-2.5">Uploaded Date</th>
                                    <th className="px-4 py-2.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {documents.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                                                    <FolderArchive className="h-5 w-5" />
                                                </div>
                                                <p className="mt-2 text-xs font-semibold text-zinc-700">No documents found</p>
                                                <p className="mt-0.5 text-[11px] text-zinc-400">
                                                    {isFiltered
                                                        ? 'No results match your active filter criteria.'
                                                        : 'No documents have been uploaded yet.'}
                                                </p>
                                                {canManage && (
                                                    <Button
                                                        onClick={() => setIsUploadOpen(true)}
                                                        size="sm"
                                                        className="mt-3 h-7.5 cursor-pointer bg-teal-600 text-xs text-white hover:bg-teal-700"
                                                    >
                                                        <Plus className="mr-1 h-3 w-3" /> Upload File
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    documents.data.map((doc) => {
                                        const badge = getFileBadge(doc.file_type);
                                        const Icon = badge.icon;

                                        return (
                                            <tr
                                                key={`desktop-${doc.id}`}
                                                className={`transition-colors hover:bg-zinc-50/80 ${
                                                    doc.is_pinned ? 'bg-amber-50/25 border-l-2 border-l-amber-500' : ''
                                                }`}
                                            >
                                                {/* Title & File info */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className={`mt-0.5 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg border shadow-2xs ${badge.iconClass}`}>
                                                            <Icon className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {doc.is_pinned && (
                                                                    <span className="inline-flex items-center gap-0.5 rounded-sm bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800">
                                                                        <Pin className="h-2.5 w-2.5 fill-amber-700" /> PINNED
                                                                    </span>
                                                                )}
                                                                <span className="font-semibold text-zinc-900 line-clamp-1 leading-snug">
                                                                    {doc.title}
                                                                </span>
                                                            </div>
                                                            <p className="mt-0.5 text-[11px] text-zinc-400 truncate max-w-xs">
                                                                {doc.file_name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Category */}
                                                <td className="px-4 py-3">
                                                    {doc.category ? (
                                                        <span className="inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 truncate max-w-[180px]">
                                                            {doc.category.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-400">-</span>
                                                    )}
                                                </td>

                                                {/* Type & Size */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${badge.badgeClass}`}>
                                                            {badge.label}
                                                        </span>
                                                        <span className="text-[11px] text-zinc-500 font-medium">
                                                            {doc.formatted_file_size}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Downloads */}
                                                <td className="px-4 py-3 font-medium text-zinc-700 whitespace-nowrap">
                                                    {doc.download_count}
                                                </td>

                                                {/* Date */}
                                                <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-[11px]">
                                                    {new Date(doc.created_at).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </td>

                                                {/* Action */}
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <a
                                                            href={`/documents/${doc.id}/download`}
                                                            title="Download file"
                                                            className="inline-flex h-7.5 cursor-pointer items-center gap-1 rounded-lg bg-teal-600 px-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 transition-colors"
                                                        >
                                                            <Download className="h-3 w-3" />
                                                            <span>Download</span>
                                                        </a>

                                                        {badge.previewable && (
                                                            <a
                                                                href={`/documents/${doc.id}/preview`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                title="Preview in browser"
                                                                className="inline-flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </a>
                                                        )}

                                                        {isSuperAdminUser && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                                                                    >
                                                                        <MoreVertical className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-38">
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleTogglePin(doc)}
                                                                        className="cursor-pointer text-xs"
                                                                    >
                                                                        {doc.is_pinned ? (
                                                                            <>
                                                                                <PinOff className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                                                                <span>Unpin</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Pin className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                                                                <span>Pin to Top</span>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleOpenEdit(doc)}
                                                                        className="cursor-pointer text-xs"
                                                                    >
                                                                        <Pencil className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                                                        <span>Edit</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeletingDoc(doc)}
                                                                        className="cursor-pointer text-xs text-rose-600 focus:text-rose-600"
                                                                    >
                                                                        <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600" />
                                                                        <span>Delete</span>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {documents.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-xs text-zinc-500">
                            <div>
                                Showing <span className="font-semibold text-zinc-800">{documents.data.length}</span> of{' '}
                                <span className="font-semibold text-zinc-800">{documents.total}</span> items
                            </div>
                            <div className="flex items-center gap-1">
                                {documents.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        preserveScroll
                                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                            link.active
                                                ? 'bg-teal-600 text-white'
                                                : link.url
                                                ? 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                                : 'text-zinc-300 pointer-events-none'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* UPLOAD DOCUMENT MODAL                                                     */}
            {/* ========================================================================= */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900">
                            <UploadCloud className="h-5 w-5 text-teal-600" />
                            <span>Upload Document</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Add a file to the official repository.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUploadSubmit} className="space-y-3 pt-1">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                Document Title <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                required
                                value={uploadForm.data.title}
                                onChange={(e) => uploadForm.setData('title', e.target.value)}
                                placeholder="e.g., Code of Conduct 2026"
                                className="h-8.5 text-xs"
                            />
                            {uploadForm.errors.title && (
                                <p className="mt-1 text-[11px] text-rose-500">{uploadForm.errors.title}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                Category <span className="text-rose-500">*</span>
                            </label>
                            <ComboSelect<number>
                                portal={false}
                                value={typeof uploadForm.data.category_id === 'number' ? uploadForm.data.category_id : null}
                                onChange={(val) => uploadForm.setData('category_id', val ?? '')}
                                items={categoryOptions}
                                placeholder="Select or type to create…"
                                creatable={true}
                                onCreate={handleCreateCategoryOnTheFly}
                                createLabel={(q) => `+ Create category "${q}"`}
                            />
                            {uploadForm.errors.category_id && (
                                <p className="mt-1 text-[11px] text-rose-500">{uploadForm.errors.category_id}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                Description <span className="text-zinc-400 font-normal">(Optional)</span>
                            </label>
                            <Textarea
                                rows={2}
                                value={uploadForm.data.description}
                                onChange={(e) => uploadForm.setData('description', e.target.value)}
                                placeholder="Short summary or instructions…"
                                className="text-xs resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                File Attachment <span className="text-rose-500">*</span>
                            </label>
                            <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-3 text-center hover:bg-zinc-50 transition-colors">
                                <input
                                    required
                                    type="file"
                                    id="upload-file-input"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        uploadForm.setData('file', file);
                                    }}
                                />
                                <label
                                    htmlFor="upload-file-input"
                                    className="flex flex-col items-center justify-center cursor-pointer"
                                >
                                    <UploadCloud className="h-6 w-6 text-teal-600 mb-1" />
                                    {uploadForm.data.file ? (
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-800 truncate max-w-xs">
                                                {uploadForm.data.file.name}
                                            </p>
                                            <p className="text-[11px] text-teal-600 font-medium">
                                                {(uploadForm.data.file.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-xs font-medium text-zinc-700">
                                                Click to browse file
                                            </p>
                                            <p className="text-[10px] text-zinc-400">
                                                PDF, DOCX, XLSX, PPTX, ZIP, Images (Max 50MB)
                                            </p>
                                        </div>
                                    )}
                                </label>
                            </div>
                            {uploadForm.errors.file && (
                                <p className="mt-1 text-[11px] text-rose-500">{uploadForm.errors.file}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/40 p-2.5">
                            <Checkbox
                                id="upload-is-pinned"
                                checked={uploadForm.data.is_pinned}
                                onCheckedChange={(val) => uploadForm.setData('is_pinned', Boolean(val))}
                            />
                            <label
                                htmlFor="upload-is-pinned"
                                className="cursor-pointer text-xs font-medium text-zinc-800"
                            >
                                <span className="font-bold text-amber-900">Pin to Top:</span> Feature at the top of the table.
                            </label>
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsUploadOpen(false)}
                                className="h-8 cursor-pointer text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={uploadForm.processing}
                                className="h-8 cursor-pointer bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700"
                            >
                                {uploadForm.processing ? 'Uploading…' : 'Upload'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* EDIT DOCUMENT MODAL (Super Admin Only)                                    */}
            {/* ========================================================================= */}
            {isSuperAdminUser && (
                <Dialog open={Boolean(editingDoc)} onOpenChange={(open) => !open && setEditingDoc(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900">
                                <Pencil className="h-4 w-4 text-blue-600" />
                                <span>Edit Document</span>
                            </DialogTitle>
                        </DialogHeader>

                        {editingDoc && (
                            <form onSubmit={handleEditSubmit} className="space-y-3 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Document Title <span className="text-rose-500">*</span>
                                    </label>
                                    <Input
                                        required
                                        value={editForm.data.title}
                                        onChange={(e) => editForm.setData('title', e.target.value)}
                                        className="h-8.5 text-xs"
                                    />
                                    {editForm.errors.title && (
                                        <p className="mt-1 text-[11px] text-rose-500">{editForm.errors.title}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Category <span className="text-rose-500">*</span>
                                    </label>
                                    <ComboSelect<number>
                                        portal={false}
                                        value={typeof editForm.data.category_id === 'number' ? editForm.data.category_id : null}
                                        onChange={(val) => editForm.setData('category_id', val ?? '')}
                                        items={categoryOptions}
                                        placeholder="Select category…"
                                        creatable={true}
                                        onCreate={handleCreateCategoryOnTheFly}
                                        createLabel={(q) => `+ Create category "${q}"`}
                                    />
                                    {editForm.errors.category_id && (
                                        <p className="mt-1 text-[11px] text-rose-500">{editForm.errors.category_id}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                        Description
                                    </label>
                                    <Textarea
                                        rows={2}
                                        value={editForm.data.description}
                                        onChange={(e) => editForm.setData('description', e.target.value)}
                                        className="text-xs resize-none"
                                    />
                                </div>

                                <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5 text-xs">
                                    <div className="flex items-center justify-between text-zinc-600">
                                        <span className="truncate font-medium">{editingDoc.file_name}</span>
                                        <span className="text-zinc-400 shrink-0 ml-2">{editingDoc.formatted_file_size}</span>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-zinc-200">
                                        <label
                                            htmlFor="edit-file-input"
                                            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700"
                                        >
                                            <UploadCloud className="h-3 w-3" />
                                            <span>Replace file (Optional)</span>
                                        </label>
                                        <input
                                            type="file"
                                            id="edit-file-input"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                editForm.setData('file', file);
                                            }}
                                        />
                                        {editForm.data.file && (
                                            <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                                                Replacement: {editForm.data.file.name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/40 p-2.5">
                                    <Checkbox
                                        id="edit-is-pinned"
                                        checked={editForm.data.is_pinned}
                                        onCheckedChange={(val) => editForm.setData('is_pinned', Boolean(val))}
                                    />
                                    <label
                                        htmlFor="edit-is-pinned"
                                        className="cursor-pointer text-xs font-medium text-zinc-800"
                                    >
                                        <span className="font-bold text-amber-900">Pin to Top:</span> Feature at the top of the table.
                                    </label>
                                </div>

                                <DialogFooter className="gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingDoc(null)}
                                        className="h-8 cursor-pointer text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={editForm.processing}
                                        className="h-8 cursor-pointer bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700"
                                    >
                                        {editForm.processing ? 'Saving…' : 'Save'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            )}

            {/* ========================================================================= */}
            {/* NEW CATEGORY MODAL                                                        */}
            {/* ========================================================================= */}
            <Dialog open={isNewCategoryOpen} onOpenChange={setIsNewCategoryOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900">
                            <FolderPlus className="h-5 w-5 text-teal-600" />
                            <span>Add Category</span>
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCategorySubmit} className="space-y-3 pt-1">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                Category Name <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                required
                                value={categoryForm.data.name}
                                onChange={(e) => categoryForm.setData('name', e.target.value)}
                                placeholder="e.g., Audit Guidelines"
                                className="h-8.5 text-xs"
                            />
                            {categoryForm.errors.name && (
                                <p className="mt-1 text-[11px] text-rose-500">{categoryForm.errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                Description <span className="text-zinc-400 font-normal">(Optional)</span>
                            </label>
                            <Textarea
                                rows={2}
                                value={categoryForm.data.description}
                                onChange={(e) => categoryForm.setData('description', e.target.value)}
                                placeholder="Short description…"
                                className="text-xs resize-none"
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsNewCategoryOpen(false)}
                                className="h-8 cursor-pointer text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={categoryForm.processing}
                                className="h-8 cursor-pointer bg-teal-600 text-xs font-semibold text-white hover:bg-teal-700"
                            >
                                {categoryForm.processing ? 'Creating…' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DELETE CONFIRMATION DIALOG (Super Admin Only)                             */}
            {/* ========================================================================= */}
            {isSuperAdminUser && (
                <AlertDialog open={Boolean(deletingDoc)} onOpenChange={(open) => !open && setDeletingDoc(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
                                <Trash2 className="h-5 w-5" />
                                <span>Delete Document?</span>
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-xs text-zinc-600">
                                Are you sure you want to permanently delete{' '}
                                <strong className="text-zinc-900">{deletingDoc?.title}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="h-8 cursor-pointer text-xs">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteSubmit}
                                className="h-8 cursor-pointer bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </Layout>
    );
}
