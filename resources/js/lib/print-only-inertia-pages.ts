/** Inertia `component` names for print-only views — hide PWA install UI and notification gate overlay. */
export function shouldHideGlobalChromeForInertiaPage(component: string): boolean {
    return (
        component.endsWith('/print') ||
        component.endsWith('/pdf') ||
        component === 'movement/log-book/payment/voucher' ||
        component === 'office-map/index'
    );
}
