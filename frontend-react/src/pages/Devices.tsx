import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { deviceAPI } from '../services/api';
import { Device } from '../types';
import { FiAlertCircle, FiCheckCircle, FiSearch } from 'react-icons/fi';

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

const Devices: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Get URL search parameters
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const filterParam = searchParams.get('filter');

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                setIsLoading(true);
                const data = await deviceAPI.getAllDevices();
                console.log("Device data:", data);
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
            // Filter for devices that need attention (updated_at is null or older than 1 day)
            result = result.filter(device => !device.updated_at || !isWithinOneDay(device.updated_at));
        } else if (filterParam === 'healthy') {
            // Filter for healthy devices (updated_at is within 1 day)
            result = result.filter(device => device.updated_at && isWithinOneDay(device.updated_at));
        }

        // Apply search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                device =>
                    device.model_number.toLowerCase().includes(term) ||
                    device.serial_number.toLowerCase().includes(term) ||
                    device.device_type.toLowerCase().includes(term) ||
                    device.firmware_version.toLowerCase().includes(term) ||
                    device.device_id.toLowerCase().includes(term)
            );
        }

        setFilteredDevices(result);
    }, [devices, filterParam, searchTerm]);

    return (
        <div className="min-h-screen bg-gray-100">
            <main>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
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
                    ) : (
                        <>
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-900">Devices</h2>
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
                                            to="/devices"
                                            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${!filterParam ? 'text-white bg-blue-700 hover:bg-blue-800' : 'text-gray-800 bg-white hover:bg-gray-50'
                                                }`}
                                        >
                                            All
                                        </Link>
                                        <Link
                                            to="/devices?filter=attention"
                                            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md ${filterParam === 'attention' ? 'text-white bg-red-700 hover:bg-red-800' : 'text-gray-800 bg-white hover:bg-gray-50'
                                                }`}
                                        >
                                            <FiAlertCircle className="mr-1.5 h-4 w-4" />
                                            Needs Attention
                                        </Link>
                                        <Link
                                            to="/devices?filter=healthy"
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
                                        {filteredDevices.map((device) => {
                                            // Determine health status based on updated_at time
                                            const isHealthy = device.updated_at ? isWithinOneDay(device.updated_at) : false;

                                            return (
                                                <li key={device.device_id}>
                                                    <Link
                                                        to={`/devices/${device.device_id}`}
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
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Devices; 