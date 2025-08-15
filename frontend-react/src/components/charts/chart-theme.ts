import { designTokens } from '../../styles/design-tokens';

/**
 * Chart theme configuration integrated with the design system
 * Provides consistent styling across all charts in both light and dark modes
 */

export interface ChartTheme {
    background: string;
    foreground: string;
    card: string;
    border: string;
    grid: string;
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    muted: string;
    text: {
        primary: string;
        secondary: string;
        muted: string;
    };
    axis: {
        line: string;
        tick: string;
        label: string;
    };
}

export const chartThemes: Record<'light' | 'dark', ChartTheme> = {
    light: {
        background: '#ffffff',
        foreground: '#111827',
        card: '#ffffff',
        border: '#e5e7eb',
        grid: '#f3f4f6',
        primary: '#3b82f6',
        secondary: '#6b7280',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        muted: '#f3f4f6',
        text: {
            primary: '#111827',
            secondary: '#4b5563',
            muted: '#9ca3af',
        },
        axis: {
            line: '#e5e7eb',
            tick: '#6b7280',
            label: '#4b5563',
        },
    },
    dark: {
        background: '#1f2937',
        foreground: '#f9fafb',
        card: '#1f2937',
        border: '#4b5563',
        grid: '#374151',
        primary: '#60a5fa',
        secondary: '#9ca3af',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        muted: '#374151',
        text: {
            primary: '#f9fafb',
            secondary: '#d1d5db',
            muted: '#9ca3af',
        },
        axis: {
            line: '#4b5563',
            tick: '#9ca3af',
            label: '#d1d5db',
        },
    },
};

/**
 * Get the appropriate chart theme based on the current theme mode
 */
export function getChartTheme(isDark: boolean): ChartTheme {
    return chartThemes[isDark ? 'dark' : 'light'];
}

/**
 * Default chart colors for data series
 * These work well in both light and dark modes
 */
export const chartColors = {
    light: [
        '#3b82f6', // blue-500
        '#10b981', // emerald-500
        '#f59e0b', // amber-500
        '#ef4444', // red-500
        '#8b5cf6', // violet-500
        '#06b6d4', // cyan-500
        '#84cc16', // lime-500
        '#f97316', // orange-500
    ],
    dark: [
        '#60a5fa', // blue-400
        '#34d399', // emerald-400
        '#fbbf24', // amber-400
        '#f87171', // red-400
        '#a78bfa', // violet-400
        '#22d3ee', // cyan-400
        '#a3e635', // lime-400
        '#fb923c', // orange-400
    ],
};

/**
 * Get chart colors for the current theme
 */
export function getChartColors(isDark: boolean): string[] {
    return chartColors[isDark ? 'dark' : 'light'];
}

/**
 * Common chart style configurations
 */
export const chartStyles = {
    cartesianGrid: {
        strokeDasharray: '3 3',
        strokeOpacity: 0.3,
    },
    axis: {
        fontSize: 12,
        fontFamily: designTokens.typography.fontFamily.sans.join(', '),
    },
    tooltip: {
        contentStyle: {
            fontSize: 14,
            fontFamily: designTokens.typography.fontFamily.sans.join(', '),
            borderRadius: designTokens.borderRadius.md,
            border: 'none',
            boxShadow: designTokens.shadow.lg,
        },
    },
    legend: {
        fontSize: 12,
        fontFamily: designTokens.typography.fontFamily.sans.join(', '),
    },
};

/**
 * Responsive chart dimensions based on screen size
 */
export const chartDimensions = {
    mobile: {
        height: 300,
        margin: { top: 20, right: 20, bottom: 60, left: 20 },
    },
    tablet: {
        height: 350,
        margin: { top: 20, right: 30, bottom: 60, left: 30 },
    },
    desktop: {
        height: 400,
        margin: { top: 20, right: 30, bottom: 60, left: 40 },
    },
};

/**
 * Animation configurations for charts
 */
export const chartAnimations = {
    duration: 300,
    easing: 'ease-out',
    delay: 0,
};

/**
 * Export chart configuration helper
 */
export interface ExportConfig {
    filename: string;
    format: 'png' | 'jpg' | 'pdf' | 'svg' | 'csv';
    quality?: number; // For jpg format
    width?: number;
    height?: number;
}

/**
 * Default export configuration
 */
export const defaultExportConfig: ExportConfig = {
    filename: 'chart',
    format: 'png',
    quality: 0.95,
    width: 1200,
    height: 600,
};
