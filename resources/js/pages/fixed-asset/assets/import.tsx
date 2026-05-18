import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import Layout from '@/layouts/AdminLayout';
import { PayrollPage, PayrollPageHeader, PayrollSectionCard } from '@/components/payroll/PayrollPageShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload } from 'lucide-react';

export default function FixedAssetImport({
    branchScoped,
    templateHeaders,
}: {
    branchScoped: boolean;
    templateHeaders: string[];
}) {
    const { data, setData, post, processing, errors } = useForm<{ file: File | null }>({ file: null });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('fixed-assets.import.preview'), { forceFormData: true });
    };

    return (
        <Layout>
            <Head title="Import assets" />
            <PayrollPage>
                <PayrollPageHeader title="Bulk import assets" description="Upload a CSV file to register many assets at once.">
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('fixed-assets.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                </PayrollPageHeader>

                {branchScoped && (
                    <Alert className="mb-4 border-blue-200 bg-blue-50">
                        <AlertTitle>Branch limit</AlertTitle>
                        <AlertDescription>Only assets for your branch can be imported.</AlertDescription>
                    </Alert>
                )}

                <PayrollSectionCard title="CSV template" description="First row must be column headers (case insensitive).">
                    <p className="mb-3 text-xs text-muted-foreground">
                        Required: <strong>name</strong>, <strong>category_code</strong>, <strong>branch_code</strong> (use branch code from master data).
                        Optional: purchase_date, purchase_cost, book_value, vendor, serial_number, invoice_no, useful_life_years, status.
                    </p>
                    <code className="block overflow-x-auto rounded bg-slate-100 p-2 text-xs">{templateHeaders.join(',')}</code>
                </PayrollSectionCard>

                <PayrollSectionCard className="mt-4" title="Upload file">
                    <form onSubmit={submit} className="space-y-4">
                        <Input
                            type="file"
                            accept=".csv,.txt"
                            onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                        />
                        {errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
                        <Button type="submit" disabled={processing || !data.file}>
                            <Upload className="mr-2 h-4 w-4" /> Preview import
                        </Button>
                    </form>
                </PayrollSectionCard>
            </PayrollPage>
        </Layout>
    );
}
