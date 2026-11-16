import { useForm } from '@inertiajs/react';
import EmployeeLoanLayout from '@/layouts/EmployeeLoanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollEmployeeSelect } from '@/components/payroll/PayrollFilterGrid';
import { fmtLoanAmount } from '@/lib/employee-loan-format';
import { employeeLoanPath } from '@/lib/employee-loan-nav';

type Policy = {
    id: number;
    code: string;
    name: string;
    min_amount: number;
    max_amount: number;
    total_installments: number;
    interest_rate: number;
};

type Candidate = {
    id: number;
    pin?: string | null;
    name_en?: string | null;
    status?: string | null;
    active_loan_number: string;
    active_loan_cycle: string;
    max_amount: number;
};

type Props = {
    policies: Policy[];
    candidates: Candidate[];
    defaultDisbursementDate: string;
};

const fmt = fmtLoanAmount;

export default function SecondMotorcycleCreate({ policies, candidates, defaultDisbursementDate }: Props) {
    const form = useForm({
        employee_id: '',
        loan_policy_id: policies[0] ? String(policies[0].id) : '',
        principal_amount: '',
        disbursement_date: defaultDisbursementDate,
        notes: '',
    });

    const selected = candidates.find((row) => String(row.id) === form.data.employee_id);
    const policy = policies.find((row) => String(row.id) === form.data.loan_policy_id);

    return (
        <EmployeeLoanLayout
            title="Second motorcycle loan"
            activeTab="second-motorcycle"
            description="Disburse a second motorcycle loan while the first one is still active. Accounts and Super Admin only."
        >
            <Card className="border-zinc-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-sm">Direct disbursement</CardTitle>
                    <CardDescription className="text-xs">
                        The recommendation chain is skipped. The earlier loan stays active, and both installments deduct on payroll. A third active motorcycle loan is not allowed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {candidates.length === 0 ? (
                        <p className="text-sm text-zinc-600">
                            No employee currently has exactly one active motorcycle loan that is free of an open application.
                        </p>
                    ) : (
                        <form
                            className="grid gap-4 sm:grid-cols-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.post(employeeLoanPath('/employee-loans/second-motorcycle'));
                            }}
                        >
                            <div className="sm:col-span-2">
                                <PayrollEmployeeSelect
                                    label="Employee"
                                    required
                                    allowAll={false}
                                    value={form.data.employee_id}
                                    onChange={(value) => form.setData('employee_id', value)}
                                    employees={candidates}
                                />
                                {selected && (
                                    <p className="mt-1.5 text-[11px] text-amber-800">
                                        Active loan {selected.active_loan_number} ({selected.active_loan_cycle}) stays open. Designation cap {fmt(selected.max_amount)}.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Motorcycle policy</Label>
                                <select
                                    className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs"
                                    value={form.data.loan_policy_id}
                                    onChange={(event) => form.setData('loan_policy_id', event.target.value)}
                                >
                                    {policies.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            {row.code} — {row.name} ({row.total_installments} installments)
                                        </option>
                                    ))}
                                </select>
                                {policy && (
                                    <p className="text-[11px] text-zinc-500">
                                        Policy range {fmt(policy.min_amount)} – {fmt(policy.max_amount)}. The designation cap still applies.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Amount</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    className="h-9 text-xs"
                                    value={form.data.principal_amount}
                                    onChange={(event) => form.setData('principal_amount', event.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Disbursement date</Label>
                                <Input
                                    type="date"
                                    className="h-9 text-xs"
                                    value={form.data.disbursement_date}
                                    onChange={(event) => form.setData('disbursement_date', event.target.value)}
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-xs">Notes (optional)</Label>
                                <Textarea
                                    className="min-h-[72px] text-xs"
                                    value={form.data.notes}
                                    onChange={(event) => form.setData('notes', event.target.value)}
                                />
                            </div>

                            {form.errors.loan && <p className="text-xs text-rose-600 sm:col-span-2">{form.errors.loan}</p>}

                            <div className="sm:col-span-2">
                                <Button type="submit" className="h-9 bg-emerald-600 text-xs hover:bg-emerald-700" disabled={form.processing || policies.length === 0}>
                                    Disburse second loan
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </EmployeeLoanLayout>
    );
}
