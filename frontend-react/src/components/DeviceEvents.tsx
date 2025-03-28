import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCalendar, FiClock, FiInfo } from 'react-icons/fi';
import { eventsAPI } from '../services/api';
import { Event, EventType } from '../types';

interface DeviceEventsProps {
    deviceId: string;
}

const DeviceEvents: React.FC<DeviceEventsProps> = ({ deviceId }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDeviceEvents = async () => {
            if (!deviceId) {
                setError('Device ID is missing');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const data = await eventsAPI.getEventsByDeviceId(deviceId);
                setEvents(data);
            } catch (err: any) {
                console.error('Error fetching device events:', err);
                setError('Failed to fetch device events: ' + (err.message || 'Unknown error'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchDeviceEvents();
    }, [deviceId]);

    // Helper function to format date
    const formatDate = (dateString?: string): string => {
        if (!dateString) return "Invalid Date";
        if (dateString === "0") return "Immediate";

        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (e) {
            return "Invalid Date";
        }
    };

    // Helper to get event type display name and color
    const getEventInfo = (eventType: EventType): { name: string; bgColor: string; textColor: string; icon: React.ReactNode } => {
        switch (eventType) {
            case EventType.LOAD_UP:
                return {
                    name: "Load Up",
                    bgColor: "bg-blue-100",
                    textColor: "text-blue-800",
                    icon: <FiInfo className="h-5 w-5 text-blue-600" />
                };
            case EventType.GRID_EMERGENCY:
                return {
                    name: "Grid Emergency",
                    bgColor: "bg-red-100",
                    textColor: "text-red-800",
                    icon: <FiAlertCircle className="h-5 w-5 text-red-600" />
                };
            case EventType.CRITICAL_PEAK:
                return {
                    name: "Critical Peak",
                    bgColor: "bg-orange-100",
                    textColor: "text-orange-800",
                    icon: <FiAlertCircle className="h-5 w-5 text-orange-600" />
                };
            case EventType.START_SHED:
                return {
                    name: "Start Shed",
                    bgColor: "bg-amber-100",
                    textColor: "text-amber-800",
                    icon: <FiClock className="h-5 w-5 text-amber-600" />
                };
            case EventType.END_SHED:
                return {
                    name: "End Shed",
                    bgColor: "bg-green-100",
                    textColor: "text-green-800",
                    icon: <FiClock className="h-5 w-5 text-green-600" />
                };
            case EventType.INFO_REQUEST:
                return {
                    name: "Information Request",
                    bgColor: "bg-purple-100",
                    textColor: "text-purple-800",
                    icon: <FiInfo className="h-5 w-5 text-purple-600" />
                };
            default:
                return {
                    name: "Unknown Event",
                    bgColor: "bg-gray-100",
                    textColor: "text-gray-800",
                    icon: <FiInfo className="h-5 w-5 text-gray-600" />
                };
        }
    };

    // Sort events by date in descending order (most recent first)
    const sortedEvents = [...events].sort((a, b) => {
        // Choose the appropriate date field based on the event type
        const getDateString = (event: Event) => {
            if (event.event_type === EventType.INFO_REQUEST && event.event_data.timestamp) {
                return event.event_data.timestamp;
            }
            return event.event_data.start_time || "0";
        };

        const dateA = getDateString(a) === "0" ? new Date() : new Date(getDateString(a));
        const dateB = getDateString(b) === "0" ? new Date() : new Date(getDateString(b));
        return dateB.getTime() - dateA.getTime();
    });

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Device Events</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Current and past events for this device.</p>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-32">
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
            ) : sortedEvents.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                    <FiCalendar className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="mt-2">No events found for this device.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Event Type
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Start Time
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Duration
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedEvents.map((event) => {
                                const eventInfo = getEventInfo(event.event_type);
                                // Get the appropriate date field based on event type
                                const dateField = event.event_type === EventType.INFO_REQUEST
                                    ? event.event_data.timestamp
                                    : event.event_data.start_time;

                                return (
                                    <tr key={event.event_id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0">
                                                    {eventInfo.icon}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {eventInfo.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{formatDate(dateField)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {event.event_type === EventType.INFO_REQUEST
                                                    ? 'N/A'
                                                    : (event.event_data.duration
                                                        ? `${event.event_data.duration} seconds`
                                                        : 'N/A')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.event_data.event_sent
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {event.event_data.event_sent ? 'Sent' : 'Failed'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DeviceEvents; 