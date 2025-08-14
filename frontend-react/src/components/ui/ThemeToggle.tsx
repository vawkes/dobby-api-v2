import React from 'react';
import { Button } from './Button';
import { useTheme, type Theme } from '../../hooks/use-theme';

/**
 * Theme toggle component with icon indicators
 * Provides a dropdown for selecting light, dark, or system theme
 * 
 * @example
 * <ThemeToggle />
 */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const handleToggle = () => {
    // Simple toggle between light and dark
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost" 
      size="sm"
      onClick={handleToggle}
      className={className}
      aria-label={`Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} theme`}
      icon={effectiveTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
    >
      <span className="sr-only">
        Switch to {effectiveTheme === 'dark' ? 'light' : 'dark'} theme
      </span>
    </Button>
  );
};

/**
 * Advanced theme selector with dropdown for all theme options
 */
interface ThemeSelectorProps {
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className }) => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <SunIcon /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
    { value: 'system', label: 'System', icon: <SystemIcon /> },
  ];

  return (
    <div className={className}>
      <label htmlFor="theme-select" className="block text-sm font-medium mb-2">
        Theme
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {themes.map(({ value, label }) => (
          <option key={value} value={value}>
            {label} {value === 'system' && `(${effectiveTheme})`}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Sun icon for light theme indicator
 */
const SunIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

/**
 * Moon icon for dark theme indicator  
 */
const MoonIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round" 
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

/**
 * System/auto icon for system theme indicator
 */
const SystemIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

export default ThemeToggle;
