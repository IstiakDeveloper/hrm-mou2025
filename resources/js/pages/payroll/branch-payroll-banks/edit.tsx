import React, { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComboSelect, type ComboSelectItem } from '@/components/ComboSelect';
import { ArrowLeft } from 'lucide-react';

type BranchRef = { id: number; name: string; branch_code: string | null };
type BankRecord = {
    id: number;
    branch_id: number;
    bank_name: string;
    bank_branch_name: string | null;
    account_no: string | null;
    account_type: string | null;
    notes: string | null;
    is_active: boolean;
    branch?: BranchRef;
};

export default function BranchPayrollBankEdit({
    record,
    banks,
}: {
    record: BankRecord;
    banks: string[];
}) {
    const { data, setData, put, processing, errors } = useForm({
        bank_name: record.bank_name,
        bank_branch_name: record.bank_branch_name || '',
        account_no: record.account_no || '',
        account_type: record.account_type || '',
        notes: record.notes || '',
        is_active: record.is_active,
    });

    const bankItems: ComboSelectItem<string>[] = useMemo(() => {
        const items = banks.map((b) => ({ value: b, label: b }));
        if (record.bank_name && !banks.includes(record.bank_name)) {
            items.unshift({ value: record.bank_name, label: record.bank_name });
        }
        return items;
    }, [banks, record.bank_name]);

    const branchLabel = record.branch
        ? `${record.branch.name}${record.branch.branch_code ? ` (${record.branch.branch_code})` : ''}`
        : `Branch #${record.branch_id}`;

    return (
        <Layout>
            <Head title="Edit Branch Payroll Bank" />
            <div className="container mx-auto max-w-2xl py-8">
                <Link href={route('branch-payroll-banks.index')} className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        put(route('branch-payroll-banks.update', record.id));
                    }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit branch payroll bank</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Branch</Label>
                                <Input value={branchLabel} readOnly className="bg-slate-50" />
                            </div>
                            <div>
                                <Label>Bank name *</Label>
                                <ComboSelect
                                    value={data.bank_name || null}
                                    onChange={(v) => setData('bank_name', v ?? '')}
                                    items={bankItems}
                                    placeholder="Select or search bank"
                                />
                                {errors.bank_name && <p className="text-sm text-red-500">{errors.bank_name}</p>}
                            </div>
                            <div>
                                <Label>Bank branch name</Label>
                                <Input value={data.bank_branch_name} onChange={(e) => setData('bank_branch_name', e.target.value)} />
                            </div>
                            <div>
                                <Label>Account number</Label>
                                <Input value={data.account_no} onChange={(e) => setData('account_no', e.target.value)} />
                            </div>
                            <div>
                                <Label>Account type</Label>
                                <Select
                                    value={data.account_type || 'none'}
                                    onValueChange={(v) => setData('account_type', v === 'none' ? '' : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        <SelectItem value="current">Current</SelectItem>
                                        <SelectItem value="savings">Savings</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={data.is_active} onCheckedChange={(v) => setData('is_active', Boolean(v))} />
                                <Label>Active</Label>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            <Button type="button" variant="outline" asChild>
                                <Link href={route('branch-payroll-banks.index')}>Cancel</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Update
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
