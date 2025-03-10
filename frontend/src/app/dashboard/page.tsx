'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { deviceAPI } from '@/services/api';
import { Device } from '@/types';
import Link from 'next/link';
import { FiGrid, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

// Helper function to get link type name
const getLinkTypeName = (linkType?: number): string => {
    if (linkType === 1) return 'BLE';
    if (linkType === 4) return 'LoRA';
    return 'Unknown';
};

// Helper function to check if a date is within 1 day of now
const isWithinOneDay = (dateString?: string): boolean => {
    if (!dateString) return false;
    try {
        const date = new Date(dateString);
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        return (now.getTime() - date.getTime()) < oneDayMs;
    } catch (e) {
        return false;
    }
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                setIsLoading(true);
                const data = await deviceAPI.getAllDevices();
                // Debug to check if the fields exist in the data
                console.log("Dashboard device data:", data);
                setDevices(data);
            } catch (err) {
                console.error('Error fetching devices:', err);
                setError('Failed to fetch devices. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDevices();
    }, []);

    // Update health status logic based on updated_at time
    const devicesNeedingAttention = devices.filter(device => !device.updated_at || !isWithinOneDay(device.updated_at));
    const healthyDevices = devices.filter(device => device.updated_at && isWithinOneDay(device.updated_at));

    // Update the card for devices needing attention
    const needsAttentionCount = devicesNeedingAttention.length;
    const healthyCount = healthyDevices.length;
    const needsAttentionPercentage = devices.length > 0
        ? Math.round((needsAttentionCount / devices.length) * 100)
        : 0;
    const healthyPercentage = devices.length > 0
        ? Math.round((healthyCount / devices.length) * 100)
        : 0;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <FiAlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-gray-800">
                    Welcome back{user?.name ? `, ${user.name}` : ''}! Here's an overview of your devices.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-600 rounded-md p-3">
                                <FiGrid className="h-6 w-6 text-white" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-800 truncate">
                                        Total Devices
                                    </dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {devices.length}
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-4 sm:px-6">
                        <div className="text-sm">
                            <Link
                                href="/devices"
                                className="font-medium text-blue-700 hover:text-blue-800"
                            >
                                View all devices
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-red-600 rounded-md p-3">
                                <FiAlertCircle className="h-6 w-6 text-white" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-800 truncate">
                                        Needs Attention
                                    </dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {devicesNeedingAttention.length}
                                        </div>
                                        <div className="ml-2 text-sm font-medium text-red-600">
                                            {needsAttentionPercentage}% of total
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-4 sm:px-6">
                        <div className="text-sm">
                            <Link
                                href="/devices?filter=attention"
                                className="font-medium text-red-700 hover:text-red-800"
                            >
                                View devices needing attention
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-600 rounded-md p-3">
                                <FiCheckCircle className="h-6 w-6 text-white" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-800 truncate">
                                        Healthy Devices
                                    </dt>
                                    <dd className="flex items-baseline">
                                        <div className="text-2xl font-semibold text-gray-900">
                                            {healthyDevices.length}
                                        </div>
                                        <div className="ml-2 text-sm font-medium text-green-600">
                                            {healthyPercentage}% of total
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-4 sm:px-6">
                        <div className="text-sm">
                            <Link
                                href="/devices?filter=healthy"
                                className="font-medium text-green-700 hover:text-green-800"
                            >
                                View healthy devices
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {devices.slice(0, 5).map((device, index) => {
                            // Determine health status based on updated_at time
                            const isHealthy = device.updated_at ? isWithinOneDay(device.updated_at) : false;

                            return (
                                <li key={device.device_id}>
                                    <Link
                                        href={`/devices/${device.device_id}`}
                                        className="block hover:bg-gray-50"
                                    >
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-blue-700 truncate">
                                                    {device.device_id}
                                                </p>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${!isHealthy ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {!isHealthy ? 'Needs Attention' : 'Healthy'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex flex-col">
                                                    {device.last_rx_rssi !== undefined && (
                                                        <p className="flex items-center text-sm text-gray-700">
                                                            RSSI: {device.last_rx_rssi} dBm
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex flex-col items-end text-sm text-gray-700 sm:mt-0">
                                                    {device.last_link_type !== undefined && (
                                                        <p>
                                                            Link Type: {getLinkTypeName(device.last_link_type)}
                                                        </p>
                                                    )}
                                                    {device.updated_at && (
                                                        <p className="mt-1 text-xs">
                                                            Updated: {new Date(device.updated_at).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
} 