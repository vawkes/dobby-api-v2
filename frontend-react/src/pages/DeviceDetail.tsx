import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deviceAPI } from '../services/api.ts';
import { Device, DeviceDataPoint } from '../types/index.ts';
import { FiAlertCircle, FiArrowLeft, FiBattery, FiCpu, FiWifi, FiActivity } from 'react-icons/fi';
import { InstantPowerChart, CumulativeEnergyChart, OperationalStateChart } from '../components/charts/index.ts';
import DeviceEvents from '../components/DeviceEvents.tsx';
import ScheduleEvent from '../components/ScheduleEvent.tsx';
import DeviceTypeDisplay from '../components/ui/DeviceTypeDisplay.tsx';

// Extend the DeviceDataPoint type with our custom field
interface FormattedDataPoint extends DeviceDataPoint {
    timeMs: number;
    formattedTime: string;
    formattedDate: string;
    isVirtual?: boolean; // Add isVirtual as an optional property
}

// Helper function to get link type name
const getLinkTypeName = (linkType?: number): string => {
    if (linkType === 1) return 'BLE';
    if (linkType === 4) return 'LoRA';
    return 'Unknown';
};

// Helper function to format date
const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        return dateString;
    }
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

const DeviceDetail: React.FC = () => {
    const { deviceId } = useParams<{ deviceId: string }>();
    const [device, setDevice] = useState<Device | null>(null);
    const [deviceData, setDeviceData] = useState<DeviceDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dataError, setDataError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<number>(1); // Default to 1 day
    const [eventsKey, setEventsKey] = useState<number>(0); // Used to force refresh of events component

    useEffect(() => {
        const fetchDeviceDetails = async () => {
            if (!deviceId) {
                setError('Device ID is missing');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const data = await deviceAPI.getDeviceById(deviceId);
                console.log("Device details:", data);
                setDevice(data);
            } catch (err) {
                console.error('Error fetching device details:', err);
                setError('Failed to fetch device details. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDeviceDetails();
    }, [deviceId]);

    useEffect(() => {
        const fetchDeviceData = async () => {
            if (!deviceId) {
                return;
            }

            try {
                setIsLoadingData(true);
                setDataError(null);
                const data = await deviceAPI.getDeviceData(deviceId, timeRange);
                console.log("Device data:", data);
                setDeviceData(data);
            } catch (err) {
                console.error('Error fetching device data:', err);
                setDataError('Failed to fetch device data. Please try again later.');
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchDeviceData();
    }, [deviceId, timeRange]);

    // Format data for the enhanced chart components
    const renderData = deviceData.map(item => {
        const timeMs = item.timestamp * 1000;
        const date = new Date(timeMs);
        return {
            ...item,
            timeMs,
            formattedTime: date.toLocaleTimeString(),
            formattedDate: date.toLocaleDateString(),
        };
    }).sort((a, b) => a.timeMs - b.timeMs);

    // Function to refresh events after scheduling a new one
    const handleEventScheduled = () => {
        // Increment the key to force the DeviceEvents component to re-render
        setEventsKey(prevKey => prevKey + 1);
    };

    // Chart components now handle their own tooltips and formatting

    return (
        <div className="min-h-screen bg-background">
            <main>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error || !device ? (
                        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4 dark:bg-red-900/20 dark:border-red-500">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800 dark:text-red-200">{error || 'Device not found'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <Link to="/devices" className="inline-flex items-center text-blue-600 hover:text-blue-800">
                                    <FiArrowLeft className="mr-2" />
                                    Back to Devices
                                </Link>
                            </div>
                            {/* Device Data Charts Section */}
                            <div className="bg-card shadow overflow-hidden sm:rounded-lg mb-8">
                                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg leading-6 font-medium text-card-foreground">Device Data</h3>
                                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Time series data from DobbyData table.</p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <select
                                            value={timeRange}
                                            onChange={(e) => setTimeRange(Number(e.target.value))}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border bg-background text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                        >
                                            <option value={1}>Last 24 Hours</option>
                                            <option value={7}>Last 7 Days</option>
                                            <option value={30}>Last 30 Days</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="border-t border-border">
                                    {isLoadingData ? (
                                        <div className="flex justify-center items-center h-64">
                                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : dataError ? (
                                        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4 dark:bg-red-900/20 dark:border-red-500">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-red-800 dark:text-red-200">{dataError}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : deviceData.length === 0 ? (
                                        <div className="p-6 text-center text-muted-foreground">
                                            <FiActivity className="h-12 w-12 mx-auto text-muted-foreground" />
                                            <p className="mt-2">No data available for this device.</p>
                                        </div>
                                    ) : (
                                        <div className="p-4">
                                            <div className="grid grid-cols-1 gap-6">
                                                {/* Enhanced Charts with Theme Support */}
                                                <InstantPowerChart
                                                    data={renderData}
                                                    loading={isLoadingData}
                                                    error={dataError}
                                                    timeRange={`${timeRange}d`}
                                                    exportable={true}
                                                    onRetry={() => window.location.reload()}
                                                />

                                                <CumulativeEnergyChart
                                                    data={renderData}
                                                    loading={isLoadingData}
                                                    error={dataError}
                                                    timeRange={`${timeRange}d`}
                                                    exportable={true}
                                                    onRetry={() => window.location.reload()}
                                                />

                                                <OperationalStateChart
                                                    data={renderData}
                                                    loading={isLoadingData}
                                                    error={dataError}
                                                    timeRange={`${timeRange}d`}
                                                    exportable={true}
                                                    onRetry={() => window.location.reload()}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Only render event components if we have a valid deviceId */}
                            {deviceId && (
                                <>
                                    {/* Schedule Event Section */}
                                    <ScheduleEvent
                                        deviceId={deviceId || ''}
                                        onEventScheduled={handleEventScheduled}
                                    />

                                    {/* Device Events Section */}
                                    <DeviceEvents
                                        key={eventsKey}
                                        deviceId={deviceId || ''}
                                    />
                                </>
                            )}

                            <div className="bg-card shadow overflow-hidden sm:rounded-lg mb-8">
                                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg leading-6 font-medium text-card-foreground">Device Information</h3>
                                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Details and specifications.</p>
                                    </div>
                                    <div>
                                        {/* Change health status logic - now based on updated_at time */}
                                        {(() => {
                                            const isHealthy = device.updated_at ? isWithinOneDay(device.updated_at) : false;
                                            return (
                                                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${isHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {isHealthy ? 'Healthy' : 'Needs Attention'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="border-t border-border">
                                    <dl>
                                        <div className="bg-muted px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Device ID</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.device_id}</dd>
                                        </div>
                                        <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Device Type</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">
                                                <DeviceTypeDisplay deviceType={device.device_type} />
                                            </dd>
                                        </div>
                                        <div className="bg-muted px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Model Number</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.model_number}</dd>
                                        </div>
                                        <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Serial Number</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.serial_number}</dd>
                                        </div>
                                        <div className="bg-muted px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Firmware Version</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.firmware_version}</dd>
                                        </div>
                                        <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Firmware Date</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.firmware_date}</dd>
                                        </div>
                                        <div className="bg-muted px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">CTA Version</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.cta_version}</dd>
                                        </div>
                                        <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Vendor ID</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.vendor_id}</dd>
                                        </div>
                                        <div className="bg-muted px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Device Revision</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.device_revision}</dd>
                                        </div>
                                        <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-muted-foreground">Capability Bitmap</dt>
                                            <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.capability_bitmap}</dd>
                                        </div>
                                        {device.gridcube_firmware_version && (
                                            <div className="bg-muted px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-muted-foreground">GridCube Firmware Version</dt>
                                                <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">{device.gridcube_firmware_version}</dd>
                                            </div>
                                        )}
                                        {device.last_rx_rssi !== undefined && (
                                            <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-muted-foreground flex items-center">
                                                    <FiWifi className="mr-2" /> Signal Strength (RSSI)
                                                </dt>
                                                <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">
                                                    {device.last_rx_rssi} dBm
                                                </dd>
                                            </div>
                                        )}
                                        {device.last_link_type !== undefined && (
                                            <div className="bg-muted px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-muted-foreground flex items-center">
                                                    <FiCpu className="mr-2" /> Link Type
                                                </dt>
                                                <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">
                                                    {getLinkTypeName(device.last_link_type)}
                                                </dd>
                                            </div>
                                        )}
                                        {device.updated_at && (
                                            <div className="bg-card px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                                                <dd className="mt-1 text-sm text-card-foreground sm:mt-0 sm:col-span-2">
                                                    {formatDate(device.updated_at)}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

// Helper functions for chart display
function getMetricLabel(metric: string): string {
    switch (metric) {
        case 'instant_power': return 'Instant Power';
        case 'cumulative_energy': return 'Cumulative Energy';
        case 'operational_state': return 'Operational State';
        default: return metric;
    }
}

function getUnitForMetric(metric: string): string {
    switch (metric) {
        case 'instant_power': return 'W';
        case 'cumulative_energy': return 'kWh';
        case 'operational_state': return '';
        default: return '';
    }
}

function getAxisLabel(metric: string): string {
    return `${getMetricLabel(metric)}${getUnitForMetric(metric) ? ` (${getUnitForMetric(metric)})` : ''}`;
}

export default DeviceDetail; 