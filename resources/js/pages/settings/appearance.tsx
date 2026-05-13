import { Head } from '@inertiajs/react';

import AppearanceLightOnly from '@/components/appearance-light-only';
import HeadingSmall from '@/components/heading-small';

import AdminLayout from '@/layouts/AdminLayout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Appearance() {
    return (
        <AdminLayout>
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
        </AdminLayout>
    );
}
