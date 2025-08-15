import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Hook for managing theme state with system preference detection
 * Provides theme switching functionality with persistence
 * 
 * @example
 * const { theme, setTheme, effectiveTheme } = useTheme();
 * 
 * // Set theme manually
 * setTheme('dark');
 * 
 * // Get current effective theme (resolves 'system' to actual theme)
 * console.log(effectiveTheme); // 'light' or 'dark'
 */
export function useTheme() {
    const [theme, setThemeState] = useState<Theme>('system');
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    // Get the effective theme (resolves 'system' to actual preference)
    const effectiveTheme = theme === 'system' ? systemTheme : theme;

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        // Set initial system theme
        setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

        // Add listener
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, []);

    // Load saved theme from localStorage on mount
    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('theme') as Theme;
            if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                setThemeState(savedTheme);
            }
        } catch (error) {
            console.warn('Failed to load theme from localStorage:', error);
        }
    }, []);

    // Apply theme to document element
    useEffect(() => {
        const root = document.documentElement;

        // Remove any existing theme classes
        root.classList.remove('light', 'dark');
        root.removeAttribute('data-theme');

        // Apply new theme
        if (effectiveTheme === 'dark') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        } else {
            root.classList.add('light');
            root.setAttribute('data-theme', 'light');
        }
    }, [effectiveTheme]);

    // Theme setter with persistence
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);

        try {
            localStorage.setItem('theme', newTheme);
        } catch (error) {
            console.warn('Failed to save theme to localStorage:', error);
        }
    }, []);

    // Toggle between light and dark (ignores system)
    const toggleTheme = useCallback(() => {
        setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
    }, [effectiveTheme, setTheme]);

    return {
        theme,
        effectiveTheme,
        systemTheme,
        setTheme,
        toggleTheme,
        isDark: effectiveTheme === 'dark',
        isLight: effectiveTheme === 'light',
    };
}

/**
 * Simple theme toggle hook for basic light/dark switching
 * 
 * @example
 * const { isDark, toggle } = useThemeToggle();
 */
export function useThemeToggle() {
    const { effectiveTheme, toggleTheme, isDark } = useTheme();

    return {
        isDark,
        isLight: !isDark,
        theme: effectiveTheme,
        toggle: toggleTheme,
    };
}
