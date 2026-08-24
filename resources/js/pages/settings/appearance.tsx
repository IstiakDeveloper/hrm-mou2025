import { Head } from '@inertiajs/react';

import AppearanceLightOnly from '@/components/appearance-light-only';
import HeadingSmall from '@/components/heading-small';
import NavLayoutSettings from '@/components/nav-layout-settings';
import { Separator } from '@/components/ui/separator';

import AdminLayout from '@/layouts/AdminLayout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Appearance() {
    return (
        <AdminLayout>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
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
    );
}
