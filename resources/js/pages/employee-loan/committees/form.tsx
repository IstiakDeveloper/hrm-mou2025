import React, { useMemo } from 'react';
import { useEmployeeLookup } from '@/lib/employee-lookup';
import { Link, useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboSelect } from '@/components/ComboSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeLoanPath } from '@/lib/employee-loan-nav';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

type MemberRow = {
    member_type: string;
    employee_id: string;
    display_name: string;
};

type Props = {
    employees: { id: number; pin?: string; name_en?: string; employee_id?: string }[];
    committee: {
        id: number;
        committee_name: string;
        establishment_date: string;
        is_active: boolean;
        inactive_date: string | null;
        members: MemberRow[];
    } | null;
};

function employeeLabel(e: { id: number; pin?: string; name_en?: string; employee_id?: string }) {
    const pin = e.pin || e.employee_id || '';
    const name = e.name_en || '';
    return [pin, name].filter(Boolean).join(' — ') || `Employee #${e.id}`;
}

export default function LoanCommitteeForm({ employees, committee }: Props) {
    const isEdit = Boolean(committee?.id);
    const employeeLookup = useEmployeeLookup({ enabled: employees.length === 0, limit: 50 });
    const employeeSource = employees.length > 0 ? employees : employeeLookup.employees;

    const form = useForm({
        committee_name: committee?.committee_name ?? '',
        establishment_date: committee?.establishment_date ?? new Date().toISOString().slice(0, 10),
        is_active: committee?.is_active ?? true,
        inactive_date: committee?.inactive_date ?? '',
        members: (committee?.members?.length ? committee.members : [{ member_type: 'internal', employee_id: '', display_name: '' }]) as MemberRow[],
    });

    const employeeItems = useMemo(
        () =>
            employeeSource.map((e) => ({
                value: String(e.id),
                label: employeeLabel(e),
                keywords: `${e.pin ?? ''} ${e.name_en ?? ''} ${e.employee_id ?? ''} ${e.id}`,
            })),
        [employeeSource],
    );

    const addMember = () => form.setData('members', [...form.data.members, { member_type: 'internal', employee_id: '', display_name: '' }]);
    const removeMember = (i: number) => form.setData('members', form.data.members.filter((_, idx) => idx !== i));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && committee) form.put(route('loan-committees.update', committee.id));
        else form.post(route('loan-committees.store'));
    };

    return (
        <EmployeeLoanLayout
            title={isEdit ? 'Edit loan committee' : 'New loan committee'}
            activeTab="committees"
            description="Define committee members for loan approval workflow."
        >
            <div className="mb-4">
                <Link href={employeeLoanPath(route('loan-committees.index'))} className="inline-flex items-center text-xs text-zinc-600 hover:text-zinc-900">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Committees
                </Link>
            </div>

            <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 py-3">
                        <CardTitle className="text-sm font-semibold text-zinc-900">Committee details</CardTitle>
                        <CardDescription className="text-xs text-zinc-500">Name, establishment date, and status.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs">Committee name</Label>
                            <Input className="h-9 text-xs" value={form.data.committee_name} onChange={(e) => form.setData('committee_name', e.target.value)} required />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Establishment date</Label>
                            <Input type="date" className="h-9 text-xs" value={form.data.establishment_date} onChange={(e) => form.setData('establishment_date', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Inactive date</Label>
                            <Input type="date" className="h-9 text-xs" value={form.data.inactive_date} onChange={(e) => form.setData('inactive_date', e.target.value)} />
                        </div>
                        <label className="flex items-center gap-2 text-xs sm:col-span-2">
                            <Checkbox checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', Boolean(v))} />
                            Active committee
                        </label>
                    </CardContent>
                </Card>

                <Card className="border-zinc-200/90 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 py-3">
                        <div>
                            <CardTitle className="text-sm font-semibold text-zinc-900">Members</CardTitle>
                            <CardDescription className="text-xs text-zinc-500">{employeeSource.length} active employees available for internal members.</CardDescription>
                        </div>
                        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={addMember}>
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add member
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {form.data.members.map((m, i) => (
                            <div key={i} className="grid gap-3 rounded-lg border border-zinc-100 bg-zinc-50/40 p-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Type</Label>
                                    <Select
                                        value={m.member_type}
                                        onValueChange={(v) => {
                                            const members = [...form.data.members];
                                            members[i] = { ...members[i], member_type: v };
                                            form.setData('members', members);
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="internal">Internal</SelectItem>
                                            <SelectItem value="external">External</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {m.member_type === 'internal' ? (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Employee</Label>
                                        <ComboSelect
                                            value={m.employee_id || null}
                                            onChange={(v) => {
                                                const members = [...form.data.members];
                                                members[i] = { ...members[i], employee_id: v ?? '' };
                                                form.setData('members', members);
                                            }}
                                            items={employeeItems}
                                            placeholder="Search employee…"
                                            clearable={false}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Member name</Label>
                                        <Input
                                            className="h-9 text-xs"
                                            value={m.display_name}
                                            onChange={(e) => {
                                                const members = [...form.data.members];
                                                members[i] = { ...members[i], display_name: e.target.value };
                                                form.setData('members', members);
                                            }}
                                        />
                                    </div>
                                )}
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeMember(i)}>
                                    <Trash2 className="h-4 w-4 text-rose-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" className="h-9 text-xs" asChild>
                        <Link href={employeeLoanPath(route('loan-committees.index'))}>Cancel</Link>
                    </Button>
                    <Button type="submit" className="h-9 bg-emerald-600 text-xs hover:bg-emerald-700" disabled={form.processing}>
                        <Save className="mr-1.5 h-4 w-4" />
                        Save committee
                    </Button>
                </div>
            </form>
        </EmployeeLoanLayout>
    );
}
