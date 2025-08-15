import React, { useState } from 'react';
import BulkScheduleEvent from '../components/BulkScheduleEvent';

const BulkSchedulePage: React.FC = () => {
    const [eventsKey, setEventsKey] = useState(0);

    const handleEventsScheduled = () => {
        // Update key to force a refresh of components if needed
        setEventsKey(prev => prev + 1);
    };

    return (
        <div className="min-h-screen bg-background">
            <main>
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-foreground">Bulk Schedule Events</h2>
                        <p className="mt-2 text-muted-foreground">
                            Schedule the same event for multiple devices simultaneously.
                        </p>
                    </div>

                    <BulkScheduleEvent
                        onEventsScheduled={handleEventsScheduled}
                    />
                </div>
            </main>
        </div>
    );
};

export default BulkSchedulePage; 