'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { deviceAPI } from '@/services/api';
import { Device } from '@/types';
import Link from 'next/link';
import { FiAlertCircle, FiCheckCircle, FiSearch } from 'react-icons/fi';

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const searchParams = useSearchParams();
    const filterParam = searchParams.get('filter');

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                setIsLoading(true);
                const data = await deviceAPI.getAllDevices();
                setDevices(data);
                setFilteredDevices(data);
            } catch (err) {
                console.error('Error fetching devices:', err);
                setError('Failed to fetch devices. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDevices();
    }, []);

    useEffect(() => {
        // Apply filters based on URL parameters and search term
        let result = [...devices];

        // Apply filter parameter
        if (filterParam === 'attention') {
            result = result.filter((_, index) => index % 2 === 0); // For demo, odd indices need attention
        } else if (filterParam === 'healthy') {
            result = result.filter((_, index) => index % 2 !== 0); // For demo, even indices are healthy
        }

        // Apply search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                device =>
                    device.model_number.toLowerCase().includes(term) ||
                    device.serial_number.toLowerCase().includes(term) ||
                    device.device_type.toLowerCase().includes(term) ||
                    device.firmware_version.toLowerCase().includes(term)
            );
        }

        setFilteredDevices(result);
    }, [devices, filterParam, searchTerm]);

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
                <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
                <p className="mt-2 text-gray-800">
                    Manage and monitor all your connected devices.
                </p>
            </div>

            <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="relative rounded-md shadow-sm max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiSearch className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            className="focus:ring-blue-600 focus:border-blue-600 block w-full pl-10 pr-12 py-2 sm:text-sm border-gray-300 rounded-md text-gray-900"
                            placeholder="Search devices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex space-x-2">
                        <Link
                            href="/devices"
                            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${!filterParam ? 'text-white bg-blue-700 hover:bg-blue-800' : 'text-gray-800 bg-white hover:bg-gray-50'
                                }`}
                        >
                            All
                        </Link>
                        <Link
                            href="/devices?filter=attention"
                            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${filterParam === 'attention' ? 'text-white bg-red-700 hover:bg-red-800' : 'text-gray-800 bg-white hover:bg-gray-50'
                                }`}
                        >
                            <FiAlertCircle className="mr-1.5 h-4 w-4" />
                            Needs Attention
                        </Link>
                        <Link
                            href="/devices?filter=healthy"
                            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${filterParam === 'healthy' ? 'text-white bg-green-700 hover:bg-green-800' : 'text-gray-800 bg-white hover:bg-gray-50'
                                }`}
                        >
                            <FiCheckCircle className="mr-1.5 h-4 w-4" />
                            Healthy
                        </Link>
                    </div>
                </div>
            </div>

            {filteredDevices.length === 0 ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
                    <p className="text-gray-700">No devices found matching your criteria.</p>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {filteredDevices.map((device, index) => (
                            <li key={device.device_id}>
                                <Link
                                    href={`/devices/${device.device_id}`}
                                    className="block hover:bg-gray-50"
                                >
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-blue-700 truncate">
                                                {device.model_number} - {device.serial_number}
                                            </p>
                                            <div className="ml-2 flex-shrink-0 flex">
                                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${index % 2 === 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {index % 2 === 0 ? 'Needs Attention' : 'Healthy'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-700">
                                                    Type: {device.device_type}
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-gray-700 sm:mt-0">
                                                <p>
                                                    Firmware: {device.firmware_version}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-700">
                                                ID: {device.device_id}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
} 