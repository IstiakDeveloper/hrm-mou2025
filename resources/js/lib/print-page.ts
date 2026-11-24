/**
 * Closes the current print window/tab or navigates back.
 * When a print page is opened via `window.open(url, '_blank')`, `window.close()`
 * immediately closes the tab.
 * If the tab was opened directly or within the same window, it falls back
 * to `window.history.back()` or redirects to the provided fallback URL.
 */
export function handlePrintClose(fallbackUrl?: string): void {
    window.close();

    // Fallback if window.close() did not close the window (e.g. opened directly in tab)
    setTimeout(() => {
        if (window.closed) return;
        if (window.history.length > 1) {
            window.history.back();
        } else if (fallbackUrl) {
            window.location.href = fallbackUrl;
        }
    }, 100);
}
