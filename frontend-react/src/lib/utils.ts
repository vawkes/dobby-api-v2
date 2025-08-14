import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for conflict resolution
 * 
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', className)
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Component display name helper for better debugging
 * 
 * @example  
 * export const Button = withDisplayName(ButtonComponent, 'Button');
 */
export function withDisplayName<T extends React.ComponentType<any>>(
    Component: T,
    name: string
): T {
    Component.displayName = name;
    return Component;
}

/**
 * Debug component props in development mode
 * Helps developers understand what props are being passed to components
 * 
 * @example
 * debugProps(props, 'Button');
 */
export function debugProps(props: any, componentName: string) {
    if (process.env.NODE_ENV === 'development') {
        console.group(`${componentName} props:`);
        console.table(props);
        console.groupEnd();
    }
}

/**
 * Format display names for better readability
 * 
 * @example
 * formatDisplayName('user_name') // returns 'User Name'
 */
export function formatDisplayName(str: string): string {
    return str
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Check if the current device likely supports touch
 */
export function isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Format file sizes for display
 * 
 * @example
 * formatFileSize(1024) // returns '1 KB'
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Debounce function for performance optimization
 * 
 * @example
 * const debouncedSearch = debounce((query) => search(query), 300);
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Generate a random ID for components that need unique identifiers
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}
