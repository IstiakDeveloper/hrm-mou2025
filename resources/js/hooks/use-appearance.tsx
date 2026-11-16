/**
 * App-wide theme: light only. Tailwind dark variants use `.dark` on an ancestor;
 * we never add it and strip it on load so old localStorage values cannot stick.
 */
const applyLightTheme = () => {
    document.documentElement.classList.remove('dark');
};

export function initializeTheme() {
    applyLightTheme();
    localStorage.setItem('appearance', 'light');
}
