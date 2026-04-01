import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const InternalOnlyRoute: React.FC = () => {
  const { isAuthenticated, isLoading, isInternalLoading, isInternalUser } = useAuth();

  if (isLoading || isInternalLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700' />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  if (!isInternalUser) {
    return <Navigate to='/dashboard' replace />;
  }

  return <Outlet />;
};

export default InternalOnlyRoute;

