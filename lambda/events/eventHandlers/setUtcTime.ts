import { EventMap } from "../models/eventType.ts";
import { sendToDobby } from "../../utils/sendToDobby.ts";
import { saveEventToDynamoDB } from "../../utils/saveEvent.ts";
import { EventSchemaType } from "../eventsSchema.ts";
import { v4 as uuidv4 } from 'uuid';
import { EventType } from "../eventsSchema.ts";

interface SetUtcTimeData {
    device_id: string;
    utc_seconds: number;
    utc_offset: number;
    dst_offset: number;
    event_sent?: boolean;
}

export const handleSetUtcTime = async (eventData: SetUtcTimeData): Promise<EventSchemaType> => {
    // Create the payload using DataView
    const buffer = new ArrayBuffer(7);
    const view = new DataView(buffer);
    
    // Command Type
    view.setUint8(0, EventMap.SET_UTC_TIME);
    
    // UTC seconds since 1/1/2000 (4 bytes)
    view.setUint32(1, eventData.utc_seconds, true);
    
    // UTC offset in 15-minute intervals (1 byte, signed)
    view.setInt8(5, eventData.utc_offset);
    
    // DST offset in 15-minute intervals (1 byte, unsigned)
    view.setUint8(6, eventData.dst_offset);

    // Send the command to the device
    const sentToDobby = await sendToDobby(eventData.device_id, buffer);

    // Create the event object
    const event: EventSchemaType = {
        event_id: uuidv4(),
        event_type: EventType.SET_UTC_TIME,
        event_data: {
            device_id: eventData.device_id,
            utc_seconds: eventData.utc_seconds,
            utc_offset: eventData.utc_offset,
            dst_offset: eventData.dst_offset,
            event_sent: sentToDobby
        },
        event_ack: false
    };

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event);

    return event;
}; 