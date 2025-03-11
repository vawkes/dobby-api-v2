import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

    // If authenticated, render the child routes
    return <Outlet />;
};

export default ProtectedRoute; 