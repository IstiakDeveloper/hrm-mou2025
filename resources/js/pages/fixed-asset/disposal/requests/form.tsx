import React from 'react';
import { Head, Link } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { DisposalAssetForm } from '@/components/fixed-asset/DisposalAssetForm';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function DisposalRequestForm(props: {
    prefillAsset: { id: number; asset_tag: string; manual_asset_code: string | null; name: string; book_value: string | null } | null;
    assets: { id: number; asset_tag: string; manual_asset_code: string | null; name: string; book_value: string | null }[];
    reasons: { id: number; code: string; name: string }[];
    methodOptions: { value: string; label: string }[];
    submitRoute: string;
    pageTitle: string;
    pageDescription: string;
    backRoute: string;
    submitLabel: string;
}) {
    return (
        <Layout>
            <Head title={props.pageTitle} />
            <PayrollPage>
                <Link href={route(props.backRoute)} className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Link>
                <PayrollPageHeader icon={Trash2} title={props.pageTitle} description={props.pageDescription} />
                <PayrollSectionCard title="Details" className="max-w-xl">
                    <DisposalAssetForm
                        prefillAsset={props.prefillAsset}
                        assets={props.assets}
                        reasons={props.reasons}
                        methodOptions={props.methodOptions}
                        submitRoute={props.submitRoute}
                        submitLabel={props.submitLabel}
                    />
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
