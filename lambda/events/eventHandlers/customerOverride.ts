import { EventMap } from "../models/eventType";
import { sendToDobby } from "../../utils/sendToDobby";
import { saveEventToDynamoDB } from "../../utils/saveEvent";
import { EventSchemaType } from "../eventsSchema";
import { v4 as uuidv4 } from 'uuid';
import { EventType } from "../eventsSchema";
import { convertToGpsTimeEpoch } from "../../utils/convertGpsTime";

export async function handleCustomerOverride(
    deviceId: string,
    override: boolean
): Promise<EventSchemaType> {
    // Create the payload using DataView
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setUint8(0, EventMap.CUSTOMER_OVERRIDE);
    view.setUint8(1, override ? 1 : 0);

    // Send the command to the device
    const sentToDobby = await sendToDobby(deviceId, view.buffer);

    const gpsTimeEpoch = convertToGpsTimeEpoch(new Date());

    // Create the event object
    const event: EventSchemaType = {
        event_id: uuidv4(),
        event_type: EventType.CUSTOMER_OVERRIDE,
        event_data: {
            device_id: deviceId,
            override: override,
            start_time: gpsTimeEpoch,
            event_sent: sentToDobby
        },
        event_ack: false
    };

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event);

    return event;
} 