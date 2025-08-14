import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ResponsiveNavigation } from './navigation';

interface ProtectedRouteProps {
    redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    redirectPath = '/login'
}) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        // Show loading spinner while checking authentication
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
            </div>
        );
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
        return <Navigate to={redirectPath} replace />;
    }

    // If authenticated, render the ResponsiveNavigation and child routes
    return (
        <>
            <ResponsiveNavigation />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Outlet />
            </main>
        </>
    );
};

export default ProtectedRoute; 