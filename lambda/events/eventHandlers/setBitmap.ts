import { EventMap } from "../models/eventType.ts";
import { sendToDobby } from "../../utils/sendToDobby.ts";
import { saveEventToDynamoDB } from "../../utils/saveEvent.ts";
import { EventSchemaType } from "../eventsSchema.ts";
import { v4 as uuidv4 } from 'uuid';
import { EventType } from "../eventsSchema.ts";

interface SetBitmapData {
    device_id: string;
    bit_number: number;
    set_value: boolean;
    event_sent?: boolean;
}

export const handleSetBitmap = async (eventData: SetBitmapData, clientEventId?: string): Promise<EventSchemaType> => {
    // Validate bit number
    if (eventData.bit_number < 0 || eventData.bit_number > 255) {
        throw new Error('Bit number must be between 0 and 255');
    }

    // Create the payload using DataView
    const buffer = new ArrayBuffer(3);
    const view = new DataView(buffer);
    
    // Command Type
    view.setUint8(0, EventMap.SET_BITMAP);
    
    // Bit Number
    view.setUint8(1, eventData.bit_number);
    
    // Set/Unset Value
    view.setUint8(2, eventData.set_value ? 1 : 0);

    // Send the command to the device
    const sentToDobby = await sendToDobby(eventData.device_id, buffer);

    // Use client-provided event ID if available, otherwise generate new UUID for backward compatibility
    const eventId = clientEventId || uuidv4();
    console.log(`[DEBUG] SetBitmap handler using event_id: ${eventId} ${clientEventId ? '(client-provided)' : '(generated for backward compatibility)'}`);

    // Create the event object
    const event: EventSchemaType = {
        event_id: eventId,
        event_type: EventType.SET_BITMAP,
        event_data: {
            device_id: eventData.device_id,
            bit_number: eventData.bit_number,
            set_value: eventData.set_value,
            event_sent: sentToDobby
        },
        event_ack: false
    };

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event);

    return event;
}; 