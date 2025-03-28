import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NavigationBar: React.FC = () => {
    const { logout, user } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        // For devices, match both /devices and /devices/:id
        if (path === '/devices') {
            return location.pathname === '/devices' || location.pathname.startsWith('/devices/');
        }
        return location.pathname === path;
    };

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            {/* You can add your logo here */}
                            <span className="text-lg font-semibold text-gray-800">GridCube</span>
                        </div>
                        <div className="ml-6 flex space-x-8">
                            <NavLink
                                to="/dashboard"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/dashboard')
                                    ? 'border-indigo-500 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                            >
                                Dashboard
                            </NavLink>
                            <NavLink
                                to="/devices"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/devices')
                                    ? 'border-indigo-500 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                            >
                                Devices
                            </NavLink>
                            <NavLink
                                to="/bulk-schedule"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/bulk-schedule')
                                    ? 'border-indigo-500 text-gray-900'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                            >
                                Bulk Schedule
                            </NavLink>
                        </div>
                    </div>
                    <div className="flex items-center">
                        {user && (
                            <span className="text-sm text-gray-500 mr-4">
                                {user.email}
                            </span>
                        )}
                        <button
                            onClick={logout}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default NavigationBar; 