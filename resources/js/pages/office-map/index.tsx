import type { OfficeMapPageProps } from '@/lib/office-map-types';
import { Head } from '@inertiajs/react';
import { useEffect, useState, type ComponentType } from 'react';

export default function OfficeMapIndex(props: OfficeMapPageProps) {
    const [Canvas, setCanvas] = useState<ComponentType<OfficeMapPageProps> | null>(null);

    useEffect(() => {
        let cancelled = false;

        import('@/components/office-map/OfficeMapCanvas').then((mod) => {
            if (!cancelled) {
                setCanvas(() => mod.default);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <>
            <Head title="Office Map" />
            {Canvas ? (
                <Canvas {...props} />
            ) : (
                <div className="flex h-screen w-full items-center justify-center bg-slate-100 text-sm text-slate-600">
                    Loading map…
                </div>
            )}
        </>
    );
}
