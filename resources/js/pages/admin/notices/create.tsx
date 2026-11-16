import Layout from '@/layouts/AdminLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    Info,
    List,
    Megaphone,
    Search,
    Send,
    Users as UsersIcon,
    X,
    XCircle,
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';

interface Department {
    id: number;
    name: string;
}

interface UserOption {
    id: number;
    name: string;
    email: string;
    username: string | null;
}

interface PageProps {
    departments: Department[];
    users: UserOption[];
}

type AudienceType = 'all' | 'departments' | 'users';

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; badge: string }> = {
    info: {
        label: 'Info',
        icon: <Info className="h-4 w-4" />,
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    success: {
        label: 'Success',
        icon: <CheckCircle2 className="h-4 w-4" />,
        badge: 'bg-green-100 text-green-700 border-green-200',
    },
    warning: {
        label: 'Warning',
        icon: <AlertTriangle className="h-4 w-4" />,
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    error: {
        label: 'Error',
        icon: <XCircle className="h-4 w-4" />,
        badge: 'bg-red-100 text-red-700 border-red-200',
    },
};

export default function AdminNoticeCreate({ departments, users }: PageProps) {
    const { flash } = usePage<{ flash?: { success?: string; warning?: string; error?: string } }>().props;

    const [userSearch, setUserSearch] = useState('');
    const [deptSearch, setDeptSearch] = useState('');
    const [userListOpen, setUserListOpen] = useState(false);
    const [deptListOpen, setDeptListOpen] = useState(false);

    const userPopoverRef = useRef<HTMLDivElement | null>(null);
    const deptPopoverRef = useRef<HTMLDivElement | null>(null);

    const attachmentInputRef = useRef<HTMLInputElement | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        message: '',
        type: 'info',
        link: '',
        audience: 'all' as AudienceType,
        department_ids: [] as number[],
        user_ids: [] as number[],
        attachment: null as File | null,
    });

    const userById = useMemo(() => {
        const m = new Map<number, UserOption>();
        for (const u of users) m.set(u.id, u);
        return m;
    }, [users]);

    const deptById = useMemo(() => {
        const m = new Map<number, Department>();
        for (const d of departments) m.set(d.id, d);
        return m;
    }, [departments]);

    const filteredUsers = useMemo(() => {
        const q = userSearch.trim().toLowerCase();
        if (!q) return users.slice(0, 150);
        return users
            .filter(
                (u) =>
                    u.name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    (u.username && u.username.toLowerCase().includes(q)),
            )
            .slice(0, 150);
    }, [users, userSearch]);

    const filteredDepartments = useMemo(() => {
        const q = deptSearch.trim().toLowerCase();
        if (!q) return departments;
        return departments.filter((d) => d.name.toLowerCase().includes(q));
    }, [departments, deptSearch]);

    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userPopoverRef.current && !userPopoverRef.current.contains(e.target as Node)) {
                setUserListOpen(false);
            }
            if (deptPopoverRef.current && !deptPopoverRef.current.contains(e.target as Node)) {
                setDeptListOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleDepartment = (id: number) => {
        setData(
            'department_ids',
            data.department_ids.includes(id)
                ? data.department_ids.filter((x) => x !== id)
                : [...data.department_ids, id],
        );
    };

    const toggleUser = (id: number) => {
        setData(
            'user_ids',
            data.user_ids.includes(id) ? data.user_ids.filter((x) => x !== id) : [...data.user_ids, id],
        );
    };

    const selectAllFilteredUsers = () => {
        const ids = new Set(data.user_ids);
        for (const u of filteredUsers) ids.add(u.id);
        setData('user_ids', Array.from(ids));
    };

    const clearUsers = () => setData('user_ids', []);
    const clearDepartments = () => setData('department_ids', []);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.notices.store'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                reset('title', 'message', 'link', 'attachment');
                if (attachmentInputRef.current) {
                    attachmentInputRef.current.value = '';
                }
            },
        });
    };

    const selectedType = TYPE_META[data.type] ?? TYPE_META.info;
    const recipientHint =
        data.audience === 'all'
            ? 'All active users will receive this notice.'
            : data.audience === 'departments'
              ? `${data.department_ids.length} department(s) selected.`
              : `${data.user_ids.length} user(s) selected.`;

    return (
        <Layout>
            <Head title="Send notice" />

            <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={route('admin.notices.index')}>
                            <Button type="button" variant="outline" size="icon" aria-label="Back to notices">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                                <Megaphone className="h-7 w-7 text-green-600" />
                                Send notice
                            </h1>
                            <p className="text-sm text-gray-600">
                                Users get this in the app bell, by email (when they have an email on file), and as web push if configured.
                            </p>
                        </div>
                    </div>
                    <Link href={route('admin.notices.index')}>
                        <Button type="button" variant="outline" className="gap-2">
                            <List className="h-4 w-4" />
                            View notice list
                        </Button>
                    </Link>
                </div>

                {flash?.success && (
                    <Alert className="border-green-200 bg-green-50 text-green-800">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Sent</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.warning && (
                    <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Notice</AlertTitle>
                        <AlertDescription>{flash.warning}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Send className="h-5 w-5 text-green-600" />
                                    Notice content
                                </CardTitle>
                                <CardDescription>
                                    Title and message appear in the notification bell and as a push preview.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">
                                        Title <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        required
                                        maxLength={255}
                                        placeholder="e.g. Office will close early on Friday"
                                    />
                                    {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="message">
                                        Message <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="message"
                                        value={data.message}
                                        onChange={(e) => setData('message', e.target.value)}
                                        required
                                        rows={7}
                                        className="min-h-[140px]"
                                        placeholder="Write the full message employees should see…"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {data.message.length} character(s). Push preview shows the first ~140 characters.
                                    </p>
                                    {errors.message && <p className="text-sm text-red-600">{errors.message}</p>}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(TYPE_META).map(([key, meta]) => (
                                                    <SelectItem key={key} value={key}>
                                                        <span className="flex items-center gap-2">
                                                            {meta.icon}
                                                            {meta.label}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="link">Optional link</Label>
                                        <Input
                                            id="link"
                                            value={data.link}
                                            onChange={(e) => setData('link', e.target.value)}
                                            placeholder="/dashboard or https://…"
                                        />
                                        {errors.link && <p className="text-sm text-red-600">{errors.link}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="attachment">Attachment (optional)</Label>
                                    <Input
                                        ref={attachmentInputRef}
                                        id="attachment"
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.jpg,.jpeg,.png,.gif,.webp"
                                        onChange={(e) => setData('attachment', e.target.files?.[0] ?? null)}
                                        className="cursor-pointer"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Max 15 MB. The same file is attached to each recipient&apos;s email and linked in the in-app notice.
                                    </p>
                                    {errors.attachment && <p className="text-sm text-red-600">{errors.attachment}</p>}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5 text-blue-600" />
                                    Live preview
                                </CardTitle>
                                <CardDescription>Exactly how the bell item will look.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-lg border bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${selectedType.badge}`}
                                        >
                                            {selectedType.icon}
                                            {selectedType.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">just now</span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {data.title || 'Notice title appears here'}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                                        {data.message || 'The message content preview…'}
                                    </p>
                                    {data.link && (
                                        <p className="mt-2 truncate text-xs text-blue-600">{data.link}</p>
                                    )}
                                </div>
                                <div className="mt-4 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                                    {recipientHint}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UsersIcon className="h-5 w-5 text-green-600" />
                                Audience
                            </CardTitle>
                            <CardDescription>Choose exactly who should receive this notice.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-3 md:grid-cols-3">
                                {(
                                    [
                                        {
                                            value: 'all' as AudienceType,
                                            label: 'All active users',
                                            desc: 'Every user with an active account.',
                                        },
                                        {
                                            value: 'departments' as AudienceType,
                                            label: 'By department',
                                            desc: 'Users linked to employees in selected departments.',
                                        },
                                        {
                                            value: 'users' as AudienceType,
                                            label: 'Specific users',
                                            desc: 'Pick individual users from the list.',
                                        },
                                    ] as const
                                ).map((opt) => {
                                    const active = data.audience === opt.value;
                                    return (
                                        <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => setData('audience', opt.value)}
                                            className={`flex flex-col items-start rounded-lg border p-4 text-left transition-all ${
                                                active
                                                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                                    : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40'
                                            }`}
                                        >
                                            <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                                            <span className="mt-1 text-xs text-muted-foreground">{opt.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {data.audience === 'departments' && (
                                <>
                                    <Separator />
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Departments</Label>
                                            <div className="flex items-center gap-2 text-xs">
                                                {data.department_ids.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={clearDepartments}
                                                        className="text-red-600 hover:underline"
                                                    >
                                                        Clear all
                                                    </button>
                                                )}
                                                <span className="text-muted-foreground">
                                                    {data.department_ids.length} / {departments.length} selected
                                                </span>
                                            </div>
                                        </div>

                                        <div ref={deptPopoverRef} className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setDeptListOpen((v) => !v)}
                                                className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
                                            >
                                                <span className="flex flex-wrap items-center gap-1">
                                                    {data.department_ids.length === 0 ? (
                                                        <span className="text-muted-foreground">
                                                            Search and select departments…
                                                        </span>
                                                    ) : (
                                                        data.department_ids.slice(0, 4).map((id) => {
                                                            const d = deptById.get(id);
                                                            if (!d) return null;
                                                            return (
                                                                <Badge
                                                                    key={id}
                                                                    variant="secondary"
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    {d.name}
                                                                    <X
                                                                        className="h-3 w-3 cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleDepartment(id);
                                                                        }}
                                                                    />
                                                                </Badge>
                                                            );
                                                        })
                                                    )}
                                                    {data.department_ids.length > 4 && (
                                                        <Badge variant="outline">
                                                            +{data.department_ids.length - 4} more
                                                        </Badge>
                                                    )}
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </button>

                                            {deptListOpen && (
                                                <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg">
                                                    <div className="flex items-center gap-2 border-b px-3 py-2">
                                                        <Search className="h-4 w-4 text-muted-foreground" />
                                                        <input
                                                            autoFocus
                                                            value={deptSearch}
                                                            onChange={(e) => setDeptSearch(e.target.value)}
                                                            placeholder="Search department…"
                                                            className="w-full bg-transparent text-sm outline-none"
                                                        />
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto py-1">
                                                        {filteredDepartments.length === 0 ? (
                                                            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                                No department matches.
                                                            </p>
                                                        ) : (
                                                            filteredDepartments.map((d) => {
                                                                const checked = data.department_ids.includes(d.id);
                                                                return (
                                                                    <label
                                                                        key={d.id}
                                                                        className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                                                                            checked ? 'bg-green-50' : ''
                                                                        }`}
                                                                    >
                                                                        <Checkbox
                                                                            checked={checked}
                                                                            onCheckedChange={() => toggleDepartment(d.id)}
                                                                        />
                                                                        <span>{d.name}</span>
                                                                    </label>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {errors.department_ids && (
                                            <p className="text-sm text-red-600">{errors.department_ids}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {data.audience === 'users' && (
                                <>
                                    <Separator />
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Users</Label>
                                            <div className="flex items-center gap-3 text-xs">
                                                {data.user_ids.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={clearUsers}
                                                        className="text-red-600 hover:underline"
                                                    >
                                                        Clear all
                                                    </button>
                                                )}
                                                <span className="text-muted-foreground">
                                                    {data.user_ids.length} selected
                                                </span>
                                            </div>
                                        </div>

                                        <div ref={userPopoverRef} className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setUserListOpen((v) => !v)}
                                                className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
                                            >
                                                <span className="flex flex-wrap items-center gap-1">
                                                    {data.user_ids.length === 0 ? (
                                                        <span className="text-muted-foreground">
                                                            Search users by name, email or username…
                                                        </span>
                                                    ) : (
                                                        data.user_ids.slice(0, 5).map((id) => {
                                                            const u = userById.get(id);
                                                            if (!u) return null;
                                                            return (
                                                                <Badge
                                                                    key={id}
                                                                    variant="secondary"
                                                                    className="flex items-center gap-1"
                                                                >
                                                                    {u.name}
                                                                    <X
                                                                        className="h-3 w-3 cursor-pointer"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleUser(id);
                                                                        }}
                                                                    />
                                                                </Badge>
                                                            );
                                                        })
                                                    )}
                                                    {data.user_ids.length > 5 && (
                                                        <Badge variant="outline">
                                                            +{data.user_ids.length - 5} more
                                                        </Badge>
                                                    )}
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </button>

                                            {userListOpen && (
                                                <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg">
                                                    <div className="flex items-center gap-2 border-b px-3 py-2">
                                                        <Search className="h-4 w-4 text-muted-foreground" />
                                                        <input
                                                            autoFocus
                                                            value={userSearch}
                                                            onChange={(e) => setUserSearch(e.target.value)}
                                                            placeholder="Search user…"
                                                            className="w-full bg-transparent text-sm outline-none"
                                                        />
                                                        {filteredUsers.length > 0 && (
                                                            <button
                                                                type="button"
                                                                className="whitespace-nowrap text-xs text-green-700 hover:underline"
                                                                onClick={selectAllFilteredUsers}
                                                            >
                                                                Select all shown
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="max-h-72 overflow-y-auto py-1">
                                                        {filteredUsers.length === 0 ? (
                                                            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                                No user matches.
                                                            </p>
                                                        ) : (
                                                            filteredUsers.map((u) => {
                                                                const checked = data.user_ids.includes(u.id);
                                                                return (
                                                                    <label
                                                                        key={u.id}
                                                                        className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                                                                            checked ? 'bg-green-50' : ''
                                                                        }`}
                                                                    >
                                                                        <Checkbox
                                                                            checked={checked}
                                                                            onCheckedChange={() => toggleUser(u.id)}
                                                                            className="mt-0.5"
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium text-gray-900">
                                                                                {u.name}
                                                                            </span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {u.email}
                                                                                {u.username ? ` · ${u.username}` : ''}
                                                                            </span>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                    <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                                                        Showing up to {filteredUsers.length} of {users.length} loaded users.
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {errors.user_ids && <p className="text-sm text-red-600">{errors.user_ids}</p>}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <Button type="button" variant="outline" asChild>
                            <Link href={route('admin.notices.index')}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing} className="gap-2 bg-green-600 hover:bg-green-700">
                            <Send className="h-4 w-4" />
                            {processing ? 'Sending…' : 'Send notice'}
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
