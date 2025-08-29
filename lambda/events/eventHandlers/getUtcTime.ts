import { EventMap } from "../models/eventType.ts";
import { sendToDobby } from "../../utils/sendToDobby.ts";
import { saveEventToDynamoDB } from "../../utils/saveEvent.ts";
import { EventSchemaType } from "../eventsSchema.ts";
import { v4 as uuidv4 } from 'uuid';
import { EventType } from "../eventsSchema.ts";

interface GetUtcTimeData {
    device_id: string;
    event_sent?: boolean;
}

export const handleGetUtcTime = async (eventData: GetUtcTimeData, clientEventId?: string): Promise<EventSchemaType> => {
    // Create the payload using DataView
    const buffer = new ArrayBuffer(1);
    const view = new DataView(buffer);
    
    // Command Type
    view.setUint8(0, EventMap.GET_UTC_TIME);

    // Send the command to the device
    const sentToDobby = await sendToDobby(eventData.device_id, buffer);

    // Use client-provided event ID if available, otherwise generate new UUID for backward compatibility
    const eventId = clientEventId || uuidv4();
    console.log(`[DEBUG] GetUtcTime handler using event_id: ${eventId} ${clientEventId ? '(client-provided)' : '(generated for backward compatibility)'}`);

    // Create the event object
    const event: EventSchemaType = {
        event_id: eventId,
        event_type: EventType.GET_UTC_TIME,
        event_data: {
            device_id: eventData.device_id,
            event_sent: sentToDobby
        },
        event_ack: false
    };

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event);

    return event;
}; 