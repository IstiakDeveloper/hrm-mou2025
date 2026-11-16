import { useEffect, useState } from 'react';

export type NavLayout = 'sidebar' | 'top';

export const NAV_LAYOUT_STORAGE_KEY = 'admin_nav_layout';
const NAV_LAYOUT_EVENT = 'hrm:nav-layout-change';

export function getStoredNavLayout(): NavLayout {
    if (typeof window === 'undefined' || !window.localStorage) {
        return 'sidebar';
    }
    const val = window.localStorage.getItem(NAV_LAYOUT_STORAGE_KEY);
    return val === 'top' ? 'top' : 'sidebar';
}

export function setStoredNavLayout(layout: NavLayout): void {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }
    window.localStorage.setItem(NAV_LAYOUT_STORAGE_KEY, layout);
    window.dispatchEvent(new CustomEvent(NAV_LAYOUT_EVENT, { detail: layout }));
}

export function useNavLayout() {
    const [navLayout, setNavLayoutState] = useState<NavLayout>(() => getStoredNavLayout());

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<NavLayout>;
            if (ce?.detail) {
                setNavLayoutState(ce.detail);
            } else {
                setNavLayoutState(getStoredNavLayout());
            }
        };

        window.addEventListener(NAV_LAYOUT_EVENT, handler);
        window.addEventListener('storage', handler);

        return () => {
            window.removeEventListener(NAV_LAYOUT_EVENT, handler);
            window.removeEventListener('storage', handler);
        };
    }, []);

    const setNavLayout = (layout: NavLayout) => {
        setNavLayoutState(layout);
        setStoredNavLayout(layout);
    };

    const toggleNavLayout = () => {
        const next: NavLayout = navLayout === 'top' ? 'sidebar' : 'top';
        setNavLayout(next);
    };

    return {
        navLayout,
        setNavLayout,
        toggleNavLayout,
        isTopNav: navLayout === 'top',
        isSidebarNav: navLayout === 'sidebar',
    };
}
