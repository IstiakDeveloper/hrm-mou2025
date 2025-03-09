import { useCallback, useEffect, useState } from 'react';

// We still define the type for potential future use, but we'll only use 'light'
export type Appearance = 'light' | 'dark' | 'system';

// No longer need these functions since we're always using light theme
// const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
// const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
// const handleSystemThemeChange = () => {...}

const applyLightTheme = () => {
  // Remove 'dark' class to ensure light theme
  document.documentElement.classList.remove('dark');
};

export function initializeTheme() {
  // Always apply light theme, ignore saved preference
  applyLightTheme();

  // Store 'light' as the preference
  localStorage.setItem('appearance', 'light');

  // No need for event listeners anymore
}

export function useAppearance() {
  // Always initialize with 'light'
  const [appearance, setAppearance] = useState<Appearance>('light');

  const updateAppearance = useCallback(() => {
    // Force light theme regardless of what's passed
    setAppearance('light');
    localStorage.setItem('appearance', 'light');
    applyLightTheme();
  }, []);

  useEffect(() => {
    // Always set to light on component mount
    updateAppearance();

    // No cleanup needed since we don't have event listeners
  }, [updateAppearance]);

  // We still return both values for API compatibility
  return { appearance, updateAppearance } as const;
}
