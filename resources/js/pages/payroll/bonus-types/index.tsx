import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Award, Edit, Plus, Search, Trash2 } from 'lucide-react';

type BonusTypeRow = {
    id: number;
    code: string;
    name: string;
    name_bn: string | null;
    sort_order: number;
    is_active: boolean;
    configurations_count: number;
};

type Paginated = { data: BonusTypeRow[] };

export default function BonusTypeIndex({
    bonusTypes,
    filters,
}: {
    bonusTypes: Paginated;
    filters: { search?: string };
}) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = () => router.get(route('bonus-types.index'), { search }, { preserveState: true });
    const handleDelete = (id: number) => {
        if (confirm('Delete this bonus type?')) router.delete(route('bonus-types.destroy', id));
    };

    return (
        <Layout>
            <Head title="Bonus types" />
            <PayrollPage>
                <PayrollPageHeader
                    icon={Award}
                    title="Bonus types"
                    description="Festival, performance, and other bonus categories used in configuration."
                >
                    <Link href={route('bonus-types.create')}>
                        <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add bonus type</Button>
                    </Link>
                </PayrollPageHeader>

                {flash?.success && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{flash.success}</AlertDescription>
                    </Alert>
                )}
                {flash?.error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{flash.error}</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="Search" className="mb-4">
                    <div className="flex gap-2">
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Name or code…"
                            className="max-w-sm"
                        />
                        <Button variant="outline" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
                    </div>
                </PayrollSectionCard>

                <PayrollSectionCard title="All bonus types">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Bangla</TableHead>
                                <TableHead>Configs</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bonusTypes.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                        No bonus types yet. Add one to start configuring bonuses.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                bonusTypes.data.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-mono text-xs">{row.code}</TableCell>
                                        <TableCell className="font-medium">{row.name}</TableCell>
                                        <TableCell>{row.name_bn || '—'}</TableCell>
                                        <TableCell>{row.configurations_count}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.is_active ? 'default' : 'secondary'}>
                                                {row.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="space-x-2 text-right">
                                            <Link href={route('bonus-types.edit', row.id)}>
                                                <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                                            </Link>
                                            <Button variant="outline" size="sm" onClick={() => handleDelete(row.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
