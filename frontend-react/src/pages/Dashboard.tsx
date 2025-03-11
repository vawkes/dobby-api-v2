import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-700">Welcome, {user?.name || user?.email}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                        >
                            Logout
                        </Button>
                    </div>
                </div>
            </header>
            <main>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Welcome to Dobby API Dashboard
                        </h2>
                        <p className="text-gray-600">
                            You are now logged in. This is a simple dashboard page.
                        </p>
                        <div className="mt-6">
                            <h3 className="text-lg font-medium text-gray-900">Your Account</h3>
                            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <div className="text-sm font-medium text-gray-500">Email</div>
                                    <div className="mt-1 text-gray-900">{user?.email}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <div className="text-sm font-medium text-gray-500">Name</div>
                                    <div className="mt-1 text-gray-900">{user?.name || 'Not provided'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard; 