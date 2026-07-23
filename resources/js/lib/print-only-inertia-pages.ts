/** Inertia `component` names for print-only views — hide PWA install UI and notification gate overlay. */
export function shouldHideGlobalChromeForInertiaPage(component: string): boolean {
    return component === 'leave/applications/pdf' || component === 'movement/print';
}
