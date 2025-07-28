import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deviceAPI } from '../services/api';
import { Device, DeviceDataPoint } from '../types';
import { FiAlertCircle, FiArrowLeft, FiBattery, FiCpu, FiWifi, FiActivity } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import DeviceEvents from '../components/DeviceEvents';
import ScheduleEvent from '../components/ScheduleEvent';

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
    const [selectedMetric, setSelectedMetric] = useState<string>('overlay');
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

    // Format data for the chart
    const formattedChartData = deviceData.map(item => {
        // Keep timestamp in milliseconds for x-axis
        const timeMs = item.timestamp * 1000;
        const date = new Date(timeMs);
        return {
            ...item,
            timeMs,  // Use milliseconds timestamp for x-axis
            formattedTime: date.toLocaleTimeString(),
            formattedDate: date.toLocaleDateString(),
        };
    });

    // Sort data by timestamp to ensure proper line rendering
    formattedChartData.sort((a, b) => a.timeMs - b.timeMs);

    // Calculate time domain for chart
    const currentTime = Date.now(); // Current time in milliseconds
    let startTime: number | 'auto' = 'auto';

    // Create a separate array for rendering that includes a virtual point
    let renderData = [...formattedChartData];

    // Only use calculated start time if we have data points
    if (formattedChartData.length > 0) {
        // Get the time range in milliseconds based on selection
        const timeRangeMs = timeRange * 24 * 60 * 60 * 1000;
        // Set the start time based on current time minus the selected time range
        // This ensures that we use the same time range as the data fetch
        startTime = Math.min(formattedChartData[0].timeMs, currentTime - timeRangeMs);

        // Add a virtual data point at the current time to extend the line
        // This uses the step-after interpolation by carrying forward the last value
        if (formattedChartData.length > 0) {
            const lastDataPoint = formattedChartData[formattedChartData.length - 1];

            // Only add the virtual point if it's after the last real data point
            if (currentTime > lastDataPoint.timeMs) {
                const virtualDataPoint = {
                    ...lastDataPoint,
                    timeMs: currentTime,
                    formattedTime: new Date(currentTime).toLocaleTimeString(),
                    formattedDate: new Date(currentTime).toLocaleDateString()
                };
                renderData.push(virtualDataPoint);
            }
        }
    }

    // Time formatter for axis ticks
    const formatXAxis = (tickItem: number) => {
        const date = new Date(tickItem);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Function to refresh events after scheduling a new one
    const handleEventScheduled = () => {
        // Increment the key to force the DeviceEvents component to re-render
        setEventsKey(prevKey => prevKey + 1);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <main>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error || !device ? (
                        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <FiAlertCircle className="h-5 w-5 text-red-600" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800">{error || 'Device not found'}</p>
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
                            {/* Device Data Chart Section */}
                            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Device Data</h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Time series data from DobbyData table.</p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <select
                                            value={selectedMetric}
                                            onChange={(e) => setSelectedMetric(e.target.value)}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                        >
                                            <option value="overlay">All Metrics (Overlay)</option>
                                            <option value="instant_power">Instant Power (W)</option>
                                            <option value="cumulative_energy">Cumulative Energy (Wh)</option>
                                            <option value="operational_state">Operational State</option>
                                        </select>
                                        <select
                                            value={timeRange}
                                            onChange={(e) => setTimeRange(Number(e.target.value))}
                                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                        >
                                            <option value={1}>Last 24 Hours</option>
                                            <option value={7}>Last 7 Days</option>
                                            <option value={30}>Last 30 Days</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200">
                                    {isLoadingData ? (
                                        <div className="flex justify-center items-center h-64">
                                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                                        </div>
                                    ) : dataError ? (
                                        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <FiAlertCircle className="h-5 w-5 text-red-600" />
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-red-800">{dataError}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : deviceData.length === 0 ? (
                                        <div className="p-6 text-center text-gray-500">
                                            <FiActivity className="h-12 w-12 mx-auto text-gray-400" />
                                            <p className="mt-2">No data available for this device.</p>
                                        </div>
                                    ) : (
                                        <div className="p-4 h-96">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart
                                                    data={renderData}
                                                    margin={{ top: 5, right: 100, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="timeMs"
                                                        scale="time"
                                                        domain={[startTime, currentTime]}
                                                        type="number"
                                                        tickFormatter={formatXAxis}
                                                        label={{ value: 'Time', position: 'center' }}
                                                    />

                                                    {/* Primary Y-axis - for instant power or selected single metric */}
                                                    <YAxis
                                                        yAxisId="left"
                                                        domain={selectedMetric === 'cumulative_energy' ? ['auto', 'auto'] : [0, 'auto']}
                                                        tickFormatter={(value) => {
                                                            // Convert Wh to kWh for cumulative energy
                                                            if (selectedMetric === 'cumulative_energy') {
                                                                return (value / 1000).toFixed(0);
                                                            }
                                                            return value;
                                                        }}
                                                    >
                                                        <Label value={selectedMetric === 'overlay' ? 'Instant Power (W)' : getAxisLabel(selectedMetric)} position="left" angle={270} style={{ textAnchor: 'middle' }} />
                                                    </YAxis>

                                                    {/* Tertiary Y-axis for operational state (only shown in overlay mode) */}
                                                    {selectedMetric === 'overlay' && (
                                                        <YAxis
                                                            yAxisId="right2"
                                                            orientation="right"
                                                        >
                                                            <Label value="Operational State" position="right" angle={270} style={{ textAnchor: 'middle' }} />
                                                        </YAxis>
                                                    )}

                                                    {/* Secondary Y-axis - for cumulative energy (only shown in overlay mode) */}
                                                    {selectedMetric === 'overlay' && (
                                                        <YAxis
                                                            yAxisId="right"
                                                            orientation="right"
                                                            domain={['auto', 'auto']}
                                                            tickFormatter={(value) => {
                                                                // Convert Wh to kWh
                                                                return (value / 1000).toFixed(0);
                                                            }}
                                                        >
                                                            <Label value="Cumulative Energy (kWh)" position="right" angle={270} style={{ textAnchor: 'middle' }} />
                                                        </YAxis>
                                                    )}

                                                    <Tooltip
                                                        // Only show tooltip for real data points
                                                        content={(props) => {
                                                            // If it's the virtual point (last one) don't show the tooltip
                                                            if (props.active && props.payload && props.payload.length) {
                                                                const dataIndex = props.payload[0].payload.timeMs === currentTime &&
                                                                    props.payload[0].payload.timeMs !== formattedChartData[formattedChartData.length - 1]?.timeMs;
                                                                if (dataIndex) {
                                                                    return null;
                                                                }

                                                                // Otherwise show the default tooltip
                                                                return (
                                                                    <div className="custom-tooltip bg-white p-2 border border-gray-300 rounded shadow">
                                                                        <p className="font-semibold">{new Date(props.payload[0].payload.timeMs).toLocaleString()}</p>
                                                                        {props.payload.map((entry, index) => {
                                                                            let formattedValue = entry.value;
                                                                            let unit = '';

                                                                            // Format based on metric type
                                                                            if (entry.name === 'Instant Power') {
                                                                                unit = 'W';
                                                                            } else if (entry.name === 'Cumulative Energy') {
                                                                                // Convert Wh to kWh
                                                                                formattedValue = (Number(entry.value) / 1000).toFixed(3);
                                                                                unit = 'kWh';
                                                                            } else if (entry.name === 'Operational State') {
                                                                                unit = '';
                                                                            } else if (selectedMetric === 'cumulative_energy') {
                                                                                // Convert Wh to kWh for single metric mode
                                                                                formattedValue = (Number(entry.value) / 1000).toFixed(3);
                                                                                unit = 'kWh';
                                                                            } else {
                                                                                unit = getUnitForMetric(selectedMetric);
                                                                            }

                                                                            return (
                                                                                <p key={`item-${index}`} style={{ color: entry.color }}>
                                                                                    {entry.name}: {formattedValue} {unit}
                                                                                </p>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />

                                                    <Legend />

                                                    {/* Conditional rendering of lines based on selected view */}
                                                    {(selectedMetric === 'instant_power' || selectedMetric === 'overlay') && (
                                                        <Line
                                                            yAxisId="left"
                                                            type="stepAfter"
                                                            dataKey="instant_power"
                                                            stroke="#3b82f6" // Blue
                                                            dot={false} // Hide all dots, simpler approach
                                                            activeDot={true} // But show active dots on hover
                                                            name="Instant Power"
                                                        />
                                                    )}

                                                    {(selectedMetric === 'cumulative_energy' || selectedMetric === 'overlay') && (
                                                        <Line
                                                            yAxisId={selectedMetric === 'overlay' ? "right" : "left"}
                                                            type="stepAfter"
                                                            dataKey="cumulative_energy"
                                                            stroke="#10b981" // Green
                                                            dot={false} // Hide all dots, simpler approach
                                                            activeDot={true} // But show active dots on hover
                                                            name="Cumulative Energy"
                                                        />
                                                    )}

                                                    {(selectedMetric === 'operational_state' || selectedMetric === 'overlay') && (
                                                        <Line
                                                            yAxisId={selectedMetric === 'overlay' ? "right2" : "left"}
                                                            type="stepAfter"
                                                            dataKey="operational_state"
                                                            stroke="#ef4444" // Red
                                                            dot={false} // Hide all dots, simpler approach
                                                            activeDot={true} // But show active dots on hover
                                                            name="Operational State"
                                                        />
                                                    )}
                                                </LineChart>
                                            </ResponsiveContainer>
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

                            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Device Information</h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and specifications.</p>
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
                                <div className="border-t border-gray-200">
                                    <dl>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Device ID</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.device_id}</dd>
                                        </div>
                                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Device Type</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.device_type}</dd>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Model Number</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.model_number}</dd>
                                        </div>
                                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.serial_number}</dd>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Firmware Version</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.firmware_version}</dd>
                                        </div>
                                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Firmware Date</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.firmware_date}</dd>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">CTA Version</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.cta_version}</dd>
                                        </div>
                                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Vendor ID</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.vendor_id}</dd>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Device Revision</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.device_revision}</dd>
                                        </div>
                                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Capability Bitmap</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.capability_bitmap}</dd>
                                        </div>
                                        {device.gridcube_firmware_version && (
                                            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-gray-500">GridCube Firmware Version</dt>
                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{device.gridcube_firmware_version}</dd>
                                            </div>
                                        )}
                                        {device.last_rx_rssi !== undefined && (
                                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-gray-500 flex items-center">
                                                    <FiWifi className="mr-2" /> Signal Strength (RSSI)
                                                </dt>
                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                    {device.last_rx_rssi} dBm
                                                </dd>
                                            </div>
                                        )}
                                        {device.last_link_type !== undefined && (
                                            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-gray-500 flex items-center">
                                                    <FiCpu className="mr-2" /> Link Type
                                                </dt>
                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                    {getLinkTypeName(device.last_link_type)}
                                                </dd>
                                            </div>
                                        )}
                                        {device.updated_at && (
                                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
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