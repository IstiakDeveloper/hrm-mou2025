import React from 'react';
import { Head } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PageSurface } from '@/components/page-surface';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Boxes } from 'lucide-react';

type AssetRow = {
    id: number;
    asset_tag: string;
    name: string;
    status: string;
    status_label: string;
    serial_number: string | null;
    custody_type: string;
    custody_label: string;
    assigned_date: string | null;
    category?: { code: string; name: string } | null;
    branch?: { name: string; branch_code: string | null } | null;
};

export default function EmployeeMyAssets({
    assets,
    hasEmployeeProfile,
    employee,
}: {
    assets: AssetRow[];
    hasEmployeeProfile: boolean;
    employee?: { employee_id: string; name: string };
}) {
    return (
        <Layout>
            <Head title="My assets" />
            <PageSurface className="max-w-5xl">
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15">
                            <Boxes className="h-5 w-5" />
                        </span>
                        <div>
                            <h1 className="text-xl font-semibold text-zinc-900">My assets</h1>
                            <p className="text-sm text-muted-foreground">
                                {employee
                                    ? `Fixed assets assigned to ${employee.name} (${employee.employee_id})`
                                    : 'Equipment and assets in your custody'}
                            </p>
                        </div>
                    </div>
                </div>

                {!hasEmployeeProfile && (
                    <Alert variant="destructive">
                        <AlertTitle>No employee profile</AlertTitle>
                        <AlertDescription>
                            Your user account is not linked to an employee record. Contact HR if you believe this is an error.
                        </AlertDescription>
                    </Alert>
                )}

                {hasEmployeeProfile && assets.length === 0 && (
                    <Alert className="border-zinc-200 bg-zinc-50">
                        <AlertTitle>No assets</AlertTitle>
                        <AlertDescription>You do not have any active asset assignments or custodian records.</AlertDescription>
                    </Alert>
                )}

                {assets.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tag</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Serial</TableHead>
                                    <TableHead>Custody</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assets.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="font-mono text-xs">{a.asset_tag}</TableCell>
                                        <TableCell className="font-medium">{a.name}</TableCell>
                                        <TableCell>{a.category?.name ?? '—'}</TableCell>
                                        <TableCell>{a.branch?.name ?? '—'}</TableCell>
                                        <TableCell>{a.serial_number ?? '—'}</TableCell>
                                        <TableCell>
                                            <span className="text-sm">{a.custody_label}</span>
                                            {a.assigned_date ? (
                                                <span className="block text-xs text-muted-foreground">Since {a.assigned_date}</span>
                                            ) : null}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{a.status_label}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </PageSurface>
        </Layout>
    );
}
