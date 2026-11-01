import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    FileText, 
    Plus, 
    Search, 
    CheckCircle2, 
    Clock, 
    RotateCcw, 
    XCircle, 
    Eye, 
    Printer, 
    UserCheck,
    Calendar,
    Users,
    Trash2,
    Edit
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface IndexProps {
    applications: any;
    metrics: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
    filters: {
        search?: string;
        status?: string;
        per_page?: number;
    };
    canCreate: boolean;
    reasonCategories: Record<string, string>;
}

export default function ResignationApplicationIndex({
    applications,
    metrics,
    filters,
    canCreate = true,
    reasonCategories = {},
}: IndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/resignation-applications', {
            search: search.trim() || undefined,
            status: status !== 'all' ? status : undefined,
        }, { preserveState: true, replace: true });
    };

    const handleStatusFilter = (val: string) => {
        setStatus(val);
        router.get('/resignation-applications', {
            search: search.trim() || undefined,
            status: val !== 'all' ? val : undefined,
        }, { preserveState: true, replace: true });
    };

    const handleDelete = (id: number, appNo: string) => {
        if (confirm(`আপনি কি নিশ্চিত যে খসড়া আবেদনটি (${appNo}) মুছে ফেলতে চান?`)) {
            router.delete(`/resignation-applications/${id}`);
        }
    };

    const getStatusBadge = (st: string) => {
        switch (st) {
            case 'approved':
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]"><CheckCircle2 className="h-3 w-3" /> অনুমোদিত</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="gap-1 text-[11px]">বাতিল</Badge>;
            case 'sent_back':
                return <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1 text-[11px]"><RotateCcw className="h-3 w-3" /> সংশোধনে</Badge>;
            case 'draft':
                return <Badge variant="secondary" className="gap-1 text-[11px]">খসড়া</Badge>;
            default:
                return <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-[11px]"><Clock className="h-3 w-3" /> পর্যালোচনায়</Badge>;
        }
    };

    return (
        <AdminLayout>
            <Head title="চাকরি হতে অব্যাহতির আবেদন তালিকা" />

            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <FileText className="h-6 w-6 text-emerald-600" />
                            চাকরি হতে অব্যাহতির আবেদন (Resignation Applications)
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            মৌসুমী (Ukilpara, Naogaon) — পদোন্নতি মূল্যায়নের অনুরূপ ৬-স্তরের অনুমোদন ওয়ার্কফ্লো
                        </p>
                    </div>

                    {canCreate && (
                        <Link href="/resignation-applications/create">
                            <Button className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold">
                                <Plus className="h-4 w-4" />
                                নতুন আবেদন দাখিল করুন
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="border-slate-200 bg-white shadow-2xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] text-slate-500 font-medium block">মোট আবেদন</span>
                                <span className="text-lg font-bold text-slate-900">{metrics.total}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-2xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] text-blue-600 font-medium block">পর্যালোচনাধীন</span>
                                <span className="text-lg font-bold text-slate-900">{metrics.pending}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-2xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] text-emerald-600 font-medium block">চূড়ান্ত অনুমোদিত</span>
                                <span className="text-lg font-bold text-emerald-700">{metrics.approved}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white shadow-2xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                                <XCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] text-red-600 font-medium block">বাতিলকৃত</span>
                                <span className="text-lg font-bold text-red-700">{metrics.rejected}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="আবেদন নং, কর্মীর নাম বা পিন..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 text-xs h-9 bg-slate-50"
                            />
                        </div>
                        <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
                            খুঁজুন
                        </Button>
                    </form>

                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-medium">স্ট্যাটাস:</span>
                        <Select value={status} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-40 text-xs h-9 bg-white">
                                <SelectValue placeholder="সবগুলো" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">সব স্ট্যাটাস</SelectItem>
                                <SelectItem value="draft" className="text-xs">খসড়া (Draft)</SelectItem>
                                <SelectItem value="submitted_to_supervisor" className="text-xs">১ম তত্ত্বাবধায়ক পর্যায়</SelectItem>
                                <SelectItem value="submitted_to_rm" className="text-xs">আরএম পর্যায়</SelectItem>
                                <SelectItem value="submitted_to_zm" className="text-xs">জেডএম পর্যায়</SelectItem>
                                <SelectItem value="submitted_to_director" className="text-xs">বিভাগীয় প্রধান পর্যায়</SelectItem>
                                <SelectItem value="submitted_to_hr" className="text-xs">এইচআর যাচাই পর্যায়</SelectItem>
                                <SelectItem value="submitted_to_ed" className="text-xs">ইডি অনুমোদন পর্যায়</SelectItem>
                                <SelectItem value="approved" className="text-xs">চূড়ান্ত অনুমোদিত</SelectItem>
                                <SelectItem value="sent_back" className="text-xs">সংশোধনে ফেরত</SelectItem>
                                <SelectItem value="rejected" className="text-xs">বাতিলকৃত</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-bold">
                                <tr>
                                    <th className="p-3.5 pl-5">আবেদন নং</th>
                                    <th className="p-3.5">কর্মী ও পিন</th>
                                    <th className="p-3.5">পদবি ও কর্মস্থল</th>
                                    <th className="p-3.5">অব্যাহতির কারণ</th>
                                    <th className="p-3.5">কার্যকরের তারিখ</th>
                                    <th className="p-3.5">বর্তমান পর্যায়</th>
                                    <th className="p-3.5">স্ট্যাটাস</th>
                                    <th className="p-3.5 pr-5 text-right">কার্যক্রম</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {applications.data?.length > 0 ? (
                                    applications.data.map((app: any) => {
                                        const emp = app.employee || {};
                                        return (
                                            <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                                                    <Link href={`/resignation-applications/${app.id}`} className="hover:underline text-emerald-700">
                                                        {app.application_no}
                                                    </Link>
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="font-semibold text-slate-900">
                                                        {emp.name_bn || emp.name_en || '-'}
                                                    </div>
                                                    <div className="text-[11px] font-mono text-slate-500">
                                                        PIN: {emp.pin || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="font-medium text-slate-800">
                                                        {emp.designation?.name || '-'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        {emp.branch?.name || 'প্রধান কার্যালয়'}
                                                    </div>
                                                </td>
                                                <td className="p-3.5">
                                                    <Badge variant="outline" className="text-[10.5px] font-normal border-slate-200">
                                                        {app.reason_category_label}
                                                    </Badge>
                                                </td>
                                                <td className="p-3.5 font-mono text-slate-700">
                                                    {app.approved_effective_date
                                                        ? format(parseISO(app.approved_effective_date), 'dd/MM/yyyy')
                                                        : (app.effective_date ? format(parseISO(app.effective_date), 'dd/MM/yyyy') : '-')}
                                                </td>
                                                <td className="p-3.5 text-slate-700 font-medium">
                                                    {app.current_stage_label}
                                                </td>
                                                <td className="p-3.5">
                                                    {getStatusBadge(app.status)}
                                                </td>
                                                <td className="p-3.5 pr-5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Link href={`/resignation-applications/${app.id}`}>
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900" title="বিস্তারিত দেখুন">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        {app.can_edit && (
                                                            <Link href={`/resignation-applications/${app.id}/edit`}>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="সংশোধন করুন">
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => window.open(`/resignation-applications/${app.id}/print`, '_blank')}
                                                            className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-700"
                                                            title="প্রিন্ট ভিউ"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                        {app.can_delete && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDelete(app.id, app.application_no)}
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                title="খসড়া আবেদন মুছে ফেলুন"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-slate-400">
                                            কোনো অব্যাহতির আবেদন পাওয়া যায়নি।
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {applications.links && applications.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>
                                মোট {applications.total} টির মধ্যে {applications.from ?? 0}-{applications.to ?? 0} টি প্রদর্শিত
                            </span>
                            <div className="flex items-center gap-1">
                                {applications.links.map((link: any, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg border text-xs ${
                                            link.active
                                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                                : link.url
                                                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                                : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

