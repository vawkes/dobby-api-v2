import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { deviceAPI } from '../services/api';
import { Device } from '../types';
import { FiAlertCircle, FiCheckCircle, FiSearch } from 'react-icons/fi';
import { DataTable, deviceColumns } from '../components/data';
import { Button } from '../components/ui/Button';

// Helper function to check if a date is within 1 day of now (kept for filtering logic)
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
    const navigate = useNavigate();
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
        <div className="min-h-screen bg-background">
            <main>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4 dark:bg-red-900/20 dark:border-red-500">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-foreground">Devices</h2>
                                <p className="mt-2 text-muted-foreground">
                                    Manage and monitor all your connected devices.
                                </p>
                            </div>

                            <div className="mb-6">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div className="relative rounded-md shadow-sm max-w-md">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiSearch className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <input
                                            type="text"
                                            className="focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400 block w-full pl-10 pr-12 py-2 sm:text-sm border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
                                            placeholder="Search devices..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="flex space-x-2">
                                        <Button
                                            variant={!filterParam ? "primary" : "outline"}
                                            size="sm"
                                            onClick={() => navigate('/devices')}
                                        >
                                            All
                                        </Button>
                                        <Button
                                            variant={filterParam === 'attention' ? "danger" : "outline"}
                                            size="sm"
                                            onClick={() => navigate('/devices?filter=attention')}
                                            icon={<FiAlertCircle className="h-4 w-4" />}
                                        >
                                            Needs Attention
                                        </Button>
                                        <Button
                                            variant={filterParam === 'healthy' ? "primary" : "outline"}
                                            size="sm"
                                            onClick={() => navigate('/devices?filter=healthy')}
                                            icon={<FiCheckCircle className="h-4 w-4" />}
                                            className={filterParam === 'healthy' ? "bg-green-600 hover:bg-green-700 focus:ring-green-600" : ""}
                                        >
                                            Healthy
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <DataTable
                                data={filteredDevices}
                                columns={deviceColumns}
                                loading={isLoading}
                                error={error || undefined}
                                globalFilter={searchTerm}
                                onGlobalFilterChange={setSearchTerm}
                                onRowClick={(device) => navigate(`/devices/${device.device_id}`)}
                                emptyMessage="No devices found matching your criteria."
                                pageSize={25}
                            />
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Devices; 
