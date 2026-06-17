import React from 'react';
import { Link } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export type TransferRow = {
    id: number;
    transfer_type: string;
    transfer_date: string;
    notes: string | null;
    reason: string | null;
    fixed_asset?: { id: number; asset_tag: string; manual_asset_code: string | null; name: string };
    from_branch?: { name: string } | null;
    to_branch?: { name: string } | null;
    from_project?: { name: string; code: string } | null;
    to_project?: { name: string; code: string } | null;
    from_custodian?: { name: string } | null;
    to_custodian?: { name: string } | null;
    transferred_by_user?: { name: string } | null;
};

import { formatDisplayDate } from '@/lib/display-date';

const typeLabels: Record<string, string> = {
    branch: 'Branch',
    project: 'Project',
    custodian: 'Custodian',
};

function projectLabel(p?: { name: string; code: string } | null) {
    return p ? `${p.code} — ${p.name}` : '—';
}

function detailCell(row: TransferRow) {
    if (row.transfer_type === 'branch') {
        return (
            <>
                <span className="text-muted-foreground">{row.from_branch?.name ?? '—'}</span>
                <span className="mx-1">→</span>
                <span>{row.to_branch?.name ?? '—'}</span>
            </>
        );
    }
    if (row.transfer_type === 'project') {
        return (
            <>
                <span className="text-muted-foreground">{projectLabel(row.from_project)}</span>
                <span className="mx-1">→</span>
                <span>{projectLabel(row.to_project)}</span>
            </>
        );
    }
    return (
        <>
            <span className="text-muted-foreground">{row.from_custodian?.name ?? '—'}</span>
            <span className="mx-1">→</span>
            <span>{row.to_custodian?.name ?? 'Released'}</span>
        </>
    );
}

export function TransferHistoryTable({ transfers, showType = false }: { transfers: TransferRow[]; showType?: boolean }) {
    const colSpan = showType ? 6 : 5;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    {showType && <TableHead>Type</TableHead>}
                    <TableHead>Asset</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Notes</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transfers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                            No transfers yet.
                        </TableCell>
                    </TableRow>
                ) : transfers.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell>{formatDisplayDate(row.transfer_date)}</TableCell>
                        {showType && (
                            <TableCell>
                                <Badge variant="outline">{typeLabels[row.transfer_type] ?? row.transfer_type}</Badge>
                            </TableCell>
                        )}
                        <TableCell>
                            {row.fixed_asset && (
                                <Link href={route('fixed-assets.show', row.fixed_asset.id)} className="font-mono text-xs text-emerald-700 hover:underline">
                                    {row.fixed_asset.manual_asset_code || row.fixed_asset.asset_tag}
                                </Link>
                            )}
                            <div className="text-xs text-muted-foreground">{row.fixed_asset?.name}</div>
                        </TableCell>
                        <TableCell className="text-sm">{detailCell(row)}</TableCell>
                        <TableCell>{row.transferred_by_user?.name ?? '—'}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs">{row.notes || row.reason || '—'}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
