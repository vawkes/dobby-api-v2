'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiGrid, FiBell, FiSettings, FiLogOut } from 'react-icons/fi';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: <FiHome className="mr-2" /> },
        { name: 'Devices', href: '/devices', icon: <FiGrid className="mr-2" /> },
        { name: 'Notifications', href: '/notifications', icon: <FiBell className="mr-2" /> },
        { name: 'Settings', href: '/settings', icon: <FiSettings className="mr-2" /> },
    ];

    const isActive = (path: string) => pathname === path;

    // Don't show navigation for login/register pages
    const isAuthPage = pathname.includes('/login') ||
        pathname.includes('/register') ||
        pathname.includes('/verify') ||
        pathname.includes('/forgot-password');

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Toast container for notifications */}
            <ToastContainer position="top-right" autoClose={5000} />

            {isAuthenticated && !isAuthPage && (
                <nav className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex">
                                <div className="flex-shrink-0 flex items-center">
                                    <span className="text-xl font-bold text-blue-700">GridCube</span>
                                </div>
                                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                    {navItems.map((item) => (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive(item.href)
                                                ? 'border-blue-600 text-gray-900'
                                                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                                                }`}
                                        >
                                            {item.icon}
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:items-center">
                                <div className="ml-3 relative">
                                    <div className="flex items-center space-x-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {user?.email}
                                        </div>
                                        <button
                                            onClick={logout}
                                            className="flex items-center text-sm text-gray-700 hover:text-gray-900"
                                        >
                                            <FiLogOut className="mr-1" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile menu */}
                    <div className="sm:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center px-3 py-2 text-base font-medium ${isActive(item.href)
                                        ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-800'
                                        : 'border-l-4 border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                                        }`}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            ))}
                            <button
                                onClick={logout}
                                className="flex w-full items-center px-3 py-2 text-base font-medium border-l-4 border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900"
                            >
                                <FiLogOut className="mr-2" />
                                Logout
                            </button>
                        </div>
                    </div>
                </nav>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>
        </div>
    );
};

export default MainLayout; 