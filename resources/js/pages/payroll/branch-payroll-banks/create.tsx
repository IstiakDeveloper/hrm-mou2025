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
import { formatPayrollBranchLabel, sortPayrollBranches } from '@/lib/payroll-branches';
import { ArrowLeft } from 'lucide-react';

type BranchOption = { id: number; name: string; branch_code: string | null };

export default function BranchPayrollBankCreate({
    branches,
    banks,
}: {
    branches: BranchOption[];
    banks: string[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        branch_id: '',
        bank_name: '',
        bank_branch_name: '',
        account_no: '',
        account_type: '',
        notes: '',
        is_active: true,
    });

    const bankItems: ComboSelectItem<string>[] = useMemo(
        () => banks.map((b) => ({ value: b, label: b })),
        [banks],
    );

    const branchItems: ComboSelectItem<string>[] = useMemo(
        () =>
            sortPayrollBranches(branches).map((b) => {
                const code = (b.branch_code ?? '').trim();
                return {
                    value: String(b.id),
                    label: formatPayrollBranchLabel(b),
                    keywords: `${b.name} ${code}`.trim(),
                };
            }),
        [branches],
    );

    return (
        <Layout>
            <Head title="Add Branch Payroll Bank" />
            <div className="container mx-auto max-w-2xl py-8">
                <Link href={route('branch-payroll-banks.index')} className="mb-4 flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        post(route('branch-payroll-banks.store'));
                    }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Branch payroll bank</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Branch *</Label>
                                <ComboSelect
                                    value={data.branch_id || null}
                                    onChange={(v) => setData('branch_id', v ?? '')}
                                    items={branchItems}
                                    placeholder="Select branch"
                                />
                                {errors.branch_id && <p className="text-sm text-red-500">{errors.branch_id}</p>}
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
                                {errors.bank_branch_name && <p className="text-sm text-red-500">{errors.bank_branch_name}</p>}
                            </div>
                            <div>
                                <Label>Account number</Label>
                                <Input value={data.account_no} onChange={(e) => setData('account_no', e.target.value)} />
                                {errors.account_no && <p className="text-sm text-red-500">{errors.account_no}</p>}
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
                                {errors.account_type && <p className="text-sm text-red-500">{errors.account_type}</p>}
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} />
                                {errors.notes && <p className="text-sm text-red-500">{errors.notes}</p>}
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
                                Save
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </div>
        </Layout>
    );
}
