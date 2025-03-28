import React, { useState } from 'react';
import { eventsAPI } from '../services/api';
import { EventType } from '../types';

interface ScheduleEventProps {
    deviceId: string;
    onEventScheduled: () => void;
}

const ScheduleEvent: React.FC<ScheduleEventProps> = ({ deviceId, onEventScheduled }) => {
    const [eventType, setEventType] = useState<EventType>(EventType.LOAD_UP);
    const [startTime, setStartTime] = useState('');
    const [scheduleForNow, setScheduleForNow] = useState(true);
    const [duration, setDuration] = useState<number | undefined>(300); // Default 5 minutes (300 seconds)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Determine if the selected event type requires duration
    const eventRequiresDuration = () => {
        return eventType === EventType.LOAD_UP || eventType === EventType.START_SHED;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            // Format date or use current time
            const eventTime = scheduleForNow ? new Date() : new Date(startTime);

            // Create event params
            const eventParams: any = {};

            // Add appropriate time field based on event type
            if (eventType === EventType.INFO_REQUEST) {
                eventParams.timestamp = eventTime.toISOString();
            } else {
                eventParams.start_time = eventTime.toISOString();
                // Add duration if applicable
                if (eventRequiresDuration() && duration) {
                    eventParams.duration = duration;
                }
            }

            // Call the bulk events API with a single device ID
            const response = await eventsAPI.createBulkEvents(
                eventType,
                eventParams,
                [deviceId] // Pass as an array with a single device ID
            );

            if (response.body?.successful_events?.length > 0) {
                setSuccess(true);
            } else if (response.body?.failed_events?.length > 0) {
                const failedDevice = response.body.failed_events[0];
                setError(failedDevice.error || 'Failed to schedule event');
            }

            onEventScheduled();

            // Reset form
            setEventType(EventType.LOAD_UP);
            setStartTime('');
            setScheduleForNow(true);
            setDuration(300);
        } catch (err: any) {
            console.error('Error scheduling event:', err);
            setError(err.message || 'Failed to schedule event');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Schedule Event</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Schedule a new event for this device.</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                {success && (
                    <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-green-800">Event scheduled successfully!</p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        {/* Event Type */}
                        <div className="sm:col-span-3">
                            <label htmlFor="event-type" className="block text-sm font-medium text-gray-700">
                                Event Type
                            </label>
                            <select
                                id="event-type"
                                name="event-type"
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value as EventType)}
                                required
                            >
                                <option value={EventType.LOAD_UP}>Load Up</option>
                                <option value={EventType.GRID_EMERGENCY}>Grid Emergency</option>
                                <option value={EventType.CRITICAL_PEAK}>Critical Peak</option>
                                <option value={EventType.START_SHED}>Start Shed</option>
                                <option value={EventType.END_SHED}>End Shed</option>
                                <option value={EventType.INFO_REQUEST}>Information Request</option>
                            </select>
                        </div>

                        {/* Timing Option */}
                        <div className="sm:col-span-3">
                            <fieldset className="mt-4">
                                <legend className="block text-sm font-medium text-gray-700">When to schedule</legend>
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center">
                                        <input
                                            id="now"
                                            name="schedule-time"
                                            type="radio"
                                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                            checked={scheduleForNow}
                                            onChange={() => setScheduleForNow(true)}
                                        />
                                        <label htmlFor="now" className="ml-3 block text-sm font-medium text-gray-700">
                                            Right now
                                        </label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            id="later"
                                            name="schedule-time"
                                            type="radio"
                                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                                            checked={!scheduleForNow}
                                            onChange={() => setScheduleForNow(false)}
                                        />
                                        <label htmlFor="later" className="ml-3 block text-sm font-medium text-gray-700">
                                            Schedule for later
                                        </label>
                                    </div>
                                </div>
                            </fieldset>
                        </div>

                        {/* Date/Time Picker (shown only if scheduling for later) */}
                        {!scheduleForNow && (
                            <div className="sm:col-span-3">
                                <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">
                                    Start Time
                                </label>
                                <input
                                    type="datetime-local"
                                    name="start-time"
                                    id="start-time"
                                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required={!scheduleForNow}
                                />
                            </div>
                        )}

                        {/* Duration (shown only for event types that need it) */}
                        {eventRequiresDuration() && (
                            <div className="sm:col-span-3">
                                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                                    Duration (seconds)
                                </label>
                                <input
                                    type="number"
                                    name="duration"
                                    id="duration"
                                    min="1"
                                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    value={duration || ''}
                                    onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    {duration ? `${Math.floor(duration / 60)} minutes ${duration % 60} seconds` : ''}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <button
                            type="submit"
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Scheduling...' : 'Schedule Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleEvent; 