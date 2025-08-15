/**
 * Mobile-First Navigation System
 * 
 * A comprehensive navigation system designed for modern web applications with:
 * - Mobile-first responsive design
 * - Touch-friendly interactions (44px+ targets)
 * - Theme integration (light/dark mode)
 * - Smooth animations and transitions
 * - Accessibility features (ARIA labels, keyboard navigation)
 * - Multiple navigation patterns (drawer, bottom tabs, breadcrumbs)
 */

// Core navigation components
export { ResponsiveNavigation } from './ResponsiveNavigation';
export { MobileNavigation } from './MobileNavigation';
export { BottomNavigation } from './ResponsiveNavigation';

// Navigation utilities
export { Breadcrumbs, PageHeader } from './Breadcrumbs';
export { NavigationProvider, useNavigation } from './NavigationContext';

// Re-export for backward compatibility
export { ResponsiveNavigation as NavigationBar } from './ResponsiveNavigation';
