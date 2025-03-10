'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'react-toastify';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip the check if still loading
        if (isLoading) return;

        // If not authenticated and not on an auth page, redirect to login
        if (!isAuthenticated && !pathname.startsWith('/auth')) {
            toast.error('Please log in to access this page');
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router, pathname]);

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // If authenticated or on an auth page, render children
    return <>{children}</>;
};

export default ProtectedRoute; 