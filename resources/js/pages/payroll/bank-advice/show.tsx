import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Button } from '@/components/ui/button';
import Layout from '@/layouts/AdminLayout';
import { formatTakaAmount } from '@/lib/taka-format';
import { Head, Link, router } from '@inertiajs/react';
import { adviceBase, type BankAdvice } from './types';

export default function BankAdviceShow({
    advice,
    canEdit,
    canExport,
    canDelete,
}: {
    advice: BankAdvice;
    canEdit: boolean;
    canExport: boolean;
    canDelete: boolean;
}) {
    const url = `${adviceBase}/${advice.id}`;
    return (
        <Layout>
            <Head title={`Bank Advice - ${advice.salary_month}`} />
            <PayrollPage>
                <PayrollPageHeader
                    title={`Bank Advice - ${advice.salary_month}`}
                    description={`${advice.reference} | ${advice.entries.length} account(s) | BDT ${formatTakaAmount(Number(advice.total), 2)}`}
                >
                    <Button asChild variant="outline">
                        <Link href={adviceBase}>Saved advices</Link>
                    </Button>
                    {canEdit && (
                        <Button asChild variant="outline">
                            <Link href={`${url}/edit`}>Edit letter</Link>
                        </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => window.open(`${url}/print`, '_blank')}>
                        Print
                    </Button>
                    {canExport && (
                        <>
                            <Button asChild variant="outline">
                                <a href={`${url}/pdf`} target="_blank" rel="noreferrer">
                                    PDF
                                </a>
                            </Button>
                            {advice.include_account_list && (
                                <Button asChild variant="outline">
                                    <a href={`${url}/excel`}>Excel account list</a>
                                </Button>
                            )}
                        </>
                    )}
                    {canDelete && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                if (window.confirm(`Delete bank advice ${advice.reference} for ${advice.salary_month}? This cannot be undone.`))
                                    router.delete(url);
                            }}
                        >
                            Delete advice
                        </Button>
                    )}
                </PayrollPageHeader>
                <PayrollSectionCard
                    title={advice.include_account_list ? 'Letter and attached account list' : 'Bank advice letter'}
                    description="This saved advice retains the salary accounts and amounts from when it was generated."
                >
                    <iframe
                        title="Bank advice letter and account list"
                        src={`${url}/preview`}
                        className="min-h-[1000px] w-full border-0 bg-white"
                        onLoad={(event) => {
                            const frame = event.currentTarget;
                            if (frame.contentDocument?.body) frame.style.height = `${frame.contentDocument.body.scrollHeight + 100}px`;
                        }}
                    />
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
