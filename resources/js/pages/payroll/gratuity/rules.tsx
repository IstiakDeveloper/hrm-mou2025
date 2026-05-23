import React from 'react';
import { Head, Link } from '@inertiajs/react';
import StaffFundLayout from '@/layouts/StaffFundLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gift } from 'lucide-react';
import { staffFundPath } from '@/lib/staff-fund-nav';

type Props = {
    tiers: { min_years: number; basic_multiplier: number }[];
};

export default function GratuityRules({ tiers }: Props) {
    return (
        <StaffFundLayout title="Gratuity Rules" activeTab="gratuity-rules" description="Configuration overview for gratuity payouts based on tenure thresholds.">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Link
                        href={staffFundPath('/gratuity')}
                        className="inline-flex items-center gap-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
                    >
                        <ArrowLeft className="h-3 w-3" /> Back to Entitlements
                    </Link>
                </div>
            </div>

            {/* Rules Content */}
            <Card className="overflow-hidden border-zinc-200/80 bg-white shadow-2xs rounded-lg max-w-md">
                <CardHeader className="border-b border-zinc-100 px-3 py-2 bg-zinc-50/50">
                    <CardTitle className="text-xs font-bold text-zinc-800 uppercase tracking-wide">Eligibility & Tiers</CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 space-y-3">
                    <ul className="divide-y divide-zinc-100 text-xs">
                        {tiers.map((t) => (
                            <li key={t.min_years} className="flex justify-between py-2 text-zinc-700 font-medium">
                                <span>{t.min_years}+ years of service completed</span>
                                <span className="font-bold text-emerald-700">{t.basic_multiplier} × basic salary</span>
                            </li>
                        ))}
                        <li className="flex justify-between py-2 text-zinc-500 font-medium">
                            <span>Below 5 years of service</span>
                            <span className="font-semibold text-amber-700">Not Eligible</span>
                        </li>
                        <li className="flex justify-between py-2 text-zinc-550 font-medium">
                            <span>Maximum limit</span>
                            <span className="font-semibold text-zinc-700">4 × basic (20+ years)</span>
                        </li>
                    </ul>
                    <div className="rounded-md bg-zinc-50/50 border border-zinc-150 p-2.5 text-[10px] text-zinc-400 leading-normal">
                        Note: Tiers and multipliers are system configurations loaded from the server's config files (<code className="text-[10px] font-mono bg-zinc-100 text-zinc-600 px-1 rounded">config/payroll.php</code> under <code className="text-[10px] font-mono bg-zinc-100 text-zinc-600 px-1 rounded">gratuity_tiers</code>).
                    </div>
                </CardContent>
            </Card>
        </StaffFundLayout>
    );
}
