import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Navigation context for managing global navigation state
 * 
 * Provides:
 * - Mobile menu state management
 * - Navigation history
 * - Breadcrumb support
 * - Page title management
 * 
 * @example
 * const { 
 *   mobileMenuOpen, 
 *   setMobileMenuOpen, 
 *   pageTitle, 
 *   setPageTitle 
 * } = useNavigation();
 */
interface NavigationContextType {
    // Mobile menu state
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
    toggleMobileMenu: () => void;

    // Page information
    pageTitle: string;
    setPageTitle: (title: string) => void;

    // Breadcrumbs
    breadcrumbs: Breadcrumb[];
    setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
    addBreadcrumb: (breadcrumb: Breadcrumb) => void;

    // Navigation history
    canGoBack: boolean;
    goBack: () => void;
}

interface Breadcrumb {
    name: string;
    href?: string;
    current?: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

/**
 * Navigation provider component
 */
export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({
    children
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [pageTitle, setPageTitle] = useState('');
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

    const toggleMobileMenu = useCallback(() => {
        setMobileMenuOpen(prev => !prev);
    }, []);

    const addBreadcrumb = useCallback((breadcrumb: Breadcrumb) => {
        setBreadcrumbs(prev => [...prev, breadcrumb]);
    }, []);

    const goBack = useCallback(() => {
        if (window.history.length > 1) {
            window.history.back();
        }
    }, []);

    const canGoBack = window.history.length > 1;

    const value: NavigationContextType = {
        mobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu,
        pageTitle,
        setPageTitle,
        breadcrumbs,
        setBreadcrumbs,
        addBreadcrumb,
        canGoBack,
        goBack,
    };

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

/**
 * Hook to access navigation context
 */
export const useNavigation = (): NavigationContextType => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

export default NavigationProvider;
