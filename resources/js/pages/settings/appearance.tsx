import { Head } from '@inertiajs/react';

import AppearanceLightOnly from '@/components/appearance-light-only';
import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Appearance settings"
                        description="The interface uses a single light theme for everyone."
                    />
                    <AppearanceLightOnly />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
