import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { staffFundPath } from '@/lib/staff-fund-nav';

type Props = {
    pf_employee_percent: number;
    pf_employer_percent: number;
    env_keys: { employee: string; employer: string };
};

export default function ProvidentFundSettings({ pf_employee_percent, pf_employer_percent, env_keys }: Props) {
    return (
        <Layout>
            <Head title="PF Settings" />
            <PayrollPage>
                <PayrollPageHeader icon={Settings2} title="PF settings" description="Contribution rates applied during salary process.">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={staffFundPath('/sections/staff-fund')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Staff Fund
                        </Link>
                    </Button>
                </PayrollPageHeader>
                <PayrollSectionCard title="Current rates" className="max-w-lg">
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <dt className="text-muted-foreground">Employee contribution</dt>
                            <dd className="font-semibold">{pf_employee_percent}% of basic</dd>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <dt className="text-muted-foreground">Employer contribution</dt>
                            <dd className="font-semibold">{pf_employer_percent}% of basic</dd>
                        </div>
                    </dl>
                    <p className="mt-4 text-xs text-muted-foreground">
                        To change rates, update environment variables <code className="text-xs">{env_keys.employee}</code> and{' '}
                        <code className="text-xs">{env_keys.employer}</code> in <code className="text-xs">.env</code>, then clear config cache.
                    </p>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
