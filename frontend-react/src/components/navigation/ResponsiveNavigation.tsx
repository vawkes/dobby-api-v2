import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks/use-media-query';
import { useTheme } from '../../hooks/use-theme';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';
import { MobileNavigation } from './MobileNavigation';
import { cn } from '../../lib/utils';

/**
 * Responsive navigation bar that adapts to screen size
 * 
 * Features:
 * - Desktop: Horizontal navigation with all items visible
 * - Mobile: Hamburger menu with slide-out drawer
 * - Theme toggle integration
 * - User profile display
 * - Touch-friendly interactions
 * - Smooth animations and transitions
 * 
 * @example
 * <ResponsiveNavigation />
 */
export const ResponsiveNavigation: React.FC = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const { effectiveTheme } = useTheme();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Navigation items configuration
    const navigationItems = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Devices', href: '/devices' },
        { name: 'Bulk Schedule', href: '/bulk-schedule' },
    ];

    const isActive = (path: string) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        if (path === '/devices') {
            return location.pathname === '/devices' || location.pathname.startsWith('/devices/');
        }
        return location.pathname === path;
    };

    return (
        <nav className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left side - Logo and Desktop Navigation */}
                    <div className="flex">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center">
                            <NavLink
                                to="/dashboard"
                                className="text-xl font-bold text-foreground hover:text-blue-600 transition-colors"
                            >
                                GridCube
                            </NavLink>
                        </div>

                        {/* Desktop Navigation Links */}
                        {!isMobile && (
                            <div className="hidden md:ml-6 md:flex md:space-x-8">
                                {navigationItems.map((item) => (
                                    <NavLink
                                        key={item.name}
                                        to={item.href}
                                        className={({ isActive: linkActive }) => cn(
                                            'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200',
                                            linkActive || isActive(item.href)
                                                ? 'border-blue-500 text-foreground'
                                                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                                        )}
                                    >
                                        {item.name}
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right side - User info, theme toggle, and mobile menu */}
                    <div className="flex items-center space-x-3">
                        {/* Desktop Theme Toggle */}
                        {!isMobile && <ThemeToggle />}

                        {/* Desktop User Info and Logout */}
                        {!isMobile && (
                            <>
                                {user && (
                                    <div className="hidden md:flex md:items-center md:space-x-4">
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">
                                                {user.email}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={logout}
                                    icon={<LogoutIcon className="h-4 w-4" />}
                                    className="hidden md:inline-flex"
                                >
                                    Sign Out
                                </Button>
                            </>
                        )}

                        {/* Mobile Navigation */}
                        {isMobile && (
                            <MobileNavigation
                                isOpen={mobileMenuOpen}
                                onToggle={setMobileMenuOpen}
                                onClose={() => setMobileMenuOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Backdrop - only show when menu is open */}
            {isMobile && mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}
        </nav>
    );
};

/**
 * Alternative Bottom Navigation for Mobile
 * Provides tab-style navigation at bottom of screen
 * 
 * @example
 * <BottomNavigation />
 */
export const BottomNavigation: React.FC = () => {
    const location = useLocation();
    const { effectiveTheme } = useTheme();
    const isMobile = useMediaQuery('(max-width: 768px)');

    if (!isMobile) return null;

    const bottomNavItems = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: <DashboardIcon className="h-5 w-5" />,
        },
        {
            name: 'Devices',
            href: '/devices',
            icon: <DevicesIcon className="h-5 w-5" />,
        },
        {
            name: 'Schedule',
            href: '/bulk-schedule',
            icon: <ScheduleIcon className="h-5 w-5" />,
        },
    ];

    const isActive = (path: string) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        if (path === '/devices') {
            return location.pathname === '/devices' || location.pathname.startsWith('/devices/');
        }
        return location.pathname === path;
    };

    return (
        <div className={cn(
            'fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 safe-bottom',
            effectiveTheme === 'dark' && 'bg-gray-900 border-gray-700'
        )}>
            <div className="grid grid-cols-3 py-2">
                {bottomNavItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive: linkActive }) => cn(
                            'flex flex-col items-center justify-center px-3 py-2 text-xs font-medium',
                            'touch-target min-h-[60px] transition-colors duration-200',
                            linkActive || isActive(item.href)
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        )}
                    >
                        <div className="mb-1">
                            {item.icon}
                        </div>
                        <span className="leading-none">
                            {item.name}
                        </span>
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

/**
 * Navigation icons
 */
const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const DashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v4m8-4v4" />
    </svg>
);

const DevicesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const ScheduleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

export default ResponsiveNavigation;
