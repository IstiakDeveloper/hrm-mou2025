import { Head } from '@inertiajs/react';

<<<<<<< HEAD
import AppearanceTabs from '@/components/appearance-tabs';
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
=======
import AppearanceLightOnly from '@/components/appearance-light-only';
import HeadingSmall from '@/components/heading-small';
import NavLayoutSettings from '@/components/nav-layout-settings';
import { Separator } from '@/components/ui/separator';

import AdminLayout from '@/layouts/AdminLayout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Appearance() {
    return (
        <AdminLayout>
>>>>>>> feature/flutter-mobile-app
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
<<<<<<< HEAD
                    <HeadingSmall title="Appearance settings" description="Update your account's appearance settings" />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppLayout>
=======
                    <HeadingSmall
                        title="Appearance & Layout"
                        description="Customize your navigation layout and theme preferences."
                    />

                    <NavLayoutSettings />

                    <Separator className="my-6" />

                    <AppearanceLightOnly />
                </div>
            </SettingsLayout>
        </AdminLayout>
>>>>>>> feature/flutter-mobile-app
    );
}
