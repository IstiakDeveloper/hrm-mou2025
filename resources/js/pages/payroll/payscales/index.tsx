import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSurface } from '@/components/page-surface';
import { Badge } from '@/components/ui/badge';
import { BriefcaseBusiness, Edit, Plus, Search, Trash2 } from 'lucide-react';

type Payscale = {
    id: number;
    name: string;
    effective_from_display?: string | null;
    is_active: boolean;
    grades_count: number;
};

type Paginated = { data: Payscale[]; meta: { current_page: number; last_page: number; total: number } };

export default function PayscaleIndex({ payscales, filters }: { payscales: Paginated; filters: { search?: string } }) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = () => router.get(route('payscales.index'), { search }, { preserveState: true });
    const handleDelete = (id: number) => {
        if (confirm('Delete this payscale?')) router.delete(route('payscales.destroy', id));
    };

    return (
        <Layout>
            <Head title="Payscales" />
            <PageSurface>
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Payscales</h1>
                        <p className="text-sm text-gray-500">Organization salary scale policies</p>
                    </div>
                    <Link href={route('payscales.create')}>
                        <Button><Plus className="mr-2 h-4 w-4" />Add payscale</Button>
                    </Link>
                </div>

                <Card className="mb-4">
                    <CardContent className="pt-4 flex gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search..." className="max-w-sm" />
                        <Button variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5" />All payscales</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Effective from</TableHead>
                                    <TableHead>Grades</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payscales.data.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.effective_from_display || '—'}</TableCell>
                                        <TableCell>{p.grades_count}</TableCell>
                                        <TableCell><Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link href={route('payscales.edit', p.id)}><Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button></Link>
                                            <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </PageSurface>
        </Layout>
    );
}
