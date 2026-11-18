import { usePage } from '@inertiajs/react';

export function useListReturnUrl(fallback: string): string {
    const { listReturnUrl } = usePage<{ listReturnUrl?: string }>().props;
    return listReturnUrl || fallback;
}
