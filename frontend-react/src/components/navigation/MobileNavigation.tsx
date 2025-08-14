import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks/use-media-query';
import { useTheme } from '../../hooks/use-theme';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

/**
 * Mobile navigation with slide-out drawer and hamburger menu
 * 
 * Features:
 * - Touch-friendly hamburger menu (44px minimum)
 * - Smooth slide-out drawer animation
 * - Keyboard navigation support
 * - Auto-close on route change
 * - Theme integration
 * - Backdrop overlay with click-to-close
 * - Accessibility features (focus management, ARIA labels)
 * 
 * @example
 * <MobileNavigation 
 *   isOpen={mobileMenuOpen}
 *   onToggle={setMobileMenuOpen}
 *   onClose={() => setMobileMenuOpen(false)}
 * />
 */
interface MobileNavigationProps {
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  onToggle,
  onClose,
}) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const { effectiveTheme } = useTheme();
  
  // Auto-close menu on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Navigation items configuration
  const navigationItems = [
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
      name: 'Bulk Schedule',
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
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={() => onToggle(!isOpen)}
        className={cn(
          'touch-target inline-flex items-center justify-center p-2 rounded-md',
          'text-gray-400 hover:text-gray-500 hover:bg-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500',
          'transition-colors duration-200',
          effectiveTheme === 'dark' && 'text-gray-300 hover:text-gray-200 hover:bg-gray-800'
        )}
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
      >
        <span className="sr-only">Open main menu</span>
        <HamburgerIcon isOpen={isOpen} />
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Navigation Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 z-30 h-full w-80 max-w-sm transform transition-transform duration-300 ease-in-out',
          'bg-white shadow-xl border-l border-gray-200',
          effectiveTheme === 'dark' && 'bg-gray-900 border-gray-700',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="mobile-menu-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            GridCube
          </h2>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={onClose}
              className={cn(
                'touch-target p-2 rounded-md text-gray-400 hover:text-gray-500',
                'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                effectiveTheme === 'dark' && 'text-gray-300 hover:text-gray-200 hover:bg-gray-800'
              )}
              aria-label="Close navigation menu"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive: linkActive }) => cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg',
                'touch-target transition-colors duration-200',
                linkActive || isActive(item.href)
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white'
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {user && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Signed in as
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <Button
            variant="outline"
            fullWidth
            onClick={logout}
            className="touch-target"
            icon={<LogoutIcon className="h-4 w-4" />}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </>
  );
};

/**
 * Animated hamburger icon that transforms to X when open
 */
interface HamburgerIconProps {
  isOpen: boolean;
  className?: string;
}

const HamburgerIcon: React.FC<HamburgerIconProps> = ({ isOpen, className = "h-6 w-6" }) => (
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
      d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
      className="transition-all duration-300"
    />
  </svg>
);

/**
 * Navigation icons for better visual hierarchy
 */
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

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export default MobileNavigation;
